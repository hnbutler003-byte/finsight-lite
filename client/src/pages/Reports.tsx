import { Sidebar } from "@/components/layout/Sidebar";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, Target, TrendingUp, Globe, ArrowRightLeft, Info, Newspaper, ExternalLink, Download, FileText, FileSpreadsheet, BarChart3, DollarSign, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const [currency, setCurrency] = useState("BSD");
  const [exportPeriod, setExportPeriod] = useState("all");
  const { toast } = useToast();

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

  const getDateRange = () => {
    const now = new Date();
    let startDate = "";
    let endDate = now.toISOString().split("T")[0];
    if (exportPeriod === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = start.toISOString().split("T")[0];
    } else if (exportPeriod === "quarter") {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      startDate = start.toISOString().split("T")[0];
    } else if (exportPeriod === "year") {
      const start = new Date(now.getFullYear(), 0, 1);
      startDate = start.toISOString().split("T")[0];
    }
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/export/summary", currency, exportPeriod],
    queryFn: async () => {
      const params = new URLSearchParams({ currency });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/export/summary?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
  });

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/ai/insights", currency],
    queryFn: async () => {
      const res = await fetch(`/api/ai/insights?currency=${currency}`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    }
  });

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    window.open(`/api/export/transactions?${params}`, "_blank");
    toast({ title: "Export started", description: "Your CSV file will download shortly." });
  };

  const handleExportJSON = () => {
    const params = new URLSearchParams({ format: "json" });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    fetch(`/api/export/transactions?${params}`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `finsight360-transactions-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Export started", description: "Your JSON file will download shortly." });
      });
  };

  const currSymbol = CURRENCIES.find(c => c.code === currency)?.symbol || "$";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold" data-testid="text-reports-title">Reports & Insights</h1>
              <p className="text-muted-foreground">Financial summaries, exports, and AI-powered analysis.</p>
            </div>
            <div className="flex gap-3">
              <Select value={exportPeriod} onValueChange={setExportPeriod}>
                <SelectTrigger className="w-[160px] bg-card border-primary/20" data-testid="select-period">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[200px] bg-card border-primary/20" data-testid="select-currency">
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full max-w-3xl grid-cols-4 mb-8">
              <TabsTrigger value="summary" className="flex items-center gap-2" data-testid="tab-summary">
                <BarChart3 className="w-4 h-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2" data-testid="tab-export">
                <Download className="w-4 h-4" />
                Export
              </TabsTrigger>
              <TabsTrigger value="spending" className="flex items-center gap-2" data-testid="tab-spending">
                <TrendingUp className="w-4 h-4" />
                AI Insights
              </TabsTrigger>
              <TabsTrigger value="news" className="flex items-center gap-2" data-testid="tab-news">
                <Newspaper className="w-4 h-4" />
                News
              </TabsTrigger>
            </TabsList>

            {/* Financial Summary Tab */}
            <TabsContent value="summary" className="space-y-6">
              {summaryLoading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Generating financial summary...</p>
                </div>
              ) : summary ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <ArrowUpRight className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Income</p>
                            <p className="text-xl font-bold text-green-600" data-testid="text-total-income">
                              {currSymbol}{summary.totalIncome.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <ArrowDownRight className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Expenses</p>
                            <p className="text-xl font-bold text-red-600" data-testid="text-total-expenses">
                              {currSymbol}{summary.totalExpenses.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Net Savings</p>
                            <p className={`text-xl font-bold ${summary.netSavings >= 0 ? "text-blue-600" : "text-red-600"}`} data-testid="text-net-savings">
                              {currSymbol}{summary.netSavings.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <PieChartIcon className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Savings Rate</p>
                            <p className="text-xl font-bold text-purple-600" data-testid="text-savings-rate">
                              {summary.savingsRate}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {summary.topCategories?.length > 0 && (
                    <Card className="border-none shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg font-display">Top Spending Categories</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {summary.topCategories.map((cat: any, i: number) => (
                            <div key={i} className="flex items-center gap-4" data-testid={`row-category-${i}`}>
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium">{cat.category}</span>
                                  <span className="text-muted-foreground">{currSymbol}{cat.amount.toLocaleString()} ({cat.percentage}%)</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${cat.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {summary.budgetStatus?.length > 0 && (
                    <Card className="border-none shadow-md">
                      <CardHeader>
                        <CardTitle className="text-lg font-display">Budget Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {summary.budgetStatus.map((b: any, i: number) => {
                            const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
                            const over = pct > 100;
                            return (
                              <div key={i} className="flex items-center gap-4" data-testid={`row-budget-${i}`}>
                                <div className="flex-1">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium">{b.category}</span>
                                    <span className={`text-sm ${over ? "text-red-600 font-bold" : "text-muted-foreground"}`}>
                                      {currSymbol}{b.spent} / {currSymbol}{b.limit} ({pct}%)
                                    </span>
                                  </div>
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-green-500"}`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <p className="text-sm text-muted-foreground text-center">
                    {summary.transactionCount} transactions in this period
                  </p>
                </>
              ) : (
                <div className="text-center p-12 text-muted-foreground">
                  No data available for the selected period.
                </div>
              )}
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover-elevate border-none shadow-md">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Export as CSV</CardTitle>
                      <p className="text-sm text-muted-foreground">Spreadsheet format, works with Excel & Google Sheets</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Downloads all your transactions with date, description, amount, type, currency, and category columns.
                    </p>
                    <Button onClick={handleExportCSV} className="w-full" data-testid="button-export-csv">
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover-elevate border-none shadow-md">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Export as JSON</CardTitle>
                      <p className="text-sm text-muted-foreground">Structured data format for developers</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Downloads your transactions in JSON format, suitable for importing into other financial tools.
                    </p>
                    <Button onClick={handleExportJSON} variant="outline" className="w-full" data-testid="button-export-json">
                      <Download className="w-4 h-4 mr-2" />
                      Download JSON
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="spending" className="space-y-6">
              {insightsLoading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground animate-pulse">Consulting regional economic data...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(insights as any)?.spendingInsights?.map((insight: any, i: number) => (
                      <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${i * 150}ms` }}>
                        <Card className="hover-elevate border-none shadow-md bg-gradient-to-br from-card to-muted/30">
                          <CardHeader className="flex flex-row items-center gap-3 pb-2">
                            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center animate-pulse">
                              <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <CardTitle className="text-lg font-display">{insight.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed italic">
                              "{insight.behavior}"
                            </p>
                            <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-inner">
                              <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2 mb-1">
                                <Target className="w-3 h-3" />
                                Friendly Tip
                              </p>
                              <p className="text-sm text-foreground font-medium">{insight.suggestion}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>

                  {(insights as any)?.currencyInsights?.length > 0 && (
                    <>
                      <h3 className="text-xl font-display font-bold mt-8">Currency Insights</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(insights as any)?.currencyInsights?.map((insight: any, i: number) => (
                          <Card key={i} className="hover-elevate">
                            <CardHeader className="flex flex-row items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {insight.impact === 'positive' ? (
                                  <TrendingUp className="w-5 h-5 text-green-500" />
                                ) : insight.impact === 'negative' ? (
                                  <ArrowRightLeft className="w-5 h-5 text-red-500" />
                                ) : (
                                  <Info className="w-5 h-5 text-blue-500" />
                                )}
                                <CardTitle className="text-lg">{insight.title}</CardTitle>
                              </div>
                              {insight.rate && (
                                <div className="px-3 py-1 bg-primary/10 rounded-full">
                                  <span className="text-xs font-mono font-bold text-primary">{insight.rate}</span>
                                </div>
                              )}
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {insight.content}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </TabsContent>

            {/* News Tab */}
            <TabsContent value="news" className="space-y-6">
              {insightsLoading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground animate-pulse">Fetching regional news...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(insights as any)?.newsClippings?.map((news: any, i: number) => (
                    <a key={i} href={news.url} target="_blank" rel="noopener noreferrer" className="block group">
                      <Card className="hover-elevate overflow-hidden border-none shadow-md bg-card transition-all group-hover:shadow-lg group-hover:ring-1 group-hover:ring-primary/20">
                        <div className="bg-primary/5 px-4 py-2 border-b border-primary/10 flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{news.source}</span>
                          <ExternalLink className="w-3 h-3 text-primary/40 group-hover:text-primary transition-colors" />
                        </div>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">{news.headline}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-3 italic">
                            {news.summary}
                          </p>
                          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                            <span>Financial Briefing</span>
                            <span className="text-primary/60">Visit this site &rarr;</span>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
