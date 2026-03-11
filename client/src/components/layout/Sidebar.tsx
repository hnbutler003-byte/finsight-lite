import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  LogOut, 
  Menu,
  Wallet,
  TrendingUp,
  PiggyBank,
  GraduationCap,
  Sparkles,
  Gamepad2,
  Bot,
  FlaskConical,
  UsersRound,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const AVATAR_EMOJIS: Record<string, string> = {
  lion: "🦁", dolphin: "🐬", parrot: "🦜", turtle: "🐢",
  star: "🌟", butterfly: "🦋", octopus: "🐙", artist: "🎨",
  rocket: "🚀", wave: "🌊", palm: "🌴", gamer: "🎮",
};

const NAV_ITEMS = [
  { label: "My Money", href: "/", icon: LayoutDashboard, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/30" },
  { label: "Budgets", href: "/budgets", icon: Wallet, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { label: "Spending Trends", href: "/trends", icon: TrendingUp, color: "text-cyan-500", bg: "bg-cyan-100 dark:bg-cyan-900/30" },
  { label: "Savings Goals", href: "/savings", icon: PiggyBank, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
  { label: "Investment Simulator", href: "/invest", icon: GraduationCap, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
  { label: "Money Games", href: "/games", icon: Gamepad2, color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-900/30" },
  { label: "Money Guide", href: "/guide", icon: Bot, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
  { label: "MoneyLab", href: "/moneylab", icon: FlaskConical, color: "text-teal-500", bg: "bg-teal-100 dark:bg-teal-900/30" },
];

function JoinClassModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/student/join-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      qc.invalidateQueries({ queryKey: ["/api/student/classes"] });
      setJoined(data.class?.name || "your class");
    } catch (e: any) {
      toast({ title: "Couldn't join class", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-3xl border-2 border-violet-200 dark:border-violet-800 shadow-2xl p-8 w-full max-w-sm space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <UsersRound className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="font-display font-bold text-xl">Join a Class</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        {joined ? (
          <div className="text-center space-y-3 py-4">
            <div className="w-14 h-14 rounded-3xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-bold text-lg">You joined!</p>
            <p className="text-sm text-muted-foreground">You're now in <span className="font-bold text-violet-600">{joined}</span></p>
            <Button onClick={onClose} className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <p className="text-sm text-muted-foreground">Ask your teacher for the class code and enter it below.</p>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB12CD"
              maxLength={8}
              className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-center font-display font-bold text-2xl tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
              data-testid="input-class-code"
            />
            <Button type="submit" disabled={!code.trim() || loading} className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 py-5 font-bold" data-testid="button-join-class-submit">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Join Class"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-violet-50 via-white to-pink-50 dark:from-violet-950/40 dark:via-background dark:to-pink-950/20">
      <div className="p-6 border-b-2 border-dashed border-violet-200 dark:border-violet-800">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400 text-white flex items-center justify-center shrink-0 text-xl shadow-lg shadow-violet-300 dark:shadow-violet-900 animate-float">
            $
          </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500">
            FinSight Lite
          </span>
        </h1>
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          by FinSight Ltd.
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 border-2",
              isActive 
                ? "bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-300 dark:shadow-purple-900 border-transparent scale-[1.02]" 
                : "text-foreground hover:bg-white/80 dark:hover:bg-white/5 hover:scale-[1.02] hover:shadow-md border-transparent hover:border-violet-200 dark:hover:border-violet-800"
            )} onClick={() => setOpen(false)}>
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
                isActive ? "bg-white/20" : item.bg
              )}>
                <item.icon className={cn("w-4.5 h-4.5", isActive ? "text-white" : item.color)} />
              </div>
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t-2 border-dashed border-violet-200 dark:border-violet-800 mt-auto space-y-2">
        <div className="flex items-center gap-3 mb-2 px-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-md">
            {AVATAR_EMOJIS[(user as any)?.avatar] || "🌟"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{user?.firstName || "Player"}</p>
            <p className="text-xs text-muted-foreground truncate">{(user as any)?.username}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-2xl border-2 border-violet-200 text-violet-600 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950/20 font-semibold"
          onClick={() => setShowJoin(true)}
          data-testid="button-join-class"
        >
          <UsersRound className="w-4 h-4" />
          Join a Class
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 rounded-2xl border-2 border-red-200 text-red-500 hover:text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30 font-semibold"
          onClick={() => logout()}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {showJoin && <JoinClassModal onClose={() => setShowJoin(false)} />}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shadow-lg bg-white rounded-2xl border-2 border-violet-200 dark:border-violet-700" data-testid="button-mobile-menu">
              <Menu className="w-5 h-5 text-violet-600" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden lg:block w-72 h-screen border-r-2 border-dashed border-violet-200 dark:border-violet-800 sticky top-0 overflow-hidden">
        <NavContent />
      </aside>
    </>
  );
}
