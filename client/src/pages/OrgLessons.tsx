import { OrgSidebar } from "@/components/layout/OrgSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  BookOpen, Plus, Loader2, Eye, EyeOff, ChevronDown, ChevronUp,
  GraduationCap, Clock, Tag, Target, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type QuizQuestion = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
};

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

function emptyQuestion(): QuizQuestion {
  return { question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" };
}

function CreateLessonModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<"details" | "quiz">("details");
  const [loading, setLoading] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", instructor: "", subject: "Financial Literacy",
    gradeLevel: "", topic: "", duration: "45 minutes",
    videoUrl: "", objectivesRaw: "", contentHeading: "", contentBody: "",
  });
  const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const setQ = (i: number, k: keyof QuizQuestion, v: string) =>
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [k]: v } : q));

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const objectives = form.objectivesRaw.split("\n").map(s => s.trim()).filter(Boolean);
      const contentSections = form.contentHeading && form.contentBody
        ? [{ heading: form.contentHeading, body: form.contentBody }]
        : [];
      const res = await fetch("/api/org-admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title, instructor: form.instructor || undefined,
          subject: form.subject || undefined, gradeLevel: form.gradeLevel || undefined,
          topic: form.topic || undefined, duration: form.duration || undefined,
          videoUrl: form.videoUrl || undefined,
          objectives, contentSections,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const lesson = await res.json();
      setLessonId(lesson.id);
      setStep("quiz");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
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
      toast({ title: "Lesson created!", description: `Lesson saved with ${results.length} quiz question${results.length !== 1 ? "s" : ""}.` });
      onClose();
    } catch (e: any) {
      toast({ title: "Error saving questions", description: e.message, variant: "destructive" });
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
              {step === "details" ? <Plus className="w-5 h-5 text-blue-600" /> : <BookOpen className="w-5 h-5 text-blue-600" />}
            </div>
            <div>
              <h2 className="font-display font-bold text-xl">{step === "details" ? "Create New Lesson" : "Add Quiz Questions"}</h2>
              <p className="text-xs text-muted-foreground">{step === "details" ? "Step 1 of 2: Lesson details" : "Step 2 of 2: Quiz questions (optional)"}</p>
            </div>
          </div>

          {step === "details" ? (
            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Lesson Title <span className="text-red-500">*</span></label>
                <input required value={form.title} onChange={set("title")} placeholder="e.g. Introduction to Budgeting"
                  className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                  data-testid="input-lesson-title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Instructor</label>
                  <input value={form.instructor} onChange={set("instructor")} placeholder="e.g. Ms. Johnson"
                    className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                    data-testid="input-lesson-instructor" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Grade Level</label>
                  <input value={form.gradeLevel} onChange={set("gradeLevel")} placeholder="e.g. Grade 9"
                    className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                    data-testid="input-lesson-grade" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Subject</label>
                  <input value={form.subject} onChange={set("subject")} placeholder="Financial Literacy"
                    className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                    data-testid="input-lesson-subject" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Duration</label>
                  <input value={form.duration} onChange={set("duration")} placeholder="45 minutes"
                    className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                    data-testid="input-lesson-duration" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Topic</label>
                <input value={form.topic} onChange={set("topic")} placeholder="e.g. Needs vs Wants"
                  className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                  data-testid="input-lesson-topic" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Video URL <span className="text-muted-foreground font-normal">(optional — YouTube or direct link)</span></label>
                <input value={form.videoUrl} onChange={set("videoUrl")} placeholder="e.g. https://www.youtube.com/watch?v=..."
                  className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                  data-testid="input-lesson-video-url" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Learning Objectives (one per line)</label>
                <textarea value={form.objectivesRaw} onChange={set("objectivesRaw")} rows={3}
                  placeholder="Students will identify needs vs wants&#10;Students will create a basic budget"
                  className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  data-testid="input-lesson-objectives" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Content Section Heading</label>
                <input value={form.contentHeading} onChange={set("contentHeading")} placeholder="e.g. What is a Budget?"
                  className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                  data-testid="input-lesson-content-heading" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Content Body</label>
                <textarea value={form.contentBody} onChange={set("contentBody")} rows={3}
                  placeholder="A budget is a plan for how you will spend and save your money..."
                  className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  data-testid="input-lesson-content-body" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-2xl">Cancel</Button>
                <Button type="submit" disabled={loading} className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  data-testid="button-create-lesson-confirm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next: Add Questions →"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Add multiple-choice quiz questions for this lesson. Students will be scored on completion.</p>
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {questions.map((q, i) => (
                  <div key={i} className="rounded-2xl border-2 border-input p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Question {i + 1}</p>
                      {questions.length > 1 && (
                        <button onClick={() => setQuestions(qs => qs.filter((_, idx) => idx !== i))}
                          className="p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input value={q.question} onChange={e => setQ(i, "question", e.target.value)} placeholder="Question text..."
                      className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                      data-testid={`input-question-${i}-text`} />
                    <div className="grid grid-cols-2 gap-2">
                      {(["A", "B", "C", "D"] as const).map(opt => (
                        <div key={opt} className="relative">
                          <input value={q[`option${opt}` as keyof QuizQuestion] as string}
                            onChange={e => setQ(i, `option${opt}` as keyof QuizQuestion, e.target.value)}
                            placeholder={`Option ${opt}`}
                            className={`w-full rounded-xl border-2 bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8 ${q.correctAnswer === opt ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-input"}`}
                            data-testid={`input-question-${i}-option-${opt}`} />
                          <button onClick={() => setQ(i, "correctAnswer", opt)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold rounded px-1 ${q.correctAnswer === opt ? "text-blue-600" : "text-muted-foreground hover:text-blue-500"}`}
                            title={`Mark ${opt} as correct`} data-testid={`button-correct-${i}-${opt}`}>
                            {q.correctAnswer === opt ? "✓" : opt}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Click the letter button to mark the correct answer (currently: <span className="font-bold text-blue-600">{q.correctAnswer}</span>)</p>
                  </div>
                ))}
              </div>
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

function LessonCard({ lesson }: { lesson: LessonPlan }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const publishMutation = useMutation({
    mutationFn: (isPublished: boolean) =>
      fetch(`/api/org-admin/lessons/${lesson.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublished }),
      }).then(r => r.json()),
    onSuccess: (data) => {
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
    <Card className={`glass-card rounded-glass transition-all ${lesson.is_published ? "border-blue-200 dark:border-blue-800" : "border-dashed"}`}
      data-testid={`card-lesson-${lesson.id}`}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-display font-bold text-lg">{lesson.title}</h3>
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
    <div className="flex min-h-screen bg-background">
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
            <Card className="glass-card rounded-glass border-dashed">
              <CardContent className="p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
                  <BookOpen className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">No lessons yet</h3>
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
