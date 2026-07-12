import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp, type URLOpenListenerEvent } from "@capacitor/app";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Share } from "@capacitor/share";

const ACP_WEB_ORIGIN = "https://anticorruptionparty.us";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function toPublicWebUrl(url: string) {
  try {
    if (/^https?:\/\//i.test(url)) return url;
    return new URL(url.startsWith("/") ? url : `/${url}`, ACP_WEB_ORIGIN).toString();
  } catch {
    return ACP_WEB_ORIGIN;
  }
}

export function normalizeNativeInternalPath(path: string) {
  if (!isNativeApp()) return path;

  if (
    path.startsWith("/mobile") ||
    path.startsWith("/auth") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password")
  ) {
    return path;
  }

  const mappings: Array<[RegExp, string]> = [
    [/^\/$/, "/mobile"],
    [/^\/events(?:\/.*)?$/, "/mobile/events"],
    [/^\/friends(?:\/.*)?$/, "/mobile/friends"],
    [/^\/messages(?:\/.*)?$/, "/mobile/messages"],
    [/^\/groups(?:\/.*)?$/, "/mobile/groups"],
    [/^\/profile(?:\/.*)?$/, "/mobile/profile"],
    [/^\/representatives(?:\/.*)?$/, "/mobile/reps"],
    [/^\/politicians(?:\/.*)?$/, "/mobile/reps"],
    [/^\/signals(?:\/.*)?$/, "/mobile/signals"],
    [/^\/posts(?:\/.*)?$/, "/mobile/feed"],
    [/^\/polls(?:\/.*)?$/, "/mobile/feed"],
    [/^\/article(?:\/.*)?$/, "/mobile/feed"],
    [/^\/read(?:\/.*)?$/, "/mobile/feed"],
    [/^\/news(?:\/.*)?$/, "/mobile/feed"],
  ];

  for (const [pattern, replacement] of mappings) {
    if (pattern.test(path)) return replacement;
  }

  return "/mobile";
}

export async function nativeImpact(style: ImpactStyle = ImpactStyle.Light) {
  if (!isNativeApp()) return;
  try {
    await Haptics.impact({ style });
  } catch {
    // Haptics are optional; interaction should continue silently if unavailable.
  }
}

export async function shareNative(input: { title: string; text?: string; url: string }) {
  const url = toPublicWebUrl(input.url);

  if (isNativeApp()) {
    try {
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: input.title,
          text: input.text || input.title,
          url,
          dialogTitle: "Share ACP",
        });
        return true;
      }
    } catch (error: any) {
      if (error?.message?.toLowerCase?.().includes("cancel")) return true;
    }
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: input.title, text: input.text || input.title, url });
      return true;
    } catch (error: any) {
      if (error?.name === "AbortError") return true;
    }
  }

  return false;
}

export function installNativeAppHandlers(navigate: (path: string, options?: { replace?: boolean }) => void) {
  if (!isNativeApp()) return undefined;

  document.documentElement.classList.add("capacitor-native");

  const listenerPromises = [
    CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && window.location.pathname !== "/mobile") {
        window.history.back();
        return;
      }
      CapacitorApp.exitApp();
    }),
    CapacitorApp.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      try {
        const url = new URL(event.url);
        if (url.hostname === "anticorruptionparty.us") {
          navigate(normalizeNativeInternalPath(`${url.pathname}${url.search}${url.hash}`));
        }
      } catch {
        // Ignore malformed deep-link payloads.
      }
    }),
  ];

  return () => {
    for (const listenerPromise of listenerPromises) {
      listenerPromise.then((listener) => listener.remove()).catch(() => {});
    }
  };
}
