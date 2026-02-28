import { useStats, useConvertedStats } from "@/hooks/use-stats";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { Wallet, TrendingUp, TrendingDown, Plus, Loader2, HelpCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Link } from "wouter";
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

  const COLORS = [
    '#0891b2', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#ec4899', '#3b82f6', '#f97316', '#06b6d4', '#84cc16',
    '#14b8a6', '#a855f7', '#6366f1', '#d946ef',
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
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground" data-testid="text-dashboard-title">
                Your Money Dashboard
              </h1>
              <p className="text-muted-foreground mt-1" data-testid="text-dashboard-greeting">
                Hey {user?.firstName || "there"}! Here's how your money is doing.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[180px] bg-card border-primary/20" data-testid="select-currency">
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
                    <div>
                      <TransactionForm>
                        <Button size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" data-testid="button-new-transaction">
                          <Plus className="mr-2 w-5 h-5" />
                          Add Transaction
                        </Button>
                      </TransactionForm>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Log your spending or income</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Your Balance" 
              value={`${selectedCurrency.symbol}${(convertedStats?.balance ?? stats?.balance ?? 0).toFixed(2)}`} 
              icon={Wallet} 
              variant="primary"
              description={hasMultipleCurrencies ? `Converted to ${currency}` : `How much you have in ${currency}`}
            />
            <StatCard 
              title="Money In" 
              value={`${selectedCurrency.symbol}${(convertedStats?.totalIncome ?? stats?.totalIncome ?? 0).toFixed(2)}`} 
              icon={TrendingUp} 
              trend="+12%" 
              trendUp={true}
              description={hasMultipleCurrencies ? `All income converted to ${currency}` : "Money you've earned"}
            />
            <StatCard 
              title="Money Out" 
              value={`${selectedCurrency.symbol}${(convertedStats?.totalExpenses ?? stats?.totalExpenses ?? 0).toFixed(2)}`} 
              icon={TrendingDown} 
              trend="-5%" 
              trendUp={true}
              description={hasMultipleCurrencies ? `All expenses converted to ${currency}` : "Money you've spent"}
            />
          </div>

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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50">
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl font-bold">Where Your Money Goes</h3>
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
                  <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/50 border-none" data-testid="select-period">
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
                    No spending data yet
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-6">
                <h3 className="font-display text-xl font-bold">Recent Activity</h3>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="button-view-all">View All</Button>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                  stats.recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-2 p-3 rounded-xl hover:bg-muted/30 transition-colors group" data-testid={`transaction-item-${tx.id}`}>
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
                      <Button variant="ghost" className="mt-2 text-primary p-0 h-auto font-medium hover:bg-transparent" data-testid="button-first-transaction">Create your first transaction</Button>
                    </TransactionForm>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Card className="p-6" data-testid="card-learning-progress">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground" data-testid="text-learning-title">Learning Progress</h3>
                  <p className="text-muted-foreground mt-1" data-testid="text-learning-description">
                    Ready to grow your money skills? Try our investment simulator to learn how investing works — no real money needed!
                  </p>
                </div>
              </div>
              <Link href="/invest" data-testid="link-invest">
                <Button size="lg">
                  <Sparkles className="mr-2 w-4 h-4" />
                  Start Learning
                </Button>
              </Link>
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
}
