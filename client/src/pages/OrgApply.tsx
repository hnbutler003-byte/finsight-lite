import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const ORG_TYPES = [
  { value: "school", label: "School" },
  { value: "credit_union", label: "Credit Union" },
  { value: "government", label: "Government" },
  { value: "ngo", label: "NGO / Non-profit" },
  { value: "other", label: "Other" },
];

export default function OrgApply() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    orgName: "",
    orgType: "school",
    country: "",
    city: "",
    contactName: "",
    contactEmail: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest("POST", "/api/org/apply", form);
      setDone(true);
    } catch (err: any) {
      toast({ title: "Application failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="caribbean-bg min-h-screen flex items-center justify-center p-6">
        <div className="glass-card rounded-2xl max-w-lg w-full text-center p-10 space-y-5" data-testid="section-apply-success">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
          <h2 className="font-display font-bold text-2xl text-foreground">Application Submitted!</h2>
          <p className="text-muted-foreground leading-relaxed">
            Thank you! Your organization <strong className="text-foreground">{form.orgName}</strong> is now under
            review. Our team will activate your account, usually within 1-2 business days.
          </p>
          <Button
            onClick={() => setLocation("/org/dashboard")}
            className="w-full"
            data-testid="button-goto-dashboard"
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="caribbean-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-2xl text-white">FinSight Lite</span>
          </div>
          <h1 className="font-display font-bold text-3xl text-white">Apply for Access</h1>
          <p className="text-white/70">Tell us about your organization and create your admin account.</p>
        </div>

        <Card className="glass-card border-white/10">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-org-apply">
              {/* Organization Details */}
              <div>
                <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide opacity-70">Organization Details</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="orgName" className="text-foreground">Organization Name <span className="text-red-400">*</span></Label>
                    <Input
                      id="orgName"
                      value={form.orgName}
                      onChange={set("orgName")}
                      placeholder="e.g. Kingston Secondary School"
                      required
                      data-testid="input-org-name"
                      className="bg-background/50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="orgType" className="text-foreground">Organization Type <span className="text-red-400">*</span></Label>
                      <select
                        id="orgType"
                        value={form.orgType}
                        onChange={set("orgType")}
                        required
                        data-testid="select-org-type"
                        className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="country" className="text-foreground">Country <span className="text-red-400">*</span></Label>
                      <Input
                        id="country"
                        value={form.country}
                        onChange={set("country")}
                        placeholder="e.g. Jamaica"
                        required
                        data-testid="input-country"
                        className="bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-foreground">City / Parish <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={set("city")}
                      placeholder="e.g. Kingston"
                      data-testid="input-city"
                      className="bg-background/50"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* Contact Details */}
              <div>
                <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide opacity-70">Primary Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contactName" className="text-foreground">Contact Name <span className="text-red-400">*</span></Label>
                    <Input
                      id="contactName"
                      value={form.contactName}
                      onChange={set("contactName")}
                      placeholder="Full name"
                      required
                      data-testid="input-contact-name"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactEmail" className="text-foreground">Contact Email <span className="text-red-400">*</span></Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={form.contactEmail}
                      onChange={set("contactEmail")}
                      placeholder="contact@school.edu"
                      required
                      data-testid="input-contact-email"
                      className="bg-background/50"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* Admin Account */}
              <div>
                <h3 className="font-semibold text-foreground mb-1 text-sm uppercase tracking-wide opacity-70">Admin Account</h3>
                <p className="text-muted-foreground text-xs mb-4">These credentials are what you'll use to log in.</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-foreground">First Name <span className="text-red-400">*</span></Label>
                      <Input
                        id="firstName"
                        value={form.firstName}
                        onChange={set("firstName")}
                        placeholder="First name"
                        required
                        data-testid="input-first-name"
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-foreground">Last Name <span className="text-red-400">*</span></Label>
                      <Input
                        id="lastName"
                        value={form.lastName}
                        onChange={set("lastName")}
                        placeholder="Last name"
                        required
                        data-testid="input-last-name"
                        className="bg-background/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="adminEmail" className="text-foreground">Admin Email <span className="text-red-400">*</span></Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="admin@school.edu"
                      required
                      data-testid="input-admin-email"
                      className="bg-background/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-foreground">Password <span className="text-red-400">*</span></Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        value={form.password}
                        onChange={set("password")}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                        data-testid="input-password"
                        className="bg-background/50 pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPw(p => !p)}
                        tabIndex={-1}
                        data-testid="button-toggle-password"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="button-submit-apply"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Application
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/org/login" className="text-teal-500 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
