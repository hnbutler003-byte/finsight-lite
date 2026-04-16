import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserCog, Award } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim() });
  };

  const previewName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || user?.username || "Student";

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-white" data-testid="text-settings-title">
              Settings
            </h1>
            <p className="text-white/85 mt-1">Update your profile information.</p>
          </div>

          <Card className="glass-card-heavy rounded-glass border-0">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-violet-300" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-white">Your Name</h2>
                  <p className="text-sm text-white/70">This is the name that prints on your certificates.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-white">First name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      maxLength={50}
                      placeholder="Jane"
                      className="rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-white">Last name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      maxLength={50}
                      placeholder="Doe"
                      className="rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/5 p-4 flex items-center gap-3">
                  <Award className="w-5 h-5 text-amber-300 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-white/60 font-bold">Certificate preview</p>
                    <p className="text-white font-display font-bold truncate" data-testid="text-name-preview">{previewName}</p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white font-bold"
                  data-testid="button-save-profile"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
