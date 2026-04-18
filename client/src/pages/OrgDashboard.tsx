import { OrgSidebar } from "@/components/layout/OrgSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, BookOpen, Globe, Copy, Check, Loader2, Building2, BarChart3, Layers, Sparkles } from "lucide-react";
import { useState } from "react";

export default function OrgDashboard() {
  const { admin, isLoading: authLoading } = useOrgAuth();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);

  const { data: overview, isLoading } = useQuery<any>({
    queryKey: ["/api/org-admin/overview"],
    queryFn: () => fetch("/api/org-admin/overview", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
  });

  const { data: aiUsage } = useQuery<any>({
    queryKey: ["/api/org-admin/ai-usage"],
    queryFn: () => fetch("/api/org-admin/ai-usage", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
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

  const copyJoinCode = () => {
    const code = overview?.env?.joinCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <OrgSidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display font-bold text-3xl">
                Welcome, {admin.firstName}!
              </h1>
              <p className="text-muted-foreground mt-1">{admin.orgName} — {admin.envName}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Env Students", value: overview?.stats?.studentCount ?? 0, icon: Users, iconClass: "text-blue-600", bgClass: "bg-blue-100 dark:bg-blue-900/30" },
                  { label: "Org Students", value: overview?.stats?.orgStudentCount ?? 0, icon: Building2, iconClass: "text-indigo-600", bgClass: "bg-indigo-100 dark:bg-indigo-900/30" },
                  { label: "Environments", value: overview?.stats?.environmentCount ?? 0, icon: Layers, iconClass: "text-violet-600", bgClass: "bg-violet-100 dark:bg-violet-900/30" },
                  { label: "Published Lessons", value: overview?.stats?.publishedLessons ?? 0, icon: BookOpen, iconClass: "text-blue-600", bgClass: "bg-blue-100 dark:bg-blue-900/30" },
                ].map(stat => (
                  <Card key={stat.label} className="glass-card rounded-glass">
                    <CardContent className="p-5 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${stat.bgClass}`}>
                        <stat.icon className={`w-5 h-5 ${stat.iconClass}`} />
                      </div>
                      <div>
                        <p className="text-xl font-display font-bold">{stat.value}</p>
                        <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {overview?.env && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="glass-card rounded-glass">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h3 className="font-display font-bold text-lg">Student Join Code</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Share this code so students can enroll in your organization</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-3 border border-blue-100 dark:border-blue-800">
                          <p className="font-display font-bold text-2xl tracking-widest text-blue-600 text-center">{overview.env.joinCode ?? "—"}</p>
                        </div>
                        <button
                          onClick={copyJoinCode}
                          className="p-3 rounded-2xl border-2 border-blue-100 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
                          data-testid="button-copy-join-code"
                        >
                          {copied ? <Check className="w-5 h-5 text-blue-600" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card rounded-glass">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="font-display font-bold text-lg">Environment Info</h3>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-medium">Display Name</span>
                          <span className="font-bold">{overview.env.displayName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-medium">Slug</span>
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded-lg">{overview.env.slug}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-medium">Total Lessons</span>
                          <span className="font-bold">{overview.stats?.totalLessons ?? 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {overview?.environments && overview.environments.length > 1 && (
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-violet-600" />
                      </div>
                      <h3 className="font-display font-bold text-lg">All Environments</h3>
                    </div>
                    <div className="space-y-2">
                      {overview.environments.map((env: any) => (
                        <div key={env.id} className={`flex items-center justify-between p-3 rounded-2xl border-2 ${env.id === admin.envId ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10" : "border-input"}`}>
                          <div>
                            <p className="font-bold text-sm">{env.displayName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{env.joinCode}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-bold">{env.studentCount}</span>
                            {env.id === admin.envId && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg font-bold">Current</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {aiUsage && (
                <Card className="glass-card rounded-glass" data-testid="card-ai-usage">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg">AI Usage This Month</h3>
                        <p className="text-xs text-muted-foreground font-medium">
                          Live calls count toward your limit. Cached answers are free.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { key: "guide_chat", label: "Money Guide chat" },
                        { key: "tutor_explain", label: "AI Tutor explanations" },
                        { key: "ai_insights", label: "AI Insights" },
                      ].map(({ key, label }) => {
                        const row = aiUsage[key] ?? { live: 0, cached: 0, limit: 0 };
                        const pct = row.limit > 0 ? Math.min(100, Math.round((row.live / row.limit) * 100)) : 0;
                        const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-violet-500";
                        return (
                          <div key={key} className="rounded-2xl border-2 border-input p-3 space-y-2" data-testid={`ai-usage-${key}`}>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
                            <p className="font-display font-bold text-xl">
                              {row.live.toLocaleString()} <span className="text-sm text-muted-foreground font-medium">/ {row.limit.toLocaleString()}</span>
                            </p>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-bold text-emerald-600">{row.cached.toLocaleString()}</span> cached (saved)
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {overview?.org && (
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-6 space-y-3">
                    <h3 className="font-display font-bold text-lg">Organization Details</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      {[
                        { label: "Name", value: overview.org.name },
                        { label: "Type", value: overview.org.type?.replace("_", " ") },
                        { label: "Country", value: overview.org.country },
                      ].map(d => (
                        <div key={d.label}>
                          <p className="text-muted-foreground font-medium text-xs mb-0.5">{d.label}</p>
                          <p className="font-bold capitalize">{d.value || "—"}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
