import { OrgSidebar } from "@/components/layout/OrgSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, Loader2, Trash2, Zap, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type EnrichedStudent = {
  id: string;
  org_id: string;
  env_id: string;
  student_user_id: string;
  joined_at: string;
  displayName: string;
  username: string | null;
  avatar: string | null;
  xp: number;
  level: number;
  streak: number;
  envName: string;
};

const AVATAR_MAP: Record<string, string> = {
  lion: "🦁", dolphin: "🐬", parrot: "🦜", turtle: "🐢",
  star: "⭐", butterfly: "🦋", octopus: "🐙", artist: "🎨",
  rocket: "🚀", wave: "🌊", palm: "🌴", gamer: "🎮",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OrgStudents() {
  const { admin, isLoading: authLoading } = useOrgAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: students, isLoading } = useQuery<EnrichedStudent[]>({
    queryKey: ["/api/org-admin/students"],
    queryFn: () => fetch("/api/org-admin/students", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
  });

  const removeMutation = useMutation({
    mutationFn: (studentUserId: string) =>
      fetch(`/api/org-admin/students/${studentUserId}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/org-admin/students"] });
      qc.invalidateQueries({ queryKey: ["/api/org-admin/overview"] });
      toast({ title: "Student removed", description: "The student has been unenrolled from your organization." });
      setConfirmDelete(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Could not remove student. Please try again.", variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!admin) {
    setLocation("/org/login");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <OrgSidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display font-bold text-3xl">Students</h1>
              <p className="text-muted-foreground mt-1">Enrolled in {admin.orgName}</p>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 rounded-2xl px-4 py-2 border border-blue-100 dark:border-blue-800">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="font-display font-bold text-lg text-blue-600">{students?.length ?? 0}</span>
              <span className="text-sm text-muted-foreground font-medium">enrolled</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : !students?.length ? (
            <Card className="glass-card rounded-glass border-dashed">
              <CardContent className="p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">No students yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Share your organization join code so students can enroll.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {students.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                  data-testid={`row-student-${s.student_user_id}`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-xl">
                    {s.avatar ? (AVATAR_MAP[s.avatar] ?? "🧑‍🎓") : "🧑‍🎓"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{s.displayName}</p>
                      {s.username && <span className="text-xs text-muted-foreground">@{s.username}</span>}
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg font-bold">Lv {s.level}</span>
                      {s.streak > 0 && <span className="text-xs text-amber-600 font-bold">🔥 {s.streak}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-blue-500" />{s.xp} XP</span>
                      <span>Joined {formatDate(s.joined_at)}</span>
                      {s.envName && <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg font-medium">{s.envName}</span>}
                    </div>
                  </div>

                  {confirmDelete === s.student_user_id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Confirm remove?
                      </p>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeMutation.mutate(s.student_user_id)}
                        disabled={removeMutation.isPending}
                        className="rounded-xl text-xs"
                        data-testid={`button-confirm-remove-${s.student_user_id}`}
                      >
                        {removeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remove"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-xl text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(s.student_user_id)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                      data-testid={`button-remove-student-${s.student_user_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
