import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, GraduationCap, Loader2, BookOpen, Sparkles, ChevronRight, Info, Search, Send
} from "lucide-react";

export default function MoneyLabTutor() {
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [explanation, setExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [freeQuestion, setFreeQuestion] = useState("");

  const { data: papers, isLoading: papersLoading } = useQuery<any[]>({
    queryKey: ["/api/moneylab/papers/all"],
  });

  const { data: paperData } = useQuery<{ paper: any; questions: any[] }>({
    queryKey: ["/api/moneylab/papers", selectedPaperId],
    enabled: !!selectedPaperId,
  });

  const explainQuestion = async (question: any) => {
    setSelectedQuestion(question);
    setExplanation("");
    setIsExplaining(true);

    try {
      const response = await fetch("/api/moneylab/tutor/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          subject: question.subject,
        }),
        credentials: "include",
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            const lines = part.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    fullContent += data.content;
                    setExplanation(fullContent);
                  }
                } catch (e) {
                  if (!(e instanceof SyntaxError)) throw e;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      setExplanation("Oops! Could not get an explanation right now. Try again!");
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/moneylab">
              <Button variant="outline" size="icon" className="rounded-2xl border-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold" data-testid="text-tutor-title">AI Tutor</h1>
              <p className="text-sm text-muted-foreground">Get simple explanations for any question</p>
            </div>
          </div>

          <Card className="rounded-3xl border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50/50 to-purple-50/50 dark:from-violet-950/10 dark:to-purple-950/10">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-violet-500" />
                <h2 className="font-display font-bold text-lg">Ask Any Question</h2>
              </div>
              <p className="text-sm text-muted-foreground">Type or paste any question and the AI Tutor will explain it for you</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!freeQuestion.trim() || isExplaining) return;
                  const q = {
                    questionText: freeQuestion.trim(),
                    options: null,
                    correctAnswer: null,
                    subject: null,
                  };
                  setSelectedPaperId(null);
                  explainQuestion(q);
                  setFreeQuestion("");
                }}
                className="flex gap-3"
              >
                <textarea
                  value={freeQuestion}
                  onChange={(e) => setFreeQuestion(e.target.value)}
                  placeholder="e.g. What is the difference between a balance sheet and an income statement?"
                  disabled={isExplaining}
                  rows={2}
                  className="flex-1 rounded-2xl border-2 border-violet-200 dark:border-violet-700 bg-card px-4 py-3 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:opacity-50 resize-none"
                  data-testid="input-free-question"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={!freeQuestion.trim() || isExplaining}
                  className="rounded-2xl px-5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg self-end"
                  data-testid="button-ask"
                >
                  {isExplaining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </form>
            </CardContent>
          </Card>

          {selectedQuestion && !selectedPaperId ? (
            <div className="space-y-4">
              <Card className="rounded-3xl border-2 border-violet-200 dark:border-violet-800">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg">{selectedQuestion.questionText}</h3>
                  {selectedQuestion.options && (
                    <div className="space-y-1.5 mt-3">
                      {selectedQuestion.options.map((opt: string, i: number) => (
                        <div key={i} className={`flex items-center gap-2 text-sm ${opt === selectedQuestion.correctAnswer ? "font-bold text-green-600" : "text-muted-foreground"}`}>
                          <span className="font-mono text-xs">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                          {opt === selectedQuestion.correctAnswer && " ✓"}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-2 border-dashed border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold flex items-center gap-1">
                      AI Tutor Explanation
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </h3>
                  </div>
                  {isExplaining && !explanation ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">Thinking...</span>
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{explanation}</div>
                  )}
                </CardContent>
              </Card>

              <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/20 p-4" data-testid="disclaimer-tutor-free">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Where does this explanation come from?</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      The AI Tutor is powered by <span className="font-bold">OpenAI's GPT-4o</span>, a large language model. 
                      It generates explanations based on the question text and its general knowledge. 
                      The AI does <span className="font-bold">not</span> pull from any official textbook, syllabus, or exam board database.
                      Explanations <span className="font-bold">may contain errors</span> — always verify with your teacher or official study materials.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : !selectedPaperId ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-bold uppercase tracking-wider">Or pick from uploaded papers</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {papersLoading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
              ) : !papers?.length ? (
                <Card className="rounded-3xl border-2 border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No papers available. Upload one first!
                  </CardContent>
                </Card>
              ) : (
                papers.map((paper: any) => (
                  <Card
                    key={paper.id}
                    className="rounded-2xl border-2 cursor-pointer hover:border-violet-200 dark:hover:border-violet-800 transition-all"
                    onClick={() => setSelectedPaperId(paper.id)}
                    data-testid={`tutor-paper-${paper.id}`}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-violet-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{paper.title}</p>
                        <p className="text-xs text-muted-foreground">{paper.subject} · {paper.questionCount} questions</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : !selectedQuestion ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSelectedPaperId(null); }} className="rounded-2xl border-2 text-xs font-bold">
                  <ArrowLeft className="w-3 h-3 mr-1" /> Back to Papers
                </Button>
              </div>
              <h2 className="font-bold text-lg">Select a question to explain</h2>
              {!paperData?.questions?.length ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
              ) : (
                paperData.questions.map((q: any, i: number) => (
                  <Card
                    key={q.id}
                    className="rounded-2xl border-2 cursor-pointer hover:border-violet-200 dark:hover:border-violet-800 transition-all"
                    onClick={() => explainQuestion(q)}
                    data-testid={`tutor-question-${q.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-bold text-violet-600 shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{q.questionText}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {q.options.join(" · ")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedQuestion(null); setExplanation(""); }}
                className="rounded-2xl border-2 text-xs font-bold"
              >
                <ArrowLeft className="w-3 h-3 mr-1" /> Back to Questions
              </Button>

              <Card className="rounded-3xl border-2 border-violet-200 dark:border-violet-800">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">{selectedQuestion.questionText}</h3>
                  <div className="space-y-1.5 mb-3">
                    {selectedQuestion.options.map((opt: string, i: number) => (
                      <div key={i} className={`flex items-center gap-2 text-sm ${opt === selectedQuestion.correctAnswer ? "font-bold text-green-600" : "text-muted-foreground"}`}>
                        <span className="font-mono text-xs">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                        {opt === selectedQuestion.correctAnswer && " ✓"}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-2 border-dashed border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold flex items-center gap-1">
                      AI Tutor Explanation
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </h3>
                  </div>
                  {isExplaining && !explanation ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">Thinking...</span>
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{explanation}</div>
                  )}
                </CardContent>
              </Card>

              <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/20 p-4" data-testid="disclaimer-tutor">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Where does this explanation come from?</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      The AI Tutor is powered by <span className="font-bold">OpenAI's GPT-4o</span>, a large language model. 
                      It generates explanations based on the question text, answer choices, and its general knowledge of the subject matter. 
                      The AI does <span className="font-bold">not</span> pull from any official textbook, syllabus, or exam board database.
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      While explanations are designed to be helpful and educational, they <span className="font-bold">may contain errors or inaccuracies</span>. 
                      Always verify important information with your teacher, textbook, or official study materials. 
                      This tool is meant to <span className="font-bold">supplement</span> your learning — not replace your teacher or curriculum.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
