import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  LogOut, 
  Menu,
  Wallet
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: Receipt },
  { label: "Budgets", href: "/budgets", icon: Wallet },
  { label: "Financial Insights", href: "/reports", icon: PieChart },
];

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-white/10">
        <h1 className="font-display text-xl font-bold text-primary flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 text-lg">
            $
          </span>
          FinSight 360
        </h1>
        <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest mt-1">by FinSight Ltd.</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              isActive 
                ? "bg-primary text-white shadow-lg shadow-primary/25 translate-x-1" 
                : "text-muted-foreground hover:bg-primary/5 hover:text-primary hover:translate-x-1"
            )} onClick={() => setOpen(false)}>
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-current")} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center gap-3 mb-4 px-2">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={user.firstName || "User"} className="w-10 h-10 rounded-full border-2 border-primary/10" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground font-bold">
              {user?.firstName?.[0] || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.firstName || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/5"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shadow-md bg-white">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-screen border-r border-border bg-white/50 backdrop-blur-xl sticky top-0">
        <NavContent />
      </aside>
    </>
  );
}
