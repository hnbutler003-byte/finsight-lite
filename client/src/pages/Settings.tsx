import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, UserCog, Award, Mail, ShieldCheck, Users, Chrome } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

type EmailContact = {
  id: number;
  email: string;
  verified: boolean;
  weeklyDigest: boolean;
  classNotifications: boolean;
};

type ContactResp = { contact: EmailContact | null; guardian: EmailContact | null };

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [guardianInput, setGuardianInput] = useState("");

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user]);

  const { data: contactData } = useQuery<ContactResp>({ queryKey: ["/api/email/contact"] });
  useEffect(() => {
    if (contactData?.contact && !emailInput) setEmailInput(contactData.contact.email);
    if (contactData?.guardian && !guardianInput) setGuardianInput(contactData.guardian.email);
  }, [contactData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      toast({ title: "Email verified", description: "You'll now receive notifications and digests." });
      queryClient.invalidateQueries({ queryKey: ["/api/email/contact"] });
    }
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (payload: { firstName: string; lastName: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/profile", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated", description: "Your name will appear on future certificates." });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
    },
  });

  const saveEmail = useMutation({
    mutationFn: async (payload: { email?: string; weeklyDigest?: boolean; classNotifications?: boolean }) => {
      const res = await apiRequest("PATCH", "/api/email/contact", payload);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/email/contact"] }),
    onError: (err: Error) => toast({ title: "Couldn't save email", description: err.message, variant: "destructive" }),
  });

  const sendVerification = useMutation({
    mutationFn: async (role: "self" | "guardian") => {
      const res = await apiRequest("POST", "/api/email/send-verification", { role });
      return res.json();
    },
    onSuccess: () => toast({ title: "Verification sent", description: "Check your inbox for the link." }),
    onError: (err: Error) => toast({ title: "Couldn't send", description: err.message, variant: "destructive" }),
  });

  const saveGuardian = useMutation({
    mutationFn: async (payload: { email: string; weeklyDigest?: boolean }) => {
      const res = await apiRequest("POST", "/api/email/guardian", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/contact"] });
      toast({ title: "Guardian email saved", description: "Send the verification link to confirm." });
    },
    onError: (err: Error) => toast({ title: "Couldn't save", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim() });
  };

  const previewName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || user?.username || "Student";
  const contact = contactData?.contact;
  const guardian = contactData?.guardian;

  const [googleLinkLoading, setGoogleLinkLoading] = useState(false);
  const handleLinkGoogle = async (idToken: string) => {
    setGoogleLinkLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/google-link", { idToken });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Google account linked", description: `Linked to ${data.email}. You can now sign in with Google.` });
    } catch (e: any) {
      toast({ title: "Couldn't link Google", description: e.message, variant: "destructive" });
    } finally {
      setGoogleLinkLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-white" data-testid="text-settings-title">
              Settings
            </h1>
            <p className="text-white/85 mt-1">Update your profile and email preferences.</p>
          </div>

          {/* ── Your Name ── */}
          <Card className="glass-card-heavy rounded-glass border-0">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-violet-500 dark:text-violet-300" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-foreground">Your Name</h2>
                  <p className="text-sm text-muted-foreground">This is the name that prints on your certificates.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-foreground">First name</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={50} placeholder="Jane"
                      className="card-input rounded-2xl" data-testid="input-first-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-foreground">Last name</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={50} placeholder="Doe"
                      className="card-input rounded-2xl" data-testid="input-last-name" />
                  </div>
                </div>

                <div className="glass-inset rounded-2xl flex items-center gap-3">
                  <Award className="w-5 h-5 text-amber-500 dark:text-amber-300 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Certificate preview</p>
                    <p className="text-foreground font-display font-bold truncate" data-testid="text-name-preview">{previewName}</p>
                  </div>
                </div>

                <Button type="submit" disabled={saveMutation.isPending}
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white font-bold"
                  data-testid="button-save-profile">
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* ── Email & Notifications ── */}
          <Card className="glass-card-heavy rounded-glass border-0">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-500 dark:text-blue-300" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-foreground">Email & notifications</h2>
                  <p className="text-sm text-muted-foreground">Get class announcements and a weekly recap.</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-foreground">Your email</Label>
                <div className="flex gap-2">
                  <Input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="you@example.com"
                    className="card-input rounded-2xl" data-testid="input-email" />
                  <Button onClick={() => saveEmail.mutate({ email: emailInput.trim() })} disabled={saveEmail.isPending}
                    className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white" data-testid="button-save-email">Save</Button>
                </div>
                {contact && (
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 ${contact.verified ? "text-green-500 dark:text-green-300" : "text-amber-500 dark:text-amber-300"}`} />
                      <span className="text-muted-foreground" data-testid="text-email-verified">
                        {contact.verified ? "Verified" : "Not verified"}
                      </span>
                    </div>
                    {!contact.verified && (
                      <Button variant="ghost" onClick={() => sendVerification.mutate("self")} disabled={sendVerification.isPending}
                        className="text-blue-500 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-200" data-testid="button-send-verification">
                        Send verification email
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {contact && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pref-class" className="text-foreground">Class notifications</Label>
                    <Switch id="pref-class" checked={contact.classNotifications}
                      onCheckedChange={(v) => saveEmail.mutate({ classNotifications: v })} data-testid="switch-class-notifications" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pref-digest" className="text-foreground">Weekly recap (Sundays)</Label>
                    <Switch id="pref-digest" checked={contact.weeklyDigest}
                      onCheckedChange={(v) => saveEmail.mutate({ weeklyDigest: v })} data-testid="switch-weekly-digest" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Guardian Email ── */}
          <Card className="glass-card-heavy rounded-glass border-0">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-500 dark:text-emerald-300" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-foreground">Guardian email</h2>
                  <p className="text-sm text-muted-foreground">A parent or guardian can receive your weekly progress.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Input type="email" value={guardianInput} onChange={(e) => setGuardianInput(e.target.value)} placeholder="guardian@example.com"
                  className="card-input rounded-2xl" data-testid="input-guardian-email" />
                <Button onClick={() => saveGuardian.mutate({ email: guardianInput.trim() })} disabled={saveGuardian.isPending}
                  className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="button-save-guardian">Save</Button>
              </div>
              {guardian && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${guardian.verified ? "text-green-500 dark:text-green-300" : "text-amber-500 dark:text-amber-300"}`} />
                    <span className="text-muted-foreground" data-testid="text-guardian-verified">
                      {guardian.verified ? "Verified" : "Not verified"}
                    </span>
                  </div>
                  {!guardian.verified && (
                    <Button variant="ghost" onClick={() => sendVerification.mutate("guardian")} disabled={sendVerification.isPending}
                      className="text-emerald-500 dark:text-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-200" data-testid="button-send-guardian-verification">
                      Send verification email
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Google Account ── */}
          <Card className="glass-card-heavy rounded-glass border-0">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                  <Chrome className="w-5 h-5 text-blue-500 dark:text-blue-300" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-foreground">Google Account</h2>
                  <p className="text-sm text-muted-foreground">Link your school Google account to sign in faster.</p>
                </div>
              </div>

              {user?.email ? (
                <div className="glass-inset rounded-2xl flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-500 dark:text-green-300 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Linked email</p>
                    <p className="text-foreground font-medium" data-testid="text-google-linked-email">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">No Google account linked yet.</p>
                  <GoogleSignInButton
                    onSuccess={handleLinkGoogle}
                    onError={(msg) => toast({ title: "Couldn't link Google", description: msg, variant: "destructive" })}
                    text="signin_with"
                  />
                  {googleLinkLoading && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-500 dark:text-blue-300" /></div>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
