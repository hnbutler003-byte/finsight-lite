import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTeacherAuth } from "@/hooks/use-teacher-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  Users, BookOpen, Plus, Copy, Check, Loader2, Trophy, BarChart3,
  GraduationCap, ArrowRight, Sparkles
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
      <Card className="rounded-3xl border-2 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <CardContent className="p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Plus className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="font-display font-bold text-xl">Create a New Class</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Class Name</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Grade 7 Financial Literacy"
                className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                data-testid="input-class-name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Subject</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Financial Literacy"
                className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                data-testid="input-class-subject" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">Sponsor (optional)</label>
              <input value={form.sponsorName} onChange={e => setForm(f => ({ ...f, sponsorName: e.target.value }))}
                placeholder="e.g. Commonwealth Bank"
                className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                data-testid="input-class-sponsor" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-2xl">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" data-testid="button-create-class-confirm">
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
      <Card className="rounded-3xl border-2 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all cursor-pointer group">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg group-hover:text-emerald-600 transition-colors">{cls.name}</h3>
              <p className="text-sm text-muted-foreground font-medium">{cls.subject}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all mt-1" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-800">
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Class Code</p>
              <p className="font-display font-bold text-xl tracking-widest text-emerald-600">{cls.code}</p>
            </div>
            <button onClick={copyCode} className="p-3 rounded-2xl border-2 border-emerald-100 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all" data-testid={`button-copy-code-${cls.id}`}>
              {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-medium">{cls.enrollmentCount} student{cls.enrollmentCount !== 1 ? "s" : ""}</span>
            </div>
            {cls.sponsorName && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium">{cls.sponsorName}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function TeacherDashboard() {
  const { teacher, isLoading: authLoading } = useTeacherAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);

  const { data: classes, isLoading } = useQuery<ClassItem[]>({
    queryKey: ["/api/teacher/classes"],
    queryFn: () => fetch("/api/teacher/classes", { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher,
  });

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

  const totalStudents = classes?.reduce((s, c) => s + c.enrollmentCount, 0) ?? 0;

  return (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar />
      {showCreate && <CreateClassModal onClose={() => setShowCreate(false)} />}

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display font-bold text-3xl">Welcome back, {teacher.firstName}!</h1>
              <p className="text-muted-foreground mt-1">{teacher.schoolName}</p>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg px-6"
              data-testid="button-create-class"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Class
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Classes", value: classes?.length ?? 0, icon: BookOpen, color: "emerald" },
              { label: "Total Students", value: totalStudents, icon: Users, color: "blue" },
              { label: "Active Challenges", value: "—", icon: Trophy, color: "amber" },
            ].map(stat => (
              <Card key={stat.label} className="rounded-3xl border-2">
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl">Your Classes</h2>
              <span className="text-sm text-muted-foreground font-medium">{classes?.length ?? 0} class{classes?.length !== 1 ? "es" : ""}</span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
            ) : !classes?.length ? (
              <Card className="rounded-3xl border-2 border-dashed">
                <CardContent className="p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                    <BookOpen className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg">No classes yet</h3>
                    <p className="text-muted-foreground text-sm mt-1">Create your first class to get started</p>
                  </div>
                  <Button onClick={() => setShowCreate(true)} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" data-testid="button-create-first-class">
                    <Plus className="w-4 h-4 mr-2" /> Create First Class
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map(cls => <ClassCard key={cls.id} cls={cls} />)}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
