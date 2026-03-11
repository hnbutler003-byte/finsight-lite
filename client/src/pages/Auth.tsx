import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Rocket, Coins, GraduationCap, TrendingUp, Loader2, ArrowRight, ArrowLeft, PartyPopper, School } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

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

export default function AuthPage() {
  const [step, setStep] = useState<"name" | "avatar" | "welcome">("name");
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [error, setError] = useState("");
  const [createdUser, setCreatedUser] = useState<any>(null);

  const { register, isRegistering } = useAuth();

  const handleNameNext = () => {
    if (!name.trim()) {
      setError("Please enter your name!");
      return;
    }
    if (name.trim().length > 30) {
      setError("Name must be 30 characters or less.");
      return;
    }
    setError("");
    setStep("avatar");
  };

  const handleRegister = async () => {
    if (!selectedAvatar) {
      setError("Pick an avatar to represent you!");
      return;
    }
    setError("");

    try {
      const user = await register({ name: name.trim(), avatar: selectedAvatar });
      setCreatedUser(user);
      setStep("welcome");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <div className="lg:w-1/2 relative overflow-hidden flex flex-col justify-between p-8 lg:p-16 text-white bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-300/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-300/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

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
            Learn money,<br/>
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
            <div key={i} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-sm border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <feature.icon className="w-4 h-4 text-yellow-300" />
              </div>
              <span className="font-semibold text-sm">{feature.text}</span>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-8 flex flex-col gap-2">
          <Link href="/demo">
            <div className="flex items-center gap-3 bg-white/15 hover:bg-white/25 rounded-2xl px-4 py-3 cursor-pointer transition-colors border border-white/20" data-testid="link-try-demo">
              <div className="w-8 h-8 rounded-xl bg-amber-400/30 flex items-center justify-center shrink-0">
                <School className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">School / Organization Demo</p>
                <p className="text-white/60 text-xs">Try the full platform instantly — no sign-up</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/60 ml-auto" />
            </div>
          </Link>
          <Link href="/teacher/login">
            <div className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-2xl px-4 py-2.5 cursor-pointer transition-colors border border-white/10" data-testid="link-teacher-login">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-white/80" />
              </div>
              <span className="font-medium text-sm text-white/80">Teacher Login</span>
              <ArrowRight className="w-3 h-3 text-white/40 ml-auto" />
            </div>
          </Link>
        </div>
        <div className="relative z-10 mt-4 text-xs text-white/30">
          &copy; 2024 FinSight Financial Technologies. All rights reserved.
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-b from-violet-50 to-background dark:from-violet-950/20 dark:to-background">
        <div className="max-w-md w-full space-y-8">
          {step === "name" && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-300/50 dark:shadow-purple-900/50 animate-float">
                  <span className="text-4xl">&#x1F44B;</span>
                </div>
                <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500">
                  What's your name?
                </h2>
                <p className="mt-2 text-muted-foreground font-medium">
                  Tell us what to call you!
                </p>
              </div>

              <div className="bg-card border-2 border-dashed border-violet-200 dark:border-violet-800 shadow-xl rounded-3xl p-8">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm font-semibold">Your Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
                    className="w-full h-12 text-lg font-bold shadow-lg shadow-violet-300/50 dark:shadow-violet-900/50 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 transition-all hover:scale-[1.02] hover:shadow-xl"
                    data-testid="button-next"
                  >
                    Next — Pick Your Avatar
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          )}

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

              <div className="bg-card border-2 border-dashed border-violet-200 dark:border-violet-800 shadow-xl rounded-3xl p-6">
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => { setSelectedAvatar(av.id); setError(""); }}
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
                    onClick={() => { setStep("name"); setError(""); }}
                    className="rounded-2xl border-2 font-semibold"
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={handleRegister}
                    disabled={isRegistering || !selectedAvatar}
                    className="flex-1 h-12 text-lg font-bold shadow-lg shadow-violet-300/50 dark:shadow-violet-900/50 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 transition-all hover:scale-[1.02] hover:shadow-xl"
                    data-testid="button-start"
                  >
                    {isRegistering ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Start My Adventure!
                        <Rocket className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === "welcome" && createdUser && (
            <>
              <div className="text-center">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-300/50 dark:shadow-green-900/50 animate-float">
                  <span className="text-5xl">{AVATARS.find(a => a.id === createdUser.avatar)?.emoji || "🌟"}</span>
                </div>
                <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500">
                  Welcome aboard!
                </h2>
                <p className="mt-2 text-muted-foreground font-medium">
                  Your money adventure starts now!
                </p>
              </div>

              <div className="bg-card border-2 border-dashed border-green-200 dark:border-green-800 shadow-xl rounded-3xl p-8 text-center space-y-4">
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
                  This is your unique ID — you'll stay logged in automatically!
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
