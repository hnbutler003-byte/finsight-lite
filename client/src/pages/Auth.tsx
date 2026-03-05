import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Rocket, Coins, GraduationCap, TrendingUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");

  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const isPending = isLoggingIn || isRegistering;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ email, password, firstName: firstName || undefined, lastName: lastName || undefined });
      }
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

        <div className="relative z-10 mt-12 text-xs text-white/30">
          &copy; 2024 FinSight Financial Technologies. All rights reserved.
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-b from-violet-50 to-background dark:from-violet-950/20 dark:to-background">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-300/50 dark:shadow-purple-900/50 animate-float">
              <span className="text-4xl">&#x1F44B;</span>
            </div>
            <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500">
              {mode === "login" ? "Welcome back!" : "Create your account"}
            </h2>
            <p className="mt-2 text-muted-foreground font-medium">
              {mode === "login" ? "Sign in to continue your money journey." : "Start your money learning adventure!"}
            </p>
          </div>

          <div className="bg-card border-2 border-dashed border-violet-200 dark:border-violet-800 shadow-xl rounded-3xl p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm font-semibold">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Alex"
                      className="rounded-xl h-11"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-sm font-semibold">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Smith"
                      className="rounded-xl h-11"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="rounded-xl h-11"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                  required
                  minLength={mode === "register" ? 6 : undefined}
                  className="rounded-xl h-11"
                  data-testid="input-password"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive text-sm font-medium rounded-xl p-3 border border-destructive/20" data-testid="text-auth-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-12 text-lg font-bold shadow-lg shadow-violet-300/50 dark:shadow-violet-900/50 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 transition-all hover:scale-[1.02] hover:shadow-xl"
                data-testid="button-submit"
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === "login" ? (
                  <>
                    Sign In
                    <Rocket className="ml-2 w-5 h-5" />
                  </>
                ) : (
                  <>
                    Create Account
                    <Rocket className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t-2 border-dashed border-violet-100 dark:border-violet-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {mode === "login" ? "New here?" : "Already have an account?"}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-2xl border-2 font-semibold"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              data-testid="button-toggle-mode"
            >
              {mode === "login" ? "Create an Account" : "Sign In Instead"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
