import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";
import { VideoField } from "@/components/VideoField";

// Shared building blocks for the 3-step lesson creation wizard, used by both
// the Org Admin lessons page and the Teacher class lessons tab.

export type QuizQuestion = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
};

export type ContentFormSection = { heading: string; body: string; examples: string };

export function emptyQuestion(): QuizQuestion {
  return { question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" };
}

export function emptySection(): ContentFormSection {
  return { heading: "", body: "", examples: "" };
}

export function buildContentSections(sections: ContentFormSection[]) {
  return sections
    .filter(s => s.heading.trim() || s.body.trim())
    .map(s => ({
      heading: s.heading,
      body: s.body,
      examples: s.examples ? s.examples.split(",").map(e => e.trim()).filter(Boolean) : [],
    }));
}

export function QuizEditor({
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

export function ContentSectionEditor({
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

export function MetaFields({
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
