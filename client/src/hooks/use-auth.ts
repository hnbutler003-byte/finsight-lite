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
    staleTime: 1000 * 60 * 5,
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
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  useEffect(() => {
    try {
      if (user) {
        Sentry.setUser({ id: (user as any).id ? String((user as any).id) : undefined });
        const orgId = (user as any).orgId;
        if (orgId) Sentry.setTag("org_id", orgId);
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
