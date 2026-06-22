import { useVideoEmbed } from "@/hooks/use-video-embed";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, BookOpen, CheckCircle2, XCircle, Trophy,
  Star, Award, Loader2, ChevronRight, Clock, GraduationCap,
  Target, ListChecks, BookMarked, KeyRound, PiggyBank,
  TrendingUp, Wallet, Lightbulb, ShoppingCart, BarChart3,
  Layers, ChevronDown, ChevronUp, Play, Lock, Download, Video,
  Globe, Smartphone, Shield,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { jsPDF } from "jspdf";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { generateFinancialAcademyCertificate } from "@/lib/financialAcademyCertificate";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentSection = { heading: string; body: string; examples?: string[] };
type QuizQuestion = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  order_index: number;
};
type Lesson = {
  id: string;
  org_id: string;
  org_name?: string | null;
  org_logo_url?: string | null;
  org_signature_left_name?: string | null;
  org_signature_left_role?: string | null;
  org_signature_right_name?: string | null;
  org_signature_right_role?: string | null;
  title: string;
  instructor?: string;
  subject?: string;
  grade_level?: string;
  topic?: string;
  duration?: string;
  video_url?: string | null;
  objectives: string[];
  content_sections: ContentSection[];
  is_published: boolean;
  created_at: string;
};

const FINANCIAL_ACADEMY_NAME = "The Financial Academy";

function isFinancialAcademyLesson(lesson: Lesson | null): boolean {
  if (!lesson) return false;
  if (lesson.org_id?.startsWith("static")) return false;
  const name = lesson.org_name?.trim().toLowerCase();
  return name === FINANCIAL_ACADEMY_NAME.toLowerCase();
}

type LessonWithQuestions = Lesson & { questions: QuizQuestion[]; isStatic?: boolean };

type PageState = "list" | "reading" | "quiz" | "results";

const OPTIONS: ("option_a" | "option_b" | "option_c" | "option_d")[] = ["option_a", "option_b", "option_c", "option_d"];
const LETTERS = ["A", "B", "C", "D"];

// ─── Static Module Types & Visual Config (content loaded from API) ────────────

type StaticLessonFromAPI = {
  id: string;
  static_lesson_id: string;
  title: string;
  description: string;
  duration: string | null;
  video_url: string | null;
  objectives: string[];
  content_sections: ContentSection[];
  questions: QuizQuestion[];
};

type StaticModuleFromAPI = {
  id: string;
  title: string;
  subtitle: string;
  objective: string;
  display_order: number;
  territories?: string[];
  lessons: StaticLessonFromAPI[];
};

type StaticModuleVisual = {
  icon: React.ReactNode;
  lessonIcon: (staticId: string) => React.ReactNode;
  colorFrom: string;
  colorTo: string;
  textColor: string;
  bgMuted: string;
  borderColor: string;
};

type StaticModuleUI = StaticModuleFromAPI & StaticModuleVisual;

const MODULE_VISUAL_CONFIG: Record<string, StaticModuleVisual> = {
  budgeting: {
    icon: <Wallet className="w-6 h-6" />,
    lessonIcon: (id) => id === "static-budget-2" ? <BarChart3 className="w-5 h-5" /> : id === "static-budget-3" ? <Lightbulb className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />,
    colorFrom: "from-amber-500", colorTo: "to-orange-500",
    textColor: "text-amber-400", bgMuted: "bg-amber-500/10", borderColor: "border-amber-500/30",
  },
  saving: {
    icon: <PiggyBank className="w-6 h-6" />,
    lessonIcon: (id) => id === "static-save-2" ? <Target className="w-5 h-5" /> : id === "static-save-3" ? <Star className="w-5 h-5" /> : <PiggyBank className="w-5 h-5" />,
    colorFrom: "from-teal-500", colorTo: "to-cyan-500",
    textColor: "text-teal-400", bgMuted: "bg-teal-500/10", borderColor: "border-teal-500/30",
  },
  investing: {
    icon: <TrendingUp className="w-6 h-6" />,
    lessonIcon: (id) => id === "static-invest-2" ? <Layers className="w-5 h-5" /> : id === "static-invest-3" ? <Award className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />,
    colorFrom: "from-violet-500", colorTo: "to-purple-600",
    textColor: "text-violet-400", bgMuted: "bg-violet-500/10", borderColor: "border-violet-500/30",
  },
  "sand-dollar": {
    icon: <Smartphone className="w-6 h-6" />,
    lessonIcon: (id) => id === "static-cbdc-2" ? <Globe className="w-5 h-5" /> : id === "static-cbdc-3" ? <KeyRound className="w-5 h-5" /> : id === "static-cbdc-4" ? <Shield className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />,
    colorFrom: "from-blue-500", colorTo: "to-indigo-600",
    textColor: "text-blue-400", bgMuted: "bg-blue-500/10", borderColor: "border-blue-500/30",
  },
};

function getModuleVisual(moduleId: string): StaticModuleVisual {
  return MODULE_VISUAL_CONFIG[moduleId] ?? MODULE_VISUAL_CONFIG.budgeting;
}

// ─── OECD-Aligned Static Modules (legacy reference — unused, tree-shaken in prod) ──

type StaticLesson = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: string;
  videoUrl?: string;
  objectives: string[];
  content_sections: ContentSection[];
  questions: QuizQuestion[];
};

type StaticModule = {
  id: string;
  title: string;
  subtitle: string;
  objective: string;
  icon: React.ReactNode;
  colorFrom: string;
  colorTo: string;
  textColor: string;
  bgMuted: string;
  borderColor: string;
  lessons: StaticLesson[];
};


const STORAGE_KEY = "finsight_static_completed";

// ─── Certificate Generation ────────────────────────────────────────────────────

function generateCertificate(
  studentName: string,
  contextName: string,
  completionDate: string,
  type: "lesson" | "module"
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, H, "F");

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(10, 10, W - 20, H - 20, 6, 6, "F");

  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(1.5);
  doc.roundedRect(10, 10, W - 20, H - 20, 6, 6, "S");

  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 14, W - 28, H - 28, 4, 4, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(167, 139, 250);
  doc.text("FINSIGHT LITE", W / 2, 32, { align: "center" });

  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text("Certificate of Completion", W / 2, 55, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("This certificate is proudly presented to", W / 2, 72, { align: "center" });

  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(32);
  doc.setTextColor(52, 211, 153);
  doc.text(studentName || "Student", W / 2, 96, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  const completionPhrase = type === "module"
    ? "for successfully completing the module"
    : "for successfully completing the lesson";
  doc.text(completionPhrase, W / 2, 112, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(251, 191, 36);
  doc.text(contextName, W / 2, 126, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const scoreNote = type === "module"
    ? "having completed all lessons in this module with 80% or above"
    : "with a score of 80% or above";
  doc.text(scoreNote, W / 2, 138, { align: "center" });

  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.5);
  doc.line(60, 148, W - 60, 148);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date of Completion: ${completionDate}`, W / 2, 158, { align: "center" });
  doc.text("FinSight Lite: Financial Literacy for Caribbean Youth", W / 2, 166, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(99, 102, 241);
  doc.text("★", 50, 170);
  doc.text("★", W - 50, 170, { align: "right" });

  const safeContext = contextName.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
  doc.save(`FinSight_Certificate_${safeContext}.pdf`);

  // Best-effort email a copy to the verified email + guardian.
  try {
    const dataUri = doc.output("datauristring");
    const pdfBase64 = dataUri.split(",")[1];
    if (pdfBase64) {
      void fetch("/api/certificates/email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64, lessonTitle: contextName, kind: type, sendToGuardian: true }),
      }).catch(() => {});
    }
  } catch {}
}

// ─── Video Player Component ────────────────────────────────────────────────────

const HTML5_VIDEO_EXTS = [".mp4", ".webm", ".ogg"];

function LessonVideoPlayer({ url }: { url: string | null | undefined }) {
  const { embedUrl, isLoading, isYouTube } = useVideoEmbed(url ?? "");

  if (!url) return null;

  if (url === "coming_soon") {
    return (
      <Card className="glass-card rounded-glass border-0">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Video className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="font-bold text-sm">Video Coming Soon</p>
            <p className="text-xs text-muted-foreground mt-0.5">A video for this lesson will be available shortly.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isYouTube) {
    if (isLoading) {
      return (
        <Card className="glass-card rounded-glass border-0">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      );
    }
    if (embedUrl) {
      return (
        <Card className="glass-card rounded-glass border-0 overflow-hidden">
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              title="Lesson Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </Card>
      );
    }
  }

  const isHtml5 = HTML5_VIDEO_EXTS.some(ext => url.toLowerCase().endsWith(ext));
  if (isHtml5) {
    return (
      <Card className="glass-card rounded-glass border-0 overflow-hidden">
        <video controls className="w-full rounded-xl">
          <source src={url} />
          Your browser does not support video playback.
        </video>
      </Card>
    );
  }

  return (
    <Card className="glass-card rounded-glass border-0">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
          <Video className="w-5 h-5 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Lesson Video</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{url}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-teal-400 hover:text-teal-300 shrink-0"
        >
          Open →
        </a>
      </CardContent>
    </Card>
  );
}

// ─── Module Card Component ─────────────────────────────────────────────────────

function ModuleCard({
  module,
  completed,
  onOpenLesson,
}: {
  module: StaticModuleUI;
  completed: string[];
  onOpenLesson: (lesson: StaticLessonFromAPI, module: StaticModuleUI) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const doneCount = module.lessons.filter(l => completed.includes(l.static_lesson_id)).length;
  const pct = Math.round((doneCount / module.lessons.length) * 100);

  return (
    <div className={`rounded-2xl border ${module.borderColor} bg-card overflow-hidden shadow-sm`} data-testid={`module-card-${module.id}`}>
      {/* Module Header */}
      <div className={`bg-gradient-to-r ${module.colorFrom} ${module.colorTo} p-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white flex-shrink-0 shadow-lg">
              {module.icon}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white leading-tight">{module.title}</h2>
              <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mt-0.5">{module.subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-white/70 hover:text-white transition-colors mt-1 flex-shrink-0"
            data-testid={`button-expand-module-${module.id}`}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-white/80 text-xs font-semibold mb-1.5">
            <span>{doneCount}/{module.lessons.length} lessons complete</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-4">
          {/* Learning Objective */}
          <div className={`${module.bgMuted} rounded-xl p-4 border ${module.borderColor}`}>
            <div className="flex items-start gap-2.5">
              <Target className={`w-4 h-4 ${module.textColor} flex-shrink-0 mt-0.5`} />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Learning Objective</p>
                <p className="text-sm text-foreground leading-relaxed">{module.objective}</p>
              </div>
            </div>
          </div>

          {/* Lessons List */}
          <div className="space-y-2">
            {module.lessons.map((lesson, idx) => {
              const isDone = completed.includes(lesson.static_lesson_id);
              return (
                <button
                  key={lesson.static_lesson_id}
                  onClick={() => onOpenLesson(lesson, module)}
                  className="w-full text-left p-4 rounded-xl bg-background border border-border hover:bg-muted hover:border-border transition-all group flex items-center gap-3"
                  data-testid={`lesson-item-${lesson.static_lesson_id}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    isDone
                      ? "bg-green-500/20 text-green-400"
                      : `${module.bgMuted} ${module.textColor}`
                  }`}>
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : module.lessonIcon(lesson.static_lesson_id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">Lesson {idx + 1}</span>
                      {isDone && <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Completed</span>}
                    </div>
                    <p className="font-bold text-sm text-foreground truncate">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-1">{lesson.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lesson.duration && (
                      <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />{lesson.duration}
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 text-muted-foreground group-hover:${module.textColor} transition-colors`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              {doneCount === module.lessons.length
                ? "🎉 Module complete!"
                : `${module.lessons.length - doneCount} lesson${module.lessons.length - doneCount !== 1 ? "s" : ""} remaining`}
            </span>
            <Button
              onClick={() => {
                const next = module.lessons.find(l => !completed.includes(l.static_lesson_id)) ?? module.lessons[0];
                onOpenLesson(next, module);
              }}
              size="sm"
              className={`rounded-xl bg-gradient-to-r ${module.colorFrom} ${module.colorTo} text-white font-bold shadow-md text-xs px-4`}
              data-testid={`button-start-module-${module.id}`}
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {doneCount === 0 ? "Start" : doneCount === module.lessons.length ? "Review" : "Continue"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Lessons() {
  const { user } = useAuth();
  const certificateFullName = (() => {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return fullName || user?.username || "Student";
  })();
  const [pageState, setPageState] = useState<PageState>("list");
  const [selectedLesson, setSelectedLesson] = useState<LessonWithQuestions | null>(null);
  const [activeModule, setActiveModule] = useState<StaticModuleUI | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [quizResults, setQuizResults] = useState<any>(null);

  // Static lesson completion tracking
  const [completedStatic, setCompletedStatic] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
  });

  // Territory: read from localStorage (persisted when user picks a currency in the Investment Simulator)
  const [userCurrency] = useState<string>(() => {
    try { return localStorage.getItem("finsight_currency") ?? "BSD"; } catch { return "BSD"; }
  });

  // Inline join code state
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const { data: lessons = [], isLoading } = useQuery<Lesson[]>({
    queryKey: ["/api/lessons"],
  });

  const { data: staticModulesRaw = [], isLoading: staticLoading } = useQuery<StaticModuleFromAPI[]>({
    queryKey: ["/api/lessons/static", userCurrency],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/static?currency=${userCurrency}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    staleTime: Infinity,
  });
  const staticModules: StaticModuleUI[] = staticModulesRaw
    .filter(mod => !mod.territories || mod.territories.includes(userCurrency))
    .map(mod => ({ ...mod, ...getModuleVisual(mod.id) }));

  const markStaticDone = (lessonId: string): string[] => {
    if (completedStatic.includes(lessonId)) return completedStatic;
    const next = [...completedStatic, lessonId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCompletedStatic(next);
    return next;
  };

  const handleJoinCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setJoinError("Please enter a code."); return; }
    setIsJoining(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      const checkRes = await fetch(`/api/classes/check-code/${encodeURIComponent(code)}`, { credentials: "include" });
      const checkData = await checkRes.json();
      if (!checkRes.ok) { setJoinError(checkData.message || "Code not found."); return; }

      const endpoint = checkData.type === "org" ? "/api/org/join" : "/api/student/join-class";
      const joinRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });
      const joinData = await joinRes.json();
      if (!joinRes.ok) { setJoinError(joinData.message || "Could not join. Try again."); return; }

      const label = checkData.type === "org" ? `${checkData.name}: ${checkData.envName}` : checkData.name;
      setJoinSuccess(`You've joined ${label}! Your lessons will appear below.`);
      setJoinCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
    } catch {
      setJoinError("Something went wrong. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const completeMutation = useMutation({
    mutationFn: async ({ id, answers }: { id: string; answers: string[] }) => {
      const res = await apiRequest("POST", `/api/lessons/${id}/complete`, { answers });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/xp"] });
    },
  });

  const openOrgLesson = async (lesson: Lesson) => {
    try {
      const res = await fetch(`/api/lessons/${lesson.id}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to load lesson" }));
        throw new Error(err.message ?? "Failed to load lesson");
      }
      const data: LessonWithQuestions = await res.json();
      setSelectedLesson(data);
      setActiveModule(null);
      setPageState("reading");
      setCurrentQ(0);
      setSelected(null);
      setShowResult(false);
      setAnswers([]);
      setQuizResults(null);
    } catch (e) {
      console.error("Failed to load lesson:", e);
    }
  };

  const openStaticLesson = (staticLesson: StaticLessonFromAPI, mod: StaticModuleUI) => {
    const asLesson: LessonWithQuestions = {
      id: staticLesson.static_lesson_id,
      org_id: "static",
      title: staticLesson.title,
      duration: staticLesson.duration ?? undefined,
      video_url: staticLesson.video_url ?? null,
      objectives: staticLesson.objectives,
      content_sections: staticLesson.content_sections,
      questions: staticLesson.questions,
      is_published: true,
      created_at: new Date().toISOString(),
      isStatic: true,
    };
    setSelectedLesson(asLesson);
    setActiveModule(mod);
    setPageState("reading");
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setAnswers([]);
    setQuizResults(null);
  };

  const startQuiz = () => {
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setAnswers([]);
    setPageState("quiz");
  };

  const handleAnswer = (letter: string) => {
    if (showResult || !selectedLesson) return;
    setSelected(letter);
    setShowResult(true);
    const newAnswers = [...answers, letter];
    setAnswers(newAnswers);

    setTimeout(async () => {
      if (currentQ < selectedLesson.questions.length - 1) {
        setCurrentQ(i => i + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        if (selectedLesson.isStatic) {
          // Static lessons: compute score locally
          const finalCorrect = newAnswers.filter((a, i) => a === selectedLesson.questions[i]?.correct_answer).length;
          const total = selectedLesson.questions.length;
          const xpEarned = finalCorrect * 10;
          const scorePct = total > 0 ? Math.round((finalCorrect / total) * 100) : 0;
          // Only mark as done if 80%+
          let updatedCompleted = completedStatic;
          if (scorePct >= 80) {
            updatedCompleted = markStaticDone(selectedLesson.id);
          }
          // Detect module completion: all lessons in activeModule completed with 80%+
          const moduleComplete = activeModule
            ? activeModule.lessons.every(l => updatedCompleted.includes(l.static_lesson_id))
            : false;
          setQuizResults({ finalCorrect, total, xpEarned, moduleComplete });
          setPageState("results");
        } else {
          const result = await completeMutation.mutateAsync({ id: selectedLesson.id, answers: newAnswers });
          setQuizResults({
            ...result,
            finalCorrect: result.correctAnswers ?? newAnswers.filter((a, i) => a === selectedLesson.questions[i]?.correct_answer).length,
            total: result.total ?? selectedLesson.questions.length,
          });
          setPageState("results");
        }
      }
    }, 1400);
  };

  const goBack = () => {
    setPageState("list");
    setSelectedLesson(null);
    setActiveModule(null);
  };

  const currentQuestion = selectedLesson?.questions[currentQ];
  const correctCount = selectedLesson
    ? answers.reduce((acc, ans, i) => acc + (ans === selectedLesson.questions[i]?.correct_answer ? 1 : 0), 0)
    : 0;
  const pct = selectedLesson ? Math.round(((quizResults?.finalCorrect ?? correctCount) / (selectedLesson.questions.length || 1)) * 100) : 0;

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">

          {/* ── Lesson List ── */}
          {pageState === "list" && (
            <div className="space-y-8">
              <div>
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-white" data-testid="text-lessons-title">
                  My Lessons
                </h1>
                <p className="text-white/85 mt-1">OECD-aligned financial literacy: read, learn, and quiz yourself.</p>
              </div>

              {/* ── Built-in OECD Modules ── */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-violet-400" />
                  <h2 className="font-display font-bold text-lg text-white">Core Curriculum</h2>
                  <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2.5 py-0.5 rounded-full font-semibold">OECD-Aligned</span>
                </div>
                {staticLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-white/75" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staticModules.map(mod => (
                      <ModuleCard
                        key={mod.id}
                        module={mod}
                        completed={completedStatic}
                        onOpenLesson={openStaticLesson}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* ── Org / Class Lessons ── */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-teal-400" />
                  <h2 className="font-display font-bold text-lg text-white">School Lessons</h2>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-white/75" />
                  </div>
                ) : lessons.length === 0 ? (
                  <div className="space-y-3">
                    <div className="glass-card rounded-glass p-8 text-center">
                      <BookOpen className="w-10 h-10 text-teal-400 mx-auto mb-3 opacity-60" />
                      <p className="font-bold">No school lessons yet</p>
                      <p className="text-muted-foreground text-sm mt-1">Enter your class or organization code to unlock lessons from your school.</p>
                    </div>
                    <div className="glass-card rounded-glass p-5 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <KeyRound className="w-5 h-5 text-violet-400" />
                        <span className="font-bold text-sm">Enter your code</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={joinCode}
                          onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); setJoinSuccess(""); }}
                          onKeyDown={(e) => e.key === "Enter" && handleJoinCode()}
                          placeholder="e.g. 3KMXJD"
                          className="rounded-xl font-mono text-center tracking-widest uppercase h-11"
                          maxLength={8}
                          data-testid="input-join-code-lessons"
                        />
                        <Button
                          onClick={handleJoinCode}
                          disabled={isJoining || !joinCode.trim()}
                          className="rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold px-5 shrink-0"
                          data-testid="button-join-code-lessons"
                        >
                          {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
                        </Button>
                      </div>
                      {joinError && <p className="text-destructive text-sm font-medium" data-testid="text-join-error">{joinError}</p>}
                      {joinSuccess && <p className="text-green-400 text-sm font-medium" data-testid="text-join-success">{joinSuccess}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lessons.map((lesson) => (
                      <Card
                        key={lesson.id}
                        className="glass-card rounded-glass border-0 cursor-pointer hover:scale-[1.01] transition-all"
                        onClick={() => openOrgLesson(lesson)}
                        data-testid={`lesson-card-${lesson.id}`}
                      >
                        <CardContent className="p-5 flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                            <BookMarked className="w-7 h-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-lg truncate">{lesson.title}</h3>
                              {lesson.subject && (
                                <span className="text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-medium">
                                  {lesson.subject}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                              {lesson.instructor && <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {lesson.instructor}</span>}
                              {lesson.grade_level && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Grade {lesson.grade_level}</span>}
                              {lesson.duration && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {lesson.duration}</span>}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ── Reading View ── */}
          {pageState === "reading" && selectedLesson && (
            <div className="space-y-6 animate-bounce-in">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-2xl border-2" onClick={goBack} data-testid="button-back-lessons">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  {activeModule && (
                    <div className={`flex items-center gap-1.5 mb-1`}>
                      <span className={`text-xs font-bold uppercase tracking-wide ${activeModule.textColor}`}>{activeModule.title}</span>
                    </div>
                  )}
                  <h1 className="font-display text-2xl font-bold text-white truncate" data-testid="text-lesson-title">{selectedLesson.title}</h1>
                  <div className="flex items-center gap-3 text-white/75 text-sm flex-wrap mt-0.5">
                    {selectedLesson.duration && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedLesson.duration}</span>}
                    {selectedLesson.instructor && <span>{selectedLesson.instructor}</span>}
                    {selectedLesson.subject && <span>· {selectedLesson.subject}</span>}
                  </div>
                </div>
              </div>

              {/* Lesson Video */}
              <LessonVideoPlayer url={selectedLesson.video_url} />

              {/* Learning Objectives */}
              {selectedLesson.objectives.length > 0 && (
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-6">
                    <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Target className="w-4 h-4 text-violet-400" />
                      </div>
                      Learning Objectives
                    </h2>
                    <ul className="space-y-2">
                      {selectedLesson.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm" data-testid={`objective-${i}`}>
                          <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-teal-400 font-bold text-xs">{i + 1}</span>
                          </div>
                          <span className="text-foreground">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Content Sections */}
              {selectedLesson.content_sections.map((section, i) => (
                <Card key={i} className="glass-card rounded-glass border-0">
                  <CardContent className="p-6">
                    <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                      </div>
                      {section.heading}
                    </h2>
                    <p className="text-foreground text-sm leading-relaxed mb-3" data-testid={`section-body-${i}`}>{section.body}</p>
                    {section.examples && section.examples.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                          <ListChecks className="w-3.5 h-3.5" /> Examples
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {section.examples.map((ex, j) => (
                            <span key={j} className="text-sm bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-xl font-medium" data-testid={`example-${i}-${j}`}>
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Start Quiz */}
              {selectedLesson.questions.length > 0 && (
                <Card className="glass-card-coral rounded-glass border-0">
                  <CardContent className="p-6 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-foreground">Ready to test yourself?</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedLesson.questions.length} questions · Earn {selectedLesson.questions.length * 10} XP
                      </p>
                    </div>
                    <Button
                      onClick={startQuiz}
                      className="rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold px-6 shadow-lg shrink-0"
                      data-testid="button-start-quiz"
                    >
                      Start Quiz
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Quiz View ── */}
          {pageState === "quiz" && currentQuestion && selectedLesson && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-2xl border-2" onClick={() => setPageState("reading")} data-testid="button-back-reading">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white/85">Question {currentQ + 1} / {selectedLesson.questions.length}</span>
                    <span className="text-sm font-bold text-amber-400 flex items-center gap-1">
                      <Star className="w-4 h-4" /> {correctCount} correct
                    </span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${((currentQ + 1) / selectedLesson.questions.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <Card className="glass-card rounded-glass border-0">
                <CardContent className="p-6 lg:p-8">
                  <h2 className="text-xl font-bold leading-relaxed" data-testid="text-quiz-question">{currentQuestion.question}</h2>
                </CardContent>
              </Card>

              <div className="grid gap-3">
                {OPTIONS.map((opt, i) => {
                  const letter = LETTERS[i];
                  const optionText = currentQuestion[opt];
                  const isSelected = selected === letter;
                  const isCorrect = letter === currentQuestion.correct_answer;

                  let cls = "border-border hover:border-teal-400 hover:scale-[1.01]";
                  if (showResult) {
                    if (isCorrect) cls = "border-green-500 bg-green-500/10 scale-[1.01]";
                    else if (isSelected) cls = "border-red-500 bg-red-500/10";
                    else cls = "border-border/50 opacity-50";
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(letter)}
                      disabled={showResult}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 glass-card ${cls}`}
                      data-testid={`quiz-option-${i}`}
                    >
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
                        showResult && isCorrect ? "bg-green-500 text-white" :
                        showResult && isSelected ? "bg-red-500 text-white" :
                        "bg-muted text-foreground"
                      }`}>
                        {showResult && isCorrect ? <CheckCircle2 className="w-5 h-5" /> :
                         showResult && isSelected ? <XCircle className="w-5 h-5" /> : letter}
                      </span>
                      <span className="font-medium text-sm leading-snug text-foreground">{optionText}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Results View ── */}
          {pageState === "results" && quizResults && selectedLesson && (
            <div className="space-y-6 text-center animate-bounce-in">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-xl text-5xl">
                {pct >= 80 ? "🏆" : pct >= 50 ? "⭐" : "💪"}
              </div>

              <div className="text-white">
                <h1 className="font-display text-3xl font-bold">Quiz Complete!</h1>
                <p className="text-white/85 mt-2">{selectedLesson.title}</p>
                {selectedLesson.isStatic && pct >= 80 && (
                  <p className="text-green-400 font-bold text-sm mt-1">✓ Lesson marked as complete</p>
                )}
                {quizResults?.moduleComplete && activeModule && (
                  <p className="text-amber-400 font-bold text-sm mt-1">🏅 Module "{activeModule.title}" fully completed!</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-teal-400" data-testid="text-quiz-score">{quizResults.finalCorrect}/{quizResults.total}</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">Correct</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-400">{pct}%</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">Score</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <span className="xp-pill text-lg" data-testid="text-xp-earned">+{quizResults.xpEarned}</span>
                    <p className="text-xs font-bold text-muted-foreground mt-1">XP Earned</p>
                  </CardContent>
                </Card>
              </div>

              {pct < 60 && (
                <Card className="glass-card-teal rounded-glass border-0" data-testid="card-ai-tutor-prompt">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm text-teal-800 dark:text-teal-200">Need help with this topic?</p>
                      <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">Your AI Tutor can explain <span className="font-bold">{selectedLesson.title}</span> in simple steps.</p>
                    </div>
                    <Link href={`/moneylab/tutor?q=${encodeURIComponent(selectedLesson.title)}`}>
                      <Button size="sm" className="rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold shrink-0" data-testid="button-ask-ai-tutor">
                        Ask AI Tutor
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {pct === 100 && (
                <Card className="glass-card-coral rounded-glass border-0">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-amber-500 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-display font-bold text-foreground">Perfect Score! 🎉</p>
                      <p className="text-sm text-muted-foreground">Outstanding work! You've mastered this lesson.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {quizResults?.moduleComplete && activeModule && (
                <Card className="glass-card rounded-glass border-0" style={{ borderColor: "rgba(251,191,36,0.3)" }}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm">Module Complete! 🏅</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Download your module certificate of completion.</p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Certificate name: <span className="font-semibold text-foreground" data-testid="text-certificate-name-module">{certificateFullName}</span>
                        {" · "}
                        <Link href="/settings" className="underline text-teal-300 hover:text-teal-200" data-testid="link-edit-name-module">Edit name</Link>
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        const studentName = certificateFullName;
                        const contextName = activeModule.title;
                        const completionDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
                        generateCertificate(studentName, contextName, completionDate, "module");
                      }}
                      className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold shrink-0 shadow-lg"
                      data-testid="button-download-module-certificate"
                    >
                      <Download className="w-4 h-4 mr-2" /> Module Certificate
                    </Button>
                  </CardContent>
                </Card>
              )}

              {pct >= 80 && (
                <Card className="glass-card rounded-glass border-0" style={{ borderColor: "rgba(251,191,36,0.2)" }}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Award className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm">
                        {isFinancialAcademyLesson(selectedLesson)
                          ? "Financial Academy Module Certificate Earned!"
                          : "Lesson Certificate Earned!"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isFinancialAcademyLesson(selectedLesson)
                          ? "Download your official Financial Academy certificate of module completion."
                          : "Download your certificate of completion for this lesson."}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Certificate name: <span className="font-semibold text-foreground" data-testid="text-certificate-name-lesson">{certificateFullName}</span>
                        {" · "}
                        <Link href="/settings" className="underline text-teal-300 hover:text-teal-200" data-testid="link-edit-name-lesson">Edit name</Link>
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        const studentName = certificateFullName;
                        const contextName = selectedLesson.title;
                        const completionDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
                        if (isFinancialAcademyLesson(selectedLesson)) {
                          await generateFinancialAcademyCertificate(studentName, contextName, completionDate, {
                            logoUrl: selectedLesson.org_logo_url,
                            leftName: selectedLesson.org_signature_left_name,
                            leftRole: selectedLesson.org_signature_left_role,
                            rightName: selectedLesson.org_signature_right_name,
                            rightRole: selectedLesson.org_signature_right_role,
                          });
                        } else {
                          generateCertificate(studentName, contextName, completionDate, "lesson");
                        }
                      }}
                      className="rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold shrink-0 shadow-lg"
                      data-testid="button-download-certificate"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setPageState("reading")} className="rounded-2xl border-white/30 text-white hover:bg-white/10">
                  <BookOpen className="w-4 h-4 mr-2" /> Review Lesson
                </Button>
                <Button onClick={goBack} className="rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold">
                  <Award className="w-4 h-4 mr-2" /> Back to Lessons
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
