import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function TeacherRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", schoolName: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/auth/register", {
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
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
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
          <h1 className="font-display font-bold text-3xl">Create Teacher Account</h1>
          <p className="text-muted-foreground">Set up your teacher portal in seconds</p>
        </div>

        <Card className="rounded-3xl border-2 border-emerald-100 dark:border-emerald-800 shadow-xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">First Name</label>
                  <input required value={form.firstName} onChange={set("firstName")} placeholder="Jane"
                    className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                    data-testid="input-teacher-first-name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Last Name</label>
                  <input required value={form.lastName} onChange={set("lastName")} placeholder="Smith"
                    className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                    data-testid="input-teacher-last-name" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">School Name</label>
                <input required value={form.schoolName} onChange={set("schoolName")} placeholder="e.g. Nassau Primary School"
                  className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  data-testid="input-teacher-school" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Email Address</label>
                <input type="email" required value={form.email} onChange={set("email")} placeholder="you@school.edu"
                  className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  data-testid="input-teacher-email" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} required value={form.password} onChange={set("password")}
                    placeholder="Min. 6 characters"
                    className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                    data-testid="input-teacher-password" />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-bold text-base shadow-lg"
                data-testid="button-teacher-register"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/teacher/login">
            <span className="font-bold text-emerald-600 hover:underline cursor-pointer">Sign in</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
