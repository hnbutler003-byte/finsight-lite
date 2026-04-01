import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles, Rocket, Coins, GraduationCap, TrendingUp,
  Loader2, ArrowRight, ArrowLeft, PartyPopper, BookOpen,
  Zap, User, School, KeyRound, RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

const AVATARS = [
  { id: "lion", emoji: "🦁", label: "Lion" },
  { id: "dolphin", emoji: "🐬", label: "Dolphin" },
  { id: "parrot", emoji: "🦜", label: "Parrot" },
  { id: "turtle", emoji: "🐢", label: "Turtle" },
  { id: "star", emoji: "🌟", label: "Star" },
  { id: "butterfly", emoji: "🦋", label: "Butterfly" },
  { id: "octopus", emoji: "🐙", label: "Octopus" },
  { id: "artist", emoji: "🎨", label: "Artist" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "wave", emoji: "🌊", label: "Wave" },
  { id: "palm", emoji: "🌴", label: "Palm Tree" },
  { id: "gamer", emoji: "🎮", label: "Gamer" },
];

type Step =
  | "entry"
  | "student-access"
  | "student-code"
  | "student-resume"
  | "student-name"
  | "guest-name"
  | "avatar"
  | "welcome";

type Flow = "student" | "guest";

export default function AuthPage() {
  const [step, setStep] = useState<Step>("entry");
  const [flow, setFlow] = useState<Flow>("guest");
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [className, setClassName] = useState("");
  const [resumeUsername, setResumeUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [error, setError] = useState("");
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);

  const { register, isRegistering } = useAuth();
  const [, setLocation] = useLocation();

  const clearError = () => setError("");

  // Validate class code against the server
  const handleValidateCode = async () => {
    const code = classCode.trim().toUpperCase();
    if (code.length < 3) {
      setError("Enter a valid class code.");
      return;
    }
    setIsValidatingCode(true);
    setError("");
    try {
      const res = await fetch(`/api/classes/check-code/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Code not found.");
        return;
      }
      setClassName(data.name);
      setClassCode(code);
      setStep("student-name");
    } catch {
      setError("Could not check the code. Try again.");
    } finally {
      setIsValidatingCode(false);
    }
  };

  // Resume session by username
  const handleResume = async () => {
    if (!resumeUsername.trim()) {
      setError("Please enter your username.");
      return;
    }
    setIsResuming(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: resumeUsername.trim() }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Username not found.");
        return;
      }
      // Session is now set — force a page reload so useAuth picks it up
      window.location.href = "/";
    } catch {
      setError("Could not resume. Try again.");
    } finally {
      setIsResuming(false);
    }
  };

  const handleNameNext = () => {
    if (!name.trim()) { setError("Please enter your name!"); return; }
    if (name.trim().length > 30) { setError("Name must be 30 characters or less."); return; }
    setError("");
    setStep("avatar");
  };

  const handleRegister = async () => {
    if (!selectedAvatar) { setError("Pick an avatar to represent you!"); return; }
    setError("");
    try {
      const user = await register({ name: name.trim(), avatar: selectedAvatar });
      setCreatedUser(user);

      // Auto-join class for student flow
      if (flow === "student" && classCode) {
        setIsJoiningClass(true);
        try {
          await fetch("/api/student/join-class", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: classCode }),
            credentials: "include",
          });
        } catch {
          // Non-blocking — don't fail registration over this
        } finally {
          setIsJoiningClass(false);
        }
      }

      setStep("welcome");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    }
  };

  // Left panel — always shown
  const LeftPanel = () => (
    <div className="lg:w-1/2 relative overflow-hidden flex flex-col justify-between p-8 lg:p-16 text-white caribbean-bg">
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-10">
          <span className="w-12 h-12 rounded-2xl bg-white text-purple-600 flex items-center justify-center text-3xl font-bold shadow-lg animate-float">
            $
          </span>
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-display tracking-tight leading-none">FinSight Lite</span>
            <span className="text-[10px] text-white/60 uppercase font-bold tracking-widest mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-yellow-300" />
              by FinSight Ltd.
            </span>
          </div>
        </div>
        <h1 className="text-4xl lg:text-6xl font-display font-bold leading-tight mb-6">
          Learn money,<br />
          <span className="text-yellow-300">have fun!</span>
        </h1>
        <p className="text-white/80 text-lg max-w-md leading-relaxed">
          A safe place for kids to learn about saving, budgeting, and investing with virtual money. No real risk!
        </p>
      </div>
      <div className="relative z-10 space-y-4">
        {[
          { icon: Coins, text: "Track your allowance and spending" },
          { icon: TrendingUp, text: "Try investing with pretend money" },
          { icon: GraduationCap, text: "Learn about stocks, bonds, and more" },
          { icon: Rocket, text: "Build smart money habits for life" },
        ].map((feature, i) => (
          <div key={i} className="glass-inset-light flex items-center gap-3 rounded-2xl px-4 py-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <feature.icon className="w-4 h-4 text-yellow-300" />
            </div>
            <span className="font-semibold text-sm">{feature.text}</span>
          </div>
        ))}
      </div>
      <div className="relative z-10 mt-6 text-xs text-white/30">
        &copy; 2024 FinSight Financial Technologies. All rights reserved.
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <LeftPanel />

      <div className="lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-b from-violet-50 to-background dark:from-violet-950/20 dark:to-background">
        <div className="max-w-md w-full space-y-8">

          {/* ── ENTRY SCREEN ── */}
          {step === "entry" && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-300/50 dark:shadow-purple-900/50 animate-float">
                  <span className="text-4xl">👋</span>
                </div>
                <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500">
                  Welcome to FinSight Lite
                </h2>
                <p className="mt-2 text-muted-foreground font-medium">
                  How would you like to get started?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => { clearError(); setFlow("student"); setStep("student-access"); }}
                  className="w-full flex items-center gap-4 glass-card-heavy rounded-2xl p-5 border-2 border-transparent hover:border-violet-300 dark:hover:border-violet-700 transition-all hover:scale-[1.02] group text-left"
                  data-testid="button-student"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                    👩🏽‍🎓
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold font-display">I'm a Student</p>
                    <p className="text-sm text-muted-foreground">Join a class or start learning</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-violet-500 transition-colors shrink-0" />
                </button>

                <button
                  onClick={() => setLocation("/teacher/login")}
                  className="w-full flex items-center gap-4 glass-card-heavy rounded-2xl p-5 border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:scale-[1.02] group text-left"
                  data-testid="button-teacher"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-2xl shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                    👩🏽‍🏫
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold font-display">I'm a Teacher</p>
                    <p className="text-sm text-muted-foreground">Manage classes and track progress</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors shrink-0" />
                </button>

                <button
                  onClick={() => { clearError(); setFlow("guest"); setStep("guest-name"); }}
                  className="w-full flex items-center gap-4 glass-card-heavy rounded-2xl p-5 border-2 border-transparent hover:border-amber-300 dark:hover:border-amber-700 transition-all hover:scale-[1.02] group text-left"
                  data-testid="button-guest"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                    ⚡
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold font-display">Continue as Guest</p>
                    <p className="text-sm text-muted-foreground">Jump in instantly — no class needed</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500 transition-colors shrink-0" />
                </button>
              </div>
            </>
          )}

          {/* ── STUDENT ACCESS SCREEN ── */}
          {step === "student-access" && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-300/50 dark:shadow-purple-900/50 animate-float">
                  <span className="text-4xl">👩🏽‍🎓</span>
                </div>
                <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500">
                  Student Access
                </h2>
                <p className="mt-2 text-muted-foreground font-medium">
                  Choose how to get in
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => { clearError(); setStep("student-code"); }}
                  className="w-full flex items-center gap-4 glass-card-heavy rounded-2xl p-5 border-2 border-transparent hover:border-violet-300 dark:hover:border-violet-700 transition-all hover:scale-[1.02] group text-left"
                  data-testid="button-enter-code"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                    <KeyRound className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold font-display">Enter Class Code</p>
                    <p className="text-sm text-muted-foreground">Your teacher gave you a code</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-violet-500 transition-colors shrink-0" />
                </button>

                <button
                  onClick={() => { clearError(); setStep("student-resume"); }}
                  className="w-full flex items-center gap-4 glass-card-heavy rounded-2xl p-5 border-2 border-transparent hover:border-green-300 dark:hover:border-green-700 transition-all hover:scale-[1.02] group text-left"
                  data-testid="button-resume"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                    <RotateCcw className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold font-display">Continue Previous Session</p>
                    <p className="text-sm text-muted-foreground">Already have a username? Log back in</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-green-500 transition-colors shrink-0" />
                </button>
              </div>

              <button
                onClick={() => setStep("entry")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                data-testid="button-back-entry"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </>
          )}

          {/* ── STUDENT CODE SCREEN ── */}
          {step === "student-code" && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-300/50 dark:shadow-violet-900/50 animate-float">
                  <KeyRound className="w-9 h-9 text-white" />
                </div>
                <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500">
                  Enter Class Code
                </h2>
                <p className="mt-2 text-muted-foreground font-medium">
                  Ask your teacher for the code
                </p>
              </div>

              <div className="glass-card-heavy rounded-glass p-8 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="class-code" className="text-sm font-semibold">Class Code</Label>
                  <Input
                    id="class-code"
                    value={classCode}
                    onChange={(e) => { setClassCode(e.target.value.toUpperCase()); clearError(); }}
                    onKeyDown={(e) => e.key === "Enter" && handleValidateCode()}
                    placeholder="e.g. ABC123"
                    className="rounded-xl h-12 text-lg text-center font-mono tracking-widest uppercase"
                    maxLength={8}
                    autoFocus
                    data-testid="input-class-code"
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm font-medium rounded-xl p-3 border border-destructive/20" data-testid="text-auth-error">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleValidateCode}
                  disabled={isValidatingCode || !classCode.trim()}
                  className="w-full h-12 text-lg font-bold rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 transition-all hover:scale-[1.02] shadow-lg shadow-violet-300/50 dark:shadow-violet-900/50"
                  data-testid="button-validate-code"
                >
                  {isValidatingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Join Class <ArrowRight className="ml-2 w-5 h-5" /></>}
                </Button>

                <button
                  onClick={() => { setStep("student-access"); clearError(); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  data-testid="button-back-access"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </div>
            </>
          )}

          {/* ── STUDENT RESUME SCREEN ── */}
          {step === "student-resume" && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-300/50 dark:shadow-green-900/50 animate-float">
                  <RotateCcw className="w-9 h-9 text-white" />
                </div>
                <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500">
                  Welcome Back!
                </h2>
                <p className="mt-2 text-muted-foreground font-medium">
                  Enter your username to pick up where you left off
                </p>
              </div>

              <div className="glass-card-heavy rounded-glass p-8 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="resume-username" className="text-sm font-semibold">Your Username</Label>
                  <Input
                    id="resume-username"
                    value={resumeUsername}
                    onChange={(e) => { setResumeUsername(e.target.value); clearError(); }}
                    onKeyDown={(e) => e.key === "Enter" && handleResume()}
                    placeholder="e.g. Alex_4291"
                    className="rounded-xl h-12 text-lg font-mono"
                    autoFocus
                    data-testid="input-resume-username"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your username was shown when you first signed up — it looks like <span className="font-mono font-semibold">Name_1234</span>
                  </p>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm font-medium rounded-xl p-3 border border-destructive/20" data-testid="text-auth-error">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleResume}
                  disabled={isResuming || !resumeUsername.trim()}
                  className="w-full h-12 text-lg font-bold rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all hover:scale-[1.02] shadow-lg shadow-green-300/50 dark:shadow-green-900/50"
                  data-testid="button-resume-submit"
                >
                  {isResuming ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="ml-2 w-5 h-5" /></>}
                </Button>

                <button
                  onClick={() => { setStep("student-access"); clearError(); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  data-testid="button-back-access-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </div>
            </>
          )}

          {/* ── STUDENT NAME (after code accepted) ── */}
          {step === "student-name" && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-300/50 dark:shadow-purple-900/50 animate-bounce-in">
                  <span className="text-4xl">🎉</span>
                </div>
                <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500">
                  Code accepted!
                </h2>
                <p className="mt-2 text-muted-foreground font-medium">
                  You're joining <strong className="text-foreground">{className}</strong>. What's your name?
                </p>
              </div>

              <div className="glass-card-heavy rounded-glass p-8 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="student-name" className="text-sm font-semibold">Your Name</Label>
                  <Input
                    id="student-name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearError(); }}
                    onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
                    placeholder="e.g. Alex, Keisha, Jamal..."
                    className="rounded-xl h-12 text-lg"
                    autoFocus
                    data-testid="input-name"
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm font-medium rounded-xl p-3 border border-destructive/20" data-testid="text-auth-error">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleNameNext}
                  className="w-full h-12 text-lg font-bold rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 transition-all hover:scale-[1.02] shadow-lg shadow-violet-300/50 dark:shadow-violet-900/50"
                  data-testid="button-next"
                >
                  Next — Pick Your Avatar <ArrowRight className="ml-2 w-5 h-5" />
                </Button>

                <button
                  onClick={() => { setStep("student-code"); clearError(); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  data-testid="button-back-code"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </div>
            </>
          )}

          {/* ── GUEST NAME ── */}
          {step === "guest-name" && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-300/50 dark:shadow-orange-900/50 animate-float">
                  <span className="text-4xl">⚡</span>
                </div>
                <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-500">
                  Guest Access
                </h2>
                <p className="mt-2 text-muted-foreground font-medium">
                  What should we call you?
                </p>
              </div>

              <div className="glass-card-heavy rounded-glass p-8 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="guest-name-input" className="text-sm font-semibold">Your Name</Label>
                  <Input
                    id="guest-name-input"
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearError(); }}
                    onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
                    placeholder="e.g. Alex, Keisha, Jamal..."
                    className="rounded-xl h-12 text-lg"
                    autoFocus
                    data-testid="input-name"
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm font-medium rounded-xl p-3 border border-destructive/20" data-testid="text-auth-error">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleNameNext}
                  className="w-full h-12 text-lg font-bold rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 hover:from-amber-500 hover:via-orange-500 hover:to-pink-600 transition-all hover:scale-[1.02] shadow-lg shadow-orange-300/50 dark:shadow-orange-900/50"
                  data-testid="button-next"
                >
                  Next — Pick Your Avatar <ArrowRight className="ml-2 w-5 h-5" />
                </Button>

                <button
                  onClick={() => { setStep("entry"); clearError(); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  data-testid="button-back-entry-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </div>
            </>
          )}

          {/* ── AVATAR SELECTION (shared by student + guest) ── */}
          {step === "avatar" && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-300/50 dark:shadow-orange-900/50 animate-float">
                  <span className="text-4xl">🎭</span>
                </div>
                <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500">
                  Pick your avatar!
                </h2>
                <p className="mt-2 text-muted-foreground font-medium">
                  Choose one that represents you, <strong className="text-foreground">{name.trim()}</strong>!
                </p>
              </div>

              <div className="glass-card-heavy rounded-glass p-6">
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => { setSelectedAvatar(av.id); clearError(); }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all duration-200 hover:scale-105 ${
                        selectedAvatar === av.id
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 shadow-lg scale-105 ring-2 ring-violet-300 dark:ring-violet-700"
                          : "border-muted hover:border-violet-300 dark:hover:border-violet-700"
                      }`}
                      data-testid={`button-avatar-${av.id}`}
                    >
                      <span className="text-3xl">{av.emoji}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{av.label}</span>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm font-medium rounded-xl p-3 border border-destructive/20 mb-4" data-testid="text-auth-error">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearError();
                      setStep(flow === "student" ? "student-name" : "guest-name");
                    }}
                    className="rounded-2xl border-2 font-semibold"
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleRegister}
                    disabled={isRegistering || isJoiningClass || !selectedAvatar}
                    className="flex-1 h-12 text-lg font-bold rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 transition-all hover:scale-[1.02] shadow-lg shadow-violet-300/50 dark:shadow-violet-900/50"
                    data-testid="button-start"
                  >
                    {isRegistering || isJoiningClass ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Start My Adventure! <Rocket className="ml-2 w-5 h-5" /></>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── WELCOME SCREEN ── */}
          {step === "welcome" && createdUser && (
            <>
              <div className="text-center">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-300/50 dark:shadow-green-900/50 animate-bounce-in">
                  <span className="text-5xl">{AVATARS.find(a => a.id === createdUser.avatar)?.emoji || "🌟"}</span>
                </div>
                <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500">
                  Welcome aboard!
                </h2>
                <p className="mt-2 text-muted-foreground font-medium">
                  {flow === "student" && className
                    ? <>You've joined <strong className="text-foreground">{className}</strong>! Your adventure starts now.</>
                    : "Your money adventure starts now!"}
                </p>
              </div>

              <div className="glass-card-heavy rounded-glass p-8 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <PartyPopper className="w-4 h-4 text-amber-500" />
                  Your username is
                </div>
                <div className="bg-gradient-to-r from-violet-50 to-pink-50 dark:from-violet-950/30 dark:to-pink-950/30 rounded-2xl p-4 border-2 border-violet-200 dark:border-violet-800">
                  <p className="text-2xl font-display font-bold text-violet-600 dark:text-violet-400" data-testid="text-username">
                    {createdUser.username}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Save this username — you'll need it to log back in next time!
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
