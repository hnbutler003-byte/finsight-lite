import { useStats, useConvertedStats } from "@/hooks/use-stats";
import { useTransactions, useDeleteTransaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Wallet, TrendingUp, TrendingDown, Plus, Loader2, Sparkles,
  Lightbulb, Target, Trash2, Edit2, ChevronDown, ChevronUp, MessageSquare,
  ArrowUpCircle, ArrowDownCircle, CheckCircle2, Circle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { GuidedTour } from "@/components/GuidedTour";
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
  Tooltip as RechartsTooltip
} from "recharts";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CURRENCIES = [
  { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$" },
  { code: "BSD", name: "Bahamian Dollar", symbol: "B$" },
  { code: "GYD", name: "Guyanese Dollar", symbol: "G$" },
  { code: "HTG", name: "Haitian Gourde", symbol: "G" },
  { code: "JMD", name: "Jamaican Dollar", symbol: "J$" },
  { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$" },
];

const COLORS = [
  '#0891b2', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#3b82f6', '#f97316', '#06b6d4', '#84cc16',
];

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [currency, setCurrency] = useState("BSD");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem("finsight_tour_done");
    if (!done) setShowTour(true);
  }, []);

  const { data: stats, isLoading: statsLoading } = useStats({ period: "all" });
  const { data: convertedStats } = useConvertedStats({ baseCurrency: currency, period: "all" });
  const { data: transactions, isLoading: txLoading } = useTransactions({});
  const { mutate: deleteTx } = useDeleteTransaction();
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/ai/insights", currency],
    queryFn: async () => {
      const res = await fetch(`/api/ai/insights?currency=${currency}`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    }
  });

  const { data: teacherFeedback } = useQuery<any[]>({
    queryKey: ["/api/student/feedback"],
  });

  const { data: savingsGoals } = useQuery<any[]>({
    queryKey: ["/api/savings-goals"],
  });

  const [checklistDismissed, setChecklistDismissed] = useState(
    () => localStorage.getItem("student_checklist_dismissed") === "true"
  );

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[1];

  if (authLoading || statsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center caribbean-bg">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  const expenseData = stats?.expensesByCategory.map((item, index) => ({
    name: item.category,
    value: Number(item.amount),
    color: item.color || COLORS[index % COLORS.length]
  })) || [];

  const visibleTransactions = showAllTransactions
    ? transactions
    : transactions?.slice(0, 8);

  const tourDone = localStorage.getItem("finsight_tour_done") === "true";
  const hasTransactions = (transactions?.length ?? 0) > 0;
  const hasSavingsGoal = Array.isArray(savingsGoals) && savingsGoals.length > 0;
  const hasXp = ((user as any)?.xp ?? 0) > 0;
  const checklistItems = [
    { label: "Complete the welcome tour", done: tourDone },
    { label: "Log your first transaction", done: hasTransactions },
    { label: "Create a savings goal", done: hasSavingsGoal },
    { label: "Try a money game or lesson", done: hasXp },
  ];
  const checklistProgress = checklistItems.filter(i => i.done).length;
  const checklistAllDone = checklistProgress === checklistItems.length;

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      {showTour && (
        <GuidedTour onComplete={() => {
          setShowTour(false);
          localStorage.setItem("finsight_tour_done", "true");
        }} />
      )}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-white" data-testid="text-dashboard-title">
                My Money
              </h1>
              <p className="text-white/85 mt-1" data-testid="text-dashboard-greeting">
                Hey {user?.firstName || "there"}! Here's your money at a glance.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[160px] bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white font-medium shadow-lg focus:ring-2 focus:ring-white/40 data-[placeholder]:text-white/75" data-testid="select-currency">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TransactionForm>
                <Button size="lg" className="shadow-lg shadow-primary/20 rounded-2xl" data-testid="button-new-transaction">
                  <Plus className="mr-2 w-5 h-5" />
                  Add
                </Button>
              </TransactionForm>
            </div>
          </div>

          {!checklistDismissed && (
            <div className="glass-card rounded-glass p-5 animate-bounce-in" data-testid="section-student-checklist">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {checklistAllDone ? "🎉 You're all set!" : "Getting Started"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {checklistAllDone
                      ? "You've completed all the starter steps — keep going!"
                      : `${checklistProgress} of ${checklistItems.length} steps done`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem("student_checklist_dismissed", "true");
                    setChecklistDismissed(true);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5 p-0.5 rounded"
                  aria-label="Dismiss checklist"
                  data-testid="button-dismiss-checklist"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="xp-bar-track mb-4">
                <div
                  className="xp-bar-fill"
                  style={{ width: `${(checklistProgress / checklistItems.length) * 100}%` }}
                />
              </div>
              <div className="space-y-2.5">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3" data-testid={`checklist-item-${i}`}>
                    {item.done ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-4.5 h-4.5 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={`text-sm ${item.done ? "text-foreground line-through decoration-muted-foreground/40" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Your Balance"
              value={`${selectedCurrency.symbol}${(convertedStats?.balance ?? stats?.balance ?? 0).toFixed(2)}`}
              icon={Wallet}
              variant="primary"
              description={`How much you have in ${currency}`}
            />
            <StatCard
              title="Money In"
              value={`${selectedCurrency.symbol}${(convertedStats?.totalIncome ?? stats?.totalIncome ?? 0).toFixed(2)}`}
              icon={TrendingUp}
              description="Money you've earned"
            />
            <StatCard
              title="Money Out"
              value={`${selectedCurrency.symbol}${(convertedStats?.totalExpenses ?? stats?.totalExpenses ?? 0).toFixed(2)}`}
              icon={TrendingDown}
              description="Money you've spent"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 glass-card rounded-glass p-5">
              <h3 className="font-display text-lg font-bold mb-3">Where It Goes</h3>
              <div className="h-[260px] w-full">
                {expenseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {expenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value) => `${selectedCurrency.symbol}${Number(value).toFixed(2)}`}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: "#555555" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-muted text-sm">
                    No spending data yet
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 glass-card rounded-glass p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-bold">Recent Activity</h3>
                <TransactionForm>
                  <Button variant="ghost" size="sm" className="text-primary rounded-xl text-xs" data-testid="button-add-inline">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </TransactionForm>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {txLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
                        <div className="w-9 h-9 rounded-xl bg-muted animate-shimmer shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 rounded-full bg-muted animate-shimmer" style={{ width: `${55 + (i * 13) % 35}%` }} />
                          <div className="h-2.5 rounded-full bg-muted animate-shimmer w-1/3" />
                        </div>
                        <div className="h-3 rounded-full bg-muted animate-shimmer w-14" />
                      </div>
                    ))}
                  </div>
                ) : visibleTransactions && visibleTransactions.length > 0 ? (
                  visibleTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-2xl hover:bg-muted/30 transition-colors group"
                      data-testid={`transaction-item-${tx.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-secondary/20 text-secondary-foreground flex items-center justify-center text-base shrink-0">
                          {tx.category?.icon ? (
                            <span dangerouslySetInnerHTML={{ __html: tx.category.icon }} />
                          ) : tx.type === "income" ? (
                            <ArrowUpCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <ArrowDownCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{tx.description || tx.category?.name || "Transaction"}</p>
                          <p className="text-[11px] text-muted-foreground">{format(new Date(tx.date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-semibold text-sm whitespace-nowrap ${tx.type === "income" ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.type === "income" ? '+' : '-'}
                          {tx.currency === currency ? selectedCurrency.symbol : `${tx.currency} `}
                          {Math.abs(Number(tx.amount)).toFixed(2)}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TransactionForm transaction={tx as any}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" data-testid={`button-edit-${tx.id}`}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </TransactionForm>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" data-testid={`button-delete-${tx.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this transaction.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTx(tx.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground text-center py-8 text-sm">
                    <p>No activity yet.</p>
                    <TransactionForm>
                      <Button variant="ghost" className="mt-2 text-primary p-0 h-auto font-medium hover:bg-transparent text-sm" data-testid="button-first-transaction">
                        Add your first transaction
                      </Button>
                    </TransactionForm>
                  </div>
                )}
              </div>
              {transactions && transactions.length > 8 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs text-muted-foreground rounded-xl"
                  onClick={() => setShowAllTransactions(!showAllTransactions)}
                  data-testid="button-toggle-transactions"
                >
                  {showAllTransactions ? (
                    <>Show Less <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
                  ) : (
                    <>Show All ({transactions.length}) <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="glass-card rounded-glass overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-5 text-left hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
              onClick={() => setShowTips(!showTips)}
              data-testid="button-toggle-tips"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Smart Money Tips</h3>
                  <p className="text-xs text-muted-foreground">AI-powered tips based on your spending</p>
                </div>
              </div>
              {showTips ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            {showTips && (
              <div className="px-5 pb-5 space-y-3">
                {insightsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    <span className="ml-2 text-sm text-muted-foreground">Getting smart tips...</span>
                  </div>
                ) : (insights as any)?.spendingInsights?.length > 0 ? (
                  (insights as any).spendingInsights.slice(0, 4).map((insight: any, i: number) => (
                    <div key={i} className="rounded-2xl border border-border/50 p-4 bg-muted/20" data-testid={`tip-card-${i}`}>
                      <p className="font-semibold text-sm mb-1">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mb-2 italic">"{insight.behavior}"</p>
                      <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
                          <Target className="w-3 h-3" />
                          Tip
                        </p>
                        <p className="text-sm text-foreground">{insight.suggestion}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Add some transactions to get personalized tips!
                  </p>
                )}
              </div>
            )}
          </div>

          {teacherFeedback && teacherFeedback.length > 0 && (
            <div className="glass-card rounded-glass p-5 space-y-3" data-testid="section-teacher-feedback">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">Teacher Feedback</h3>
                  <p className="text-xs text-muted-foreground">Messages from your teacher</p>
                </div>
              </div>
              <div className="space-y-3">
                {teacherFeedback.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="rounded-2xl border border-border/50 p-4 bg-muted/20" data-testid={`feedback-item-${item.id}`}>
                    <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                      <p className="text-xs font-bold text-teal-700 dark:text-teal-300">{item.teacherName}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(item.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Card className="glass-card p-5 rounded-glass" data-testid="card-learning-progress">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground" data-testid="text-learning-title">Ready to Learn More?</h3>
                  <p className="text-muted-foreground text-sm mt-0.5" data-testid="text-learning-description">
                    Try the investment simulator or play money games to level up your skills!
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/invest" data-testid="link-invest">
                  <Button size="sm" className="rounded-2xl">
                    <Sparkles className="mr-1.5 w-4 h-4" />
                    Invest
                  </Button>
                </Link>
                <Link href="/games" data-testid="link-games">
                  <Button size="sm" variant="outline" className="rounded-2xl border-2">
                    Play Games
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
}
