import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, Gamepad2, Clock, Zap, Play, CheckCircle2, XCircle,
  Trophy, Flame, Star, Award, Loader2, ChevronRight, Timer
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type GameMode = "quiz" | "timed" | "challenge";
type GameState = "select" | "mode" | "playing" | "results";

interface Question {
  id: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  subject: string | null;
  difficulty: string | null;
}

const MODE_INFO = {
  quiz: { label: "Quiz Mode", icon: Gamepad2, color: "from-green-500 to-emerald-500", desc: "No time pressure. Learn at your pace.", emoji: "📝" },
  timed: { label: "Timed Exam", icon: Clock, color: "from-blue-500 to-cyan-500", desc: "30 seconds per question. Beat the clock!", emoji: "⏱️" },
  challenge: { label: "Challenge Mode", icon: Zap, color: "from-orange-500 to-red-500", desc: "Streak scoring + speed bonus. Go fast!", emoji: "🔥" },
};

export default function MoneyLabPlay() {
  const [gameState, setGameState] = useState<GameState>("select");
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
  const [mode, setMode] = useState<GameMode>("quiz");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timer, setTimer] = useState(30);
  const [streak, setStreak] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [gameResults, setGameResults] = useState<any>(null);

  const { data: papers, isLoading: papersLoading } = useQuery<any[]>({
    queryKey: ["/api/moneylab/papers/all"],
    queryFn: async () => {
      const res = await fetch("/api/moneylab/papers/all?limit=200", { credentials: "include" });
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/moneylab/games/submit", data);
      return res.json();
    },
  });

  // Timer for timed & challenge modes
  useEffect(() => {
    if (gameState !== "playing" || mode === "quiz" || showResult) return;
    if (timer <= 0) {
      handleAnswer(null);
      return;
    }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [gameState, mode, timer, showResult]);

  const startGame = async (paperId: number, selectedMode: GameMode) => {
    try {
      const res = await fetch(`/api/moneylab/papers/${paperId}`, { credentials: "include" });
      const data = await res.json();
      if (data.questions?.length > 0) {
        const shuffled = [...data.questions].sort(() => Math.random() - 0.5);
        setQuestions(shuffled.slice(0, 20));
        setMode(selectedMode);
        setCurrentIndex(0);
        setScore(0);
        setCorrectCount(0);
        setAnswers([]);
        setSelectedAnswer(null);
        setShowResult(false);
        setStreak(0);
        setTimer(selectedMode === "challenge" ? 15 : 30);
        setStartTime(Date.now());
        setGameState("playing");
      }
    } catch (e) {
      console.error("Failed to load questions:", e);
    }
  };

  const handleAnswer = useCallback((answer: string | null) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);

    const q = questions[currentIndex];
    const isCorrect = answer === q.correctAnswer;

    let pts = 0;
    if (isCorrect) {
      pts = 10;
      if (mode === "challenge") {
        pts += streak * 5 + Math.max(0, timer);
      } else if (mode === "timed") {
        pts += Math.max(0, timer);
      }
      setScore((s) => s + pts);
      setCorrectCount((c) => c + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }

    setAnswers((prev) => [...prev, answer]);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimer(mode === "challenge" ? 15 : 30);
      } else {
        finishGame(pts, isCorrect);
      }
    }, 1500);
  }, [showResult, questions, currentIndex, mode, streak, timer]);

  const finishGame = async (lastCorrectPts: number, lastWasCorrect: boolean) => {
    const finalCorrect = correctCount + (lastWasCorrect ? 1 : 0);
    const finalScore = score + lastCorrectPts;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    const result = await submitMutation.mutateAsync({
      paperId: selectedPaperId,
      mode,
      score: finalScore,
      totalQuestions: questions.length,
      correctAnswers: finalCorrect,
      timeSpent,
    });

    setGameResults({ ...result, finalScore, finalCorrect, totalQ: questions.length });
    setGameState("results");
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {gameState === "select" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Link href="/moneylab">
                  <Button variant="outline" size="icon" className="rounded-2xl border-2" data-testid="button-back">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="font-display text-2xl font-bold" data-testid="text-play-title">Play Exam Game</h1>
                  <p className="text-sm text-muted-foreground">Choose a paper to play</p>
                </div>
              </div>

              {papersLoading ? (
                <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
              ) : !papers?.length ? (
                <Card className="rounded-3xl border-2 border-dashed">
                  <CardContent className="p-8 text-center">
                    <p className="text-lg font-bold">No papers available yet</p>
                    <p className="text-muted-foreground mt-1">Upload a past paper first to start playing!</p>
                    <Link href="/moneylab/upload">
                      <Button className="mt-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500" data-testid="button-go-upload">
                        Upload Paper
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {papers.map((paper: any) => (
                    <Card
                      key={paper.id}
                      className="rounded-2xl border-2 hover:border-teal-200 dark:hover:border-teal-800 cursor-pointer transition-all hover:scale-[1.01]"
                      onClick={() => { setSelectedPaperId(paper.id); setGameState("mode"); }}
                      data-testid={`paper-select-${paper.id}`}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md text-lg">
                          {paper.questionCount}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">{paper.title}</p>
                          <p className="text-sm text-muted-foreground">{paper.subject} · {paper.questionCount} questions</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {gameState === "mode" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-2xl border-2" onClick={() => setGameState("select")} data-testid="button-back-mode">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="font-display text-2xl font-bold">Choose Game Mode</h1>
                  <p className="text-sm text-muted-foreground">How do you want to play?</p>
                </div>
              </div>

              <div className="grid gap-4">
                {(Object.entries(MODE_INFO) as [GameMode, typeof MODE_INFO.quiz][]).map(([key, info]) => (
                  <Card
                    key={key}
                    className="rounded-2xl border-2 hover:border-teal-200 dark:hover:border-teal-800 cursor-pointer transition-all hover:scale-[1.02]"
                    onClick={() => startGame(selectedPaperId!, key)}
                    data-testid={`mode-${key}`}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${info.color} flex items-center justify-center text-3xl shadow-lg`}>
                        {info.emoji}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-lg">{info.label}</h3>
                        <p className="text-sm text-muted-foreground">{info.desc}</p>
                      </div>
                      <Play className="w-6 h-6 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {gameState === "playing" && currentQuestion && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground">
                    Q{currentIndex + 1}/{questions.length}
                  </span>
                  <div className="h-2 w-32 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all"
                      style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {mode !== "quiz" && (
                    <div className={`flex items-center gap-1.5 font-bold ${timer <= 5 ? "text-red-500 animate-pulse" : "text-blue-500"}`}>
                      <Timer className="w-4 h-4" />
                      {timer}s
                    </div>
                  )}
                  {mode === "challenge" && streak > 0 && (
                    <div className="flex items-center gap-1 text-orange-500 font-bold">
                      <Flame className="w-4 h-4" />
                      {streak}x
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-4 h-4" />
                    {score}
                  </div>
                </div>
              </div>

              <Card className="glass-card rounded-glass">
                <CardContent className="p-6 lg:p-8">
                  <div className="mb-2 flex gap-2">
                    {currentQuestion.subject && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                        {currentQuestion.subject}
                      </span>
                    )}
                    {currentQuestion.difficulty && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        currentQuestion.difficulty === "easy" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                        currentQuestion.difficulty === "hard" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}>
                        {currentQuestion.difficulty}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold leading-relaxed" data-testid="text-question">
                    {currentQuestion.questionText}
                  </h2>
                </CardContent>
              </Card>

              <div className="grid gap-3">
                {currentQuestion.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isSelected = selectedAnswer === opt;
                  const isCorrect = opt === currentQuestion.correctAnswer;
                  let borderClass = "border-gray-200 dark:border-gray-700 hover:border-teal-400 hover:scale-[1.01]";
                  if (showResult) {
                    if (isCorrect) borderClass = "border-green-500 bg-green-50 dark:bg-green-950/30 scale-[1.01]";
                    else if (isSelected && !isCorrect) borderClass = "border-red-500 bg-red-50 dark:bg-red-950/30";
                    else borderClass = "border-gray-200 dark:border-gray-700 opacity-60";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => !showResult && handleAnswer(opt)}
                      disabled={showResult}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${borderClass}`}
                      data-testid={`option-${i}`}
                    >
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                        showResult && isCorrect ? "bg-green-500 text-white" :
                        showResult && isSelected ? "bg-red-500 text-white" :
                        "bg-gray-100 dark:bg-gray-800"
                      }`}>
                        {showResult && isCorrect ? <CheckCircle2 className="w-4 h-4" /> :
                         showResult && isSelected ? <XCircle className="w-4 h-4" /> : letter}
                      </span>
                      <span className="font-medium text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {gameState === "results" && gameResults && (
            <div className="space-y-6 text-center animate-bounce-in">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-xl text-5xl">
                {gameResults.finalCorrect >= gameResults.totalQ * 0.8 ? "🏆" :
                 gameResults.finalCorrect >= gameResults.totalQ * 0.5 ? "⭐" : "💪"}
              </div>
              <h1 className="font-display text-3xl font-bold">Game Over!</h1>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{gameResults.finalScore}</p>
                    <p className="text-xs font-bold text-muted-foreground">Score</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{gameResults.finalCorrect}/{gameResults.totalQ}</p>
                    <p className="text-xs font-bold text-muted-foreground">Correct</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-4 text-center">
                    <span className="xp-pill text-lg">+{gameResults.xpEarned} XP</span>
                    <p className="text-xs font-bold text-muted-foreground mt-1">XP Earned</p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">Lv.{gameResults.level}</p>
                    <p className="text-xs font-bold text-muted-foreground">Level</p>
                  </CardContent>
                </Card>
              </div>

              {gameResults.streak > 0 && (
                <div className="flex items-center justify-center gap-2 text-orange-500 font-bold">
                  <Flame className="w-5 h-5" />
                  {gameResults.streak} day streak!
                </div>
              )}

              {gameResults.newBadges?.length > 0 && (
                <Card className="glass-card-coral rounded-glass">
                  <CardContent className="p-4">
                    <p className="font-bold mb-2 flex items-center justify-center gap-1 text-foreground">
                      <Award className="w-4 h-4 text-orange-500" /> New Badge{gameResults.newBadges.length > 1 ? "s" : ""}!
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {gameResults.newBadges.map((id: string) => (
                        <span key={id} className="badge-coral">
                          {id.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setGameState("select")}
                  variant="outline"
                  className="rounded-2xl border-2 font-bold"
                  data-testid="button-play-again"
                >
                  Play Again
                </Button>
                <Link href="/moneylab/leaderboard">
                  <Button className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 font-bold" data-testid="button-leaderboard">
                    <Trophy className="w-4 h-4 mr-2" />
                    Leaderboard
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
