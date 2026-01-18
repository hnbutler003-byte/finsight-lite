import { Sidebar } from "@/components/layout/Sidebar";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lightbulb, Target, TrendingUp } from "lucide-react";

export default function Reports() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ["/api/ai/insights"],
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Smart Insights</h1>
            <p className="text-muted-foreground">AI-powered analysis of your financial health.</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Analyzing your spending patterns...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(insights as any)?.insights?.map((insight: any, i: number) => (
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
          )}
        </div>
      </main>
    </div>
  );
}
