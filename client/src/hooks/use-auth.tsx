import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type TwoFactorRequirement = {
  requiresTwoFactor: true;
  challengeToken: string;
  twoFactorMethod: 'totp' | 'sms' | null;
  phone: string | null;
};

export type LoginResponse = SelectUser | TwoFactorRequirement;

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<LoginResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser & { invitationToken: string }>;
  verify2FAMutation: UseMutationResult<SelectUser, Error, TwoFactorVerifyData>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

type TwoFactorVerifyData = {
  challengeToken: string;
  method: 'totp' | 'sms';
  code: string;
  rememberDevice?: boolean;
};

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData): Promise<LoginResponse> => {
      const response = await apiRequest("/api/login", "POST", credentials);
      return response.json();
    },
    onSuccess: (response: LoginResponse) => {
      if ('requiresTwoFactor' in response && response.requiresTwoFactor) {
        return;
      }
      queryClient.setQueryData(["/api/user"], response);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async (data: TwoFactorVerifyData): Promise<SelectUser> => {
      const endpoint = data.method === 'totp' ? '/api/2fa/totp/verify' : '/api/2fa/sms/verify';
      const response = await apiRequest(endpoint, "POST", {
        challengeToken: data.challengeToken,
        token: data.method === 'totp' ? data.code : undefined,
        code: data.method === 'sms' ? data.code : undefined,
        rememberDevice: data.rememberDevice,
      });
      return response.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser & { invitationToken: string }): Promise<SelectUser> => {
      const response = await apiRequest("/api/register", "POST", credentials);
      return response.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await apiRequest("/api/logout", "POST");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update lastSeen timestamp periodically when user is active
  useEffect(() => {
    if (!user) return;

    const updateLastSeen = async () => {
      try {
        await apiRequest("/api/user/lastseen", "POST");
      } catch (error) {
        console.error("Failed to update last seen:", error);
      }
    };

    // Update immediately on mount
    updateLastSeen();

    // Update every 2 minutes
    const interval = setInterval(updateLastSeen, 2 * 60 * 1000);

    // Throttle activity updates to avoid too many requests
    let lastActivityUpdate = 0;
    const throttledActivity = () => {
      const now = Date.now();
      if (now - lastActivityUpdate < 30000) return; // Throttle to once every 30 seconds
      lastActivityUpdate = now;
      updateLastSeen();
    };

    window.addEventListener("click", throttledActivity);
    window.addEventListener("keydown", throttledActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", throttledActivity);
      window.removeEventListener("keydown", throttledActivity);
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        verify2FAMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
