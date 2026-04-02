import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, BookOpen, CheckCircle2, XCircle, Trophy,
  Star, Award, Loader2, ChevronRight, Clock, GraduationCap,
  Target, ListChecks, BookMarked, KeyRound
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  title: string;
  instructor?: string;
  subject?: string;
  grade_level?: string;
  topic?: string;
  duration?: string;
  objectives: string[];
  content_sections: ContentSection[];
  is_published: boolean;
  created_at: string;
};
type LessonWithQuestions = Lesson & { questions: QuizQuestion[] };

type PageState = "list" | "reading" | "quiz" | "results";

const OPTIONS: ("option_a" | "option_b" | "option_c" | "option_d")[] = ["option_a", "option_b", "option_c", "option_d"];
const LETTERS = ["A", "B", "C", "D"];

export default function Lessons() {
  const [pageState, setPageState] = useState<PageState>("list");
  const [selectedLesson, setSelectedLesson] = useState<LessonWithQuestions | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [quizResults, setQuizResults] = useState<any>(null);

  // Inline join code state (for empty state)
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const { data: lessons = [], isLoading } = useQuery<Lesson[]>({
    queryKey: ["/api/lessons"],
  });

  const handleJoinCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setJoinError("Please enter a code."); return; }
    setIsJoining(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      // First validate the code type
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

      const label = checkData.type === "org"
        ? `${checkData.name} — ${checkData.envName}`
        : checkData.name;
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

  const openLesson = async (lesson: Lesson) => {
    try {
      const res = await fetch(`/api/lessons/${lesson.id}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to load lesson" }));
        throw new Error(err.message ?? "Failed to load lesson");
      }
      const data: LessonWithQuestions = await res.json();
      setSelectedLesson(data);
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

  const startQuiz = () => {
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setAnswers([]);
    setPageState("quiz");
  };

  const handleAnswer = (letter: string) => {
    if (showResult || !selectedLesson) return;
    const q = selectedLesson.questions[currentQ];
    setSelected(letter);
    setShowResult(true);

    // Record this answer; derive correctness purely from answers + questions
    const newAnswers = [...answers, letter];
    setAnswers(newAnswers);

    setTimeout(async () => {
      if (currentQ < selectedLesson.questions.length - 1) {
        setCurrentQ(i => i + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        // Quiz finished — send full answers array; server computes the score
        const result = await completeMutation.mutateAsync({
          id: selectedLesson.id,
          answers: newAnswers,
        });
        // Use server-returned correctAnswers and total for results page
        setQuizResults({
          ...result,
          finalCorrect: result.correctAnswers ?? newAnswers.filter((a, i) => a === selectedLesson.questions[i]?.correct_answer).length,
          total: result.total ?? selectedLesson.questions.length,
        });
        setPageState("results");
      }
    }, 1400);
  };

  const goBack = () => {
    setPageState("list");
    setSelectedLesson(null);
  };

  const currentQuestion = selectedLesson?.questions[currentQ];

  // Derive correct count from answers array — single source of truth
  const correctCount = selectedLesson
    ? answers.reduce(
        (acc, ans, i) => acc + (ans === selectedLesson.questions[i]?.correct_answer ? 1 : 0),
        0
      )
    : 0;
  const pct = selectedLesson ? Math.round(((quizResults?.finalCorrect ?? correctCount) / (selectedLesson.questions.length || 1)) * 100) : 0;

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">

          {/* ── Lesson List ── */}
          {pageState === "list" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-white" data-testid="text-lessons-title">
                  My Lessons
                </h1>
                <p className="text-white/70 mt-1">Curriculum from your school — read, learn, and quiz yourself.</p>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-white/60" />
                </div>
              ) : lessons.length === 0 ? (
                <div className="space-y-4">
                  <div className="glass-card rounded-glass p-10 text-center">
                    <BookOpen className="w-12 h-12 text-teal-400 mx-auto mb-3 opacity-60" />
                    <p className="font-bold text-lg">No lessons yet</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Enter your class or organization code below to unlock your lessons.
                    </p>
                  </div>
                  <div className="glass-card rounded-glass p-6 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <KeyRound className="w-5 h-5 text-violet-500" />
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
                    {joinError && (
                      <p className="text-destructive text-sm font-medium" data-testid="text-join-error">{joinError}</p>
                    )}
                    {joinSuccess && (
                      <p className="text-green-600 dark:text-green-400 text-sm font-medium" data-testid="text-join-success">{joinSuccess}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons.map((lesson) => (
                    <Card
                      key={lesson.id}
                      className="glass-card rounded-glass border-0 cursor-pointer hover:scale-[1.01] transition-all"
                      onClick={() => openLesson(lesson)}
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
                              <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-medium">
                                {lesson.subject}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                            {lesson.instructor && (
                              <span className="flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5" /> {lesson.instructor}
                              </span>
                            )}
                            {lesson.grade_level && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5" /> Grade {lesson.grade_level}
                              </span>
                            )}
                            {lesson.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {lesson.duration}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Reading View ── */}
          {pageState === "reading" && selectedLesson && (
            <div className="space-y-6 animate-bounce-in">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-2xl border-2" onClick={goBack} data-testid="button-back-lessons">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="font-display text-2xl font-bold text-white" data-testid="text-lesson-title">{selectedLesson.title}</h1>
                  <div className="flex items-center gap-3 text-white/60 text-sm flex-wrap mt-0.5">
                    {selectedLesson.instructor && <span>{selectedLesson.instructor}</span>}
                    {selectedLesson.subject && <span>· {selectedLesson.subject}</span>}
                    {selectedLesson.grade_level && <span>· Grade {selectedLesson.grade_level}</span>}
                    {selectedLesson.duration && <span>· {selectedLesson.duration}</span>}
                  </div>
                </div>
              </div>

              {/* Learning Objectives */}
              {selectedLesson.objectives.length > 0 && (
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-6">
                    <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <Target className="w-4 h-4 text-violet-600" />
                      </div>
                      Learning Objectives
                    </h2>
                    <ul className="space-y-2">
                      {selectedLesson.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm" data-testid={`objective-${i}`}>
                          <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-teal-600 dark:text-teal-400 font-bold text-xs">{i + 1}</span>
                          </div>
                          <span className="text-foreground">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Content Sections */}
              {selectedLesson.content_sections.length > 0 && selectedLesson.content_sections.map((section, i) => (
                <Card key={i} className="glass-card rounded-glass border-0">
                  <CardContent className="p-6">
                    <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-amber-600" />
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
                            <span key={j} className="text-sm bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-200 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 font-medium" data-testid={`example-${i}-${j}`}>
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Start Quiz Button */}
              {selectedLesson.questions.length > 0 && (
                <Card className="glass-card-coral rounded-glass border-0">
                  <CardContent className="p-6 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-gray-800">Ready to test yourself?</h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {selectedLesson.questions.length} multiple-choice question{selectedLesson.questions.length !== 1 ? "s" : ""} · Earn XP for correct answers
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
                    <span className="text-sm font-bold text-white/70">
                      Question {currentQ + 1} / {selectedLesson.questions.length}
                    </span>
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
                  <h2 className="text-xl font-bold leading-relaxed" data-testid="text-quiz-question">
                    {currentQuestion.question}
                  </h2>
                </CardContent>
              </Card>

              <div className="grid gap-3">
                {OPTIONS.map((opt, i) => {
                  const letter = LETTERS[i];
                  const optionText = currentQuestion[opt];
                  const isSelected = selected === letter;
                  const isCorrect = letter === currentQuestion.correct_answer;

                  let cls = "border-gray-200 dark:border-gray-700 hover:border-teal-400 hover:scale-[1.01]";
                  if (showResult) {
                    if (isCorrect) cls = "border-green-500 bg-green-50 dark:bg-green-950/30 scale-[1.01]";
                    else if (isSelected) cls = "border-red-500 bg-red-50 dark:bg-red-950/30";
                    else cls = "border-gray-200 dark:border-gray-700 opacity-50";
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
                        "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}>
                        {showResult && isCorrect ? <CheckCircle2 className="w-5 h-5" /> :
                         showResult && isSelected ? <XCircle className="w-5 h-5" /> : letter}
                      </span>
                      <span className="font-medium text-sm leading-snug">{optionText}</span>
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
                <p className="text-white/70 mt-2">{selectedLesson.title}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-teal-600" data-testid="text-quiz-score">{quizResults.finalCorrect}/{quizResults.total}</p>
                    <p className="text-xs font-bold text-gray-500 mt-1">Correct</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{pct}%</p>
                    <p className="text-xs font-bold text-gray-500 mt-1">Score</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass border-0">
                  <CardContent className="p-4 text-center">
                    <span className="xp-pill text-lg" data-testid="text-xp-earned">+{quizResults.xpEarned}</span>
                    <p className="text-xs font-bold text-gray-500 mt-1">XP Earned</p>
                  </CardContent>
                </Card>
              </div>

              {pct === 100 && (
                <Card className="glass-card-coral rounded-glass border-0">
                  <CardContent className="p-4">
                    <p className="font-bold flex items-center justify-center gap-2 text-gray-800">
                      <Award className="w-5 h-5 text-orange-500" /> Perfect Score! Outstanding work!
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3 justify-center flex-wrap">
                <Button
                  variant="outline"
                  onClick={startQuiz}
                  className="rounded-2xl border-2 font-bold"
                  data-testid="button-retry-quiz"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => setPageState("reading")}
                  className="rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 font-bold"
                  data-testid="button-back-to-lesson"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Review Lesson
                </Button>
                <Button
                  onClick={goBack}
                  variant="outline"
                  className="rounded-2xl border-2 font-bold"
                  data-testid="button-all-lessons"
                >
                  All Lessons
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
