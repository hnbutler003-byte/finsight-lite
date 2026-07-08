import { OrgSidebar } from "@/components/layout/OrgSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  BookOpen, Plus, Loader2, Eye, EyeOff, ChevronDown, ChevronUp,
  GraduationCap, Clock, Tag, Target, Trash2, Pencil, Minus,
  PlayCircle, ArrowLeft, CheckCircle2, XCircle, ListChecks,
  Video, X, Star, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { VideoField } from "@/components/VideoField";
import { useVideoEmbed } from "@/hooks/use-video-embed";
import { QuizCta } from "@/components/QuizCta";

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

type LessonPlan = {
  id: string;
  org_id: string;
  env_id?: string | null;
  title: string;
  instructor?: string | null;
  subject?: string | null;
  grade_level?: string | null;
  topic?: string | null;
  duration?: string | null;
  video_url?: string | null;
  objectives: string[];
  content_sections: { heading: string; body: string; examples?: string[] }[];
  is_published: boolean;
  created_at: string;
};

type LessonWithQuestions = LessonPlan & {
  questions: {
    id: string;
    lesson_id: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    order_index: number;
  }[];
};

function CreateLessonModal({ onClose }: { onClose: () => void }) {
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

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/org-admin/lessons", {
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
        const res = await fetch(`/api/org-admin/lessons/${lessonId}/questions`, {
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
      qc.invalidateQueries({ queryKey: ["/api/org-admin/lessons"] });
      qc.invalidateQueries({ queryKey: ["/api/org-admin/overview"] });
      toast({ title: "Lesson created!", description: `Saved with ${results.length} quiz question${results.length !== 1 ? "s" : ""}.` });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error saving questions", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipQuestions = () => {
    qc.invalidateQueries({ queryKey: ["/api/org-admin/lessons"] });
    qc.invalidateQueries({ queryKey: ["/api/org-admin/overview"] });
    toast({ title: "Lesson created!", description: "You can add quiz questions later." });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <Card className="rounded-3xl border-2 w-full max-w-lg shadow-2xl my-4" onClick={e => e.stopPropagation()}>
        <CardContent className="p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-xl">Create New Lesson</h2>
              <p className="text-xs text-muted-foreground">
                {step === "details" ? "Step 1 of 3: Lesson details" : step === "content" ? "Step 2 of 3: Content sections" : "Step 3 of 3: Quiz questions (optional)"}
              </p>
            </div>
          </div>

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
                <Button type="submit" disabled={!title} className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
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
                  className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  data-testid="button-create-lesson-confirm"
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
                className="w-full rounded-2xl border-dashed" data-testid="button-add-question">
                <Plus className="w-4 h-4 mr-2" /> Add Another Question
              </Button>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleSkipQuestions} className="flex-1 rounded-2xl text-xs">
                  Skip for Now
                </Button>
                <Button type="button" disabled={loading} onClick={handleSaveQuestions}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  data-testid="button-save-questions">
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

function EditLessonModal({ lesson, onClose }: { lesson: LessonPlan; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<"details" | "content" | "quiz">("details");
  const [loading, setLoading] = useState(false);
  const [questionsInit, setQuestionsInit] = useState(false);

  const [title, setTitle] = useState(lesson.title);
  const [instructor, setInstructor] = useState(lesson.instructor ?? "");
  const [subject, setSubject] = useState(lesson.subject ?? "");
  const [gradeLevel, setGradeLevel] = useState(lesson.grade_level ?? "");
  const [topic, setTopic] = useState(lesson.topic ?? "");
  const [duration, setDuration] = useState(lesson.duration ?? "");
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? "");
  const [objectives, setObjectives] = useState<string[]>(
    lesson.objectives.length > 0 ? lesson.objectives : [""]
  );
  const [sections, setSections] = useState<ContentFormSection[]>(
    lesson.content_sections.length > 0
      ? lesson.content_sections.map(s => ({
          heading: s.heading,
          body: s.body,
          examples: (s.examples ?? []).join(", "),
        }))
      : [emptySection()]
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()]);

  const { data: lessonWithQ, isLoading: questionsLoading, isError: questionsError } = useQuery<LessonWithQuestions>({
    queryKey: ["/api/org-admin/lessons", lesson.id],
    queryFn: async () => {
      const r = await fetch(`/api/org-admin/lessons/${lesson.id}`, { credentials: "include" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "Failed to load lesson");
      return r.json();
    },
  });

  useEffect(() => {
    if (lessonWithQ && !questionsInit) {
      setQuestionsInit(true);
      if (lessonWithQ.questions && lessonWithQ.questions.length > 0) {
        setQuestions(
          lessonWithQ.questions
            .sort((a, b) => a.order_index - b.order_index)
            .map(q => ({
              question: q.question,
              optionA: q.option_a,
              optionB: q.option_b,
              optionC: q.option_c,
              optionD: q.option_d,
              correctAnswer: q.correct_answer as "A" | "B" | "C" | "D",
            }))
        );
      }
    }
  }, [lessonWithQ, questionsInit]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const validQuestions = questions.filter(
        q => q.question && q.optionA && q.optionB && q.optionC && q.optionD
      );
      const payload: Record<string, unknown> = {
        title,
        instructor: instructor || null,
        subject: subject || null,
        gradeLevel: gradeLevel || null,
        topic: topic || null,
        duration: duration || null,
        videoUrl: videoUrl || null,
        objectives: objectives.map(o => o.trim()).filter(Boolean),
        contentSections: buildContentSections(sections),
      };
      if (!questionsError) {
        payload.questions = validQuestions;
      }
      const res = await fetch(`/api/org-admin/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/org-admin/lessons"] });
      qc.invalidateQueries({ queryKey: ["/api/org-admin/overview"] });
      toast({ title: "Lesson updated!" });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <Card className="rounded-3xl border-2 w-full max-w-lg shadow-2xl my-4" onClick={e => e.stopPropagation()}>
        <CardContent className="p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-xl">Edit Lesson</h2>
              <p className="text-xs text-muted-foreground">
                {step === "details" ? "Step 1 of 3: Lesson details" : step === "content" ? "Step 2 of 3: Content sections" : "Step 3 of 3: Quiz questions"}
              </p>
            </div>
          </div>

          {step === "details" && (
            <div className="space-y-4">
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
                <Button type="button" onClick={() => setStep("content")} disabled={!title}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                  Next: Content →
                </Button>
              </div>
            </div>
          )}

          {step === "content" && (
            <div className="space-y-4">
              <ContentSectionEditor sections={sections} setSections={setSections} />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep("details")} className="flex-1 rounded-2xl text-xs">← Back</Button>
                <Button type="button" onClick={() => setStep("quiz")}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                  Next: Quiz →
                </Button>
              </div>
            </div>
          )}

          {step === "quiz" && (
            <div className="space-y-4">
              {questionsError ? (
                <p className="text-sm text-red-500 py-4 text-center">Failed to load quiz questions. You can still save the lesson details.</p>
              ) : questionsLoading && !questionsInit ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Edit quiz questions. Existing questions will be replaced on save.</p>
                  <QuizEditor questions={questions} setQuestions={setQuestions} />
                  <Button type="button" variant="outline" onClick={() => setQuestions(qs => [...qs, emptyQuestion()])}
                    className="w-full rounded-2xl border-dashed">
                    <Plus className="w-4 h-4 mr-2" /> Add Another Question
                  </Button>
                </>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep("content")} className="flex-1 rounded-2xl text-xs">← Back</Button>
                <Button type="button" disabled={loading} onClick={handleSave}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  data-testid="button-save-edit-lesson">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DeleteConfirmDialog({ lesson, onClose }: { lesson: LessonPlan; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org-admin/lessons/${lesson.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/org-admin/lessons"] });
      qc.invalidateQueries({ queryKey: ["/api/org-admin/overview"] });
      toast({ title: "Lesson deleted" });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="rounded-3xl border-2 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <CardContent className="p-8 space-y-5 text-center">
          <div className="w-14 h-14 rounded-3xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-xl">Delete Lesson?</h2>
            <p className="text-sm text-muted-foreground mt-2">
              This will permanently delete <span className="font-semibold text-foreground">"{lesson.title}"</span> and all its quiz questions. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl" data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={loading}
              className="flex-1 rounded-2xl bg-red-500 hover:bg-red-600 text-white border-0"
              data-testid="button-confirm-delete">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Lesson"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Video helpers ────────────────────────────────────────────────────────────
const HTML5_VIDEO_EXTS = [".mp4", ".webm", ".ogg"];

function PreviewVideoPlayer({ url }: { url: string | null | undefined }) {
  const { embedUrl, isLoading, isError, isYouTube } = useVideoEmbed(url ?? "");

  if (!url) return null;
  if (url === "coming_soon") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border bg-muted/50 p-4">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
          <Video className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <p className="font-bold text-sm">Video Coming Soon</p>
          <p className="text-xs text-muted-foreground mt-0.5">A video for this lesson will be available shortly.</p>
        </div>
      </div>
    );
  }

  if (isYouTube) {
    if (isLoading) {
      return (
        <div className="rounded-2xl border border-border flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (embedUrl) {
      return (
        <div className="rounded-2xl overflow-hidden border border-border">
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              title="Lesson Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      );
    }
    if (isError) {
      return (
        <div className="flex items-center gap-3 rounded-2xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-bold text-sm">Video not available</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This video is private, deleted, or restricted. Update the link in the lesson editor.
            </p>
          </div>
        </div>
      );
    }
  }

  const isHtml5 = HTML5_VIDEO_EXTS.some(ext => url.toLowerCase().endsWith(ext));
  if (isHtml5) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border">
        <video controls className="w-full">
          <source src={url} />
          Your browser does not support video playback.
        </video>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-muted/50 p-4">
      <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
        <Video className="w-5 h-5 text-teal-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">Lesson Content</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{url}</p>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-teal-600 hover:text-teal-700 shrink-0">Open →</a>
    </div>
  );
}

// ── Broken video warning (lesson card) ───────────────────────────────────────
function BrokenVideoWarning({ url }: { url: string | null | undefined }) {
  const { isYouTube, isLoading, isError } = useVideoEmbed(url ?? "");
  if (!isYouTube || isLoading || !isError) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1" data-testid="warning-broken-video">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      Video link appears broken. Update it before publishing to students.
    </div>
  );
}

// ── Lesson Preview Modal ─────────────────────────────────────────────────────
type PreviewLesson = LessonPlan & {
  questions: {
    id: string; lesson_id: string; question: string;
    option_a: string; option_b: string; option_c: string; option_d: string;
    correct_answer: string; order_index: number;
  }[];
};

type PreviewPage = "reading" | "quiz" | "results";
const OPTS = ["option_a", "option_b", "option_c", "option_d"] as const;
const LETTERS = ["A", "B", "C", "D"];

function LessonPreviewModal({ lesson, onClose }: { lesson: LessonPlan; onClose: () => void }) {
  const [previewLesson, setPreviewLesson] = useState<PreviewLesson | null>(null);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState<PreviewPage>("reading");
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [finalCorrect, setFinalCorrect] = useState(0);

  useEffect(() => {
    fetch(`/api/org-admin/lessons/${lesson.id}/preview`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.message) setLoadError(data.message);
        else setPreviewLesson(data as PreviewLesson);
      })
      .catch(() => setLoadError("Failed to load lesson preview."));
  }, [lesson.id]);

  const handleAnswer = (letter: string) => {
    if (showResult || !previewLesson) return;
    setSelected(letter);
    setShowResult(true);
    const newAnswers = [...answers, letter];
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentQ < previewLesson.questions.length - 1) {
        setCurrentQ(i => i + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        const correct = newAnswers.filter((a, i) => a === previewLesson.questions[i]?.correct_answer).length;
        setFinalCorrect(correct);
        setPage("results");
      }
    }, 1400);
  };

  const resetQuiz = () => {
    setCurrentQ(0); setSelected(null); setShowResult(false);
    setAnswers([]); setFinalCorrect(0); setPage("reading");
  };

  const pct = previewLesson ? Math.round((finalCorrect / (previewLesson.questions.length || 1)) * 100) : 0;
  const currentQuestion = previewLesson?.questions[currentQ];
  const correctCount = answers.filter((a, i) => a === previewLesson?.questions[i]?.correct_answer).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" data-testid="modal-lesson-preview">
      {/* Preview banner */}
      <div className="shrink-0 bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <PlayCircle className="w-4 h-4" />
          Preview Mode: this is how students see this lesson. Quiz results are not saved.
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-amber-600 transition-colors"
          data-testid="button-close-preview"
          aria-label="Close preview"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content area: caribbean-bg to match student experience */}
      <div className="flex-1 overflow-y-auto caribbean-bg">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          {!previewLesson && !loadError && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-white/70" />
            </div>
          )}

          {loadError && (
            <div className="text-center py-20 text-white/80">
              <p className="font-bold text-lg">Could not load preview</p>
              <p className="text-sm mt-1">{loadError}</p>
            </div>
          )}

          {/* ── Reading view ── */}
          {previewLesson && page === "reading" && (
            <>
              <div>
                <h1 className="font-display text-2xl font-bold text-white">{previewLesson.title}</h1>
                <div className="flex items-center gap-3 text-white/75 text-sm flex-wrap mt-1">
                  {previewLesson.duration && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{previewLesson.duration}</span>}
                  {previewLesson.instructor && <span>{previewLesson.instructor}</span>}
                  {previewLesson.subject && <span>· {previewLesson.subject}</span>}
                </div>
              </div>

              <PreviewVideoPlayer url={previewLesson.video_url} />

              {previewLesson.objectives.length > 0 && (
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-6">
                    <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      Learning Objectives
                    </h2>
                    <ul className="space-y-2">
                      {previewLesson.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-teal-700 dark:text-teal-400 font-bold text-xs">{i + 1}</span>
                          </div>
                          <span className="text-foreground">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {previewLesson.content_sections.map((section, i) => (
                <Card key={i} className="glass-card rounded-glass border-0">
                  <CardContent className="p-6">
                    <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      {section.heading}
                    </h2>
                    <p className="text-foreground text-sm leading-relaxed mb-3">{section.body}</p>
                    {section.examples && section.examples.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                          <ListChecks className="w-3.5 h-3.5" /> Examples
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {section.examples.map((ex, j) => (
                            <span key={j} className="text-sm bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-xl font-medium">{ex}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {previewLesson.questions.length > 0 ? (
                <QuizCta
                  subtitle={`${previewLesson.questions.length} questions · Preview only (no XP saved)`}
                  buttonTestId="button-preview-start-quiz"
                  onStart={() => { setPage("quiz"); setCurrentQ(0); setSelected(null); setShowResult(false); setAnswers([]); }}
                />
              ) : (
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-5 text-center text-muted-foreground text-sm">No quiz questions added to this lesson yet.</CardContent>
                </Card>
              )}
            </>
          )}

          {/* ── Quiz view ── */}
          {previewLesson && page === "quiz" && currentQuestion && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-2xl border-2 border-white/20 text-white hover:bg-white/10" onClick={() => setPage("reading")} data-testid="button-preview-back-reading">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white/85">Question {currentQ + 1} / {previewLesson.questions.length}</span>
                    <span className="text-sm font-bold text-amber-400 flex items-center gap-1">
                      <Star className="w-4 h-4" /> {correctCount} correct
                    </span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${((currentQ + 1) / previewLesson.questions.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <Card className="glass-card rounded-glass border-0">
                <CardContent className="p-6 lg:p-8">
                  <h2 className="text-xl font-bold leading-relaxed text-foreground">{currentQuestion.question}</h2>
                </CardContent>
              </Card>

              <div className="grid gap-3">
                {OPTS.map((opt, i) => {
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
                      data-testid={`preview-option-${i}`}
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

          {/* ── Results view ── */}
          {previewLesson && page === "results" && (
            <div className="space-y-6 text-center">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-xl text-5xl">
                {pct >= 80 ? "🏆" : pct >= 50 ? "⭐" : "💪"}
              </div>
              <div className="text-white">
                <h1 className="font-display text-3xl font-bold">Quiz Complete!</h1>
                <p className="text-white/85 mt-2">{previewLesson.title}</p>
                <p className="text-amber-300 text-sm mt-1 font-semibold">Preview only, no XP or progress was saved</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">{finalCorrect}/{previewLesson.questions.length}</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">Correct</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pct}%</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">Score</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{previewLesson.questions.length}</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">Questions</p>
                  </CardContent>
                </Card>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setPage("reading")} className="rounded-2xl border-white/30 text-white hover:bg-white/10">
                  <BookOpen className="w-4 h-4 mr-2" /> Review Lesson
                </Button>
                <Button onClick={resetQuiz} className="rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold">
                  Retake Quiz
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function LessonCard({ lesson }: { lesson: LessonPlan }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const publishMutation = useMutation({
    mutationFn: (isPublished: boolean) =>
      fetch(`/api/org-admin/lessons/${lesson.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublished }),
      }).then(r => r.json()),
    onSuccess: (data: { message?: string }) => {
      if (data.message) {
        toast({ title: "Error", description: data.message, variant: "destructive" });
        return;
      }
      qc.invalidateQueries({ queryKey: ["/api/org-admin/lessons"] });
      qc.invalidateQueries({ queryKey: ["/api/org-admin/overview"] });
      toast({ title: lesson.is_published ? "Lesson unpublished" : "Lesson published!" });
    },
    onError: () => toast({ title: "Error", description: "Could not update lesson.", variant: "destructive" }),
  });

  return (
    <>
      {showPreview && <LessonPreviewModal lesson={lesson} onClose={() => setShowPreview(false)} />}
      {showEdit && <EditLessonModal lesson={lesson} onClose={() => setShowEdit(false)} />}
      {showDelete && <DeleteConfirmDialog lesson={lesson} onClose={() => setShowDelete(false)} />}
      <Card
        className={`console-card transition-all ${lesson.is_published ? "border-blue-200 dark:border-blue-800" : "border-dashed"}`}
        data-testid={`card-lesson-${lesson.id}`}
      >
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-bold text-base">{lesson.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${
                  lesson.is_published
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {lesson.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {lesson.instructor && (
                  <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{lesson.instructor}</span>
                )}
                {lesson.duration && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration}</span>
                )}
                {lesson.grade_level && (
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{lesson.grade_level}</span>
                )}
                {lesson.topic && (
                  <span className="flex items-center gap-1"><Target className="w-3 h-3" />{lesson.topic}</span>
                )}
              </div>
              <BrokenVideoWarning url={lesson.video_url} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={lesson.is_published ? "outline" : "default"}
                onClick={() => publishMutation.mutate(!lesson.is_published)}
                disabled={publishMutation.isPending}
                className={`rounded-xl text-xs gap-1.5 ${!lesson.is_published ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0" : ""}`}
                data-testid={`button-toggle-publish-${lesson.id}`}
              >
                {publishMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> :
                  lesson.is_published ? <><EyeOff className="w-3 h-3" /> Unpublish</> : <><Eye className="w-3 h-3" /> Publish</>}
              </Button>
              <button
                onClick={() => setShowPreview(true)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-all"
                title="Preview as student"
                data-testid={`button-preview-lesson-${lesson.id}`}
              >
                <PlayCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowEdit(true)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all"
                title="Edit lesson"
                data-testid={`button-edit-lesson-${lesson.id}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                title="Delete lesson"
                data-testid={`button-delete-lesson-${lesson.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setExpanded(e => !e)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                data-testid={`button-expand-lesson-${lesson.id}`}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="space-y-4 pt-2 border-t border-border">
              {lesson.objectives.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Learning Objectives</p>
                  <ul className="space-y-1">
                    {lesson.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lesson.content_sections.map((section, i) => (
                <div key={i}>
                  <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">{section.heading}</p>
                  <p className="text-sm leading-relaxed">{section.body}</p>
                  {section.examples && section.examples.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {section.examples.map((ex, j) => (
                        <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5 shrink-0">→</span>{ex}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function OrgLessons() {
  const { admin, isLoading: authLoading } = useOrgAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);

  const { data: lessons, isLoading } = useQuery<LessonPlan[]>({
    queryKey: ["/api/org-admin/lessons"],
    queryFn: () => fetch("/api/org-admin/lessons", { credentials: "include" }).then(r => r.json()),
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

  return (
    <div className="flex min-h-screen bg-background console">
      <OrgSidebar />
      {showCreate && <CreateLessonModal onClose={() => setShowCreate(false)} />}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display font-bold text-3xl">Lessons</h1>
              <p className="text-muted-foreground mt-1">Manage lesson plans for {admin.envName}</p>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg px-6"
              data-testid="button-create-lesson"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Lesson
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : !lessons?.length ? (
            <Card className="console-card border-dashed">
              <CardContent className="p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
                  <BookOpen className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-base">No lessons yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">Create your first lesson plan to get started</p>
                </div>
                <Button onClick={() => setShowCreate(true)} className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  data-testid="button-create-first-lesson">
                  <Plus className="w-4 h-4 mr-2" /> Create First Lesson
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</span>
                <span className="text-sm text-muted-foreground font-medium">{lessons.filter(l => l.is_published).length} published</span>
              </div>
              {lessons.map(lesson => <LessonCard key={lesson.id} lesson={lesson} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
