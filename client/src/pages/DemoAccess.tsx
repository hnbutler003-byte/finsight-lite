import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap, Users, BookOpen, Trophy, Zap,
  School, ArrowRight, Sparkles, CheckCircle, Star
} from "lucide-react";

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
  "Leaderboards & XP reward system",
  "Progress tracking & analytics",
];

export default function DemoAccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: creds, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/demo/credentials"],
    retry: false,
  });

  const setupMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/demo/setup").then(r => r.json()),
    onSuccess: () => { refetch(); },
    onError: () => toast({ title: "Setup failed", description: "Please try again.", variant: "destructive" }),
  });

  useEffect(() => {
    if (!isLoading && !creds) {
      setupMut.mutate();
    }
  }, [isLoading, creds]);

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

  const isSettingUp = isLoading || setupMut.isPending || !creds;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-none block">FinSight Lite</span>
            <span className="text-violet-300 text-xs">Financial Literacy Platform</span>
          </div>
        </div>
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
          <Sparkles className="w-3 h-3 mr-1" /> Demo Access — No Sign-Up Required
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          Explore FinSight Lite
          <span className="block text-violet-300 text-3xl sm:text-4xl mt-1">for Schools & Organizations</span>
        </h1>
        <p className="text-violet-200 text-lg max-w-xl mx-auto">
          Try the full platform instantly — no registration, no credit card. Experience both the Teacher Dashboard and Student view with pre-loaded demo data.
        </p>
      </section>

      {/* Demo Login Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        {isSettingUp ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-6 py-3 text-white">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Setting up demo environment...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Teacher Card */}
            <Card className="bg-gradient-to-br from-emerald-900/80 to-teal-900/80 border border-emerald-700/50 shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-xl">Teacher View</h2>
                    <p className="text-emerald-300 text-sm">Classroom management portal</p>
                  </div>
                </div>

                <div className="bg-black/20 rounded-xl p-4 mb-5 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-300">Name</span>
                    <span className="text-white font-semibold">{creds.teacher.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-300">School</span>
                    <span className="text-white">{creds.teacher.school}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-300">Email</span>
                    <span className="text-white font-mono text-xs">{creds.teacher.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-300">Password</span>
                    <span className="text-white font-mono text-xs">demo1234</span>
                  </div>
                  {creds.class && (
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-emerald-700/40">
                      <span className="text-emerald-300">Demo Class</span>
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
                      <div key={i} className="bg-emerald-800/40 rounded-lg p-2">
                        <Icon className="w-4 h-4 text-emerald-300 mx-auto mb-1" />
                        <p className="text-emerald-200 text-xs">{f.label}</p>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={() => loginTeacher.mutate()}
                  disabled={loginTeacher.isPending}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 text-base shadow-lg"
                  data-testid="button-demo-teacher-login"
                >
                  {loginTeacher.isPending ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Entering...</>
                  ) : (
                    <>Enter as Teacher <ArrowRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Students Card */}
            <Card className="bg-gradient-to-br from-violet-900/80 to-purple-900/80 border border-violet-700/50 shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-xl">Student View</h2>
                    <p className="text-violet-300 text-sm">Pick any student to explore as</p>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  {(creds.students || []).map((student: any, i: number) => {
                    const progressLabels = ["480 XP · Level 5", "310 XP · Level 4", "150 XP · Level 2", "220 XP · Level 3"];
                    const lessonLabels = ["5/6 lessons", "4/6 lessons", "3/6 lessons", "4/6 lessons"];
                    return (
                      <button
                        key={student.id}
                        onClick={() => handleStudentLogin(student.id)}
                        disabled={loginStudent.isPending}
                        data-testid={`button-demo-student-${student.id}`}
                        className="w-full flex items-center gap-3 bg-black/20 hover:bg-violet-800/40 rounded-xl p-3 transition-colors text-left group"
                      >
                        <div className="w-10 h-10 bg-violet-700 rounded-full flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                          {AVATAR_EMOJI[student.avatar] || "🎓"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{student.name}</span>
                            <span className="text-violet-400 text-xs font-mono">@{student.username}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-violet-300 text-xs">{progressLabels[i]}</span>
                            <span className="text-violet-400 text-xs">{lessonLabels[i]}</span>
                          </div>
                        </div>
                        {loadingId === student.id && loginStudent.isPending ? (
                          <div className="w-4 h-4 border-2 border-violet-300 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-violet-400 group-hover:text-white flex-shrink-0 transition-colors" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-violet-400 text-xs text-center">
                  Each student has different XP, progress, and lesson completion — great for exploring the leaderboard
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Features section */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <School className="w-5 h-5 text-violet-300" />
            <h3 className="text-white font-bold text-lg">What's included in the demo</h3>
            <Badge className="bg-violet-600/30 text-violet-300 border-violet-600/30 ml-auto">Full Platform Access</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURE_LIST.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-violet-200 text-sm">{f}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-violet-300">
              <Star className="w-4 h-4 text-amber-400" /> Designed for Caribbean students aged 12–17
            </div>
            <div className="flex items-center gap-1.5 text-violet-300">
              <Zap className="w-4 h-4 text-emerald-400" /> BSD currency & Bahamian context
            </div>
            <div className="flex items-center gap-1.5 text-violet-300">
              <CheckCircle className="w-4 h-4 text-blue-400" /> BGCSE exam preparation built in
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-violet-400 text-sm mb-3">Interested in deploying FinSight Lite at your school or organization?</p>
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
