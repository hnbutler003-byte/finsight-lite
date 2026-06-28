import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Eye, EyeOff, Loader2, KeyRound, CheckCircle2, Circle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function OrgRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", joinCode: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [shakePw, setShakePw] = useState(false);

  const handleGoogle = async (idToken: string) => {
    const code = form.joinCode.toUpperCase().trim();
    if (!code) {
      toast({ title: "Join code required", description: "Please enter your organization join code before signing up with Google.", variant: "destructive" });
      return;
    }
    setGoogleLoading(true);
    try {
      const res = await fetch("/api/org/auth/google-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken, joinCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      qc.setQueryData(["/api/org/auth/me"], data);
      setLocation("/org/dashboard");
    } catch (e: any) {
      toast({ title: "Google sign-up failed", description: e.message, variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
      setShakePw(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/org/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, joinCode: form.joinCode.toUpperCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      qc.setQueryData(["/api/org/auth/me"], data);
      setLocation("/org/dashboard");
    } catch (e: any) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const pwLongEnough = form.password.length >= 6;
  const showPwHints = pwFocused || form.password.length > 0;
  const codeReady = form.joinCode.trim().length >= 4;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-2">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl">Create Org Admin Account</h1>
          <p className="text-muted-foreground">You'll need your organization's join code</p>
        </div>

        <Card className="glass-card rounded-glass shadow-xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">First Name</label>
                  <input required value={form.firstName} onChange={set("firstName")} placeholder="Jane"
                    className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    data-testid="input-org-first-name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Last Name</label>
                  <input required value={form.lastName} onChange={set("lastName")} placeholder="Smith"
                    className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    data-testid="input-org-last-name" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Email Address</label>
                <input type="email" required value={form.email} onChange={set("email")} placeholder="you@organization.edu"
                  className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  data-testid="input-org-email" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Password</label>
                <div
                  className={shakePw ? "animate-shake" : ""}
                  onAnimationEnd={() => setShakePw(false)}
                >
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      value={form.password}
                      onChange={set("password")}
                      onFocus={() => setPwFocused(true)}
                      onBlur={() => setPwFocused(false)}
                      placeholder="Min. 6 characters"
                      className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      data-testid="input-org-password"
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {showPwHints && (
                    <div className="mt-2 flex items-center gap-2 text-xs px-1">
                      {pwLongEnough ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className={pwLongEnough ? "text-blue-600 dark:text-blue-400 font-medium" : "text-muted-foreground"}>
                        At least 6 characters
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  Organization Join Code
                </label>
                <div className="relative">
                  <input
                    required
                    value={form.joinCode}
                    onChange={set("joinCode")}
                    placeholder="e.g. 3KMXJD"
                    className={`w-full rounded-2xl border-2 bg-background px-4 py-3 text-sm font-medium tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
                      codeReady
                        ? "border-blue-400 focus:border-blue-500"
                        : "border-input focus:border-blue-400"
                    }`}
                    data-testid="input-org-join-code"
                  />
                  {codeReady && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This code identifies your organization in Finsight Lite</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 font-bold text-base shadow-lg"
                data-testid="button-org-register"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Create Account
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or sign up with Google</span>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">Enter your join code above, then use Google to skip the form</p>
              <GoogleSignInButton
                onSuccess={handleGoogle}
                onError={(msg) => toast({ title: "Google sign-up failed", description: msg, variant: "destructive" })}
                text="signup_with"
              />
              {googleLoading && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>}
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/org/login">
            <span className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">Sign in</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
