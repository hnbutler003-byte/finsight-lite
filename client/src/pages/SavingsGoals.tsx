import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Loader2, Plus, Target, Trash2, PiggyBank, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { redirectToLogin } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { SavingsGoal } from "@shared/schema";

const CURRENCIES = [
  { code: "BSD", symbol: "B$" }, { code: "USD", symbol: "$" },
  { code: "JMD", symbol: "J$" }, { code: "TTD", symbol: "TT$" },
  { code: "BBD", symbol: "Bds$" }, { code: "XCD", symbol: "EC$" },
  { code: "GYD", symbol: "G$" }, { code: "HTG", symbol: "G" },
];
const getSymbol = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol ?? code;

export default function SavingsGoals() {
  const { isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [justCompletedId, setJustCompletedId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", targetAmount: "", currency: "BSD", deadline: "" });

  useEffect(() => {
    if (!justCompletedId) return;
    const t = setTimeout(() => setJustCompletedId(null), 4500);
    return () => clearTimeout(t);
  }, [justCompletedId]);

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
      toast({ title: "Goal created!", description: "Your savings goal has been added." });
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
      toast({ title: "Savings updated!", description: "Amount added to your goal." });
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

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center caribbean-bg">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-white" data-testid="text-page-title">
                Savings Goals
              </h1>
              <p className="text-white/85 mt-1">Set targets and track your progress</p>
            </div>
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-goal" className="w-full sm:w-auto shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  New Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Savings Goal</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate({
                      name: formData.name,
                      targetAmount: parseFloat(formData.targetAmount),
                      currency: formData.currency,
                      deadline: formData.deadline || undefined,
                    });
                    setFormData({ name: "", targetAmount: "", currency: "BSD", deadline: "" });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="goal-name">Goal Name</Label>
                    <Input
                      id="goal-name"
                      data-testid="input-goal-name"
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., New phone, School trip, Emergency fund"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="goal-target">Target Amount</Label>
                      <Input
                        id="goal-target"
                        data-testid="input-goal-target"
                        type="number"
                        step="0.01"
                        min="1"
                        value={formData.targetAmount}
                        onChange={e => setFormData(p => ({ ...p, targetAmount: e.target.value }))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={v => setFormData(p => ({ ...p, currency: v }))}
                      >
                        <SelectTrigger data-testid="select-goal-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="goal-deadline">Target Date (optional)</Label>
                    <Input
                      id="goal-deadline"
                      data-testid="input-goal-deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-goal"
                  >
                    {createMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : <Plus className="w-4 h-4 mr-2" />}
                    Create Goal
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Empty state */}
          {!goals || goals.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-glass">
              <PiggyBank className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">No savings goals yet</h3>
              <p className="text-muted-foreground mb-4">Start by creating a personal savings target above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((goal) => {
                const current = parseFloat(goal.currentAmount);
                const target = parseFloat(goal.targetAmount);
                const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
                const symbol = getSymbol(goal.currency);
                const isComplete = percent >= 100;
                const justCompleted = justCompletedId === goal.id;

                return (
                  <div
                    key={goal.id}
                    className={`glass-card rounded-glass p-6 flex flex-col gap-4 ${isComplete ? "ring-2 ring-secondary/50" : ""} ${justCompleted ? "animate-bounce-in" : ""}`}
                    data-testid={`card-goal-${goal.id}`}
                  >
                    {/* Celebration banner - appears only when goal is freshly completed */}
                    {justCompleted && (
                      <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-secondary/15 border border-secondary/40 animate-pop-in">
                        <Trophy className="w-4 h-4 text-secondary shrink-0" />
                        <p className="font-display font-bold text-secondary text-sm">
                          Congratulations! Goal reached!
                        </p>
                        <Trophy className="w-4 h-4 text-secondary shrink-0" />
                      </div>
                    )}

                    {/* Goal header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isComplete ? "bg-secondary/20" : "bg-primary/10"}`}>
                          {isComplete
                            ? <Trophy className="w-5 h-5 text-secondary" />
                            : <Target className="w-5 h-5 text-primary" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-semibold text-foreground truncate">
                            {goal.name}
                          </h3>
                          {goal.deadline && (
                            <p className="text-xs text-muted-foreground">
                              Due {format(new Date(goal.deadline), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteMutation.mutate(goal.id)}
                        data-testid={`button-delete-goal-${goal.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Amount display */}
                    <div className="flex justify-between items-baseline">
                      <span className={`font-display text-2xl font-bold ${isComplete ? "text-secondary" : "text-foreground"}`}>
                        {symbol}{current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        of {symbol}{target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Savings progress bar - amber/secondary token */}
                    <div>
                      <div className="xp-bar-track">
                        <div
                          className="savings-bar-fill"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                        <span className={`font-medium ${isComplete ? "text-secondary" : ""}`}>
                          {percent}% saved
                        </span>
                        {!isComplete && (
                          <span>
                            {symbol}{(target - current).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to go
                          </span>
                        )}
                        {isComplete && !justCompleted && (
                          <span className="text-secondary font-semibold">Complete!</span>
                        )}
                      </div>
                    </div>

                    {/* Add savings / complete state */}
                    {!isComplete && (
                      addingTo === goal.id ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={addAmount}
                            onChange={e => setAddAmount(e.target.value)}
                            placeholder={`Amount in ${goal.currency}`}
                            className="flex-1 min-w-0"
                            data-testid={`input-add-savings-${goal.id}`}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const added = parseFloat(addAmount || "0");
                              if (isNaN(added) || added <= 0) return;
                              const newAmount = current + added;
                              if (newAmount >= target) setJustCompletedId(goal.id);
                              updateMutation.mutate({ id: goal.id, currentAmount: newAmount });
                            }}
                            disabled={!addAmount || updateMutation.isPending}
                            data-testid={`button-save-savings-${goal.id}`}
                          >
                            {updateMutation.isPending
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setAddingTo(null); setAddAmount(""); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setAddingTo(goal.id)}
                          data-testid={`button-add-savings-${goal.id}`}
                        >
                          <Plus className="w-3 h-3 mr-1.5" />
                          Add Savings
                        </Button>
                      )
                    )}
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
