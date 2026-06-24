import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function TeacherLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);

  const handleGoogle = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const res = await fetch("/api/teacher/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      qc.setQueryData(["/api/teacher/auth/me"], data);
      setLocation("/teacher/dashboard");
    } catch (e: any) {
      toast({ title: "Google sign-in failed", description: e.message, variant: "destructive" });
      setShakeForm(true);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      qc.setQueryData(["/api/teacher/auth/me"], data);
      setLocation("/teacher/dashboard");
    } catch (e: any) {
      toast({ title: "Login failed", description: e.message, variant: "destructive" });
      setShakeForm(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950 dark:to-teal-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg mb-2">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl">Teacher Portal</h1>
          <p className="text-muted-foreground">Sign in to manage your classes</p>
        </div>

        <Card className="glass-card rounded-glass shadow-xl">
          <CardContent className="p-8 space-y-5">
            <GoogleSignInButton
              onSuccess={handleGoogle}
              onError={(msg) => { toast({ title: "Google sign-in failed", description: msg, variant: "destructive" }); setShakeForm(true); }}
            />
            {googleLoading && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>}

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or use email</span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className={`space-y-5 ${shakeForm ? "animate-shake" : ""}`}
              onAnimationEnd={() => setShakeForm(false)}
            >
              <div className="space-y-2">
                <label className="text-sm font-bold">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@school.edu"
                  className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  data-testid="input-teacher-email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                    data-testid="input-teacher-password"
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-bold text-base shadow-lg"
                data-testid="button-teacher-login"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          New teacher?{" "}
          <Link href="/teacher/register">
            <span className="font-bold text-emerald-600 hover:underline cursor-pointer">Create an account</span>
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          Are you a student?{" "}
          <Link href="/">
            <span className="font-bold text-violet-600 hover:underline cursor-pointer">Go to student app</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
