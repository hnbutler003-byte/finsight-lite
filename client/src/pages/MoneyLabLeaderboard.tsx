import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Trophy, Medal, Crown, Loader2 } from "lucide-react";

const AVATAR_EMOJIS: Record<string, string> = {
  lion: "🦁", dolphin: "🐬", parrot: "🦜", turtle: "🐢",
  star: "🌟", butterfly: "🦋", octopus: "🐙", artist: "🎨",
  rocket: "🚀", wave: "🌊", palm: "🌴", gamer: "🎮",
};

export default function MoneyLabLeaderboard() {
  const [period, setPeriod] = useState<"all" | "weekly">("all");

  const { data: leaderboard, isLoading } = useQuery<{
    userId: string;
    userName: string;
    avatar: string;
    totalScore: number;
    gamesPlayed: number;
  }[]>({
    queryKey: ["/api/moneylab/leaderboard", period],
    queryFn: async () => {
      const res = await fetch(`/api/moneylab/leaderboard?period=${period}`, { credentials: "include" });
      return res.json();
    },
  });

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-amber-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/10 border-amber-200 dark:border-amber-800";
    if (index === 1) return "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/10 border-gray-200 dark:border-gray-800";
    if (index === 2) return "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/10 dark:to-amber-950/10 border-orange-200 dark:border-orange-800";
    return "";
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/moneylab">
              <Button variant="outline" size="icon" className="rounded-2xl border-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold flex items-center gap-2" data-testid="text-leaderboard-title">
                <Trophy className="w-6 h-6 text-amber-500" />
                Leaderboard
              </h1>
              <p className="text-sm text-muted-foreground">Top MoneyLab players</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={period === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("all")}
              className={`rounded-2xl font-bold ${period === "all" ? "bg-gradient-to-r from-amber-500 to-orange-500" : "border-2"}`}
              data-testid="button-period-all"
            >
              All Time
            </Button>
            <Button
              variant={period === "weekly" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("weekly")}
              className={`rounded-2xl font-bold ${period === "weekly" ? "bg-gradient-to-r from-amber-500 to-orange-500" : "border-2"}`}
              data-testid="button-period-weekly"
            >
              This Week
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
          ) : !leaderboard?.length ? (
            <Card className="rounded-3xl border-2 border-dashed">
              <CardContent className="p-8 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-lg font-bold">No games played yet</p>
                <p className="text-muted-foreground mt-1">Be the first to get on the leaderboard!</p>
                <Link href="/moneylab/play">
                  <Button className="mt-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 font-bold" data-testid="button-play-now">
                    Play Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <Card key={entry.userId} className={`rounded-2xl border-2 transition-all ${getRankBg(i)}`} data-testid={`leaderboard-entry-${i}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-8 flex justify-center">{getRankIcon(i)}</div>
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-md">
                      {AVATAR_EMOJIS[entry.avatar] || "🌟"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{entry.userName}</p>
                      <p className="text-xs text-muted-foreground">{entry.gamesPlayed} game{entry.gamesPlayed !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-amber-600 dark:text-amber-400">{entry.totalScore.toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">points</p>
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
