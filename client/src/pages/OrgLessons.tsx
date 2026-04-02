import { OrgSidebar } from "@/components/layout/OrgSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrgAuth } from "@/hooks/use-org-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  BookOpen, Plus, Loader2, Eye, EyeOff, ChevronDown, ChevronUp,
  GraduationCap, Clock, Tag, Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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
  objectives: string[];
  content_sections: { heading: string; body: string; examples?: string[] }[];
  is_published: boolean;
  created_at: string;
};

function CreateLessonModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", instructor: "", subject: "Financial Literacy",
    gradeLevel: "", topic: "", duration: "45 minutes",
    objectivesRaw: "", contentHeading: "", contentBody: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
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
          objectives, contentSections,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      qc.invalidateQueries({ queryKey: ["/api/org-admin/lessons"] });
      qc.invalidateQueries({ queryKey: ["/api/org-admin/overview"] });
      toast({ title: "Lesson created!", description: "You can now add content and publish it." });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <Card className="rounded-3xl border-2 w-full max-w-lg shadow-2xl my-4" onClick={e => e.stopPropagation()}>
        <CardContent className="p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="font-display font-bold text-xl">Create New Lesson</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <textarea value={form.contentBody} onChange={set("contentBody")} rows={4}
                placeholder="A budget is a plan for how you will spend and save your money..."
                className="w-full rounded-2xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                data-testid="input-lesson-content-body" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-2xl">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                data-testid="button-create-lesson-confirm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Lesson"}
              </Button>
            </div>
          </form>
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
    onSuccess: () => {
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
