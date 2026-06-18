import { OrgSidebar } from "@/components/layout/OrgSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, BookOpen, Globe, Copy, Check, Loader2, Building2, Layers, Sparkles, Settings2, Save, Mail, Send, Trophy, TrendingUp, Gamepad2, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

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

  const { data: aiQuotas } = useQuery<any>({
    queryKey: ["/api/org-admin/ai-quotas"],
    queryFn: () => fetch("/api/org-admin/ai-quotas", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
  });

  const { data: aiUsageMonthly } = useQuery<any>({
    queryKey: ["/api/org-admin/ai-usage-monthly"],
    queryFn: () => fetch("/api/org-admin/ai-usage-monthly", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
  });

  const { toast } = useToast();

  const [studentPage, setStudentPage] = useState(1);

  const { data: learningMetrics } = useQuery<any>({
    queryKey: ["/api/org-admin/learning-metrics"],
    queryFn: () => fetch("/api/org-admin/learning-metrics", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
  });

  const { data: topGames } = useQuery<any>({
    queryKey: ["/api/org-admin/top-games"],
    queryFn: () => fetch("/api/org-admin/top-games", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
  });

  const { data: studentTable, isLoading: isStudentTableLoading } = useQuery<any>({
    queryKey: ["/api/org-admin/student-table", studentPage],
    queryFn: () => fetch(`/api/org-admin/student-table?page=${studentPage}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
  });

  const { data: emailStats } = useQuery<any>({
    queryKey: ["/api/org/admin/email-stats"],
    queryFn: () => fetch("/api/org/admin/email-stats", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
    refetchInterval: 60_000,
  });

  const { data: orgSummary } = useQuery<{ summary: string }>({
    queryKey: ["/api/org/summary"],
    queryFn: () => fetch("/api/org/summary", { credentials: "include" }).then(r => r.json()),
    enabled: !!admin,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const triggerDigest = useMutation({
    mutationFn: async (audience: "student" | "teacher" | "guardian") => {
      const r = await apiRequest("POST", "/api/org/admin/weekly-digest/run-now", { audience });
      return r.json();
    },
    onSuccess: () => toast({ title: "Weekly digest queued" }),
    onError: (e: any) => toast({ title: "Couldn't queue digest", description: e.message, variant: "destructive" }),
  });
  const [editingQuotas, setEditingQuotas] = useState(false);
  const [quotaForm, setQuotaForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (aiQuotas?.perUser && aiQuotas?.perOrg) {
      setQuotaForm({
        guide_chat_per_user: String(aiQuotas.perUser.guide_chat ?? ""),
        tutor_explain_per_user: String(aiQuotas.perUser.tutor_explain ?? ""),
        ai_insights_per_user: String(aiQuotas.perUser.ai_insights ?? ""),
        guide_chat_per_org: String(aiQuotas.perOrg.guide_chat ?? ""),
        tutor_explain_per_org: String(aiQuotas.perOrg.tutor_explain ?? ""),
        ai_insights_per_org: String(aiQuotas.perOrg.ai_insights ?? ""),
      });
    }
  }, [aiQuotas]);

  const saveQuotas = useMutation({
    mutationFn: async (payload: Record<string, number>) => {
      const r = await apiRequest("PATCH", "/api/org-admin/ai-quotas", payload);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/ai-quotas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-admin/ai-usage"] });
      setEditingQuotas(false);
      toast({ title: "Daily limits updated" });
    },
    onError: (e: any) => toast({ title: "Failed to update limits", description: e.message, variant: "destructive" }),
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
            <a
              href="/api/org/report/pdf"
              className="btn-primary inline-flex items-center gap-2 no-underline"
              data-testid="link-export-report"
            >
              <FileDown className="w-4 h-4" />
              Export Report
            </a>
          </div>

          {orgSummary?.summary && (
            <Card className="glass-card-teal rounded-glass" data-testid="card-ai-summary">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-white/80" />
                  <p className="font-display font-bold text-white text-xs uppercase tracking-wider">This Month at a Glance</p>
                </div>
                <p className="text-white/90 text-sm leading-relaxed">{orgSummary.summary}</p>
              </CardContent>
            </Card>
          )}

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
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-lg">AI Usage Today</h3>
                          <p className="text-xs text-muted-foreground font-medium">
                            Daily limits — resets at midnight UTC. Cached answers are free.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingQuotas(v => !v)}
                        data-testid="button-edit-quotas"
                      >
                        <Settings2 className="w-4 h-4 mr-1" />
                        {editingQuotas ? "Hide limits" : "Edit limits"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { key: "guide_chat", label: "Money Guide chat" },
                        { key: "tutor_explain", label: "AI Tutor explanations" },
                        { key: "ai_insights", label: "AI Insights" },
                      ].map(({ key, label }) => {
                        const row = aiUsage[key] ?? { live: 0, cached: 0, limit: 0, tokens: 0 };
                        const perUserLimit = aiUsage.perUserLimits?.[key] ?? 0;
                        const pct = row.limit > 0 ? Math.min(100, Math.round((row.live / row.limit) * 100)) : 0;
                        const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-violet-500";
                        return (
                          <div key={key} className="rounded-2xl border-2 border-input p-3 space-y-2" data-testid={`ai-usage-${key}`}>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
                            <p className="font-display font-bold text-xl">
                              {row.live.toLocaleString()} <span className="text-sm text-muted-foreground font-medium">/ {row.limit.toLocaleString()} org</span>
                            </p>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-bold text-emerald-600">{row.cached.toLocaleString()}</span> cached ·{" "}
                              <span className="font-bold">{(row.tokens ?? 0).toLocaleString()}</span> tokens
                            </p>
                            <p className="text-[11px] text-muted-foreground">Per student: {perUserLimit}/day</p>
                          </div>
                        );
                      })}
                    </div>

                    {aiUsageMonthly?.series && (
                      <div className="rounded-2xl border-2 border-input p-4 space-y-3" data-testid="chart-monthly-usage">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-sm font-bold">This month so far</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-bold text-violet-600">{(aiUsageMonthly.totals?.total ?? 0).toLocaleString()}</span> live calls ·{" "}
                            <span className="font-bold text-emerald-600">{(aiUsageMonthly.totals?.cached ?? 0).toLocaleString()}</span> cached ·{" "}
                            <span className="font-bold">{(aiUsageMonthly.totals?.tokens ?? 0).toLocaleString()}</span> tokens
                          </p>
                        </div>
                        {aiUsageMonthly.series.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-4 text-center">No AI activity yet this month.</p>
                        ) : (() => {
                          const maxTotal = Math.max(1, ...aiUsageMonthly.series.map((d: any) => d.total + (d.cached || 0)));
                          return (
                            <div className="flex items-end gap-1 h-32" data-testid="bars-monthly">
                              {aiUsageMonthly.series.map((d: any) => {
                                const stackTotal = (d.guide_chat + d.tutor_explain + d.ai_insights);
                                const cachedH = ((d.cached || 0) / maxTotal) * 100;
                                const guideH = (d.guide_chat / maxTotal) * 100;
                                const tutorH = (d.tutor_explain / maxTotal) * 100;
                                const insightH = (d.ai_insights / maxTotal) * 100;
                                const dayLabel = d.day.slice(8, 10);
                                return (
                                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.day}: ${stackTotal} live, ${d.cached} cached, ${d.tokens} tokens`}>
                                    <div className="w-full flex flex-col-reverse h-28 rounded-md overflow-hidden bg-muted">
                                      <div style={{ height: `${guideH}%` }} className="bg-violet-500" />
                                      <div style={{ height: `${tutorH}%` }} className="bg-blue-500" />
                                      <div style={{ height: `${insightH}%` }} className="bg-amber-500" />
                                      <div style={{ height: `${cachedH}%` }} className="bg-emerald-400/60" />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-500" /> Guide</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500" /> Tutor</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" /> Insights</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400/60" /> Cached (free)</span>
                        </div>
                      </div>
                    )}

                    {editingQuotas && (
                      <div className="rounded-2xl border-2 border-input p-4 space-y-3" data-testid="quota-editor">
                        <p className="text-sm font-bold">Daily limits (per student / per org)</p>
                        <p className="text-xs text-muted-foreground">Leave a field blank to use the default.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { key: "guide_chat", label: "Money Guide chat" },
                            { key: "tutor_explain", label: "AI Tutor explanations" },
                            { key: "ai_insights", label: "AI Insights" },
                          ].map(({ key, label }) => (
                            <div key={key} className="space-y-2">
                              <p className="text-xs font-bold text-muted-foreground">{label}</p>
                              <div className="flex gap-2 items-center">
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="per student"
                                  value={quotaForm[`${key}_per_user`] ?? ""}
                                  onChange={(e) => setQuotaForm(f => ({ ...f, [`${key}_per_user`]: e.target.value }))}
                                  data-testid={`input-quota-${key}-per-user`}
                                />
                                <span className="text-xs text-muted-foreground">/</span>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="per org"
                                  value={quotaForm[`${key}_per_org`] ?? ""}
                                  onChange={(e) => setQuotaForm(f => ({ ...f, [`${key}_per_org`]: e.target.value }))}
                                  data-testid={`input-quota-${key}-per-org`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => {
                              const payload: any = {};
                              for (const [k, v] of Object.entries(quotaForm)) {
                                payload[k] = v === "" ? null : Number(v);
                              }
                              saveQuotas.mutate(payload);
                            }}
                            disabled={saveQuotas.isPending}
                            data-testid="button-save-quotas"
                          >
                            {saveQuotas.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                            Save limits
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {emailStats && (
                <Card className="glass-card rounded-glass" data-testid="card-email-stats">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-lg">Email deliverability (last 7 days)</h3>
                          <p className="text-xs text-muted-foreground">Sent, delivered, bounced, opened, failed.</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => triggerDigest.mutate("student")} disabled={triggerDigest.isPending} data-testid="button-digest-student">
                          <Send className="w-3 h-3 mr-1" /> Run student digest
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => triggerDigest.mutate("teacher")} disabled={triggerDigest.isPending} data-testid="button-digest-teacher">
                          <Send className="w-3 h-3 mr-1" /> Teacher
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => triggerDigest.mutate("guardian")} disabled={triggerDigest.isPending} data-testid="button-digest-guardian">
                          <Send className="w-3 h-3 mr-1" /> Guardian
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        { k: "sent", label: "Sent", color: "text-blue-600" },
                        { k: "delivered", label: "Delivered", color: "text-green-600" },
                        { k: "opened", label: "Opened", color: "text-emerald-600" },
                        { k: "bounced", label: "Bounced", color: "text-amber-600" },
                        { k: "failed", label: "Failed", color: "text-rose-600" },
                      ].map((row) => (
                        <div key={row.k} className="rounded-2xl border bg-white/60 dark:bg-white/5 p-3">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{row.label}</p>
                          <p className={`text-2xl font-display font-bold ${row.color}`} data-testid={`text-email-${row.k}`}>
                            {emailStats.totals?.[row.k] ?? 0}
                          </p>
                        </div>
                      ))}
                    </div>
                    {Array.isArray(emailStats.recent) && emailStats.recent.length > 0 && (
                      <div className="text-xs">
                        <p className="font-bold text-muted-foreground mb-2">Recent activity</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {emailStats.recent.slice(0, 10).map((e: any) => (
                            <div key={e.id} className="flex justify-between gap-2 border-b border-border/40 pb-1">
                              <span className="truncate">{e.recipient}</span>
                              <span className="text-muted-foreground">{e.kind}</span>
                              <span className={
                                e.status === "sent" || e.status === "delivered" || e.status === "opened" ? "text-green-600" :
                                e.status === "bounced" || e.status === "failed" ? "text-rose-600" : "text-muted-foreground"
                              }>{e.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ── LEARNING METRICS: Avg XP + Lesson Completion Rate ── */}
              {learningMetrics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="glass-card rounded-glass" data-testid="card-avg-xp">
                    <CardContent className="p-6 space-y-2">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg XP per Student</p>
                      </div>
                      <p className="font-display font-extrabold text-3xl text-foreground" data-testid="text-avg-xp">
                        {(learningMetrics.avgXp ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Across {learningMetrics.totalStudents ?? 0} students in your org</p>
                    </CardContent>
                  </Card>

                  <Card className="glass-card rounded-glass" data-testid="card-lesson-completion">
                    <CardContent className="p-6 space-y-2">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lesson Completion Rate</p>
                      </div>
                      <p className="font-display font-extrabold text-3xl text-foreground" data-testid="text-lesson-completion-rate">
                        {learningMetrics.lessonCompletionRate ?? 0}%
                      </p>
                      <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${learningMetrics.lessonCompletionRate ?? 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Lessons completed ÷ 9 core lessons × students</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── TOP 5 MONEY GAMES ── */}
              {topGames && topGames.length > 0 && (
                <Card className="glass-card rounded-glass" data-testid="card-top-games">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <Gamepad2 className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg">Top Money Games</h3>
                        <p className="text-xs text-muted-foreground">By session count across your org</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {topGames.map((g: any, i: number) => {
                        const maxSessions = topGames[0]?.sessions ?? 1;
                        const pct = Math.round((g.sessions / maxSessions) * 100);
                        const colors = ["bg-violet-500", "bg-blue-500", "bg-teal-500", "bg-emerald-500", "bg-amber-500"];
                        return (
                          <div key={g.game} className="space-y-1" data-testid={`row-game-${i}`}>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{g.game}</span>
                              <span className="font-display font-bold text-muted-foreground">{g.sessions.toLocaleString()} sessions</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full ${colors[i] ?? "bg-violet-500"} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ── STUDENT TABLE (paginated, 25 per page) ── */}
              <Card className="glass-card rounded-glass" data-testid="card-student-table">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg">All Students</h3>
                      <p className="text-xs text-muted-foreground">
                        {studentTable?.total ? `${studentTable.total} total` : ""}
                      </p>
                    </div>
                  </div>

                  {isStudentTableLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
                  ) : (
                    <>
                      <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-sm min-w-[560px]">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student</th>
                              <th className="text-left py-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Joined</th>
                              <th className="text-right py-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">XP</th>
                              <th className="text-right py-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lessons</th>
                              <th className="text-right py-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Active</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(studentTable?.students ?? []).length === 0 ? (
                              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No students yet.</td></tr>
                            ) : (studentTable?.students ?? []).map((s: any) => (
                              <tr key={s.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors" data-testid={`row-student-${s.id}`}>
                                <td className="py-2.5 px-2 font-medium">{s.displayName}</td>
                                <td className="py-2.5 px-2 text-muted-foreground">
                                  {s.joinedAt ? new Date(s.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                                </td>
                                <td className="py-2.5 px-2 text-right font-display font-bold text-amber-600">{(s.totalXp ?? 0).toLocaleString()}</td>
                                <td className="py-2.5 px-2 text-right">
                                  <span className="inline-flex items-center gap-1">
                                    <span className="font-bold">{s.lessonsCompleted}</span>
                                    <span className="text-muted-foreground">/ 9</span>
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 text-right text-muted-foreground">
                                  {s.lastActive ? new Date(s.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {studentTable?.total > 25 && (
                        <div className="flex items-center justify-between pt-2">
                          <p className="text-xs text-muted-foreground">
                            Page {studentTable?.page} of {Math.ceil((studentTable?.total ?? 0) / 25)}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                              disabled={studentPage <= 1}
                              data-testid="button-prev-page"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setStudentPage(p => p + 1)}
                              disabled={studentPage >= Math.ceil((studentTable?.total ?? 0) / 25)}
                              data-testid="button-next-page"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

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
