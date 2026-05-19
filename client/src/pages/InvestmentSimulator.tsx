import { Sidebar } from "@/components/layout/Sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import {
  Loader2, BookOpen, TrendingUp, Briefcase, ShoppingCart, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Shield, Scale, Coins, PiggyBank, GraduationCap,
  ChevronRight, Wallet, History, AlertTriangle, ExternalLink
} from "lucide-react";

// ── BISX Widget ────────────────────────────────────────────────────────────
const BISX_STOCKS = [
  { symbol: "CBL",  name: "Commonwealth Bank Ltd.",          price: 17.00, change: +0.25, changePct: +1.49, open: 16.75, high: 17.10, low: 16.75, vol: "8,200" },
  { symbol: "FCL",  name: "FOCOL Holdings Ltd.",             price: 11.50, change: -0.10, changePct: -0.86, open: 11.60, high: 11.65, low: 11.48, vol: "3,500" },
  { symbol: "CAB",  name: "Cable Bahamas Ltd.",              price:  4.10, change:  0.00, changePct:  0.00, open:  4.10, high:  4.15, low:  4.08, vol: "1,100" },
  { symbol: "DHS",  name: "Doctors Hospital Health System",  price: 10.25, change: +0.05, changePct: +0.49, open: 10.20, high: 10.30, low: 10.18, vol: "600"   },
  { symbol: "JSJ",  name: "J.S. Johnson & Company Ltd.",     price: 13.75, change: -0.25, changePct: -1.79, open: 14.00, high: 14.00, low: 13.70, vol: "400"   },
  { symbol: "CHB",  name: "Colina Holdings (Bahamas) Ltd.",  price:  7.75, change: +0.10, changePct: +1.31, open:  7.65, high:  7.80, low:  7.65, vol: "950"   },
];

function BISXWidget() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-white/10" data-testid="bisx-widget">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 text-sm font-semibold" style={{ background: "#0A1F44", color: "#fff" }}>
        <span className="px-2 py-0.5 rounded text-xs font-extrabold tracking-wide" style={{ background: "#C9A84C", color: "#0A1F44" }}>BISX</span>
        Bahamas International Securities Exchange
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400" style={{ animation: "pulse 1.8s ease-in-out infinite" }} />
          <span className="text-xs font-semibold text-green-300">End of Day</span>
        </div>
      </div>

      {/* Ticker grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 bg-white dark:bg-slate-900">
        {BISX_STOCKS.map((s, idx) => {
          const dir   = s.change > 0 ? "up" : s.change < 0 ? "down" : "flat";
          const arrow = s.change > 0 ? "▲" : s.change < 0 ? "▼" : "—";
          const sign  = s.change > 0 ? "+" : "";
          const changeBg   = dir === "up" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                           : dir === "down" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                           : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
          const isRightEdge = (idx + 1) % 3 === 0;
          return (
            <div
              key={s.symbol}
              className={`p-4 transition-colors hover:bg-blue-50 dark:hover:bg-slate-800 ${!isRightEdge ? "border-r border-slate-100 dark:border-slate-700" : ""} ${idx >= 3 ? "border-t border-slate-100 dark:border-slate-700" : ""}`}
              data-testid={`bisx-ticker-${s.symbol}`}
            >
              <p className="text-xl font-extrabold tabular-nums dark:text-white" style={{ color: "#0A1F44" }}>{s.symbol}</p>
              <p className="text-xs text-slate-400 mt-0.5 mb-3 truncate">{s.name}</p>
              <p className="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                <span className="text-xs text-slate-400 font-normal mr-0.5">BSD</span>{s.price.toFixed(2)}
              </p>
              <span className={`inline-flex items-center gap-1 text-xs font-bold mt-2 px-2 py-1 rounded ${changeBg}`}>
                {arrow}&nbsp;{sign}{s.change.toFixed(2)} ({sign}{s.changePct.toFixed(2)}%)
              </span>
              <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                <p>O: {s.open.toFixed(2)} · H: {s.high.toFixed(2)} · L: {s.low.toFixed(2)}</p>
                <p>Vol: {s.vol}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-5 py-2.5 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
        <span>Prices in BSD · Updated after market close (Mon–Fri, after 3 pm EST)</span>
        <a
          href="https://www.bisxbahamas.com/price-sheet/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-semibold hover:underline"
          style={{ color: "#C9A84C" }}
          data-testid="link-bisx-full-sheet"
        >
          Full price sheet <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
import type { SimulatedStock, LearningModule, UserLearningProgress, PortfolioHolding, PortfolioTransaction, UserVirtualBalance } from "@shared/schema";
import { getLocalizedModuleContent, type RegionInfo } from "@/data/learning-content";

const CURRENCIES = [
  { code: "BSD", name: "Bahamian Dollar", symbol: "B$" },
  { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$" },
  { code: "GYD", name: "Guyanese Dollar", symbol: "G$" },
  { code: "JMD", name: "Jamaican Dollar", symbol: "J$" },
  { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$" },
  { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$" },
];

const ICON_MAP: Record<string, any> = {
  Coins, PiggyBank, TrendingUp, Shield, Scale, Briefcase,
};

function getSymbol(code: string) {
  return CURRENCIES.find(c => c.code === code)?.symbol || "$";
}

const BSD_FALLBACK: RegionInfo = {
  country: "The Bahamas", currency: "Bahamian Dollar", currencyCode: "BSD", symbol: "B$",
  mainBank: "Commonwealth Bank", exchange: "Bahamas International Securities Exchange", exchangeAbbr: "BISX",
  exampleCompany1: "Focol Holdings", exampleCompany1Ticker: "FCL", exampleCompany1Desc: "distributes fuel across The Bahamas",
  exampleCompany2: "Cable Bahamas", exampleCompany2Ticker: "CAB", exampleCompany2Desc: "provides cable TV, internet, and phone services",
  centralBank: "Central Bank of The Bahamas", bondName: "Bahamas Government Registered Stock", bondRate: "4.5%",
  pegged: true, pegNote: "The Bahamian Dollar is pegged (locked) 1:1 to the US Dollar, so the exchange rate stays the same.",
};

export default function InvestmentSimulator() {
  const [currency, setCurrency] = useState("BSD");
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SimulatedStock | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  const { data: regionData } = useQuery<RegionInfo>({
    queryKey: ["/api/regional-content", currency],
    queryFn: async () => {
      const res = await fetch(`/api/regional-content/${currency}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch regional content");
      return res.json();
    },
    staleTime: Infinity,
  });

  const { data: market, isLoading: marketLoading } = useQuery<SimulatedStock[]>({
    queryKey: ["/api/investments/market", currency],
    queryFn: async () => {
      const res = await fetch(`/api/investments/market?currency=${currency}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch market data");
      return res.json();
    },
  });

  const { data: portfolio, isLoading: portfolioLoading } = useQuery<{
    holdings: (PortfolioHolding & { stock: SimulatedStock })[];
    virtualBalance: UserVirtualBalance;
  }>({
    queryKey: ["/api/investments/portfolio"],
  });

  const { data: history } = useQuery<(PortfolioTransaction & { stock: SimulatedStock })[]>({
    queryKey: ["/api/investments/history"],
  });

  const { data: modules, isLoading: modulesLoading } = useQuery<LearningModule[]>({
    queryKey: ["/api/learn/modules"],
  });

  const { data: progress } = useQuery<UserLearningProgress[]>({
    queryKey: ["/api/learn/progress"],
  });

  const buyMutation = useMutation({
    mutationFn: async ({ stockId, qty }: { stockId: number; qty: number }) => {
      const res = await apiRequest("POST", "/api/investments/buy", { stockId, quantity: qty });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments/history"] });
      setBuyDialogOpen(false);
      setQuantity(1);
      toast({ title: "Purchase complete!", description: "You just bought some shares. Check your portfolio!" });
    },
    onError: (err: Error) => {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    },
  });

  const sellMutation = useMutation({
    mutationFn: async ({ stockId, qty }: { stockId: number; qty: number }) => {
      const res = await apiRequest("POST", "/api/investments/sell", { stockId, quantity: qty });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments/history"] });
      setSellDialogOpen(false);
      setQuantity(1);
      toast({ title: "Sale complete!", description: "You sold some shares. The cash is back in your balance." });
    },
    onError: (err: Error) => {
      toast({ title: "Sale failed", description: err.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      const res = await apiRequest("POST", `/api/learn/complete/${moduleId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learn/progress"] });
      toast({ title: "Lesson complete!", description: "Great job! Keep learning to become a smart investor." });
    },
  });

  const isModuleCompleted = (moduleId: number) =>
    progress?.some(p => p.moduleId === moduleId && p.completed) || false;

  const completedCount = progress?.filter(p => p.completed).length || 0;
  const totalModules = modules?.length || 0;

  const filteredMarket = market || [];

  const virtualBalance = portfolio?.virtualBalance
    ? parseFloat(portfolio.virtualBalance.balance)
    : 10000;

  const totalPortfolioValue = portfolio?.holdings.reduce((sum, h) => {
    return sum + h.quantity * parseFloat(h.stock.currentPrice);
  }, 0) || 0;

  const currSymbol = getSymbol(currency);

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold flex items-center gap-3 text-white" data-testid="text-invest-title">
                <GraduationCap className="w-8 h-8 text-primary" />
                Investment Simulator
              </h1>
              <p className="text-white/85">Learn how investing works with virtual money — no real risk!</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 px-4 py-2 rounded-xl border border-green-200 dark:border-green-800">
                <Wallet className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400" data-testid="text-virtual-balance">
                  Virtual Cash: {currSymbol}{virtualBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[200px] bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white font-medium shadow-lg focus:ring-2 focus:ring-white/40 data-[placeholder]:text-white/75" data-testid="select-currency">
                  <SelectValue placeholder="Filter by Currency" />
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

          <Tabs defaultValue="learn" className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-8">
              <TabsTrigger value="learn" className="flex items-center gap-2" data-testid="tab-learn">
                <BookOpen className="w-4 h-4" />
                Learn
              </TabsTrigger>
              <TabsTrigger value="market" className="flex items-center gap-2" data-testid="tab-market">
                <TrendingUp className="w-4 h-4" />
                Market
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="flex items-center gap-2" data-testid="tab-portfolio">
                <Briefcase className="w-4 h-4" />
                My Portfolio
              </TabsTrigger>
            </TabsList>

            {/* === LEARN TAB === */}
            <TabsContent value="learn" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-display font-bold text-white">Money & Investing Lessons</h2>
                  <p className="text-sm text-white/85">Complete these lessons to understand how money and investing work.</p>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1" data-testid="badge-progress">
                  {completedCount}/{totalModules} Complete
                </Badge>
              </div>

              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${totalModules > 0 ? (completedCount / totalModules) * 100 : 0}%` }}
                />
              </div>

              {modulesLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : selectedModule ? (
                <Card className="glass-card rounded-glass">
                  <CardHeader className="space-y-3">
                    <Button
                      variant="ghost"
                      className="w-fit -ml-2"
                      onClick={() => setSelectedModule(null)}
                      data-testid="button-back-to-modules"
                    >
                      &larr; Back to all lessons
                    </Button>
                    <CardTitle className="text-2xl font-display">{selectedModule.title}</CardTitle>
                    <p className="text-muted-foreground">
                      {getLocalizedModuleContent(selectedModule.slug, regionData ?? BSD_FALLBACK)?.description || selectedModule.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {(getLocalizedModuleContent(selectedModule.slug, regionData ?? BSD_FALLBACK)?.content || selectedModule.content)
                        .split("\n\n").map((paragraph, i) => (
                        <p key={i} className="text-foreground leading-relaxed mb-4">{paragraph}</p>
                      ))}
                    </div>
                    {!isModuleCompleted(selectedModule.id) ? (
                      <Button
                        onClick={() => completeMutation.mutate(selectedModule.id)}
                        disabled={completeMutation.isPending}
                        className="w-full sm:w-auto"
                        data-testid="button-complete-module"
                      >
                        {completeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Mark as Complete
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-green-500 dark:text-green-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">You've completed this lesson!</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modules?.map((mod) => {
                    const completed = isModuleCompleted(mod.id);
                    const IconComponent = ICON_MAP[mod.icon || ""] || BookOpen;
                    return (
                      <Card
                        key={mod.id}
                        className={`cursor-pointer transition-all hover:shadow-lg hover:ring-1 hover:ring-primary/20 border-none shadow-md ${
                          completed ? "bg-green-50/50 dark:bg-green-950/10" : ""
                        }`}
                        onClick={() => setSelectedModule(mod)}
                        data-testid={`card-module-${mod.id}`}
                      >
                        <CardContent className="p-5 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                            completed
                              ? "bg-green-100 dark:bg-green-900/30"
                              : "bg-primary/10"
                          }`}>
                            {completed ? (
                              <CheckCircle2 className="w-6 h-6 text-green-600" />
                            ) : (
                              <IconComponent className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base">{mod.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {getLocalizedModuleContent(mod.slug, regionData ?? BSD_FALLBACK)?.description || mod.description}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* === MARKET TAB === */}
            <TabsContent value="market" className="space-y-6">
              <div>
                <h2 className="text-xl font-display font-bold text-white">Browse the Market</h2>
                <p className="text-sm text-white/75">
                  Explore stocks and bonds from across the Caribbean. Use your virtual cash to practice investing!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">Your Virtual Cash</p>
                      <p className="text-lg font-bold text-blue-500 dark:text-blue-400" data-testid="text-market-balance">
                        {currSymbol}{virtualBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-4 flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-green-500 dark:text-green-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">Portfolio Value</p>
                      <p className="text-lg font-bold text-green-500 dark:text-green-400">
                        {currSymbol}{totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Briefcase className="w-8 h-8 text-purple-500 dark:text-purple-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Value</p>
                      <p className="text-lg font-bold text-purple-500 dark:text-purple-400">
                        {currSymbol}{(virtualBalance + totalPortfolioValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* BISX live-price widget — BSD only */}
              {currency === "BSD" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white/80">Real Market Prices</h3>
                    <span className="text-xs text-white/50">— Check today's actual BISX prices before you trade</span>
                  </div>
                  <BISXWidget />
                </div>
              )}

              {marketLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stocks Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      Stocks
                      <span className="text-xs text-white/60 font-normal ml-1">— Own a piece of a company</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredMarket.filter(s => s.type === "stock").map(stock => (
                        <StockCard
                          key={stock.id}
                          stock={stock}
                          onBuy={() => { setSelectedStock(stock); setQuantity(1); setBuyDialogOpen(true); }}
                        />
                      ))}
                    </div>
                    {filteredMarket.filter(s => s.type === "stock").length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No stocks available for {currency}. Try selecting a different currency!</p>
                    )}
                  </div>

                  {/* Bonds Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                      <Shield className="w-5 h-5 text-green-400" />
                      Bonds
                      <span className="text-xs text-white/60 font-normal ml-1">— Lend money and earn interest</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredMarket.filter(s => s.type === "bond").map(stock => (
                        <StockCard
                          key={stock.id}
                          stock={stock}
                          onBuy={() => { setSelectedStock(stock); setQuantity(1); setBuyDialogOpen(true); }}
                        />
                      ))}
                    </div>
                    {filteredMarket.filter(s => s.type === "bond").length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No bonds available for {currency}. Try selecting a different currency!</p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* === PORTFOLIO TAB === */}
            <TabsContent value="portfolio" className="space-y-6">
              <div>
                <h2 className="text-xl font-display font-bold text-white">My Portfolio</h2>
                <p className="text-sm text-white/75">Track your simulated investments and see how they perform.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Virtual Cash</p>
                    <p className="text-xl font-bold text-blue-500 dark:text-blue-400" data-testid="text-portfolio-cash">
                      {currSymbol}{virtualBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Invested Value</p>
                    <p className="text-xl font-bold text-green-500 dark:text-green-400">
                      {currSymbol}{totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Net Worth</p>
                    <p className="text-xl font-bold text-purple-500 dark:text-purple-400">
                      {currSymbol}{(virtualBalance + totalPortfolioValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {portfolioLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : portfolio?.holdings.length === 0 ? (
                <Card className="glass-card rounded-glass">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Your portfolio is empty</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Head to the Market tab to buy your first stock or bond!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Your Holdings</h3>
                  {portfolio?.holdings.map(holding => {
                    const currentValue = holding.quantity * parseFloat(holding.stock.currentPrice);
                    const costBasis = holding.quantity * parseFloat(holding.avgPurchasePrice);
                    const gainLoss = currentValue - costBasis;
                    const gainPct = costBasis > 0 ? ((gainLoss / costBasis) * 100) : 0;
                    const sym = getSymbol(holding.stock.currency);
                    return (
                      <Card key={holding.id} className="glass-card rounded-glass" data-testid={`card-holding-${holding.id}`}>
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                holding.stock.type === "bond"
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : "bg-blue-100 dark:bg-blue-900/30"
                              }`}>
                                {holding.stock.type === "bond" ? (
                                  <Shield className="w-5 h-5 text-green-600" />
                                ) : (
                                  <TrendingUp className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold">{holding.stock.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {holding.quantity} shares @ {sym}{parseFloat(holding.avgPurchasePrice).toFixed(2)} avg
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold">{sym}{currentValue.toFixed(2)}</p>
                                <p className={`text-sm flex items-center gap-1 justify-end ${
                                  gainLoss >= 0 ? "text-green-600" : "text-red-600"
                                }`}>
                                  {gainLoss >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                  {sym}{Math.abs(gainLoss).toFixed(2)} ({gainPct.toFixed(1)}%)
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedStock(holding.stock);
                                  setQuantity(1);
                                  setSellDialogOpen(true);
                                }}
                                data-testid={`button-sell-${holding.id}`}
                              >
                                Sell
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Transaction History */}
              {history && history.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <History className="w-5 h-5" />
                    Recent Trades
                  </h3>
                  <div className="space-y-2">
                    {history.slice(0, 10).map(tx => {
                      const sym = getSymbol(tx.currency);
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between py-3 px-4 glass-inset rounded-xl"
                          data-testid={`row-trade-${tx.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              tx.type === "buy" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                            }`}>
                              {tx.type === "buy" ? (
                                <ShoppingCart className="w-4 h-4 text-green-600" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {tx.type === "buy" ? "Bought" : "Sold"} {tx.quantity}x {tx.stock.ticker}
                              </p>
                              <p className="text-xs text-muted-foreground">{tx.stock.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${tx.type === "buy" ? "text-red-600" : "text-green-600"}`}>
                              {tx.type === "buy" ? "-" : "+"}{sym}{(tx.quantity * parseFloat(tx.pricePerUnit)).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.executedAt!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Buy Dialog */}
        <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buy {selectedStock?.name}</DialogTitle>
            </DialogHeader>
            {selectedStock && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">{selectedStock.description}</p>
                  <div className="flex justify-between text-sm">
                    <span>Price per share:</span>
                    <span className="font-bold">{getSymbol(selectedStock.currency)}{parseFloat(selectedStock.currentPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Type:</span>
                    <Badge variant={selectedStock.type === "bond" ? "secondary" : "default"}>
                      {selectedStock.type === "bond" ? "Bond" : "Stock"}
                    </Badge>
                  </div>
                  {selectedStock.annualReturnPct && (
                    <div className="flex justify-between text-sm">
                      <span>Expected annual return:</span>
                      <span className="text-green-600 font-medium">{selectedStock.annualReturnPct}%</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">How many do you want to buy?</label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline" size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      data-testid="button-decrease-qty"
                    >-</Button>
                    <span className="text-2xl font-bold w-16 text-center" data-testid="text-quantity">{quantity}</span>
                    <Button
                      variant="outline" size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                      data-testid="button-increase-qty"
                    >+</Button>
                  </div>
                </div>

                <div className="bg-primary/5 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total cost:</span>
                    <span className="font-bold text-lg">
                      {getSymbol(selectedStock.currency)}{(quantity * parseFloat(selectedStock.currentPrice)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Your balance after:</span>
                    <span>{getSymbol(selectedStock.currency)}{(virtualBalance - quantity * parseFloat(selectedStock.currentPrice)).toFixed(2)}</span>
                  </div>
                  {virtualBalance < quantity * parseFloat(selectedStock.currentPrice) && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Not enough virtual cash!</span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  disabled={buyMutation.isPending || virtualBalance < quantity * parseFloat(selectedStock.currentPrice)}
                  onClick={() => buyMutation.mutate({ stockId: selectedStock.id, qty: quantity })}
                  data-testid="button-confirm-buy"
                >
                  {buyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                  Buy {quantity} {quantity === 1 ? "Share" : "Shares"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Sell Dialog */}
        <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sell {selectedStock?.name}</DialogTitle>
            </DialogHeader>
            {selectedStock && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current price per share:</span>
                    <span className="font-bold">{getSymbol(selectedStock.currency)}{parseFloat(selectedStock.currentPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>You own:</span>
                    <span className="font-medium">
                      {portfolio?.holdings.find(h => h.stockId === selectedStock.id)?.quantity || 0} shares
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">How many do you want to sell?</label>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} data-testid="button-sell-decrease">-</Button>
                    <span className="text-2xl font-bold w-16 text-center">{quantity}</span>
                    <Button
                      variant="outline" size="icon"
                      onClick={() => {
                        const max = portfolio?.holdings.find(h => h.stockId === selectedStock.id)?.quantity || 1;
                        setQuantity(Math.min(quantity + 1, max));
                      }}
                      data-testid="button-sell-increase"
                    >+</Button>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4">
                  <div className="flex justify-between text-sm">
                    <span>You'll receive:</span>
                    <span className="font-bold text-lg text-green-600">
                      {getSymbol(selectedStock.currency)}{(quantity * parseFloat(selectedStock.currentPrice)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant="outline"
                  disabled={sellMutation.isPending}
                  onClick={() => sellMutation.mutate({ stockId: selectedStock.id, qty: quantity })}
                  data-testid="button-confirm-sell"
                >
                  {sellMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sell {quantity} {quantity === 1 ? "Share" : "Shares"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function StockCard({ stock, onBuy }: { stock: SimulatedStock; onBuy: () => void }) {
  const sym = getSymbol(stock.currency);
  const riskColors = {
    low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <Card className="glass-card rounded-glass hover:shadow-lg transition-shadow" data-testid={`card-stock-${stock.id}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-mono">{stock.ticker}</Badge>
              <Badge className={`text-xs ${riskColors[stock.riskLevel as keyof typeof riskColors]}`}>
                {stock.riskLevel} risk
              </Badge>
            </div>
            <h4 className="font-semibold text-base leading-tight">{stock.name}</h4>
            {stock.issuer && (
              <p className="text-xs text-muted-foreground mt-0.5">Issued by {stock.issuer}</p>
            )}
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-xl font-bold">{sym}{parseFloat(stock.currentPrice).toFixed(2)}</p>
            {stock.annualReturnPct && (
              <p className="text-xs text-green-600 font-medium flex items-center justify-end gap-1">
                <ArrowUpRight className="w-3 h-3" />
                {stock.annualReturnPct}%/yr
              </p>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{stock.description}</p>
        <Button
          size="sm"
          className="w-full"
          onClick={onBuy}
          data-testid={`button-buy-${stock.id}`}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Buy
        </Button>
      </CardContent>
    </Card>
  );
}
