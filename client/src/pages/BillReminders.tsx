import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Loader2, Plus, CalendarClock, Trash2, Zap, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { redirectToLogin } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, differenceInCalendarDays, startOfDay, parseISO } from "date-fns";

interface BillReminder {
  id: number;
  name: string;
  amount: string;
  currency: string;
  frequency: string;
  nextDueDate: string;
  isAutoDetected: boolean;
  category?: { name: string } | null;
}

interface DetectedBill {
  name: string;
  amount: number;
  frequency: string;
  nextDueDate: string;
  categoryId: number | null;
}

export default function BillReminders() {
  const { isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);

  const { data: reminders, isLoading } = useQuery<BillReminder[]>({
    queryKey: ["/api/bill-reminders"],
    queryFn: async () => {
      const res = await fetch("/api/bill-reminders", { credentials: "include" });
      if (res.status === 401) { redirectToLogin(toast); return []; }
      if (!res.ok) throw new Error("Failed to fetch reminders");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; amount: number; currency: string; frequency: string; nextDueDate: string }) => {
      return apiRequest("POST", "/api/bill-reminders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bill-reminders"] });
      setShowAdd(false);
      toast({ title: "Reminder added", description: "Bill reminder has been created." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/bill-reminders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bill-reminders"] });
      toast({ title: "Reminder removed", description: "Bill reminder has been deleted." });
    },
  });

  const detectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bill-reminders/auto-detect");
      return res.json();
    },
    onSuccess: (data: { detected: DetectedBill[] }) => {
      if (data.detected.length === 0) {
        toast({ title: "No patterns found", description: "We couldn't detect recurring bills from your transactions yet." });
      } else {
        toast({ title: `Found ${data.detected.length} recurring bills`, description: "Review and add them below." });
        setDetectedBills(data.detected);
      }
    },
  });

  const [detectedBills, setDetectedBills] = useState<DetectedBill[]>([]);
  const [formData, setFormData] = useState({ name: "", amount: "", currency: "BSD", frequency: "monthly", nextDueDate: "" });

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const CURRENCIES = [
    { code: "BSD", symbol: "B$" }, { code: "USD", symbol: "$" },
    { code: "JMD", symbol: "J$" }, { code: "TTD", symbol: "TT$" },
    { code: "BBD", symbol: "Bds$" }, { code: "XCD", symbol: "EC$" },
    { code: "GYD", symbol: "G$" }, { code: "HTG", symbol: "G" },
  ];

  const getSymbol = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol || code;

  const getDueStatus = (dateStr: string) => {
    const dateParts = dateStr.split("T")[0].split("-");
    const dueDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const today = startOfDay(new Date());
    const days = differenceInCalendarDays(dueDate, today);
    if (days < 0) return { label: `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`, color: "text-red-600 bg-red-50 dark:bg-red-950/30" };
    if (days === 0) return { label: "Due today", color: "text-red-600 bg-red-50 dark:bg-red-950/30" };
    if (days === 1) return { label: "Due tomorrow", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" };
    if (days <= 7) return { label: `Due in ${days} days`, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" };
    if (days <= 30) return { label: `Due in ${days} days (${format(dueDate, "MMM d")})`, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" };
    return { label: `Due ${format(dueDate, "MMM d, yyyy")}`, color: "text-muted-foreground bg-muted/30" };
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">Bill Reminders</h1>
              <p className="text-muted-foreground mt-1">Track upcoming bills and never miss a payment</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => detectMutation.mutate()} disabled={detectMutation.isPending} data-testid="button-auto-detect">
                {detectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Auto-Detect Bills
              </Button>
              <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-reminder">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Reminder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Bill Reminder</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate({
                      name: formData.name,
                      amount: parseFloat(formData.amount),
                      currency: formData.currency,
                      frequency: formData.frequency,
                      nextDueDate: formData.nextDueDate,
                    });
                    setFormData({ name: "", amount: "", currency: "BSD", frequency: "monthly", nextDueDate: "" });
                  }} className="space-y-4">
                    <div>
                      <Label htmlFor="bill-name">Bill Name</Label>
                      <Input id="bill-name" data-testid="input-bill-name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Electricity" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bill-amount">Amount</Label>
                        <Input id="bill-amount" data-testid="input-bill-amount" type="number" step="0.01" min="0.01" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} required />
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <Select value={formData.currency} onValueChange={v => setFormData(p => ({ ...p, currency: v }))}>
                          <SelectTrigger data-testid="select-bill-currency"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Frequency</Label>
                        <Select value={formData.frequency} onValueChange={v => setFormData(p => ({ ...p, frequency: v }))}>
                          <SelectTrigger data-testid="select-bill-frequency"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="bill-due">Next Due Date</Label>
                        <Input id="bill-due" data-testid="input-bill-due-date" type="date" value={formData.nextDueDate} onChange={e => setFormData(p => ({ ...p, nextDueDate: e.target.value }))} required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-reminder">
                      {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Add Reminder
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Auto-detected bills */}
          {detectedBills.length > 0 && (
            <div className="glass-card rounded-glass p-6" data-testid="section-detected-bills">
              <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Detected Recurring Bills
              </h2>
              <div className="space-y-3">
                {detectedBills.map((bill, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div>
                      <p className="font-medium text-sm">{bill.name}</p>
                      <p className="text-xs text-muted-foreground">{bill.frequency} &middot; ~${bill.amount.toFixed(2)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      createMutation.mutate({
                        name: bill.name,
                        amount: bill.amount,
                        currency: "BSD",
                        frequency: bill.frequency,
                        nextDueDate: bill.nextDueDate,
                      });
                      setDetectedBills(prev => prev.filter((_, idx) => idx !== i));
                    }} data-testid={`button-add-detected-${i}`}>
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bill reminders list */}
          {!reminders || reminders.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-glass">
              <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bill reminders yet</h3>
              <p className="text-muted-foreground mb-4">Add reminders or let us detect recurring bills from your history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => {
                const dueStatus = getDueStatus(reminder.nextDueDate);
                return (
                  <div key={reminder.id} className="glass-card rounded-glass p-4 flex items-center justify-between" data-testid={`card-reminder-${reminder.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <CalendarClock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{reminder.name}</h3>
                          {reminder.isAutoDetected && (
                            <Badge variant="outline" className="text-xs">Auto-detected</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{getSymbol(reminder.currency)}{parseFloat(reminder.amount).toFixed(2)}</span>
                          <span>&middot;</span>
                          <span className="capitalize">{reminder.frequency}</span>
                          {reminder.category && <><span>&middot;</span><span>{reminder.category.name}</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${dueStatus.color}`}>
                        {dueStatus.label}
                      </span>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(reminder.id)} data-testid={`button-delete-reminder-${reminder.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
