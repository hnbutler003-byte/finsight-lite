import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import * as Sentry from "@sentry/react";

export type Teacher = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  isVerified: boolean;
  createdAt: string;
};

async function fetchTeacher(): Promise<Teacher | null> {
  const res = await fetch("/api/teacher/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) return null;
  return res.json();
}

export function useTeacherAuth() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: teacher, isLoading } = useQuery<Teacher | null>({
    queryKey: ["/api/teacher/auth/me"],
    queryFn: fetchTeacher,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    try {
      if (teacher) Sentry.setUser({ id: `teacher:${teacher.id}` });
      else Sentry.setUser(null);
    } catch { /* ignore */ }
  }, [teacher]);

  const logoutMutation = useMutation({
    mutationFn: () => fetch("/api/teacher/auth/logout", { method: "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      qc.setQueryData(["/api/teacher/auth/me"], null);
      setLocation("/teacher/login");
    },
  });

  return { teacher, isLoading, logout: logoutMutation.mutate };
}
