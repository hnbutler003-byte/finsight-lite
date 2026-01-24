import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Landmark, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface BankLinkModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CARIBBEAN_BANKS = [
  { id: "fcib", name: "CIBC FirstCaribbean", color: "bg-[#8B0000]" },
  { id: "scotia", name: "Scotiabank", color: "bg-[#ED1C24]" },
  { id: "rbc", name: "RBC Royal Bank", color: "bg-[#005DAA]" },
  { id: "republic", name: "Republic Bank", color: "bg-[#002D72]" },
  { id: "bob", name: "Bank of The Bahamas", color: "bg-[#00AEEF]" },
];

export function BankLinkModal({ isOpen, onOpenChange, onSuccess }: BankLinkModalProps) {
  const [step, setStep] = useState<"select" | "connecting">("select");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (bank: typeof CARIBBEAN_BANKS[0]) => {
      const res = await fetch("/api/cards/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardNumber: "4111222233334444", // Mock number
          bankName: bank.name
        }),
      });
      if (!res.ok) throw new Error("Connection failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Bank Linked Successfully",
        description: `Your ${selectedBank} account is now connected and synced.`,
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "We couldn't reach the bank servers. Please try again later.",
        variant: "destructive",
      });
      setStep("select");
    }
  });

  const handleBankSelect = (bank: typeof CARIBBEAN_BANKS[0]) => {
    setSelectedBank(bank.name);
    setStep("connecting");
    mutation.mutate(bank);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold text-primary">
            {step === "select" ? "Select Your Bank" : "Connecting..."}
          </DialogTitle>
          <DialogDescription>
            {step === "select" 
              ? "Choose your financial institution to start secure linkage."
              : `We're establishing a secure connection with ${selectedBank}...`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "select" ? (
            <div className="grid gap-3">
              {CARIBBEAN_BANKS.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => handleBankSelect(bank)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-all text-left group"
                >
                  <div className={`w-10 h-10 rounded-lg ${bank.color} flex items-center justify-center text-white shrink-0`}>
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{bank.name}</p>
                    <p className="text-xs text-muted-foreground italic">Instant sync available</p>
                  </div>
                </button>
              ))}
              <div className="p-4 rounded-xl border border-dashed border-border flex items-center gap-4 text-muted-foreground text-sm">
                <CreditCard className="w-5 h-5" />
                <span>Other regional banks coming soon</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Lock className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-medium animate-pulse text-muted-foreground">
                Verifying regional compliance standards...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
