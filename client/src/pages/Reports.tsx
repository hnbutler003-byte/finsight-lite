import { Sidebar } from "@/components/layout/Sidebar";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lightbulb, Target, TrendingUp, Globe, ArrowRightLeft, Info, Newspaper, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reports() {
  const [currency, setCurrency] = useState("BSD");

  const CURRENCIES = [
    { code: "BBD", name: "Barbadian Dollar" },
    { code: "BSD", name: "Bahamian Dollar" },
    { code: "GYD", name: "Guyanese Dollar" },
    { code: "HTG", name: "Haitian Gourde" },
    { code: "JMD", name: "Jamaican Dollar" },
    { code: "TTD", name: "Trinidad & Tobago Dollar" },
    { code: "USD", name: "US Dollar" },
    { code: "XCD", name: "East Caribbean Dollar" },
  ];

  const { data: insights, isLoading } = useQuery({
    queryKey: ["/api/ai/insights", currency],
    queryFn: async () => {
      const res = await fetch(`/api/ai/insights?currency=${currency}`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    }
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold">Financial Insights</h1>
              <p className="text-muted-foreground">AI-powered analysis and regional currency intelligence.</p>
            </div>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[200px] bg-card border-primary/20">
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

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Consulting regional economic data...</p>
            </div>
          ) : (
            <Tabs defaultValue="spending" className="w-full">
              <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-8">
                <TabsTrigger value="spending" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Spending Analysis
                </TabsTrigger>
                <TabsTrigger value="currency" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Currency Insights
                </TabsTrigger>
                <TabsTrigger value="news" className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4" />
                  Regional News
                </TabsTrigger>
              </TabsList>

              <TabsContent value="spending" className="space-y-6">
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
              </TabsContent>

              <TabsContent value="currency" className="space-y-6">
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
              </TabsContent>

              <TabsContent value="news" className="space-y-6">
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
                            <span className="text-primary/60">Visit this site →</span>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
