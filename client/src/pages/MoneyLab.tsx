import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Upload, Gamepad2, GraduationCap, Trophy, Flame, Star, Zap, Award,
  BookOpen, Target, Sparkles, ChevronRight
} from "lucide-react";

const BADGE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  first_game: { label: "First Steps", icon: "👶", color: "bg-green-100 text-green-700" },
  ten_games: { label: "Game Veteran", icon: "🎮", color: "bg-blue-100 text-blue-700" },
  perfect_score: { label: "Perfect Score", icon: "💯", color: "bg-yellow-100 text-yellow-700" },
  streak_3: { label: "On Fire", icon: "🔥", color: "bg-orange-100 text-orange-700" },
  streak_7: { label: "Week Warrior", icon: "⚔️", color: "bg-red-100 text-red-700" },
  level_5: { label: "Rising Star", icon: "⭐", color: "bg-purple-100 text-purple-700" },
  level_10: { label: "Money Master", icon: "👑", color: "bg-amber-100 text-amber-700" },
  xp_500: { label: "XP Hunter", icon: "🎯", color: "bg-cyan-100 text-cyan-700" },
  xp_1000: { label: "XP Legend", icon: "🏆", color: "bg-pink-100 text-pink-700" },
  challenge_win: { label: "Challenge Champion", icon: "🏅", color: "bg-indigo-100 text-indigo-700" },
  speed_demon: { label: "Speed Demon", icon: "⚡", color: "bg-rose-100 text-rose-700" },
};

const SECTIONS = [
  {
    label: "Upload Past Paper",
    href: "/moneylab/upload",
    icon: Upload,
    color: "from-blue-500 to-cyan-500",
    shadow: "shadow-blue-300/50 dark:shadow-blue-900/50",
    desc: "Upload PDF or images of exam papers",
    bg: "bg-blue-50 dark:bg-blue-950/20",
  },
  {
    label: "Play Exam Game",
    href: "/moneylab/play",
    icon: Gamepad2,
    color: "from-green-500 to-emerald-500",
    shadow: "shadow-green-300/50 dark:shadow-green-900/50",
    desc: "Quiz, Timed & Challenge modes",
    bg: "bg-green-50 dark:bg-green-950/20",
  },
  {
    label: "AI Tutor",
    href: "/moneylab/tutor",
    icon: GraduationCap,
    color: "from-violet-500 to-purple-500",
    shadow: "shadow-violet-300/50 dark:shadow-violet-900/50",
    desc: "Get AI explanations for questions",
    bg: "bg-violet-50 dark:bg-violet-950/20",
  },
  {
    label: "Leaderboards",
    href: "/moneylab/leaderboard",
    icon: Trophy,
    color: "from-amber-500 to-orange-500",
    shadow: "shadow-amber-300/50 dark:shadow-amber-900/50",
    desc: "See who's on top!",
    bg: "bg-amber-50 dark:bg-amber-950/20",
  },
];

export default function MoneyLab() {
  const { user } = useAuth();

  const { data: xpData } = useQuery<{
    xp: { totalXp: number; level: number; currentStreak: number; longestStreak: number };
    badges: { badgeId: string }[];
    totalGames: number;
  }>({
    queryKey: ["/api/moneylab/xp"],
  });

  const xp = xpData?.xp;
  const badges = xpData?.badges || [];
  const xpProgress = xp ? (xp.totalXp % 100) : 0;

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center mx-auto shadow-xl shadow-teal-300/50 dark:shadow-teal-900/50">
              <span className="text-4xl">🧪</span>
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" data-testid="text-moneylab-title">
              MoneyLab
            </h1>
            <p className="text-white/75 max-w-md mx-auto">
              Upload past exam papers, play quiz games, and become a commerce champion!
            </p>
          </div>

          {xp && (
            <Card className="glass-card rounded-glass overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {xp.level}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-muted-foreground">Level {xp.level}</p>
                      <span className="xp-pill">{xp.totalXp} XP</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1">
                      <span>Progress to Level {xp.level + 1}</span>
                      <span>{xpProgress}/100 XP</span>
                    </div>
                    <div className="xp-bar-track">
                      <div
                        className="xp-bar-fill"
                        style={{ width: `${xpProgress}%` }}
                        data-testid="xp-progress-bar"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="streak-badge">
                      <Flame className="w-4 h-4" />
                      {xp.currentStreak} day{xp.currentStreak !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-1.5 text-blue-500">
                      <Gamepad2 className="w-5 h-5" />
                      <span className="font-bold">{xpData?.totalGames || 0} games</span>
                    </div>
                  </div>
                </div>

                {badges.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {badges.map((b) => {
                      const info = BADGE_INFO[b.badgeId];
                      if (!info) return null;
                      return (
                        <span key={b.badgeId} className={`badge-coral`} data-testid={`badge-${b.badgeId}`}>
                          {info.icon} {info.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SECTIONS.map((s) => (
              <Link key={s.href} href={s.href}>
                <Card className={`glass-card rounded-glass transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer`} data-testid={`card-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg ${s.shadow} shrink-0`}>
                      <s.icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-lg">{s.label}</h3>
                      <p className="text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
