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
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { label: "My Money", href: "/", icon: LayoutDashboard, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/30" },
  { label: "Budgets", href: "/budgets", icon: Wallet, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { label: "Spending Trends", href: "/trends", icon: TrendingUp, color: "text-cyan-500", bg: "bg-cyan-100 dark:bg-cyan-900/30" },
  { label: "Savings Goals", href: "/savings", icon: PiggyBank, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
  { label: "Investment Simulator", href: "/invest", icon: GraduationCap, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
  { label: "Money Games", href: "/games", icon: Gamepad2, color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-900/30" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);

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
          const isActive = location === item.href;
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

      <div className="p-4 border-t-2 border-dashed border-violet-200 dark:border-violet-800 mt-auto">
        <div className="flex items-center gap-3 mb-4 px-2">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={user.firstName || "User"} className="w-11 h-11 rounded-2xl border-3 border-violet-200 dark:border-violet-700 shadow-md" />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
              {user?.firstName?.[0] || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{user?.firstName || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
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
