import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import * as Sentry from "@sentry/react";
import { apiRequest } from "@/lib/queryClient";

export function useAdminAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: admin, isLoading } = useQuery<{ email: string; isAdmin: boolean } | null>({
    queryKey: ["/api/admin/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    try {
      if (admin?.isAdmin) Sentry.setUser({ id: "admin" });
    } catch { /* ignore */ }
  }, [admin]);

  const login = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      apiRequest("POST", "/api/admin/auth/login", creds).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/auth/me"] });
    },
  });

  const logout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/auth/logout").then(r => r.json()),
    onSuccess: () => {
      queryClient.setQueryData(["/api/admin/auth/me"], null);
      setLocation("/admin/login");
    },
  });

  return { admin, isLoading, login, logout };
}
