import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  LogOut, 
  Menu,
  Wallet,
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
  BookMarked,
  Building2,
  ChevronRight,
  ChevronLeft,
  Settings as SettingsIcon,
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
  crab: "🦀", fish: "🐠", whale: "🐳", flamingo: "🦩",
  sun: "☀️", moon: "🌙", flower: "🌺", seedling: "🌱",
  mountain: "🏔️", coral: "🪸", coconut: "🥥", compass: "🧭",
};

const NAV_GROUPS = [
  {
    section: "My Finances",
    items: [
      { label: "My Money", href: "/", icon: LayoutDashboard },
      { label: "Budgets", href: "/budgets", icon: Wallet },
      { label: "Savings Goals", href: "/savings", icon: PiggyBank },
    ],
  },
  {
    section: "Investing & Learning",
    items: [
      { label: "Investment Simulator", href: "/invest", icon: GraduationCap },
      { label: "Lessons", href: "/lessons", icon: BookMarked },
      { label: "MoneyLab", href: "/moneylab", icon: FlaskConical },
    ],
  },
  {
    section: "Explore",
    items: [
      { label: "Money Games", href: "/games", icon: Gamepad2 },
      { label: "Money Guide", href: "/guide", icon: Bot },
    ],
  },
];

const NAV_SETTINGS = { label: "Settings", href: "/settings", icon: SettingsIcon };

// Flat list for icon rail (all items + settings)
const NAV_ITEMS = [
  ...NAV_GROUPS.flatMap(g => g.items),
  NAV_SETTINGS,
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
      <div className="glass-card-heavy rounded-glass p-8 w-full max-w-sm space-y-5" onClick={e => e.stopPropagation()}>
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

// ─── JoinOrgModal ────────────────────────────────────────────────────────────

type OrgPreview = { org: { name: string; type: string }; env: { display_name: string } };

function JoinOrgModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<OrgPreview | null>(null);
  const [result, setResult] = useState<{ alreadyEnrolled: boolean; orgName: string; envName: string } | null>(null);

  const lookupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/org/join/preview?code=${encodeURIComponent(code.trim())}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPreview(data);
    } catch (e: any) {
      toast({ title: "Code not found", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirmJoin = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/org/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      qc.invalidateQueries({ queryKey: ["/api/lessons"] });
      setResult({ alreadyEnrolled: data.alreadyEnrolled, orgName: data.org.name, envName: data.env.display_name });
    } catch (e: any) {
      toast({ title: "Couldn't join", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card-heavy rounded-glass p-8 w-full max-w-sm space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="font-display font-bold text-xl">Join an Organization</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {result ? (
          <div className="text-center space-y-3 py-4">
            <div className="w-14 h-14 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-indigo-600" />
            </div>
            <p className="font-bold text-lg">{result.alreadyEnrolled ? "Already Enrolled!" : "You're in!"}</p>
            <p className="text-sm text-muted-foreground">
              {result.alreadyEnrolled
                ? <>You're already part of <span className="font-bold text-indigo-600">{result.orgName}</span> — {result.envName}.</>
                : <>You've joined <span className="font-bold text-indigo-600">{result.orgName}</span> — {result.envName}. Check your Lessons tab!</>}
            </p>
            <Button onClick={onClose} className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500">Done</Button>
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 p-4 space-y-1">
              <p className="text-xs text-indigo-500 uppercase font-bold tracking-widest">You're joining</p>
              <p className="font-bold text-lg text-indigo-800 dark:text-indigo-200">{preview.org.name}</p>
              <p className="text-sm text-indigo-600 dark:text-indigo-300">{preview.env.display_name}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreview(null)} className="flex-1 rounded-2xl">Back</Button>
              <Button onClick={confirmJoin} disabled={loading} className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600" data-testid="button-confirm-join-org">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Confirm <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={lookupCode} className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the join code given by your school or organization.</p>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="e.g. ABC2DE"
              maxLength={6}
              className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-center font-display font-bold text-2xl tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
              data-testid="input-org-code"
            />
            <Button type="submit" disabled={code.length !== 6 || loading} className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 py-5 font-bold" data-testid="button-lookup-org-code">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Find Organization"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showJoinOrg, setShowJoinOrg] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try { localStorage.setItem("sidebar-collapsed", String(next)); }
    catch {}
  };

  const activeItem = NAV_ITEMS.find(item =>
    item.href === "/" ? location === "/" : location.startsWith(item.href)
  ) || NAV_ITEMS[0];

  const NavContent = () => (
    <div className="flex flex-col h-full caribbean-bg text-white">
      <div className="p-5 pb-4 border-b border-white/10 flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-400 via-pink-500 to-orange-400 text-white flex items-center justify-center shrink-0 text-xl shadow-lg shadow-violet-900/50 animate-float">
              $
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-pink-400 to-orange-400">
              FinSight Lite
            </span>
          </h1>
          <p className="text-[10px] text-white/75 uppercase font-bold tracking-widest mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            by FinSight Ltd.
          </p>
        </div>
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex mt-1 p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0"
          aria-label="Collapse sidebar"
          data-testid="button-collapse-sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.section}>
            {gi > 0 && <div className="border-t border-white/10 mb-3" />}
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 px-4 mb-1.5">
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 border",
                    isActive
                      ? "bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-900/50 border-transparent scale-[1.02]"
                      : "glass-inset text-white/80 hover:bg-white/10 hover:text-white hover:scale-[1.02] border-transparent hover:border-white/10"
                  )} onClick={() => setOpen(false)}>
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
                      isActive ? "bg-white/20" : "bg-white/10"
                    )}>
                      <item.icon className={cn("w-4.5 h-4.5", isActive ? "text-white" : "text-white/80")} />
                    </div>
                    <span className="font-semibold text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Settings — always at the bottom of the nav list */}
        <div className="border-t border-white/10 pt-3">
          {(() => {
            const item = NAV_SETTINGS;
            const isActive = location.startsWith(item.href);
            return (
              <Link href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 border",
                isActive
                  ? "bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-900/50 border-transparent scale-[1.02]"
                  : "glass-inset text-white/80 hover:bg-white/10 hover:text-white hover:scale-[1.02] border-transparent hover:border-white/10"
              )} onClick={() => setOpen(false)}>
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
                  isActive ? "bg-white/20" : "bg-white/10"
                )}>
                  <item.icon className={cn("w-4.5 h-4.5", isActive ? "text-white" : "text-white/80")} />
                </div>
                <span className="font-semibold text-sm">{item.label}</span>
              </Link>
            );
          })()}
        </div>
      </nav>

      <div className="p-4 border-t border-white/10 mt-auto space-y-2 glass-inset rounded-t-2xl">
        <div className="flex items-center gap-3 mb-2 px-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-md">
            {AVATAR_EMOJIS[(user as any)?.avatar] || "🌟"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-white">{user?.firstName || "Player"}</p>
            <p className="text-xs text-white/75 truncate">{(user as any)?.username}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-2xl border border-white/20 text-white/80 hover:bg-white/10 hover:text-white font-semibold"
          onClick={() => setShowJoin(true)}
          data-testid="button-join-class"
        >
          <UsersRound className="w-4 h-4" />
          Join a Class
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 rounded-2xl border border-indigo-400/30 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 font-semibold"
          onClick={() => setShowJoinOrg(true)}
          data-testid="button-join-org"
        >
          <Building2 className="w-4 h-4" />
          Join an Organization
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 rounded-2xl border border-red-400/30 text-red-300 hover:text-red-200 hover:bg-red-500/10 font-semibold"
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
      {showJoinOrg && <JoinOrgModal onClose={() => setShowJoinOrg(false)} />}

      {/* Mobile hamburger (unchanged) */}
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

      {/* Desktop sidebar — full panel or slim icon rail */}
      <aside className={cn(
        "hidden lg:flex flex-col h-screen border-r border-white/10 sticky top-0 overflow-hidden transition-all duration-300 ease-in-out shrink-0 caribbean-bg",
        isCollapsed ? "w-14" : "w-72"
      )}>
        {isCollapsed ? (
          /* ── Icon rail (collapsed) ── */
          <div className="flex flex-col items-center py-4 gap-1 h-full">
            <button
              onClick={toggleCollapse}
              className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors mb-3"
              aria-label="Expand sidebar"
              data-testid="button-expand-sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {NAV_ITEMS.map((item) => {
              const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-900/50"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                  data-testid={`rail-link-${item.href.replace("/", "") || "home"}`}
                >
                  <item.icon className="w-4 h-4" />
                </Link>
              );
            })}

            <div className="mt-auto mb-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-base shadow-md">
                {AVATAR_EMOJIS[(user as any)?.avatar] || "🌟"}
              </div>
            </div>
          </div>
        ) : (
          /* ── Full panel (expanded) ── */
          <div className="w-72 h-full">
            <NavContent />
          </div>
        )}
      </aside>
    </>
  );
}
