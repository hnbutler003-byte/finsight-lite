import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, ArrowLeft, KeyRound, RotateCcw, PartyPopper } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

const AVATARS = [
  { id: "lion",      emoji: "🦁", label: "Lion" },
  { id: "dolphin",   emoji: "🐬", label: "Dolphin" },
  { id: "parrot",    emoji: "🦜", label: "Parrot" },
  { id: "turtle",    emoji: "🐢", label: "Turtle" },
  { id: "star",      emoji: "🌟", label: "Star" },
  { id: "butterfly", emoji: "🦋", label: "Butterfly" },
  { id: "octopus",   emoji: "🐙", label: "Octopus" },
  { id: "artist",    emoji: "🎨", label: "Artist" },
  { id: "rocket",    emoji: "🚀", label: "Rocket" },
  { id: "wave",      emoji: "🌊", label: "Wave" },
  { id: "palm",      emoji: "🌴", label: "Palm Tree" },
  { id: "gamer",     emoji: "🎮", label: "Gamer" },
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
type CodeType = "class" | "org" | null;

export default function AuthPage() {
  const [step, setStep]               = useState<Step>("entry");
  const [flow, setFlow]               = useState<Flow>("guest");
  const [name, setName]               = useState("");
  const [classCode, setClassCode]     = useState("");
  const [className, setClassName]     = useState("");
  const [codeType, setCodeType]       = useState<CodeType>(null);
  const [resumeUsername, setResumeUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [error, setError]             = useState("");
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isResuming, setIsResuming]   = useState(false);
  const [isJoiningClass, setIsJoiningClass] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);

  const { register, isRegistering } = useAuth();
  const [, setLocation] = useLocation();

  const clearError = () => setError("");

  const handleValidateCode = async () => {
    const code = classCode.trim().toUpperCase();
    if (code.length < 3) { setError("Enter a valid code."); return; }
    setIsValidatingCode(true);
    setError("");
    try {
      const res = await fetch(`/api/classes/check-code/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Code not found."); return; }
      setCodeType(data.type);
      setClassCode(code);
      setClassName(data.type === "org" ? `${data.name} — ${data.envName}` : data.name);
      setStep("student-name");
    } catch { setError("Could not check the code. Try again."); }
    finally { setIsValidatingCode(false); }
  };

  const handleResume = async () => {
    if (!resumeUsername.trim()) { setError("Please enter your username."); return; }
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
      if (!res.ok) { setError(data.message || "Username not found."); return; }
      window.location.href = "/";
    } catch { setError("Could not resume. Try again."); }
    finally { setIsResuming(false); }
  };

  const handleNameNext = () => {
    if (!name.trim()) { setError("Please enter your name!"); return; }
    if (name.trim().length > 30) { setError("Name must be 30 characters or less."); return; }
    setError("");
    setStep("avatar");
  };

  const handleRegister = async () => {
    if (!selectedAvatar) { setError("Pick one to continue!"); return; }
    setError("");
    try {
      const user = await register({ name: name.trim(), avatar: selectedAvatar });
      setCreatedUser(user);
      if (flow === "student" && classCode) {
        setIsJoiningClass(true);
        try {
          const joinEndpoint = codeType === "org" ? "/api/org/join" : "/api/student/join-class";
          await fetch(joinEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: classCode }),
            credentials: "include",
          });
        } catch { /* non-blocking */ }
        finally { setIsJoiningClass(false); }
      }
      setStep("welcome");
    } catch (err: any) { setError(err.message || "Something went wrong."); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 px-4 py-12">

      {/* Persistent micro-brand header */}
      <div className="flex items-center gap-2 mb-10 opacity-80">
        <span className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white font-bold text-sm">$</span>
        <span className="text-white/60 text-sm font-semibold tracking-wide">FinSight Lite</span>
      </div>

      <div className="w-full max-w-sm">

        {/* ── ENTRY SCREEN ── */}
        {step === "entry" && (
          <div className="space-y-8 animate-bounce-in">
            <div className="text-center space-y-3">
              <div className="text-6xl mb-2">💸</div>
              <h1 className="text-4xl font-bold text-white tracking-tight">Welcome!</h1>
              <p className="text-white/50 text-base">Who are you today?</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { clearError(); setFlow("student"); setStep("student-access"); }}
                className="w-full flex items-center gap-4 rounded-2xl p-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/40 transition-all group text-left"
                data-testid="button-student"
              >
                <span className="text-3xl">👩🏽‍🎓</span>
                <div className="flex-1">
                  <p className="text-white font-semibold">I'm a Student</p>
                  <p className="text-white/40 text-sm">Join a class or organisation</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-violet-400 transition-colors" />
              </button>

              <button
                onClick={() => setLocation("/teacher/login")}
                className="w-full flex items-center gap-4 rounded-2xl p-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/40 transition-all group text-left"
                data-testid="button-teacher"
              >
                <span className="text-3xl">👩🏽‍🏫</span>
                <div className="flex-1">
                  <p className="text-white font-semibold">I'm a Teacher</p>
                  <p className="text-white/40 text-sm">Manage classes and students</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-blue-400 transition-colors" />
              </button>

              <button
                onClick={() => { clearError(); setFlow("guest"); setStep("guest-name"); }}
                className="w-full flex items-center gap-4 rounded-2xl p-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-500/40 transition-all group text-left"
                data-testid="button-guest"
              >
                <span className="text-3xl">⚡</span>
                <div className="flex-1">
                  <p className="text-white font-semibold">Continue as Guest</p>
                  <p className="text-white/40 text-sm">Jump in with no sign-up</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-amber-400 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* ── STUDENT ACCESS ── */}
        {step === "student-access" && (
          <div className="space-y-8 animate-bounce-in">
            <div className="text-center space-y-3">
              <div className="text-5xl mb-2">🎓</div>
              <h1 className="text-3xl font-bold text-white">How are you joining?</h1>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { clearError(); setStep("student-code"); }}
                className="w-full flex items-center gap-4 rounded-2xl p-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/40 transition-all group text-left"
                data-testid="button-enter-code"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Enter a Code</p>
                  <p className="text-white/40 text-sm">Class or organisation code</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-violet-400 transition-colors" />
              </button>

              <button
                onClick={() => { clearError(); setStep("student-resume"); }}
                className="w-full flex items-center gap-4 rounded-2xl p-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-emerald-500/40 transition-all group text-left"
                data-testid="button-resume"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Already have a username</p>
                  <p className="text-white/40 text-sm">Log back into your account</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-emerald-400 transition-colors" />
              </button>
            </div>

            <button onClick={() => setStep("entry")} className="flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors mx-auto" data-testid="button-back-entry">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>
        )}

        {/* ── STUDENT CODE ── */}
        {step === "student-code" && (
          <div className="space-y-8 animate-bounce-in">
            <div className="text-center space-y-3">
              <div className="text-5xl mb-2">🔑</div>
              <h1 className="text-3xl font-bold text-white">Enter your code</h1>
              <p className="text-white/50 text-sm">Your teacher or school gave you this</p>
            </div>

            <div className="space-y-3">
              <Input
                value={classCode}
                onChange={(e) => { setClassCode(e.target.value.toUpperCase()); clearError(); }}
                onKeyDown={(e) => e.key === "Enter" && handleValidateCode()}
                placeholder="e.g. ABC123"
                className="h-14 text-2xl text-center font-mono tracking-[0.3em] uppercase rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/60 focus:bg-white/8"
                maxLength={8}
                autoFocus
                data-testid="input-class-code"
              />

              {error && <p className="text-red-400 text-sm text-center" data-testid="text-auth-error">{error}</p>}

              <Button
                onClick={handleValidateCode}
                disabled={isValidatingCode || !classCode.trim()}
                className="w-full h-12 font-bold rounded-2xl bg-violet-600 hover:bg-violet-500 text-white transition-all"
                data-testid="button-validate-code"
              >
                {isValidatingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="ml-2 w-4 h-4" /></>}
              </Button>
            </div>

            <button onClick={() => { setStep("student-access"); clearError(); }} className="flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors mx-auto" data-testid="button-back-access">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>
        )}

        {/* ── STUDENT RESUME ── */}
        {step === "student-resume" && (
          <div className="space-y-8 animate-bounce-in">
            <div className="text-center space-y-3">
              <div className="text-5xl mb-2">👋</div>
              <h1 className="text-3xl font-bold text-white">Welcome back!</h1>
              <p className="text-white/50 text-sm">Enter your username to continue</p>
            </div>

            <div className="space-y-3">
              <Input
                value={resumeUsername}
                onChange={(e) => { setResumeUsername(e.target.value); clearError(); }}
                onKeyDown={(e) => e.key === "Enter" && handleResume()}
                placeholder="e.g. Alex_4291"
                className="h-12 text-lg font-mono rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/60"
                autoFocus
                data-testid="input-resume-username"
              />
              <p className="text-white/30 text-xs text-center">
                Looks like <span className="font-mono">Name_1234</span> — shown when you first signed up
              </p>

              {error && <p className="text-red-400 text-sm text-center" data-testid="text-auth-error">{error}</p>}

              <Button
                onClick={handleResume}
                disabled={isResuming || !resumeUsername.trim()}
                className="w-full h-12 font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                data-testid="button-resume-submit"
              >
                {isResuming ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="ml-2 w-4 h-4" /></>}
              </Button>
            </div>

            <button onClick={() => { setStep("student-access"); clearError(); }} className="flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors mx-auto" data-testid="button-back-access-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>
        )}

        {/* ── STUDENT NAME (after code accepted) ── */}
        {step === "student-name" && (
          <div className="space-y-8 animate-bounce-in">
            <div className="text-center space-y-3">
              <div className="text-5xl mb-2">🎉</div>
              <h1 className="text-3xl font-bold text-white">Code accepted!</h1>
              <p className="text-white/50 text-sm">
                Joining <span className="text-violet-300 font-semibold">{className}</span>
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-white/60 text-sm font-medium text-center">What's your name?</p>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); clearError(); }}
                onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
                placeholder="e.g. Alex, Keisha, Jamal…"
                className="h-12 text-lg rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-500/60"
                autoFocus
                data-testid="input-name"
              />

              {error && <p className="text-red-400 text-sm text-center" data-testid="text-auth-error">{error}</p>}

              <Button
                onClick={handleNameNext}
                className="w-full h-12 font-bold rounded-2xl bg-violet-600 hover:bg-violet-500 text-white transition-all"
                data-testid="button-next"
              >
                Next <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <button onClick={() => { setStep("student-code"); clearError(); }} className="flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors mx-auto" data-testid="button-back-code">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>
        )}

        {/* ── GUEST NAME ── */}
        {step === "guest-name" && (
          <div className="space-y-8 animate-bounce-in">
            <div className="text-center space-y-3">
              <div className="text-5xl mb-2">⚡</div>
              <h1 className="text-3xl font-bold text-white">What's your name?</h1>
              <p className="text-white/50 text-sm">Just to get you started</p>
            </div>

            <div className="space-y-3">
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); clearError(); }}
                onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
                placeholder="e.g. Alex, Keisha, Jamal…"
                className="h-12 text-lg rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-amber-500/60"
                autoFocus
                data-testid="input-name"
              />

              {error && <p className="text-red-400 text-sm text-center" data-testid="text-auth-error">{error}</p>}

              <Button
                onClick={handleNameNext}
                className="w-full h-12 font-bold rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-900 transition-all"
                data-testid="button-next"
              >
                Next <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <button onClick={() => { setStep("entry"); clearError(); }} className="flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors mx-auto" data-testid="button-back-entry-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>
        )}

        {/* ── AVATAR SELECTION — the reward moment ── */}
        {step === "avatar" && (
          <div className="space-y-6 animate-bounce-in">
            <div className="text-center space-y-2">
              <div className="text-5xl mb-1 animate-float">🎭</div>
              <h1 className="text-3xl font-bold text-white">Pick your vibe!</h1>
              <p className="text-white/50 text-sm">
                Choose your avatar, <span className="text-violet-300 font-semibold">{name.trim()}</span> ✨
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  onClick={() => { setSelectedAvatar(av.id); clearError(); }}
                  className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all duration-200 ${
                    selectedAvatar === av.id
                      ? "border-violet-500 bg-violet-500/20 scale-105 shadow-lg shadow-violet-500/20"
                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:scale-105"
                  }`}
                  data-testid={`button-avatar-${av.id}`}
                >
                  <span className="text-3xl leading-none">{av.emoji}</span>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wide">{av.label}</span>
                </button>
              ))}
            </div>

            {error && <p className="text-red-400 text-sm text-center" data-testid="text-auth-error">{error}</p>}

            <div className="space-y-2">
              <Button
                onClick={handleRegister}
                disabled={isRegistering || isJoiningClass || !selectedAvatar}
                className="w-full h-12 font-bold rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white transition-all disabled:opacity-40"
                data-testid="button-start"
              >
                {isRegistering || isJoiningClass
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : selectedAvatar
                    ? <>Let's go! 🚀</>
                    : "Pick one to continue"}
              </Button>

              <button
                onClick={() => { clearError(); setStep(flow === "student" ? "student-name" : "guest-name"); }}
                className="flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors mx-auto"
                data-testid="button-back"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>
          </div>
        )}

        {/* ── WELCOME ── */}
        {step === "welcome" && createdUser && (
          <div className="space-y-8 text-center animate-bounce-in">
            <div className="space-y-3">
              <div className="text-7xl animate-float">
                {AVATARS.find(a => a.id === createdUser.avatar)?.emoji || "🌟"}
              </div>
              <h1 className="text-3xl font-bold text-white">You're in!</h1>
              <p className="text-white/50 text-sm">
                {flow === "student" && className
                  ? <>Welcome to <span className="text-violet-300 font-semibold">{className}</span> 🎉</>
                  : "Your adventure starts now 🎉"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2">
              <p className="text-white/40 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-1.5">
                <PartyPopper className="w-3.5 h-3.5" /> Your username
              </p>
              <p className="text-2xl font-bold font-mono text-violet-300" data-testid="text-username">
                {createdUser.username}
              </p>
              <p className="text-white/30 text-xs">Save this — you'll use it to log back in</p>
            </div>

            <Button
              onClick={() => { window.location.href = "/"; }}
              className="w-full h-12 font-bold rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white transition-all"
              data-testid="button-go-home"
            >
              Start Learning <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}

      </div>

      {/* Footer */}
      <p className="mt-12 text-white/15 text-xs">© 2024 FinSight Financial Technologies</p>
    </div>
  );
}
