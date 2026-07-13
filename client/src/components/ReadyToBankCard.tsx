import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Landmark, Download, Mail, CheckCircle, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateReadyToBankDocument } from "@/lib/readyToBankCertificate";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ReadyToBank } from "@shared/schema";

const TERRITORY_NAMES: Record<string, string> = {
  BSD: "The Bahamas",
  JMD: "Jamaica",
  TTD: "Trinidad and Tobago",
  BBD: "Barbados",
  XCD: "the Eastern Caribbean",
  GYD: "Guyana",
  HTG: "Haiti",
};

interface ReadyToBankCardProps {
  readyToBank: ReadyToBank;
  studentName: string;
}

export function ReadyToBankCard({ readyToBank, studentName }: ReadyToBankCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState("");

  const { data: emailContact } = useQuery<{ contact: any; guardian: any } | null>({
    queryKey: ["/api/email/contact"],
    staleTime: 2 * 60 * 1000,
  });
  const hasGuardianEmail = !!emailContact?.guardian;

  const saveGuardianMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/email/guardian", { email });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/contact"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ready-to-bank"] });
      setShowEmailForm(false);
      toast({ title: "Parent email saved", description: "Your parent will now receive updates from FinSight Lite." });
    },
    onError: () => {
      toast({ title: "Could not save email", description: "Please try again.", variant: "destructive" });
    },
  });

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const dateStr = format(new Date(readyToBank.achievedAt), "MMMM d, yyyy");
      await generateReadyToBankDocument(studentName, readyToBank.territory, dateStr);
    } catch {
      toast({ title: "Download failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveGuardianEmail = () => {
    if (!guardianEmail.trim()) return;
    saveGuardianMutation.mutate(guardianEmail.trim());
  };

  const territoryName = TERRITORY_NAMES[readyToBank.territory] ?? readyToBank.territory;

  return (
    <div
      className="glass-card rounded-glass p-6 animate-bounce-in border border-amber-200/40 dark:border-amber-700/30"
      data-testid="card-ready-to-bank"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Landmark className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-display text-lg font-bold text-foreground" data-testid="text-ready-to-bank-title">
              Ready to Open a Bank Account
            </h3>
            <span className="badge-milestone" data-testid="badge-ready-to-bank">
              <Trophy className="w-3 h-3" />
              Milestone
            </span>
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed" data-testid="text-ready-to-bank-description">
            You have completed the Real Life Ready module for {territoryName}. Download your document to take to the bank when you are ready.
          </p>

          <div className="flex flex-wrap gap-2 mt-4 items-center">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="rounded-2xl gap-2"
              data-testid="button-download-ready-to-bank"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download Document
            </Button>

            {hasGuardianEmail ? (
              <div
                className="flex items-center gap-1.5 text-sm text-teal-700 dark:text-teal-300 font-medium"
                data-testid="text-parent-notified"
              >
                <CheckCircle className="w-4 h-4" />
                Parent notified by email
              </div>
            ) : !showEmailForm ? (
              <Button
                variant="outline"
                className="rounded-2xl gap-2 border-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={() => setShowEmailForm(true)}
                data-testid="button-show-parent-email-form"
              >
                <Mail className="w-4 h-4" />
                Share with Parent
              </Button>
            ) : null}
          </div>

          {!hasGuardianEmail && showEmailForm && (
            <div className="mt-4 p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-3" data-testid="section-guardian-email-form">
              <p className="text-sm text-muted-foreground">
                Enter your parent or guardian's email address. We will send them a copy of your achievement and what to bring to the bank.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="parent@example.com"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  className="rounded-xl flex-1"
                  data-testid="input-guardian-email"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveGuardianEmail(); }}
                />
                <Button
                  onClick={handleSaveGuardianEmail}
                  disabled={saveGuardianMutation.isPending || !guardianEmail.trim()}
                  className="rounded-xl shrink-0"
                  data-testid="button-save-guardian-email"
                >
                  {saveGuardianMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setShowEmailForm(false); setGuardianEmail(""); }}
                  className="rounded-xl shrink-0"
                  data-testid="button-cancel-guardian-email"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
