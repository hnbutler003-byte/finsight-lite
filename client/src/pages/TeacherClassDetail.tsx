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
  MessageSquarePlus, PiggyBank, Briefcase, FileText, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { generateTeacherCertificatesZip } from "@/lib/teacherCertificates";
import { generateImpactSummaryPdf } from "@/lib/impactSummary";
import {
  type QuizQuestion,
  type ContentFormSection,
  emptyQuestion,
  emptySection,
  buildContentSections,
  QuizEditor,
  ContentSectionEditor,
  MetaFields,
} from "@/components/lesson-editor";

function TeacherCreateLessonModal({ classId, onClose }: { classId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<"details" | "content" | "quiz">("details");
  const [loading, setLoading] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");
  const [subject, setSubject] = useState("Financial Literacy");
  const [gradeLevel, setGradeLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("45 minutes");
  const [videoUrl, setVideoUrl] = useState("");
  const [objectives, setObjectives] = useState<string[]>([""]);
  const [sections, setSections] = useState<ContentFormSection[]>([emptySection()]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()]);

  const invalidate = () => qc.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/my-lessons`] });

  const handleCreateLesson = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          instructor: instructor || undefined,
          subject: subject || undefined,
          gradeLevel: gradeLevel || undefined,
          topic: topic || undefined,
          duration: duration || undefined,
          videoUrl: videoUrl || undefined,
          objectives: objectives.map(o => o.trim()).filter(Boolean),
          contentSections: buildContentSections(sections),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const lesson = await res.json();
      setLessonId(lesson.id);
      setStep("quiz");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestions = async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const validQuestions = questions.filter(q => q.question && q.optionA && q.optionB && q.optionC && q.optionD);
      const results = await Promise.all(validQuestions.map(async (q, i) => {
        const res = await fetch(`/api/teacher/lessons/${lessonId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...q, orderIndex: i }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Unknown error" }));
          throw new Error(`Question ${i + 1}: ${err.message}`);
        }
        return res.json();
      }));
      invalidate();
      toast({ title: "Lesson created!", description: `Saved as a draft with ${results.length} quiz question${results.length !== 1 ? "s" : ""}. Publish it when you are ready.` });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error saving questions", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipQuestions = () => {
    invalidate();
    toast({ title: "Lesson created!", description: "Saved as a draft. You can publish it when you are ready." });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <Card className="rounded-3xl border-2 w-full max-w-lg shadow-2xl my-4" onClick={e => e.stopPropagation()}>
        <CardContent className="p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Plus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-xl">Create Class Lesson</h2>
              <p className="text-xs text-muted-foreground">
                {step === "details" ? "Step 1 of 3: Lesson details" : step === "content" ? "Step 2 of 3: Content sections" : "Step 3 of 3: Quiz questions (optional)"}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
            This lesson will only be visible to students in this class once you publish it.
          </p>

          {step === "details" && (
            <form onSubmit={e => { e.preventDefault(); setStep("content"); }} className="space-y-4">
              <MetaFields
                title={title} setTitle={setTitle}
                instructor={instructor} setInstructor={setInstructor}
                subject={subject} setSubject={setSubject}
                gradeLevel={gradeLevel} setGradeLevel={setGradeLevel}
                topic={topic} setTopic={setTopic}
                duration={duration} setDuration={setDuration}
                videoUrl={videoUrl} setVideoUrl={setVideoUrl}
                objectives={objectives} setObjectives={setObjectives}
              />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-2xl">Cancel</Button>
                <Button type="submit" disabled={!title} className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" data-testid="button-teacher-lesson-next-content">
                  Next: Content →
                </Button>
              </div>
            </form>
          )}

          {step === "content" && (
            <div className="space-y-4">
              <ContentSectionEditor sections={sections} setSections={setSections} />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep("details")} className="flex-1 rounded-2xl text-xs">← Back</Button>
                <Button
                  type="button"
                  disabled={loading}
                  onClick={handleCreateLesson}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  data-testid="button-teacher-create-lesson-confirm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next: Quiz →"}
                </Button>
              </div>
            </div>
          )}

          {step === "quiz" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Add multiple-choice quiz questions. Students will be scored on completion.</p>
              <QuizEditor questions={questions} setQuestions={setQuestions} />
              <Button type="button" variant="outline" onClick={() => setQuestions(qs => [...qs, emptyQuestion()])}
                className="w-full rounded-2xl border-dashed" data-testid="button-teacher-add-question">
                <Plus className="w-4 h-4 mr-2" /> Add Another Question
              </Button>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleSkipQuestions} className="flex-1 rounded-2xl text-xs" data-testid="button-teacher-skip-questions">
                  Skip for Now
                </Button>
                <Button type="button" disabled={loading} onClick={handleSaveQuestions}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  data-testid="button-teacher-save-questions">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Lesson"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
  const initials = s.name.trim().split(/\s+/).map((p: string) => p[0]?.toUpperCase() ?? "").slice(0, 2).join("");
  return (
    <button
      onClick={() => onSelect(s)}
      className="w-full flex items-center gap-4 console-row hover:bg-muted/30 transition-colors text-left group"
      data-testid={`button-student-${s.id}`}
    >
      <div className="console-avatar">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-sm">{s.name}</p>
          <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg font-bold">Lv {s.level}</span>
          {s.streak > 0 && <span className="text-xs text-muted-foreground">{s.streak}d</span>}
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
          <p className="console-mono text-sm text-foreground">{s.xp}</p>
          <p>XP</p>
        </div>
        <div className="text-center">
          <p className="console-mono text-sm text-foreground">{s.avgScore}%</p>
          <p>Avg</p>
        </div>
        <div className="text-center">
          <p className="console-mono text-sm text-foreground">{s.gamesPlayed}</p>
          <p>Games</p>
        </div>
        <div className="text-center">
          <p className="console-mono text-sm text-foreground">{s.badges}</p>
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
  const [showCreateLesson, setShowCreateLesson] = useState(false);
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
    enabled: !!teacher && (activeTab === "students" || activeTab === "analytics"),
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

  const { data: investData, isLoading: investLoading } = useQuery<any>({
    queryKey: [`/api/teacher/classes/${classId}/investment-analytics`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/investment-analytics`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "analytics",
  });

  const { data: orgLessons = [], isLoading: lessonsLoading } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${classId}/lessons`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/lessons`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "lessons" && !!cls?.envId,
  });

  const { data: myLessons = [], isLoading: myLessonsLoading } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${classId}/my-lessons`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/my-lessons`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "lessons" && !!cls?.envId,
  });

  const togglePublishLesson = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await fetch(`/api/teacher/lessons/${id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublished }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed"); }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/my-lessons`] });
      toast({ title: vars.isPublished ? "Lesson published" : "Lesson unpublished", description: vars.isPublished ? "Students in this class can now see it." : "It is now hidden from students." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teacher/lessons/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/my-lessons`] });
      toast({ title: "Lesson deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { data: insightsData, isLoading: insightsLoading } = useQuery<{
    fallingBehind: { count: number; students: string[] };
    lowestModule: { name: string; completionRate: number } | null;
    quietStreaks: { count: number; students: string[] };
  }>({
    queryKey: [`/api/teacher/classes/${classId}/insights`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/insights`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "analytics",
  });

  const { data: impactData } = useQuery<any>({
    queryKey: [`/api/teacher/classes/${classId}/impact-summary`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/impact-summary`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "analytics",
  });

  const { data: growthData, isLoading: growthLoading } = useQuery<any>({
    queryKey: [`/api/teacher/classes/${classId}/comprehension-growth`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/comprehension-growth`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "analytics",
  });

  const { data: corrData, isLoading: corrLoading } = useQuery<any>({
    queryKey: [`/api/teacher/classes/${classId}/simulator-correlation`],
    queryFn: () => fetch(`/api/teacher/classes/${classId}/simulator-correlation`, { credentials: "include" }).then(r => r.json()),
    enabled: !!teacher && activeTab === "analytics",
  });

  const TABS = cls?.envId ? [...BASE_TABS, LESSONS_TAB] : BASE_TABS;

  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [fallingBehindExpanded, setFallingBehindExpanded] = useState(false);
  const [quietStreaksExpanded, setQuietStreaksExpanded] = useState(false);
  const [certGenerating, setCertGenerating] = useState(false);

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

  const handleGenerateCerts = async () => {
    if (certGenerating || !progress?.students?.length) return;
    setCertGenerating(true);
    try {
      const tradeMap = new Map<string, number>();
      for (const row of (investData?.rows ?? [])) {
        tradeMap.set(row.studentId, row.trades ?? 0);
      }
      const certStudents = progress.students.map((s: StudentData) => ({
        name: s.name,
        xp: s.xp,
        lessonsCompleted: s.lessonsCompleted,
        trades: tradeMap.get(s.id) ?? 0,
        avgScore: s.avgScore ?? 0,
      }));
      await generateTeacherCertificatesZip(
        certStudents,
        cls?.name ?? "Class",
        teacher ? `${teacher.firstName} ${teacher.lastName}` : "Teacher",
        (cls as any)?.orgName ?? (cls as any)?.sponsorName ?? "FinSight Lite",
      );
    } catch (e) {
      console.error("Certificate generation failed:", e);
      toast({ title: "Failed to generate certificates", variant: "destructive" });
    } finally {
      setCertGenerating(false);
    }
  };

  const handleImpactSummary = async () => {
    if (!impactData) return;
    try {
      await generateImpactSummaryPdf({
        ...impactData,
        orgName: impactData.orgName ?? (cls as any)?.sponsorName ?? "FinSight Lite",
        firstJoinDate: impactData.firstJoinDate ?? null,
      });
    } catch (e) {
      console.error("Impact summary failed:", e);
      toast({ title: "Failed to generate impact summary", variant: "destructive" });
    }
  };

  const TYPE_ICONS: Record<string, string> = {
    announcement: "📢", reminder: "⏰", congratulations: "🎉",
    quiz: "📝", savings: "💰", investment: "📈", budget: "📊",
  };

  const RANK_ICONS = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex min-h-screen bg-background console">
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
                <span className="console-mono tracking-widest text-emerald-600">{cls?.code}</span>
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
                <Card className="console-card border border-dashed border-border">
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
                      <Card key={s.label} className="console-card">
                        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 text-center sm:text-left">
                          <s.icon className="w-5 h-5 text-emerald-500 shrink-0" />
                          <div>
                            <p className="console-mono text-base leading-tight">{s.value}</p>
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
                <Card className="console-card border border-dashed border-border">
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
                        <p className="console-mono text-base text-emerald-600">{s.xp} XP</p>
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
                <Card className="console-card border-dashed">
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
                      <Card key={c.id} className="console-card">
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
                <Card className="console-card border-dashed">
                  <CardContent className="p-10 text-center space-y-2">
                    <Bell className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="font-bold">No messages sent yet</p>
                    <p className="text-sm text-muted-foreground">Send announcements, reminders, or congratulations to your class</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {notifications.map(n => (
                    <Card key={n.id} className="console-card">
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
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="font-bold">My Class Lessons</h2>
                      <p className="text-xs text-muted-foreground">Lessons and quizzes you create here are only visible to students in this class.</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowCreateLesson(true)}
                    className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 gap-2"
                    data-testid="button-create-class-lesson"
                  >
                    <Plus className="w-4 h-4" /> Create Lesson
                  </Button>
                </div>
                {myLessonsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
                ) : myLessons.length === 0 ? (
                  <Card className="console-card border-dashed">
                    <CardContent className="p-8 text-center">
                      <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="font-bold">No class lessons yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Create your first lesson with an optional quiz. It stays as a draft until you publish it.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {myLessons.map((lesson: any) => (
                      <Card key={lesson.id} className="console-card" data-testid={`my-lesson-card-${lesson.id}`}>
                        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow shrink-0">
                            <BookMarked className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold truncate">{lesson.title}</h3>
                              {lesson.subject && (
                                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">{lesson.subject}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                              {lesson.grade_level && <span>Grade {lesson.grade_level}</span>}
                              {lesson.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration}</span>}
                              <span className="text-muted-foreground/60">{lesson.objectives?.length ?? 0} objectives · {lesson.content_sections?.length ?? 0} sections</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {lesson.is_published ? (
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-xl" data-testid={`status-lesson-${lesson.id}`}>Published</span>
                            ) : (
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-xl" data-testid={`status-lesson-${lesson.id}`}>Draft</span>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-2xl border-2 text-xs"
                              disabled={togglePublishLesson.isPending}
                              onClick={() => togglePublishLesson.mutate({ id: lesson.id, isPublished: !lesson.is_published })}
                              data-testid={`button-toggle-publish-${lesson.id}`}
                            >
                              {togglePublishLesson.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : lesson.is_published ? "Unpublish" : "Publish"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-2xl border-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              disabled={deleteLesson.isPending}
                              onClick={() => { if (window.confirm(`Delete "${lesson.title}"? This cannot be undone.`)) deleteLesson.mutate(lesson.id); }}
                              data-testid={`button-delete-lesson-${lesson.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

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
                <Card className="console-card border-dashed">
                  <CardContent className="p-10 text-center">
                    <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="font-bold">No lessons published yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Your organization hasn't published any lessons yet. Check back soon.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {orgLessons.map((lesson: any) => (
                    <Card key={lesson.id} className="console-card" data-testid={`lesson-card-${lesson.id}`}>
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

              {showCreateLesson && (
                <TeacherCreateLessonModal classId={classId} onClose={() => setShowCreateLesson(false)} />
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-4">
              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-2xl border-2 gap-2"
                  onClick={handleImpactSummary}
                  disabled={!impactData}
                  data-testid="button-impact-summary"
                >
                  <FileText className="w-4 h-4" />
                  Impact Summary PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-2xl border-2 gap-2"
                  onClick={handleGenerateCerts}
                  disabled={certGenerating || !progress?.students?.length}
                  data-testid="button-generate-certificates"
                >
                  {certGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                  {certGenerating ? "Generating..." : `Generate Certificates (${progress?.students?.length ?? 0})`}
                </Button>
              </div>

              {/* Insight cards */}
              {insightsLoading ? (
                <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
              ) : insightsData ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Falling Behind */}
                  <Card className="console-card border-amber-200 dark:border-amber-800">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="font-bold text-sm">Falling Behind</p>
                      </div>
                      <p className="console-mono text-2xl text-amber-600 dark:text-amber-400">
                        {insightsData.fallingBehind.count}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {insightsData.fallingBehind.count === 0
                          ? "All students active this week."
                          : `Student${insightsData.fallingBehind.count !== 1 ? "s" : ""} not active in 7+ days`}
                      </p>
                      {insightsData.fallingBehind.count > 0 && (
                        <button
                          onClick={() => setFallingBehindExpanded(v => !v)}
                          className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium"
                          data-testid="button-expand-falling-behind"
                        >
                          {fallingBehindExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {fallingBehindExpanded ? "Hide" : "See who"}
                        </button>
                      )}
                      {fallingBehindExpanded && (
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {insightsData.fallingBehind.students.map(name => (
                            <li key={name} className="truncate">{name}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  {/* Lowest Completion Module */}
                  <Card className="console-card border-violet-200 dark:border-violet-800">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-violet-500 shrink-0" />
                        <p className="font-bold text-sm">Needs Attention</p>
                      </div>
                      {insightsData.lowestModule ? (
                        <>
                          <p className="console-mono text-2xl text-violet-600 dark:text-violet-400">
                            {insightsData.lowestModule.completionRate}%
                          </p>
                          <p className="text-xs text-muted-foreground leading-snug">
                            Lowest completion: <span className="font-medium text-foreground">{insightsData.lowestModule.name}</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No lesson modules found.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quiet Streaks */}
                  <Card className="console-card border-teal-200 dark:border-teal-800">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-teal-500 shrink-0" />
                        <p className="font-bold text-sm">Quiet Streaks</p>
                      </div>
                      <p className="console-mono text-2xl text-teal-600 dark:text-teal-400">
                        {insightsData.quietStreaks.count}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {insightsData.quietStreaks.count === 0
                          ? "No streak resets this week."
                          : `Student${insightsData.quietStreaks.count !== 1 ? "s" : ""} with lapsed 3+ day streaks`}
                      </p>
                      {insightsData.quietStreaks.count > 0 && (
                        <button
                          onClick={() => setQuietStreaksExpanded(v => !v)}
                          className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-medium"
                          data-testid="button-expand-quiet-streaks"
                        >
                          {quietStreaksExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {quietStreaksExpanded ? "Hide" : "See who"}
                        </button>
                      )}
                      {quietStreaksExpanded && (
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {insightsData.quietStreaks.students.map(name => (
                            <li key={name} className="truncate">{name}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : null}

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
                      <Card key={s.label} className="console-card">
                        <CardContent className="p-4">
                          <p className="console-mono text-xl">{s.value}</p>
                          <p className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {analytics.topStudents?.length > 0 && (
                    <Card className="console-card">
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
                    <Card className="console-card border-dashed">
                      <CardContent className="p-10 text-center">
                        <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p className="font-bold">No analytics yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Analytics will appear once students join and play.</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Investment Simulator Analytics */}
              {investLoading && (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
              )}
              {!investLoading && investData && investData.totalStudents > 0 && (
                <div className="console space-y-0">
                  <div className="console-card p-4 space-y-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5" />
                      Investment Simulator
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Students Invested", value: `${investData.invested}/${investData.totalStudents}` },
                        { label: "Avg Stocks Held", value: investData.avgDistinctStocks },
                        { label: "Well Diversified (3+)", value: String(investData.diversifiedCount) },
                        { label: "Most Active Trader", value: investData.topTrader ? `${investData.topTrader.trades} trades` : "None yet" },
                      ].map(m => (
                        <div key={m.label} className="console-card p-3">
                          <p className="console-mono text-base">{m.value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                        </div>
                      ))}
                    </div>

                    {investData.rows.length > 0 && (
                      <div>
                        <div className="console-table-header grid grid-cols-5 px-3 py-2 text-xs">
                          <span className="col-span-2">Student</span>
                          <span className="text-right">Net Worth</span>
                          <span className="text-right">Gain/Loss</span>
                          <span className="text-right">Trades</span>
                        </div>
                        {investData.rows.slice(0, 12).map((row: any) => (
                          <div
                            key={row.studentId}
                            className="console-row grid grid-cols-5 px-3 text-sm"
                            data-testid={`row-invest-${row.studentId}`}
                          >
                            <span className="col-span-2 truncate">{row.name}</span>
                            <span className="console-mono text-right">
                              {parseFloat(row.netWorth).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className={`console-mono text-right ${parseFloat(row.gainLoss) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {parseFloat(row.gainLoss) >= 0 ? "+" : ""}{parseFloat(row.gainLoss).toFixed(0)} ({row.gainLossPct}%)
                            </span>
                            <span className="console-mono text-right">{row.trades}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {investData.invested === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        No students have traded yet. Portfolio activity will appear here once they do.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Comprehension Growth ── */}
              {growthLoading && (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
              )}
              {!growthLoading && growthData && (
                <div className="glass-card p-5 space-y-4" style={{ borderRadius: "var(--radius-glass)" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                    <h3 className="font-bold text-sm text-foreground">Comprehension Growth</h3>
                    <span className="text-xs text-muted-foreground ml-auto">First vs. latest quiz attempt per module</span>
                  </div>

                  {growthData.modules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-growth-empty">
                      Growth data will appear once students have completed the same module quiz more than once.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {growthData.modules.map((mod: any) => (
                          <div key={mod.slug} className="rounded-[var(--radius-glass)] bg-muted/30 border border-border/50 p-3 space-y-1" data-testid={`card-module-growth-${mod.slug}`}>
                            <p className="text-xs font-medium text-muted-foreground truncate">{mod.title}</p>
                            <p className={`text-lg font-bold console-mono ${mod.avgDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {mod.avgDelta >= 0 ? "+" : ""}{mod.avgDelta}%
                            </p>
                            <p className="text-xs text-muted-foreground">{mod.studentCount} student{mod.studentCount !== 1 ? "s" : ""}</p>
                          </div>
                        ))}
                      </div>

                      {growthData.students.length > 0 && (
                        <div className="overflow-hidden rounded-[var(--radius-glass)] border border-border/50">
                          <div className="grid grid-cols-5 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                            <span className="col-span-2">Student</span>
                            <span className="text-right">Module</span>
                            <span className="text-right">First</span>
                            <span className="text-right">Latest</span>
                          </div>
                          {growthData.students.slice(0, 15).map((row: any, i: number) => (
                            <div
                              key={`${row.studentId}-${row.moduleSlug}-${i}`}
                              className="grid grid-cols-5 px-3 py-2 text-sm border-t border-border/30 hover:bg-muted/20 transition-colors"
                              data-testid={`row-growth-${row.studentId}-${row.moduleSlug}`}
                            >
                              <span className="col-span-2 truncate text-foreground">{row.name}</span>
                              <span className="truncate text-right text-xs text-muted-foreground">{row.moduleTitle}</span>
                              <span className="console-mono text-right text-muted-foreground">{row.firstScore}%</span>
                              <span className={`console-mono text-right font-bold ${row.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : row.delta < 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                                {row.delta > 0 ? "+" : ""}{row.lastScore}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Practice to Performance ── */}
              {corrLoading && (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
              )}
              {!corrLoading && corrData && corrData.totalStudents > 0 && (
                <div className="glass-card p-5 space-y-4" style={{ borderRadius: "var(--radius-glass)" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Zap className="w-4 h-4 text-violet-500 shrink-0" />
                    <h3 className="font-bold text-sm text-foreground">Practice to Performance</h3>
                    <span className="text-xs text-muted-foreground ml-auto">Simulator engagement vs. quiz scores</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-[var(--radius-glass)] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 space-y-1" data-testid="card-active-traders">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">3+ Trades</p>
                      </div>
                      <p className="text-3xl font-bold console-mono text-foreground" data-testid="text-active-count">{corrData.activeGroup.count}</p>
                      <p className="text-xs text-muted-foreground">students</p>
                      {corrData.activeGroup.avgQuizScore != null ? (
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 pt-1" data-testid="text-active-score">
                          {corrData.activeGroup.avgQuizScore}% avg quiz score
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground pt-1">No quiz data yet</p>
                      )}
                    </div>

                    <div className="rounded-[var(--radius-glass)] bg-muted/40 border border-border p-4 space-y-1" data-testid="card-less-active-traders">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Fewer than 3</p>
                      </div>
                      <p className="text-3xl font-bold console-mono text-foreground" data-testid="text-less-active-count">{corrData.lessActiveGroup.count}</p>
                      <p className="text-xs text-muted-foreground">students</p>
                      {corrData.lessActiveGroup.avgQuizScore != null ? (
                        <p className="text-sm font-semibold text-foreground pt-1" data-testid="text-less-active-score">
                          {corrData.lessActiveGroup.avgQuizScore}% avg quiz score
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground pt-1">No quiz data yet</p>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Students who practise with the Investment Simulator regularly tend to score higher on quizzes.
                  </p>
                </div>
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
        <DialogContent className="max-w-lg console-card border-0 p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-2xl shrink-0">
                {AVATAR_MAP[selectedStudent?.avatar ?? ""] || "🧑‍🎓"}
              </div>
              <div>
                <DialogTitle className="font-bold text-base">{selectedStudent?.name}</DialogTitle>
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
                  <p className="console-mono text-sm">{s.value}</p>
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
