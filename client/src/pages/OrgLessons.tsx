import { OrgSidebar } from "@/components/layout/OrgSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  BookOpen, Plus, Loader2, Eye, EyeOff, ChevronDown, ChevronUp,
  GraduationCap, Clock, Tag, Target, Trash2, Pencil, Minus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { VideoField } from "@/components/VideoField";

type QuizQuestion = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
};

type ContentFormSection = { heading: string; body: string; examples: string };

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

function emptyQuestion(): QuizQuestion {
  return { question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" };
}

function emptySection(): ContentFormSection {
  return { heading: "", body: "", examples: "" };
}

function buildContentSections(sections: ContentFormSection[]) {
  return sections
    .filter(s => s.heading.trim() || s.body.trim())
    .map(s => ({
      heading: s.heading,
      body: s.body,
      examples: s.examples ? s.examples.split(",").map(e => e.trim()).filter(Boolean) : [],
    }));
}

function QuizEditor({
  questions,
  setQuestions,
}: {
  questions: QuizQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
}) {
  return (
    <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
      {questions.map((q, i) => (
        <div key={i} className="rounded-2xl border-2 border-input p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Question {i + 1}</p>
            {questions.length > 1 && (
              <button
                onClick={() => setQuestions(qs => qs.filter((_, idx) => idx !== i))}
                className="p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <input
            value={q.question}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuestions(qs => qs.map((x, idx) => idx === i ? { ...x, question: e.target.value } : x))
            }
            placeholder="Question text..."
            className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            data-testid={`input-question-${i}-text`}
          />
          <div className="grid grid-cols-2 gap-2">
            {(["A", "B", "C", "D"] as const).map(opt => {
              const key = `option${opt}` as "optionA" | "optionB" | "optionC" | "optionD";
              return (
                <div key={opt} className="relative">
                  <input
                    value={q[key]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setQuestions(qs => qs.map((x, idx) => idx === i ? { ...x, [key]: e.target.value } : x))
                    }
                    placeholder={`Option ${opt}`}
                    className={`w-full rounded-xl border-2 bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8 ${q.correctAnswer === opt ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : "border-input"}`}
                    data-testid={`input-question-${i}-option-${opt}`}
                  />
                  <button
                    onClick={() => setQuestions(qs => qs.map((x, idx) => idx === i ? { ...x, correctAnswer: opt } : x))}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold rounded px-1 ${q.correctAnswer === opt ? "text-blue-600" : "text-muted-foreground hover:text-blue-500"}`}
                    title={`Mark ${opt} as correct`}
                    data-testid={`button-correct-${i}-${opt}`}
                  >
                    {q.correctAnswer === opt ? "✓" : opt}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Click the letter to mark correct (currently: <span className="font-bold text-blue-600">{q.correctAnswer}</span>)
          </p>
        </div>
      ))}
    </div>
  );
}

function ContentSectionEditor({
  sections,
  setSections,
}: {
  sections: ContentFormSection[];
  setSections: React.Dispatch<React.SetStateAction<ContentFormSection[]>>;
}) {
  return (
    <div className="space-y-3">
      {sections.map((sec, i) => (
        <div key={i} className="rounded-2xl border-2 border-input p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Section {i + 1}</p>
            {sections.length > 1 && (
              <button
                onClick={() => setSections(ss => ss.filter((_, idx) => idx !== i))}
                className="p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <input
            value={sec.heading}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSections(ss => ss.map((s, idx) => idx === i ? { ...s, heading: e.target.value } : s))
            }
            placeholder="Section heading (e.g. What is a Budget?)"
            className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            data-testid={`input-section-${i}-heading`}
          />
          <textarea
            value={sec.body}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setSections(ss => ss.map((s, idx) => idx === i ? { ...s, body: e.target.value } : s))
            }
            rows={3}
            placeholder="Explanation or definition..."
            className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            data-testid={`input-section-${i}-body`}
          />
          <input
            value={sec.examples}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSections(ss => ss.map((s, idx) => idx === i ? { ...s, examples: e.target.value } : s))
            }
            placeholder="Examples (comma-separated): Food, Water, Shelter"
            className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            data-testid={`input-section-${i}-examples`}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => setSections(ss => [...ss, emptySection()])}
        className="w-full rounded-2xl border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" /> Add Content Section
      </Button>
    </div>
  );
}

function MetaFields({
  title, setTitle,
  instructor, setInstructor,
  subject, setSubject,
  gradeLevel, setGradeLevel,
  topic, setTopic,
  duration, setDuration,
  videoUrl, setVideoUrl,
  objectives, setObjectives,
}: {
  title: string; setTitle: (v: string) => void;
  instructor: string; setInstructor: (v: string) => void;
  subject: string; setSubject: (v: string) => void;
  gradeLevel: string; setGradeLevel: (v: string) => void;
  topic: string; setTopic: (v: string) => void;
  duration: string; setDuration: (v: string) => void;
  videoUrl: string; setVideoUrl: (v: string) => void;
  objectives: string[]; setObjectives: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-bold">Lesson Title <span className="text-red-500">*</span></label>
        <input
          required value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder="e.g. Introduction to Budgeting"
          className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
          data-testid="input-lesson-title"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold">Instructor</label>
          <input value={instructor}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstructor(e.target.value)}
            placeholder="e.g. Ms. Johnson"
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            data-testid="input-lesson-instructor"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold">Grade Level</label>
          <input value={gradeLevel}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGradeLevel(e.target.value)}
            placeholder="e.g. Grade 9"
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            data-testid="input-lesson-grade"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold">Subject</label>
          <input value={subject}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
            placeholder="Financial Literacy"
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            data-testid="input-lesson-subject"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold">Duration</label>
          <input value={duration}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuration(e.target.value)}
            placeholder="45 minutes"
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            data-testid="input-lesson-duration"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold">Topic</label>
        <input value={topic}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
          placeholder="e.g. Needs vs Wants"
          className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
          data-testid="input-lesson-topic"
        />
      </div>
      <VideoField value={videoUrl} onChange={setVideoUrl} />
      <div className="space-y-1.5">
        <label className="text-xs font-bold">Learning Objectives (one per line)</label>
        <textarea
          value={objectives.join("\n")}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setObjectives(e.target.value.split("\n"))
          }
          rows={3}
          placeholder="Students will identify needs vs wants&#10;Students will create a basic budget"
          className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          data-testid="input-lesson-objectives"
        />
      </div>
    </div>
  );
}

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
              <h2 className="font-display font-bold text-xl">Create New Lesson</h2>
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
              <h2 className="font-display font-bold text-xl">Edit Lesson</h2>
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
            <h2 className="font-display font-bold text-xl">Delete Lesson?</h2>
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

function LessonCard({ lesson }: { lesson: LessonPlan }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

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
      {showEdit && <EditLessonModal lesson={lesson} onClose={() => setShowEdit(false)} />}
      {showDelete && <DeleteConfirmDialog lesson={lesson} onClose={() => setShowDelete(false)} />}
      <Card
        className={`glass-card rounded-glass transition-all ${lesson.is_published ? "border-blue-200 dark:border-blue-800" : "border-dashed"}`}
        data-testid={`card-lesson-${lesson.id}`}
      >
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
