import { Sidebar } from "@/components/layout/Sidebar";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lightbulb, Target, TrendingUp, Globe, ArrowRightLeft, Info } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reports() {
  const [currency, setCurrency] = useState("BSD");

  const CURRENCIES = [
    { code: "BSD", name: "Bahamian Dollar" },
    { code: "JMD", name: "Jamaican Dollar" },
    { code: "TTD", name: "Trinidad & Tobago Dollar" },
    { code: "BBD", name: "Barbadian Dollar" },
    { code: "XCD", name: "East Caribbean Dollar" },
    { code: "GYD", name: "Guyanese Dollar" },
    { code: "HTG", name: "Haitian Gourde" },
    { code: "USD", name: "US Dollar" },
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
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
                <TabsTrigger value="spending" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Spending Analysis
                </TabsTrigger>
                <TabsTrigger value="currency" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Currency Insights
                </TabsTrigger>
              </TabsList>

              <TabsContent value="spending" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(insights as any)?.spendingInsights?.map((insight: any, i: number) => (
                    <Card key={i} className="hover-elevate">
                      <CardHeader className="flex flex-row items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-foreground">{insight.behavior}</p>
                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                          <p className="text-sm font-medium text-primary flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Suggestion:
                          </p>
                          <p className="text-sm text-primary/80 mt-1">{insight.suggestion}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="currency" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(insights as any)?.currencyInsights?.map((insight: any, i: number) => (
                    <Card key={i} className="hover-elevate">
                      <CardHeader className="flex flex-row items-center gap-2">
                        {insight.impact === 'positive' ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : insight.impact === 'negative' ? (
                          <ArrowRightLeft className="w-5 h-5 text-red-500" />
                        ) : (
                          <Info className="w-5 h-5 text-blue-500" />
                        )}
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
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
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
