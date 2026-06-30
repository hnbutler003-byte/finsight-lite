import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTeacherAuth } from "@/hooks/use-teacher-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Users, BookOpen, Plus, Copy, Check, Loader2, Trophy,
  ArrowRight, Sparkles, X, CheckCircle2, Circle, BookMarked, FlaskConical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ClassItem = {
  id: number; name: string; subject: string; code: string;
  sponsorName?: string; enrollmentCount: number; createdAt: string;
};

function CreateClassModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { teacher } = useTeacherAuth();
  const [form, setForm] = useState({ name: "", subject: "Financial Literacy", sponsorName: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, sponsorName: form.sponsorName || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/teacher/classes"] });
      toast({ title: "Class created!", description: "Your class code is ready to share." });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="console-card w-full max-w-md shadow-md" onClick={e => e.stopPropagation()}>
        <CardContent className="p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Plus className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="font-bold text-xl">Create a New Class</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Class Name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Grade 7 Financial Literacy"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                data-testid="input-class-name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Subject</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Financial Literacy"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                data-testid="input-class-subject" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Sponsor (optional)</label>
              <input value={form.sponsorName} onChange={e => setForm(f => ({ ...f, sponsorName: e.target.value }))}
                placeholder="e.g. Commonwealth Bank"
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                data-testid="input-class-sponsor" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-lg">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" data-testid="button-create-class-confirm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Class"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ClassCard({ cls }: { cls: ClassItem }) {
  const [copied, setCopied] = useState(false);

  const copyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(cls.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Link href={`/teacher/classes/${cls.id}`}>
      <Card className="console-card hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm transition-all cursor-pointer group">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-base group-hover:text-emerald-600 transition-colors">{cls.name}</h3>
              <p className="text-sm text-muted-foreground">{cls.subject}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all mt-0.5" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Class Code</p>
              <p className="console-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400">{cls.code}</p>
            </div>
            <button onClick={copyCode} className="p-3 rounded-lg border border-border hover:bg-muted transition-all" data-testid={`button-copy-code-${cls.id}`}>
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-medium">{cls.enrollmentCount} student{cls.enrollmentCount !== 1 ? "s" : ""}</span>
            </div>
            {cls.sponsorName && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium">{cls.sponsorName}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickLinksWidget({ onLessonsClick }: { onLessonsClick: () => void }) {
  const links = [
    {
      href: "/lessons",
      label: "Lessons library",
      description: "Browse curated learning content",
      icon: BookMarked,
      iconBg: "bg-teal-100 dark:bg-teal-900/30",
      iconColor: "text-teal-600 dark:text-teal-400",
      onClick: onLessonsClick,
      testId: "lessons",
    },
    {
      href: "/moneylab/upload",
      label: "MoneyLab Upload",
      description: "AI quiz generator for exam papers",
      icon: FlaskConical,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      onClick: undefined as (() => void) | undefined,
      testId: "moneylab-upload",
    },
  ];

  return (
    <Card className="console-card" data-testid="card-quick-links">
      <CardContent className="p-5 space-y-3">
        <p className="font-bold text-sm text-foreground">Quick links</p>
        <div className="space-y-1">
          {links.map(link => (
            <Link key={link.href} href={link.href} onClick={link.onClick}>
              <div
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-teal-300 dark:hover:border-teal-700 hover:bg-muted/30 transition-colors cursor-pointer group"
                data-testid={`link-quick-${link.testId}`}
              >
                <div className={`w-8 h-8 rounded-md ${link.iconBg} flex items-center justify-center shrink-0`}>
                  <link.icon className={`w-4 h-4 ${link.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground leading-snug">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeacherDashboard() {
  const { teacher, isLoading: authLoading } = useTeacherAuth();
  const [location, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [lessonsExplored, setLessonsExplored] = useState(false);

  const isClassesView = location === "/teacher/classes";

  const dismissKey = teacher ? `teacher_checklist_dismissed_${teacher.id}` : null;
  const lessonsKey = teacher ? `teacher_lessons_explored_${teacher.id}` : null;

  useEffect(() => {
    if (dismissKey) setChecklistDismissed(localStorage.getItem(dismissKey) === "true");
    if (lessonsKey) setLessonsExplored(localStorage.getItem(lessonsKey) === "true");
  }, [dismissKey, lessonsKey]);

  const dismissChecklist = () => {
    if (dismissKey) localStorage.setItem(dismissKey, "true");
    setChecklistDismissed(true);
  };

  const markLessonsExplored = () => {
    if (lessonsKey) {
      localStorage.setItem(lessonsKey, "true");
      setLessonsExplored(true);
    }
  };

  const { data: classes, isLoading } = useQuery<ClassItem[]>({
    queryKey: ["/api/teacher/classes"],
    queryFn: () => fetch("/api/teacher/classes", { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher,
  });

  const { data: allChallenges } = useQuery<unknown[]>({
    queryKey: ["/api/teacher/challenges"],
    queryFn: () => fetch("/api/teacher/challenges", { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher,
    select: (data: unknown) => Array.isArray(data) ? data as unknown[] : [],
  });
  const hasChallenges = (allChallenges?.length ?? 0) > 0;

  const totalStudents = classes?.reduce((s, c) => s + c.enrollmentCount, 0) ?? 0;

  const checklistItems = [
    { label: "Create your teacher account", done: true },
    { label: "Create your first class", done: (classes?.length ?? 0) > 0 },
    { label: "Add students to a class", done: totalStudents > 0 },
    { label: "Post a challenge or quiz", done: hasChallenges },
  ];
  const allChecklistComplete = checklistItems.every(item => item.done);

  useEffect(() => {
    if (allChecklistComplete && !checklistDismissed && dismissKey) {
      const timer = setTimeout(dismissChecklist, 1500);
      return () => clearTimeout(timer);
    }
  }, [allChecklistComplete, checklistDismissed]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!teacher) {
    setLocation("/teacher/login");
    return null;
  }

  const displayedClasses = isClassesView ? (classes ?? []) : (classes?.slice(0, 2) ?? []);
  const hasMoreClasses = !isClassesView && (classes?.length ?? 0) > 2;

  return (
    <div className="flex min-h-screen bg-background console">
      <TeacherSidebar />
      {showCreate && <CreateClassModal onClose={() => setShowCreate(false)} />}

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* PAGE HEADER */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {isClassesView ? (
                <>
                  <h1 className="font-display font-bold text-3xl">My Classes</h1>
                  <p className="text-muted-foreground mt-1">
                    {classes?.length ?? 0} class{classes?.length !== 1 ? "es" : ""}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="font-display font-bold text-3xl">Welcome back, {teacher.firstName}!</h1>
                  <p className="text-muted-foreground mt-1">{teacher.schoolName}</p>
                </>
              )}
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-5"
              data-testid="button-create-class"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Class
            </Button>
          </div>

          {/* DASHBOARD ONLY: getting started checklist + quick links */}
          {!isClassesView && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {!checklistDismissed && (
                <Card className="console-card border border-emerald-200 dark:border-emerald-800/50" data-testid="card-teacher-onboarding-checklist">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="font-bold text-sm text-foreground">Getting started</p>
                      <button
                        onClick={dismissChecklist}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 flex items-center gap-1"
                        data-testid="button-dismiss-teacher-checklist"
                      >
                        <X className="w-3 h-3" />
                        Skip for now
                      </button>
                    </div>
                    <div className="space-y-2">
                      {checklistItems.map(item => (
                        <div key={item.label} className="flex items-center gap-2.5">
                          {item.done
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            : <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                          <span className={`text-sm ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                    <a href="/teacher/help" className="inline-block mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline">Need help? View the Help Center</a>
                  </CardContent>
                </Card>
              )}

              <div className={checklistDismissed ? "max-w-sm" : ""}>
                <QuickLinksWidget onLessonsClick={markLessonsExplored} />
              </div>
            </div>
          )}

          {/* DASHBOARD ONLY: stats overview */}
          {!isClassesView && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Total Classes", value: classes?.length ?? 0, icon: BookOpen, color: "emerald" },
                { label: "Total Students", value: totalStudents, icon: Users, color: "blue" },
                { label: "Active Challenges", value: allChallenges?.length ?? 0, icon: Trophy, color: "amber" },
              ].map(stat => (
                <Card key={stat.label} className="console-card">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30 flex items-center justify-center shrink-0`}>
                      <stat.icon className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* CLASSES */}
          <div className="space-y-4">
            {!isClassesView && (
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-xl text-foreground">Your Classes</h2>
                <Link
                  href="/teacher/classes"
                  className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  data-testid="link-see-all-classes"
                >
                  {hasMoreClasses ? `See all ${classes?.length} classes` : "Manage classes"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
            ) : !classes?.length ? (
              <Card className="console-card border border-dashed border-border">
                <CardContent className="p-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                    <BookOpen className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">No classes yet</h3>
                    <p className="text-muted-foreground text-sm mt-1">Create your first class to get started</p>
                  </div>
                  <Button onClick={() => setShowCreate(true)} className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" data-testid="button-create-first-class">
                    <Plus className="w-4 h-4 mr-2" /> Create First Class
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedClasses.map(cls => <ClassCard key={cls.id} cls={cls} />)}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
