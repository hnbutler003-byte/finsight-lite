import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap, Users, BookOpen, Trophy,
  School, ArrowRight, Sparkles, CheckCircle, Star, Zap, ShieldCheck, Flame, X
} from "lucide-react";
import { FinsightLiteLogo } from "@/components/FinsightLiteLogo";

const AVATAR_EMOJI: Record<string, string> = {
  lion: "🦁", dolphin: "🐬", parrot: "🦜", turtle: "🐢",
  star: "⭐", butterfly: "🦋", octopus: "🐙", artist: "🎨",
  rocket: "🚀", wave: "🌊", palm: "🌴", gamer: "🎮",
};

const FEATURE_LIST = [
  "6 interactive financial literacy modules",
  "7 money games with real-time scoring",
  "Investment simulator with BSD currency",
  "MoneyLab exam-style quiz platform",
  "AI Money Guide chatbot",
  "Teacher dashboard with class management",
  "Leaderboards and XP reward system",
  "Progress tracking and analytics",
];

export default function DemoAccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return localStorage.getItem("finsight_demo_welcome_dismissed") !== "1"; } catch { return true; }
  });
  const dismissWelcome = () => {
    setShowWelcome(false);
    try { localStorage.setItem("finsight_demo_welcome_dismissed", "1"); } catch {}
  };

  const { data: creds, isLoading, isFetching, refetch } = useQuery<any>({
    queryKey: ["/api/demo/credentials"],
    retry: false,
  });

  const setupMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/demo/setup").then(r => r.json()),
    onSuccess: () => { refetch(); },
    onError: () => toast({ title: "Setup failed", description: "We could not load the demo. Please retry.", variant: "destructive" }),
  });

  // The credentials endpoint self-seeds, so a query error is rare. If it does fail,
  // fall back to an explicit setup call. setupMut.isIdle keeps this from looping.
  useEffect(() => {
    if (!isLoading && !creds && setupMut.isIdle) {
      setupMut.mutate();
    }
  }, [isLoading, creds, setupMut.isIdle]);

  const loginTeacher = useMutation({
    mutationFn: () => apiRequest("POST", "/api/demo/login/teacher").then(r => r.json()),
    onSuccess: () => { window.location.href = "/teacher/dashboard"; },
    onError: () => toast({ title: "Login failed", description: "Please try again.", variant: "destructive" }),
  });

  const loginStudent = useMutation({
    mutationFn: (studentId: string) => apiRequest("POST", `/api/demo/login/student/${studentId}`).then(r => r.json()),
    onSuccess: () => { window.location.href = "/"; },
    onError: () => toast({ title: "Login failed", description: "Please try again.", variant: "destructive" }),
  });

  const handleStudentLogin = (studentId: string) => {
    setLoadingId(studentId);
    loginStudent.mutate(studentId);
  };

  // Three explicit states so a failed setup never leaves an endless spinner:
  // creds present -> cards; setup failed -> retry; otherwise -> spinner.
  // demoFailed covers both an errored setup and a setup that finished while the
  // credentials read still returns nothing (so the spinner can never hang).
  const demoFailed = !creds && !isFetching && (setupMut.isError || setupMut.isSuccess);
  const isSettingUp = !creds && !demoFailed;

  const featuredStudent = creds?.students?.[0];
  const secondaryStudent = creds?.students?.[1];

  return (
    <div className="min-h-screen caribbean-bg">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <FinsightLiteLogo size={34} className="text-white" data-testid="img-logo-demo" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setLocation("/")}
            className="text-violet-300 hover:text-white hover:bg-white/10 text-sm">
            Student Login
          </Button>
          <Button variant="ghost" onClick={() => setLocation("/teacher/login")}
            className="text-violet-300 hover:text-white hover:bg-white/10 text-sm">
            Teacher Login
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center px-6 pt-8 pb-12 max-w-3xl mx-auto">
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 mb-4 px-3 py-1">
          <Sparkles className="w-3 h-3 mr-1" /> Demo Access: No Sign-Up Required
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          Explore Finsight Lite
          <span className="block text-violet-300 text-3xl sm:text-4xl mt-1">for Schools and Organizations</span>
        </h1>
        <p className="text-violet-200 text-lg max-w-xl mx-auto">
          Try the full platform instantly. No registration, no credit card needed. Experience both the Teacher Dashboard and Student view with pre-loaded demo data.
        </p>
      </section>

      {/* First-load welcome banner */}
      {showWelcome && (
        <section className="max-w-6xl mx-auto px-6 pb-3">
          <div className="relative glass-card-heavy rounded-glass p-5 pr-12 border border-white/15" data-testid="banner-demo-welcome">
            <button
              onClick={dismissWelcome}
              aria-label="Dismiss welcome message"
              data-testid="button-dismiss-welcome"
              className="absolute top-3 right-3 text-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-sm">
                <p className="font-bold text-foreground mb-1">Welcome to the Finsight Lite demo</p>
                <p className="text-foreground/70 leading-relaxed">
                  This demo has two sides. Choose <span className="font-semibold text-foreground">Enter as Teacher</span> below to explore the classroom dashboard with students, challenges, and a leaderboard. Or pick a <span className="font-semibold text-foreground">Student</span> to see the learner experience with money tools, lessons, and rewards. New here? Start with the Teacher view.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Demo Login Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="glass-card-heavy rounded-glass p-6 shadow-2xl">
        {demoFailed ? (
          <div className="text-center py-12" data-testid="state-demo-error">
            <p className="text-foreground font-semibold mb-1">We could not load the demo environment.</p>
            <p className="text-foreground/60 text-sm mb-5">This is usually temporary. Please try again.</p>
            <Button
              onClick={() => setupMut.mutate()}
              disabled={setupMut.isPending}
              className="bg-amber-400 hover:bg-amber-300 text-emerald-900 font-bold"
              data-testid="button-demo-retry"
            >
              {setupMut.isPending ? "Retrying..." : "Try again"}
            </Button>
          </div>
        ) : isSettingUp ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-6 py-3 text-foreground">
              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              Setting up demo environment...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Teacher Card (visually primary) */}
            <Card className="rounded-glass shadow-2xl border-2 border-emerald-400/60 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white">
              <CardContent className="p-6">
                {/* Header badge */}
                <div className="flex items-center gap-2 mb-5">
                  <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 font-bold tracking-widest text-xs px-3 py-1">
                    <ShieldCheck className="w-3 h-3 mr-1.5" /> EDUCATOR ACCESS
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shrink-0 ring-4 ring-emerald-400/30">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-2xl">Teacher View</h2>
                    <p className="text-emerald-200 text-sm">Full classroom management portal</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-5 space-y-2 border border-white/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-200 font-medium">Name</span>
                    <span className="text-white font-semibold">{creds.teacher.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-200 font-medium">School</span>
                    <span className="text-white">{creds.teacher.school}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-200 font-medium">Email</span>
                    <span className="text-white font-mono text-xs">{creds.teacher.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-200 font-medium">Password</span>
                    <span className="text-white font-mono text-xs">demo1234</span>
                  </div>
                  {creds.class && (
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-white/20">
                      <span className="text-emerald-200 font-medium">Demo Class</span>
                      <span className="text-white">{creds.class.name} <span className="font-mono text-amber-300">({creds.class.code})</span></span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-5 text-center">
                  {[
                    { icon: Users, label: `${creds.students?.length || 4} Students` },
                    { icon: BookOpen, label: "2 Challenges" },
                    { icon: Trophy, label: "Leaderboard" },
                  ].map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <div key={i} className="bg-white/10 rounded-lg p-2 border border-white/20">
                        <Icon className="w-4 h-4 text-emerald-300 mx-auto mb-1" />
                        <p className="text-emerald-100 text-xs font-medium">{f.label}</p>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={() => loginTeacher.mutate()}
                  disabled={loginTeacher.isPending}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-emerald-900 font-bold py-3 text-base shadow-lg"
                  data-testid="button-demo-teacher-login"
                >
                  {loginTeacher.isPending ? (
                    <><div className="w-4 h-4 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin mr-2" /> Entering...</>
                  ) : (
                    <>Enter as Teacher <ArrowRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Student Card (single featured student) */}
            <Card className="glass-card-coral rounded-glass shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-foreground font-bold text-xl">Student View</h2>
                    <p className="text-orange-700 dark:text-orange-400 text-sm">Jump in as a demo student</p>
                  </div>
                </div>

                {featuredStudent && (
                  <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-2">Featured Student</p>
                    <button
                      onClick={() => handleStudentLogin(featuredStudent.id)}
                      disabled={loginStudent.isPending}
                      data-testid={`button-demo-student-${featuredStudent.id}`}
                      className="w-full flex items-center gap-4 bg-orange-50/80 hover:bg-orange-100/90 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 rounded-2xl p-4 transition-colors text-left group border-2 border-orange-300/60 hover:border-orange-400/80"
                    >
                      <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                        {AVATAR_EMOJI[featuredStudent.avatar] || "🎓"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-foreground font-bold text-lg">{featuredStudent.name}</span>
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700 text-xs">Level 5</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-orange-600 dark:text-orange-400 text-sm font-semibold">480 XP</span>
                          <span className="text-orange-500 dark:text-orange-500 text-sm">5/6 lessons done</span>
                          <span className="flex items-center gap-1 text-orange-500 dark:text-orange-500 text-sm"><Flame className="w-3.5 h-3.5" /> 7-day streak</span>
                        </div>
                      </div>
                      {loadingId === featuredStudent.id && loginStudent.isPending ? (
                        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      ) : (
                        <ArrowRight className="w-5 h-5 text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 flex-shrink-0 transition-colors" />
                      )}
                    </button>
                  </div>
                )}

                <div className="bg-orange-50/60 dark:bg-orange-900/10 rounded-xl p-3 mb-4 border border-orange-200/40 dark:border-orange-700/30">
                  <p className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-widest mb-2">What you'll see</p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {["My Money dashboard with real transactions", "Active budgets and savings goals", "Investment portfolio (Commonwealth Bank)", "Lesson progress and XP rewards"].map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-foreground/70">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {secondaryStudent && (
                  <div className="text-center">
                    <p className="text-orange-600 dark:text-orange-500 text-xs mb-2">Or explore as a different student</p>
                    <button
                      onClick={() => handleStudentLogin(secondaryStudent.id)}
                      disabled={loginStudent.isPending}
                      data-testid={`button-demo-student-${secondaryStudent.id}`}
                      className="inline-flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 font-medium transition-colors"
                    >
                      <span className="text-base">{AVATAR_EMOJI[secondaryStudent.avatar] || "🎓"}</span>
                      {secondaryStudent.name} (Level 4, 310 XP)
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </section>

      {/* Features section */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="glass-card rounded-glass p-6">
          <div className="flex items-center gap-2 mb-5">
            <School className="w-5 h-5 text-violet-600" />
            <h3 className="text-violet-900 dark:text-violet-200 font-bold text-lg">What's included in the demo</h3>
            <Badge className="bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700 ml-auto">Full Platform Access</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURE_LIST.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-foreground/70 text-sm">{f}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-violet-200/60 dark:border-violet-700/40 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-300">
              <Star className="w-4 h-4 text-amber-500" /> Designed for Caribbean students aged 12 to 17
            </div>
            <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-300">
              <Zap className="w-4 h-4 text-emerald-500" /> BSD currency and Bahamian context
            </div>
            <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-300">
              <CheckCircle className="w-4 h-4 text-blue-500" /> BGCSE exam preparation built in
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-violet-400 text-sm mb-3">Interested in deploying Finsight Lite at your school or organization?</p>
          <Button variant="outline"
            className="border-violet-500 text-violet-300 hover:bg-violet-500 hover:text-white"
            onClick={() => setLocation("/teacher/register")}
            data-testid="button-demo-register">
            Register Your School <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </section>
    </div>
  );
}
