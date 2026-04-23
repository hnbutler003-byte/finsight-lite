import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import * as Sentry from "@sentry/react";

export type OrgAdminUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  orgId: string;
  envId: string;
  role: string;
  orgName: string;
  envName: string;
  createdAt: string;
};

async function fetchOrgAdmin(): Promise<OrgAdminUser | null> {
  const res = await fetch("/api/org/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) return null;
  return res.json();
}

export function useOrgAuth() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: admin, isLoading } = useQuery<OrgAdminUser | null>({
    queryKey: ["/api/org/auth/me"],
    queryFn: fetchOrgAdmin,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    try {
      if (admin) {
        Sentry.setUser({ id: `org_admin:${admin.id}` });
        Sentry.setTag("org_id", admin.orgId);
      } else {
        Sentry.setUser(null);
        Sentry.getCurrentScope().setTag("org_id", null);
      }
    } catch { /* ignore */ }
  }, [admin]);

  const logoutMutation = useMutation({
    mutationFn: () => fetch("/api/org/auth/logout", { method: "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      qc.setQueryData(["/api/org/auth/me"], null);
      setLocation("/org/login");
    },
  });

  return { admin, isLoading, logout: logoutMutation.mutate };
}
