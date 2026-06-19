import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Eye, EyeOff, Loader2, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

type OrgOption = { id: string; name: string };

export default function OrgLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [orgOptions, setOrgOptions] = useState<OrgOption[] | null>(null);

  const handleGoogle = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const res = await fetch("/api/org/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsRegistration) {
          toast({ title: "No account found", description: "Please register first using your org join code.", variant: "destructive" });
          setLocation("/org/register");
        } else {
          throw new Error(data.message);
        }
        return;
      }
      qc.setQueryData(["/api/org/auth/me"], data);
      setLocation("/org/dashboard");
    } catch (e: any) {
      toast({ title: "Google sign-in failed", description: e.message, variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const doLogin = async (orgId?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/org/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, ...(orgId ? { orgId } : {}) }),
      });
      const data = await res.json();
      if (res.ok && data.needsOrgSelection) {
        setOrgOptions(data.orgs);
        return;
      }
      if (!res.ok) throw new Error(data.message);
      qc.setQueryData(["/api/org/auth/me"], data);
      setLocation("/org/dashboard");
    } catch (e: any) {
      toast({ title: "Login failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin();
  };

  // ── Org picker (founder admin with multiple orgs) ──────────────────────────
  if (orgOptions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-2">
              <Building2 className="w-9 h-9 text-white" />
            </div>
            <h1 className="font-display font-bold text-3xl">Choose Organization</h1>
            <p className="text-muted-foreground">Select which org to manage</p>
          </div>

          <Card className="glass-card rounded-glass shadow-xl">
            <CardContent className="p-6 space-y-3">
              {orgOptions.map(org => (
                <button
                  key={org.id}
                  onClick={() => doLogin(org.id)}
                  disabled={loading}
                  className="w-full flex items-center justify-between rounded-2xl border-2 border-input bg-background px-5 py-4 text-left hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  data-testid={`button-org-select-${org.id}`}
                >
                  <span className="font-semibold">{org.name}</span>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
              ))}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            <button onClick={() => setOrgOptions(null)} className="text-blue-600 hover:underline font-semibold">← Back to login</button>
          </p>
        </div>
      </div>
    );
  }

  // ── Normal login form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-2">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl">Org Admin Portal</h1>
          <p className="text-muted-foreground">Sign in to manage your organization</p>
        </div>

        <Card className="glass-card rounded-glass shadow-xl">
          <CardContent className="p-8 space-y-5">
            <GoogleSignInButton
              onSuccess={handleGoogle}
              onError={(msg) => toast({ title: "Google sign-in failed", description: msg, variant: "destructive" })}
            />
            {googleLoading && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or use email</span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@organization.edu"
                  className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  data-testid="input-org-email"
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
                    className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    data-testid="input-org-password"
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 font-bold text-base shadow-lg"
                data-testid="button-org-login"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          New org admin?{" "}
          <Link href="/org/register">
            <span className="font-bold text-blue-600 hover:underline cursor-pointer">Create an account</span>
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
