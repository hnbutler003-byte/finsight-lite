import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Loader2, Plus, Target, Trash2, PiggyBank } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { redirectToLogin } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { format } from "date-fns";
import type { SavingsGoal } from "@shared/schema";

export default function SavingsGoals() {
  const { isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [addAmount, setAddAmount] = useState("");

  const { data: goals, isLoading } = useQuery<SavingsGoal[]>({
    queryKey: ["/api/savings-goals"],
    queryFn: async () => {
      const res = await fetch("/api/savings-goals", { credentials: "include" });
      if (res.status === 401) { redirectToLogin(toast); return []; }
      if (!res.ok) throw new Error("Failed to fetch goals");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; targetAmount: number; currency: string; deadline?: string }) => {
      return apiRequest("POST", "/api/savings-goals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/savings-goals"] });
      setShowAdd(false);
      toast({ title: "Goal created", description: "Your savings goal has been added." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, currentAmount }: { id: number; currentAmount: number }) => {
      return apiRequest("PATCH", `/api/savings-goals/${id}`, { currentAmount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/savings-goals"] });
      setAddingTo(null);
      setAddAmount("");
      toast({ title: "Savings updated", description: "Amount added to your goal." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/savings-goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/savings-goals"] });
      toast({ title: "Goal removed", description: "Savings goal has been deleted." });
    },
  });

  const [formData, setFormData] = useState({ name: "", targetAmount: "", currency: "BSD", deadline: "" });

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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">Savings Goals</h1>
              <p className="text-muted-foreground mt-1">Set targets and track your progress</p>
            </div>
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-goal">
                  <Plus className="w-4 h-4 mr-2" />
                  New Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Savings Goal</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate({
                    name: formData.name,
                    targetAmount: parseFloat(formData.targetAmount),
                    currency: formData.currency,
                    deadline: formData.deadline || undefined,
                  });
                  setFormData({ name: "", targetAmount: "", currency: "BSD", deadline: "" });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="goal-name">Goal Name</Label>
                    <Input id="goal-name" data-testid="input-goal-name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Emergency Fund" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="goal-target">Target Amount</Label>
                      <Input id="goal-target" data-testid="input-goal-target" type="number" step="0.01" min="1" value={formData.targetAmount} onChange={e => setFormData(p => ({ ...p, targetAmount: e.target.value }))} required />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select value={formData.currency} onValueChange={v => setFormData(p => ({ ...p, currency: v }))}>
                        <SelectTrigger data-testid="select-goal-currency"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="goal-deadline">Deadline (optional)</Label>
                    <Input id="goal-deadline" data-testid="input-goal-deadline" type="date" value={formData.deadline} onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-goal">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Goal
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {!goals || goals.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
              <PiggyBank className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No savings goals yet</h3>
              <p className="text-muted-foreground mb-4">Start setting financial targets to build your wealth</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((goal) => {
                const current = parseFloat(goal.currentAmount);
                const target = parseFloat(goal.targetAmount);
                const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
                const symbol = getSymbol(goal.currency);
                const isComplete = percent >= 100;

                return (
                  <div key={goal.id} className={`bg-card rounded-2xl p-6 shadow-sm border ${isComplete ? "border-green-300 dark:border-green-800" : "border-border/50"}`} data-testid={`card-goal-${goal.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"}`}>
                          <Target className={`w-5 h-5 ${isComplete ? "text-green-600" : "text-primary"}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{goal.name}</h3>
                          {goal.deadline && (
                            <p className="text-xs text-muted-foreground">
                              Due: {format(new Date(goal.deadline), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(goal.id)} data-testid={`button-delete-goal-${goal.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className={`font-bold ${isComplete ? "text-green-600" : ""}`}>{percent}%</span>
                      </div>
                      <Progress value={percent} className={`h-3 ${isComplete ? "[&>div]:bg-green-500" : ""}`} />
                      <div className="flex justify-between text-sm">
                        <span>{symbol}{current.toFixed(2)}</span>
                        <span className="text-muted-foreground">of {symbol}{target.toFixed(2)}</span>
                      </div>

                      {!isComplete && (
                        addingTo === goal.id ? (
                          <div className="flex gap-2 mt-2">
                            <Input type="number" step="0.01" min="0.01" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="Amount" className="flex-1" data-testid={`input-add-savings-${goal.id}`} />
                            <Button size="sm" onClick={() => {
                              const newAmount = current + parseFloat(addAmount || "0");
                              updateMutation.mutate({ id: goal.id, currentAmount: newAmount });
                            }} disabled={!addAmount || updateMutation.isPending} data-testid={`button-save-savings-${goal.id}`}>
                              Save
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setAddingTo(goal.id)} data-testid={`button-add-savings-${goal.id}`}>
                            <Plus className="w-3 h-3 mr-1" /> Add Savings
                          </Button>
                        )
                      )}

                      {isComplete && (
                        <p className="text-center text-green-600 dark:text-green-400 text-sm font-semibold mt-2">Goal reached!</p>
                      )}
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
