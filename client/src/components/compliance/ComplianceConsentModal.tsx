import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, Lock, Info } from "lucide-react";

interface ComplianceConsentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

export function ComplianceConsentModal({
  isOpen,
  onOpenChange,
  onAccept,
}: ComplianceConsentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-display font-bold text-primary">
            Secure Data Linkage
          </DialogTitle>
          <DialogDescription className="text-base">
            To securely link your financial accounts in compliance with Caribbean regional data protection standards (GDPR-aligned), we need your explicit consent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-3 items-start p-3 rounded-xl bg-muted/30 border border-border/50">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Read-Only Access</p>
              <p className="text-muted-foreground">FinSight will only read transaction data. We cannot move money or change account settings.</p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-3 rounded-xl bg-muted/30 border border-border/50">
            <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Bank-Grade Security</p>
              <p className="text-muted-foreground">Your data is encrypted using AES-256 standards and is never sold to third parties.</p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-3 rounded-xl bg-muted/30 border border-border/50">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Right to Revoke</p>
              <p className="text-muted-foreground">You can disconnect your account and request data deletion at any time from your settings.</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/30">
          By clicking "Accept & Continue", you authorize FinSight to securely access your financial information in accordance with local Data Protection Acts (e.g., Barbados DPA 2019, Jamaica DPA 2020).
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onAccept} className="bg-primary shadow-lg shadow-primary/20">
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
