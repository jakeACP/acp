import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";

let csrfToken: string | null = null;
const NATIVE_AUTH_TOKEN_KEY = "acp-native-auth-token";
let nativeAuthToken: string | null =
  Capacitor.isNativePlatform() ? localStorage.getItem(NATIVE_AUTH_TOKEN_KEY) : null;

// The packaged Capacitor app is loaded from capacitor://localhost, which has
// no backend of its own. Keep web requests same-origin, but give native builds
// an explicit API origin. This can be overridden for staging/local device
// testing with VITE_API_ORIGIN.
const NATIVE_API_ORIGIN = "https://anticorruptionparty.us";

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!Capacitor.isNativePlatform()) return path;

  const origin = String(import.meta.env.VITE_API_ORIGIN || NATIVE_API_ORIGIN).replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(resolveApiUrl("/api/csrf-token"), { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to fetch CSRF token");
  }
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken!;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setNativeAuthToken(token: string | null) {
  nativeAuthToken = token;
  if (!Capacitor.isNativePlatform()) return;

  if (token) localStorage.setItem(NATIVE_AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(NATIVE_AUTH_TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  return nativeAuthToken ? { Authorization: `Bearer ${nativeAuthToken}` } : {};
}

function shouldSendAuthToken(url: string): boolean {
  const pathname = url.replace(/^https?:\/\/[^/]+/i, "").split("?")[0];
  return !["/api/login", "/api/register", "/api/csrf-token"].includes(pathname);
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  if (!csrfToken && method !== "GET") {
    await fetchCsrfToken();
  }

  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (csrfToken && method !== "GET") {
    headers["x-csrf-token"] = csrfToken;
  }
  if (shouldSendAuthToken(url)) {
    Object.assign(headers, getAuthHeaders());
  }

  const requestUrl = resolveApiUrl(url);
  const res = await fetch(requestUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 403) {
    const text = await res.clone().text();
    if (text.toLowerCase().includes("csrf") || text.toLowerCase().includes("forbidden")) {
      await fetchCsrfToken();
      const retryRes = await fetch(requestUrl, {
        method,
        headers: {
          ...(data ? { "Content-Type": "application/json" } : {}),
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          ...(shouldSendAuthToken(url) ? getAuthHeaders() : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
      await throwIfResNotOk(retryRes);
      return retryRes;
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(resolveApiUrl(queryKey.join("/") as string), {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
