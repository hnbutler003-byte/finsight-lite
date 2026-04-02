import { OrgSidebar } from "@/components/layout/OrgSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, BookOpen, Globe, Copy, Check, Loader2, Building2, BarChart3 } from "lucide-react";
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Enrolled Students", value: overview?.stats?.studentCount ?? 0, icon: Users, color: "blue" },
                  { label: "Total Lessons", value: overview?.stats?.totalLessons ?? 0, icon: BookOpen, color: "indigo" },
                  { label: "Published Lessons", value: overview?.stats?.publishedLessons ?? 0, icon: BarChart3, color: "violet" },
                ].map(stat => (
                  <Card key={stat.label} className="glass-card rounded-glass">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30 flex items-center justify-center shrink-0`}>
                        <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{stat.value}</p>
                        <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
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
                      </div>
                    </CardContent>
                  </Card>

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
                </div>
              )}

              {overview?.org && (
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-6 space-y-3">
                    <h3 className="font-display font-bold text-lg">Organization Details</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
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
