import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { redirectToLogin } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Progress } from "@/components/ui/progress";

interface TrendMonth {
  month: string;
  income: number;
  expenses: number;
  categories: Record<string, number>;
}

interface TrendAlert {
  category: string;
  change: number;
  current: number;
  previous: number;
  overBudget?: boolean;
}

interface BudgetComparison {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

interface TrendsData {
  months: TrendMonth[];
  alerts: TrendAlert[];
  budgetComparison: BudgetComparison[];
}

export default function Trends() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: trends, isLoading } = useQuery<TrendsData | null>({
    queryKey: ["/api/trends"],
    queryFn: async () => {
      const res = await fetch("/api/trends?months=6", { credentials: "include" });
      if (res.status === 401) {
        redirectToLogin(toast);
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch trends");
      return res.json();
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center caribbean-bg">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const formatMonth = (m: string) => {
    const [year, month] = m.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const chartData = trends?.months.map(m => ({
    name: formatMonth(m.month),
    Income: Math.round(m.income * 100) / 100,
    Expenses: Math.round(m.expenses * 100) / 100,
  })) || [];

  const topCategories = new Set<string>();
  if (trends?.months) {
    for (const m of trends.months) {
      for (const cat of Object.keys(m.categories)) {
        topCategories.add(cat);
      }
    }
  }
  const categoryColors = [
    "#0891b2", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  ];

  const categoryChartData = trends?.months.map(m => {
    const entry: Record<string, string | number> = { name: formatMonth(m.month) };
    Array.from(topCategories).forEach(cat => {
      entry[cat] = Math.round((m.categories[cat] || 0) * 100) / 100;
    });
    return entry;
  }) || [];

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-white" data-testid="text-page-title">Spending Trends</h1>
            <p className="text-white/85 mt-1">Month-over-month comparison of your income and spending</p>
          </div>

          {/* Spending Alerts */}
          {trends?.alerts && trends.alerts.length > 0 && (
            <div className="space-y-3" data-testid="section-alerts">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Spending Alerts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trends.alerts.map((alert) => (
                  <div
                    key={alert.category}
                    className={`rounded-xl border p-4 ${
                      alert.overBudget
                        ? "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800"
                        : "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800"
                    }`}
                    data-testid={`alert-${alert.category}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{alert.category}</span>
                      <span className={`text-sm font-bold flex items-center gap-1 ${
                        alert.overBudget ? "text-red-600" : "text-amber-600"
                      }`}>
                        <ArrowUp className="w-3 h-3" />
                        +{alert.change}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Last month: ${alert.previous.toFixed(2)}</span>
                      <span>This month: ${alert.current.toFixed(2)}</span>
                    </div>
                    {alert.overBudget && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">Over budget!</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Income vs Expenses Bar Chart */}
          <div className="glass-card rounded-glass p-6">
            <h2 className="font-display text-lg font-bold mb-4">Income vs Expenses</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#cbd5e1" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#cbd5e1" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">No transaction data yet</p>
            )}
          </div>

          {/* Category Breakdown Over Time */}
          {topCategories.size > 0 && (
            <div className="glass-card rounded-glass p-6">
              <h2 className="font-display text-lg font-bold mb-4">Spending by Category</h2>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#cbd5e1" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#cbd5e1" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                  {Array.from(topCategories).map((cat, i) => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={categoryColors[i % categoryColors.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Budget Comparison */}
          {trends?.budgetComparison && trends.budgetComparison.length > 0 && (
            <div className="glass-card rounded-glass p-6" data-testid="section-budget-comparison">
              <h2 className="font-display text-lg font-bold mb-4">Budget vs Actual</h2>
              <div className="space-y-4">
                {trends.budgetComparison.map((b) => (
                  <div key={b.category} className="space-y-2" data-testid={`budget-comparison-${b.category}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{b.category}</span>
                      <span className={`font-semibold ${b.percentUsed > 100 ? "text-red-500 dark:text-red-400" : b.percentUsed > 80 ? "text-amber-500 dark:text-amber-400" : "text-green-500 dark:text-green-400"}`}>
                        ${b.spent.toFixed(2)} / ${b.budgeted.toFixed(2)} ({b.percentUsed}%)
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(b.percentUsed, 100)} 
                      className={`h-2 ${b.percentUsed > 100 ? "[&>div]:bg-red-500" : b.percentUsed > 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`}
                    />
                    {b.percentUsed > 100 && (
                      <p className="text-xs text-red-600 dark:text-red-400">Over budget by ${Math.abs(b.remaining).toFixed(2)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
