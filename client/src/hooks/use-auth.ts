import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 15,   // treat auth as fresh for 15 min
    gcTime:   1000 * 60 * 60,    // keep in cache for 1 hr even when unused
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; lastName?: string; avatar: string }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      localStorage.setItem("fsl_had_session", "1");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      localStorage.removeItem("fsl_had_session");
    },
  });

  useEffect(() => {
    try {
      if (user && user.id) {
        // Use opaque user id only, no PII (no email/name) sent to Sentry.
        Sentry.setUser({ id: `user:${user.id}` });
      } else {
        Sentry.setUser(null);
      }
    } catch {
      // Sentry might not be initialized; ignore
    }
  }, [user]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutate,
    registerError: registerMutation.error?.message,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
