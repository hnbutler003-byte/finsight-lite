import { useStats, useConvertedStats } from "@/hooks/use-stats";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { DocumentUploadSection } from "@/components/documents/DocumentUpload";
import { Wallet, TrendingUp, TrendingDown, Plus, Loader2, HelpCircle, Link as LinkIcon, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { ComplianceConsentModal } from "@/components/compliance/ComplianceConsentModal";
import { BankLinkModal } from "@/components/compliance/BankLinkModal";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [currency, setCurrency] = useState("BSD");
  const [period, setPeriod] = useState<"monthly" | "yearly" | "all">("all");
  const { data: stats, isLoading: statsLoading } = useStats({ period });
  const { data: convertedStats } = useConvertedStats({ baseCurrency: currency, period });
  const { data: healthScore } = useQuery<{ score: number; rating: string; tips: string[] } | null>({
    queryKey: ["/api/health-score"],
    queryFn: async () => {
      const res = await fetch("/api/health-score", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });
  const [showConsent, setShowConsent] = useState(false);
  const [showBankSelect, setShowBankSelect] = useState(false);

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

  const hasMultipleCurrencies = convertedStats?.currencyBreakdown 
    ? Object.keys(convertedStats.currencyBreakdown).length > 1 
    : false;

  if (authLoading || statsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate generic chart data from stats if available, else placeholders
  const COLORS = [
    '#0891b2', // Cyan
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#f97316', // Orange
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#14b8a6', // Teal
    '#a855f7', // Purple
    '#6366f1', // Indigo
    '#d946ef', // Fuchsia
  ];
  const expenseData = stats?.expensesByCategory.map((item, index) => ({
    name: item.category,
    value: Number(item.amount),
    color: item.color || COLORS[index % COLORS.length]
  })) || [];

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-col mb-1">
                <h2 className="text-primary font-bold tracking-tighter text-sm uppercase">FinSight 360</h2>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest -mt-1">by FinSight Ltd.</p>
              </div>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground">
                Welcome back, {user?.firstName || "Friend"}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">Here's what your finances look like today.</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[180px] bg-card border-primary/20">
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden sm:block">
                      <Button 
                        variant="outline" 
                        disabled
                        className="border-primary/20 bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60"
                      >
                        <LinkIcon className="mr-2 w-4 h-4" />
                        Link Bank
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This feature is not available in your region yet</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <TransactionForm>
                        <Button size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                          <Plus className="mr-2 w-5 h-5" />
                          New Transaction
                        </Button>
                      </TransactionForm>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Manually log cash income or expenses</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <ComplianceConsentModal 
            isOpen={showConsent} 
            onOpenChange={setShowConsent}
            onAccept={() => {
              setShowConsent(false);
              setShowBankSelect(true);
            }}
          />

          <BankLinkModal
            isOpen={showBankSelect}
            onOpenChange={setShowBankSelect}
            onSuccess={() => {
              setShowBankSelect(false);
            }}
          />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Total Balance" 
              value={`${selectedCurrency.symbol}${(convertedStats?.balance ?? stats?.balance ?? 0).toFixed(2)}`} 
              icon={Wallet} 
              variant="primary"
              description={hasMultipleCurrencies ? `Converted to ${currency}` : `Your current net worth in ${currency}`}
            />
            <StatCard 
              title="Total Income" 
              value={`${selectedCurrency.symbol}${(convertedStats?.totalIncome ?? stats?.totalIncome ?? 0).toFixed(2)}`} 
              icon={TrendingUp} 
              trend="+12%" 
              trendUp={true}
              description={hasMultipleCurrencies ? `All income converted to ${currency}` : "Total money received this period"}
            />
            <StatCard 
              title="Total Expenses" 
              value={`${selectedCurrency.symbol}${(convertedStats?.totalExpenses ?? stats?.totalExpenses ?? 0).toFixed(2)}`} 
              icon={TrendingDown} 
              trend="-5%" 
              trendUp={true}
              description={hasMultipleCurrencies ? `All expenses converted to ${currency}` : "Total money spent this period"}
            />
          </div>

          {/* Multi-Currency Breakdown */}
          {hasMultipleCurrencies && convertedStats?.currencyBreakdown && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50">
              <h3 className="font-display text-lg font-bold mb-4">Currency Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(convertedStats.currencyBreakdown).map(([code, data]) => {
                  const curr = CURRENCIES.find(c => c.code === code);
                  return (
                    <div key={code} className="rounded-xl border border-border/50 p-4 bg-muted/30" data-testid={`currency-breakdown-${code}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{curr?.symbol || code} {code}</span>
                        <span className="text-xs text-muted-foreground">{data.count} transactions</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400">+{curr?.symbol}{data.income.toFixed(2)}</span>
                        <span className="text-red-600 dark:text-red-400">-{curr?.symbol}{data.expenses.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Financial Health Score */}
          {healthScore && (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50" data-testid="section-health-score">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  healthScore.score >= 80 ? "bg-green-100 dark:bg-green-900/30" :
                  healthScore.score >= 60 ? "bg-blue-100 dark:bg-blue-900/30" :
                  healthScore.score >= 40 ? "bg-amber-100 dark:bg-amber-900/30" :
                  "bg-red-100 dark:bg-red-900/30"
                }`}>
                  <Heart className={`w-5 h-5 ${
                    healthScore.score >= 80 ? "text-green-600" :
                    healthScore.score >= 60 ? "text-blue-600" :
                    healthScore.score >= 40 ? "text-amber-600" :
                    "text-red-600"
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-bold">Financial Health Score</h3>
                  <p className="text-sm text-muted-foreground">{healthScore.rating}</p>
                </div>
                <div className={`text-4xl font-bold ${
                  healthScore.score >= 80 ? "text-green-600" :
                  healthScore.score >= 60 ? "text-blue-600" :
                  healthScore.score >= 40 ? "text-amber-600" :
                  "text-red-600"
                }`} data-testid="text-health-score">
                  {healthScore.score}
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
              </div>
              {healthScore.tips.length > 0 && (
                <div className="space-y-2">
                  {healthScore.tips.slice(0, 3).map((tip, i) => (
                    <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">&#8226;</span>
                      {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Breakdown */}
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl font-bold">Expense Breakdown</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>See where your money goes at a glance</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
                  <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/50 border-none">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-[300px] w-full">
                {expenseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {expenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `${selectedCurrency.symbol}${Number(value).toFixed(2)}`} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-muted">
                    No expense data yet
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity List (Simplified for dashboard) */}
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl font-bold">Recent Activity</h3>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">View All</Button>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                  stats.recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-secondary/20 text-secondary-foreground flex items-center justify-center text-lg">
                          {tx.category?.icon ? <span dangerouslySetInnerHTML={{__html: tx.category.icon}}/> : (Number(tx.amount) > 0 ? '💰' : '💸')}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{tx.description || "Untitled Transaction"}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(tx.date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <span className={`font-mono font-medium ${Number(tx.amount) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {Number(tx.amount) > 0 ? '+' : ''}{tx.currency === currency ? selectedCurrency.symbol : '$'}{Math.abs(Number(tx.amount)).toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center py-8">
                    <p>No recent activity.</p>
                    <TransactionForm>
                      <Button variant="ghost" className="mt-2 text-primary p-0 h-auto font-medium hover:bg-transparent">Create your first transaction</Button>
                    </TransactionForm>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document Upload Portal */}
          <DocumentUploadSection />

        </div>
      </main>
    </div>
  );
}
