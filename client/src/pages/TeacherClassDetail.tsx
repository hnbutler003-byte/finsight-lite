import { TeacherSidebar } from "@/components/layout/TeacherSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTeacherAuth } from "@/hooks/use-teacher-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { useState } from "react";
import {
  ArrowLeft, Users, Trophy, Bell, BarChart3, Loader2, Copy, Check,
  Download, Trash2, Plus, Medal, Star, BookOpen, Gamepad2, Zap, Target,
  Send, Crown, TrendingUp, AlertCircle, Sparkles, BookMarked, GraduationCap, Clock,
  MessageSquarePlus, PiggyBank
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const AVATAR_MAP: Record<string, string> = {
  lion: "🦁", dolphin: "🐬", parrot: "🦜", turtle: "🐢",
  star: "⭐", butterfly: "🦋", octopus: "🐙", artist: "🎨",
  rocket: "🚀", wave: "🌊", palm: "🌴", gamer: "🎮",
};

type StudentData = {
  id: string; name: string; avatar: string; username: string;
  xp: number; level: number; streak: number;
  lessonsCompleted: number; totalLessons: number;
  gamesPlayed: number; avgScore: number; badges: number;
  savingsGoalCount: number; savingsGoalsComplete: number;
  savingsTopGoalName: string | null; savingsTopGoalPct: number | null;
};

type Challenge = {
  id: number; title: string; description: string; type: string;
  startDate: string; endDate: string; targetValue?: string;
};

type Notification = {
  id: number; title: string; message: string; type: string; createdAt: string;
};

const BASE_TABS = [
  { id: "students", label: "Students", icon: Users },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "challenges", label: "Challenges", icon: Target },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];
const LESSONS_TAB = { id: "lessons", label: "Lessons", icon: BookMarked };

type FeedbackItem = { id: number; message: string; createdAt: string; teacherName: string };

function StudentRow({ s, onSelect }: { s: StudentData; onSelect: (s: StudentData) => void }) {
  const pct = Math.round((s.lessonsCompleted / s.totalLessons) * 100);
  return (
    <button
      onClick={() => onSelect(s)}
      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all text-left group"
      data-testid={`button-student-${s.id}`}
    >
      <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xl shrink-0">
        {AVATAR_MAP[s.avatar] || "🧑‍🎓"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-sm">{s.name}</p>
          <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg font-bold">Lv {s.level}</span>
          {s.streak > 0 && <span className="text-xs text-amber-600 font-bold">🔥 {s.streak}</span>}
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden w-full max-w-[200px]">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{s.lessonsCompleted}/{s.totalLessons} lessons</p>
        {s.savingsGoalCount > 0 && (
          <div className="mt-1.5 flex items-center gap-2 flex-wrap" data-testid={`savings-summary-${s.id}`}>
            <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
              <PiggyBank className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {s.savingsGoalCount} {s.savingsGoalCount === 1 ? "goal" : "goals"}
              {` \u00b7 ${s.savingsGoalsComplete} complete`}
            </span>
            {s.savingsTopGoalPct !== null && (
              <span
                className="flex items-center gap-1.5"
                title={s.savingsTopGoalName ? `${s.savingsTopGoalName}: ${s.savingsTopGoalPct}%` : undefined}
              >
                <span className="h-1.5 rounded-full bg-muted overflow-hidden w-16 inline-block">
                  <span className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full block" style={{ width: `${s.savingsTopGoalPct}%` }} />
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{s.savingsTopGoalPct}%</span>
              </span>
            )}
          </div>
        )}
      </div>
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <div className="text-center">
          <p className="font-display font-bold text-base text-foreground">{s.xp}</p>
          <p>XP</p>
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-base text-foreground">{s.avgScore}%</p>
          <p>Avg</p>
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-base text-foreground">{s.gamesPlayed}</p>
          <p>Games</p>
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-base text-foreground">{s.badges}</p>
          <p>Badges</p>
        </div>
      </div>
      <MessageSquarePlus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

function ChallengeForm({ classId, onDone }: { classId: number; onDone: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "", description: "", type: "quiz",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    targetValue: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      qc.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/challenges`] });
      toast({ title: "Challenge created!" });
      onDone();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10">
      <h3 className="font-bold text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-600" /> New Challenge</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <input required value={form.title} onChange={set("title")} placeholder="Challenge title..."
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400" data-testid="input-challenge-title" />
        </div>
        <div className="sm:col-span-2">
          <textarea required value={form.description} onChange={set("description")} rows={2} placeholder='e.g. "Turn $100 into $1000 in the simulator!"'
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" data-testid="input-challenge-desc" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Type</label>
          <select value={form.type} onChange={set("type")} className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400" data-testid="select-challenge-type">
            <option value="quiz">Quiz</option>
            <option value="savings">Savings</option>
            <option value="investment">Investment</option>
            <option value="budget">Budget</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Target (optional)</label>
          <input value={form.targetValue} onChange={set("targetValue")} placeholder="e.g. 1000" type="number" step="any"
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Start Date</label>
          <input type="date" value={form.startDate} onChange={set("startDate")}
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">End Date</label>
          <input type="date" value={form.endDate} onChange={set("endDate")}
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onDone} className="rounded-2xl flex-1">Cancel</Button>
        <Button type="submit" disabled={loading} className="rounded-2xl flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" data-testid="button-submit-challenge">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Challenge"}
        </Button>
      </div>
    </form>
  );
}

function NotificationForm({ classId, onDone }: { classId: number; onDone: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", message: "", type: "announcement" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      qc.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/notifications`] });
      toast({ title: "Message sent!" });
      setForm({ title: "", message: "", type: "announcement" });
      onDone();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const TYPE_COLORS: Record<string, string> = {
    announcement: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    reminder: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    congratulations: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10">
      <h3 className="font-bold text-sm flex items-center gap-2"><Send className="w-4 h-4 text-blue-600" /> New Message</h3>
      <div className="flex gap-2">
        {["announcement", "reminder", "congratulations"].map(t => (
          <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${form.type === t ? TYPE_COLORS[t] + " border-current" : "border-transparent text-muted-foreground hover:bg-muted"}`}>
            {t === "announcement" ? "📢 Announcement" : t === "reminder" ? "⏰ Reminder" : "🎉 Congrats"}
          </button>
        ))}
      </div>
      <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Message title..."
        className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400" data-testid="input-notification-title" />
      <textarea required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={3} placeholder="Write your message to the class..."
        className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" data-testid="input-notification-message" />
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onDone} className="rounded-2xl flex-1">Cancel</Button>
        <Button type="submit" disabled={loading} className="rounded-2xl flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" data-testid="button-send-notification">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" /> Send</>}
        </Button>
      </div>
    </form>
  );
}

export default function TeacherClassDetail() {
  const { teacher, isLoading: authLoading } = useTeacherAuth();
  const params = useParams<{ id: string }>();
  const classId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("students");
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: cls, isLoading: clsLoading } = useQuery<any>({
    queryKey: [`/api/teacher/classes/${classId}`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher,
  });

  const { data: progress, isLoading: progressLoading } = useQuery<{ students: StudentData[]; avgXp: number; avgLessons: number; totalGames: number }>({
    queryKey: [`/api/teacher/classes/${classId}/students`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/students?limit=200`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "students",
  });

  const { data: leaderboard, isLoading: lbLoading } = useQuery<StudentData[]>({
    queryKey: [`/api/teacher/classes/${classId}/leaderboard`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/leaderboard`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "leaderboard",
  });

  const { data: challenges, isLoading: challLoading } = useQuery<Challenge[]>({
    queryKey: [`/api/teacher/classes/${classId}/challenges`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/challenges`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "challenges",
  });

  const { data: notifications, isLoading: notifLoading } = useQuery<Notification[]>({
    queryKey: [`/api/teacher/classes/${classId}/notifications`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/notifications`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "notifications",
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: [`/api/teacher/classes/${classId}/analytics`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/analytics`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "analytics",
  });

  const { data: orgLessons = [], isLoading: lessonsLoading } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${classId}/lessons`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/lessons`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "lessons" && !!cls?.envId,
  });

  const TABS = cls?.envId ? [...BASE_TABS, LESSONS_TAB] : BASE_TABS;

  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const { data: studentFeedback = [], isLoading: feedbackLoading } = useQuery<FeedbackItem[]>({
    queryKey: [`/api/teacher/feedback`, selectedStudent?.id],
    queryFn: () => fetch(`/api/teacher/feedback/${selectedStudent!.id}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedStudent,
  });

  const submitFeedback = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch("/api/teacher/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentId: selectedStudent!.id, classId, message }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/teacher/feedback`, selectedStudent?.id] });
      setFeedbackMessage("");
      toast({ title: "Feedback sent", description: `Your note was saved for ${selectedStudent?.name}.` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteChallenge = useMutation({
    mutationFn: (id: number) => fetch(`/api/teacher/challenges/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/challenges`] }),
  });

  const deleteNotif = useMutation({
    mutationFn: (id: number) => fetch(`/api/teacher/notifications/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/notifications`] }),
  });

  if (authLoading || clsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!teacher) { setLocation("/teacher/login"); return null; }

  const copyCode = () => {
    if (cls?.code) { navigator.clipboard.writeText(cls.code); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const downloadCSV = () => {
    window.open(`/api/teacher/classes/${classId}/report.csv`, "_blank");
  };

  const TYPE_ICONS: Record<string, string> = {
    announcement: "📢", reminder: "⏰", congratulations: "🎉",
    quiz: "📝", savings: "💰", investment: "📈", budget: "📊",
  };

  const RANK_ICONS = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex min-h-screen bg-background">
      <TeacherSidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-start gap-4 flex-wrap">
            <Link href="/teacher/dashboard">
              <Button variant="outline" size="icon" className="rounded-2xl border-2 shrink-0" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-2xl truncate">{cls?.name}</h1>
              <p className="text-muted-foreground text-sm">{cls?.subject}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl px-4 py-2 border border-emerald-100 dark:border-emerald-800">
                <span className="font-display font-bold text-lg tracking-widest text-emerald-600">{cls?.code}</span>
                <button onClick={copyCode} className="text-muted-foreground hover:text-emerald-600 p-1" data-testid="button-copy-code">
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <Button variant="outline" onClick={downloadCSV} className="rounded-2xl border-2 gap-2" data-testid="button-download-report">
                <Download className="w-4 h-4" /> Report
              </Button>
            </div>
          </div>

          {cls?.sponsorName && (
            <div className="flex items-center gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-sm font-medium">
                <span className="text-muted-foreground">Financial Literacy powered by </span>
                <span className="font-bold text-amber-700 dark:text-amber-400">{cls.sponsorName}</span>
              </p>
            </div>
          )}

          <div className="flex overflow-x-auto gap-2 pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap border-2 transition-all ${
                  activeTab === tab.id
                    ? "bg-emerald-600 text-white border-emerald-600 shadow"
                    : "border-input text-muted-foreground hover:border-emerald-300 hover:text-foreground"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "students" && (
            <div className="space-y-4">
              {progressLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
              ) : !progress?.students.length ? (
                <Card className="glass-card rounded-glass border-dashed">
                  <CardContent className="p-10 text-center space-y-2">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="font-bold">No students yet</p>
                    <p className="text-sm text-muted-foreground">Share the class code <span className="font-bold text-emerald-600">{cls?.code}</span> so students can join.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Students", value: progress.students.length, icon: Users },
                      { label: "Avg XP", value: progress.avgXp, icon: Zap },
                      { label: "Total Games", value: progress.totalGames, icon: Gamepad2 },
                    ].map(s => (
                      <Card key={s.label} className="glass-card rounded-glass">
                        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 text-center sm:text-left">
                          <s.icon className="w-5 h-5 text-emerald-500 shrink-0" />
                          <div>
                            <p className="font-display font-bold text-lg leading-tight">{s.value}</p>
                            <p className="text-xs text-muted-foreground font-medium leading-tight">{s.label}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {progress.students.map(s => <StudentRow key={s.id} s={s} onSelect={setSelectedStudent} />)}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div className="space-y-3">
              {lbLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
              ) : !leaderboard?.length ? (
                <Card className="glass-card rounded-glass border-dashed">
                  <CardContent className="p-10 text-center">
                    <Trophy className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="font-bold">No students on the leaderboard yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((s, i) => (
                    <div key={s.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${i === 0 ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800" : i === 1 ? "border-zinc-200 bg-zinc-50/50 dark:bg-zinc-900/10" : i === 2 ? "border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 dark:border-orange-800" : "border-input"}`}>
                      <span className="text-2xl w-8 shrink-0 text-center">{RANK_ICONS[i] || `#${i + 1}`}</span>
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-lg shrink-0">
                        {AVATAR_MAP[s.avatar] || "🧑‍🎓"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">Level {s.level}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display font-bold text-lg text-emerald-600">{s.xp} XP</p>
                        <p className="text-xs text-muted-foreground">{s.badges} badge{s.badges !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "challenges" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                {!showChallengeForm && (
                  <Button onClick={() => setShowChallengeForm(true)} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" data-testid="button-new-challenge">
                    <Plus className="w-4 h-4 mr-2" /> New Challenge
                  </Button>
                )}
              </div>
              {showChallengeForm && <ChallengeForm classId={classId} onDone={() => setShowChallengeForm(false)} />}
              {challLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
              ) : !challenges?.length ? (
                <Card className="rounded-3xl border-2 border-dashed">
                  <CardContent className="p-10 text-center space-y-2">
                    <Target className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="font-bold">No challenges yet</p>
                    <p className="text-sm text-muted-foreground">Create a challenge to motivate your students!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {challenges.map(c => {
                    const now = new Date();
                    const end = new Date(c.endDate);
                    const active = now <= end;
                    return (
                      <Card key={c.id} className="rounded-2xl border-2">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{TYPE_ICONS[c.type] || "📝"}</span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold">{c.title}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-zinc-100 text-zinc-500"}`}>
                                    {active ? "Active" : "Ended"}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">{c.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(c.startDate).toLocaleDateString()} → {new Date(c.endDate).toLocaleDateString()}
                                  {c.targetValue && <span className="ml-2 font-bold">Target: {c.targetValue}</span>}
                                </p>
                              </div>
                            </div>
                            <button onClick={() => deleteChallenge.mutate(c.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1 shrink-0" data-testid={`button-delete-challenge-${c.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                {!showNotifForm && (
                  <Button onClick={() => setShowNotifForm(true)} className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" data-testid="button-new-notification">
                    <Send className="w-4 h-4 mr-2" /> Send Message
                  </Button>
                )}
              </div>
              {showNotifForm && <NotificationForm classId={classId} onDone={() => setShowNotifForm(false)} />}
              {notifLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
              ) : !notifications?.length ? (
                <Card className="rounded-3xl border-2 border-dashed">
                  <CardContent className="p-10 text-center space-y-2">
                    <Bell className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="font-bold">No messages sent yet</p>
                    <p className="text-sm text-muted-foreground">Send announcements, reminders, or congratulations to your class</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {notifications.map(n => (
                    <Card key={n.id} className="rounded-2xl border-2">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{TYPE_ICONS[n.type] || "📢"}</span>
                            <div>
                              <p className="font-bold">{n.title}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          <button onClick={() => deleteNotif.mutate(n.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1 shrink-0" data-testid={`button-delete-notif-${n.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "lessons" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <BookMarked className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="font-bold">Org Lesson Plans</h2>
                  <p className="text-xs text-muted-foreground">Published lessons from your linked organization. Share with students.</p>
                </div>
              </div>
              {lessonsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-teal-500" /></div>
              ) : orgLessons.length === 0 ? (
                <Card className="rounded-3xl border-2 border-dashed">
                  <CardContent className="p-10 text-center">
                    <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="font-bold">No lessons published yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Your organization hasn't published any lessons yet. Check back soon.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {orgLessons.map((lesson: any) => (
                    <Card key={lesson.id} className="rounded-2xl border-2" data-testid={`lesson-card-${lesson.id}`}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow shrink-0">
                          <BookMarked className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold truncate">{lesson.title}</h3>
                            {lesson.subject && (
                              <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-medium">{lesson.subject}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            {lesson.instructor && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{lesson.instructor}</span>}
                            {lesson.grade_level && <span>Grade {lesson.grade_level}</span>}
                            {lesson.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration}</span>}
                            <span className="text-muted-foreground/60">{lesson.objectives?.length ?? 0} objectives · {lesson.content_sections?.length ?? 0} sections</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-xl shrink-0">Published</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-4">
              {analyticsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
              ) : !analytics ? null : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Avg Quiz Score", value: `${analytics.avgScore}%`, icon: BarChart3, color: "blue" },
                      { label: "Avg Lessons Done", value: `${analytics.avgLessons}/6`, icon: BookOpen, color: "emerald" },
                      { label: "Engagement Rate", value: `${analytics.engagementRate}%`, icon: TrendingUp, color: "violet" },
                      { label: "Total Games", value: analytics.totalGames, icon: Gamepad2, color: "amber" },
                    ].map(s => (
                      <Card key={s.label} className="rounded-2xl border-2">
                        <CardContent className="p-4">
                          <p className="text-xl font-display font-bold">{s.value}</p>
                          <p className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {analytics.topStudents?.length > 0 && (
                    <Card className="rounded-3xl border-2">
                      <CardContent className="p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> Top Students</h3>
                        <div className="space-y-3">
                          {analytics.topStudents.map((s: StudentData, i: number) => (
                            <div key={s.id} className="flex items-center gap-3">
                              <span className="text-xl">{RANK_ICONS[i]}</span>
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-base">
                                {AVATAR_MAP[s.avatar] || "🧑‍🎓"}
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-sm">{s.name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden flex-1 max-w-[120px]">
                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${Math.min(100, (s.xp / 1000) * 100)}%` }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground">{s.xp} XP</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {analytics.totalStudents === 0 && (
                    <Card className="rounded-3xl border-2 border-dashed">
                      <CardContent className="p-10 text-center">
                        <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p className="font-bold">No analytics yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Analytics will appear once students join and play.</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Student Feedback Dialog ── */}
      <Dialog
        open={!!selectedStudent}
        onOpenChange={(open) => { if (!open) { setSelectedStudent(null); setFeedbackMessage(""); } }}
      >
        <DialogContent className="max-w-lg glass-card rounded-glass border-0 p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-2xl shrink-0">
                {AVATAR_MAP[selectedStudent?.avatar ?? ""] || "🧑‍🎓"}
              </div>
              <div>
                <DialogTitle className="font-display font-bold text-lg">{selectedStudent?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Level {selectedStudent?.level} · {selectedStudent?.xp} XP
                  {(selectedStudent?.streak ?? 0) > 0 && <span className="ml-2">🔥 {selectedStudent?.streak}</span>}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Avg Score", value: `${selectedStudent?.avgScore ?? 0}%` },
                { label: "Games", value: selectedStudent?.gamesPlayed ?? 0 },
                { label: "Badges", value: selectedStudent?.badges ?? 0 },
              ].map(s => (
                <div key={s.label} className="rounded-2xl bg-muted/30 p-3 text-center">
                  <p className="font-display font-bold text-base">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Feedback History */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <MessageSquarePlus className="w-3.5 h-3.5" /> Previous Notes
              </p>
              {feedbackLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
              ) : studentFeedback.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3 rounded-2xl bg-muted/20">No notes yet. Add the first one below.</p>
              ) : (
                <div className="space-y-2">
                  {studentFeedback.map(fb => (
                    <div key={fb.id} className="rounded-2xl border border-border/50 p-3 bg-muted/20" data-testid={`feedback-history-${fb.id}`}>
                      <p className="text-xs text-muted-foreground mb-1">{format(new Date(fb.createdAt), 'MMM d, yyyy · h:mm a')}</p>
                      <p className="text-sm text-foreground">{fb.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* New Feedback Form */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add a note</p>
              <Textarea
                placeholder={`Write feedback for ${selectedStudent?.name}...`}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                className="card-input rounded-2xl resize-none min-h-[90px]"
                data-testid="textarea-feedback-message"
              />
              <Button
                onClick={() => { if (feedbackMessage.trim()) submitFeedback.mutate(feedbackMessage.trim()); }}
                disabled={!feedbackMessage.trim() || submitFeedback.isPending}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold gap-2"
                data-testid="button-submit-feedback"
              >
                {submitFeedback.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
