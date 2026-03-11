import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, ShoppingCart, Zap, Target, Plus, Minus, CheckCircle2,
  XCircle, TrendingUp, TrendingDown, Minus as FlatIcon,
  Trophy, Star, Sparkles, RotateCcw, ShoppingBag, PiggyBank,
  Gamepad2, ArrowRight, Wallet, BarChart3, Clock, Timer, Hourglass
} from "lucide-react";

const CURRENCIES = [
  { code: "BSD", name: "Bahamian Dollar", symbol: "B$" },
  { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$" },
  { code: "GYD", name: "Guyanese Dollar", symbol: "G$" },
  { code: "JMD", name: "Jamaican Dollar", symbol: "J$" },
  { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$" },
  { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$" },
];

function getSymbol(code: string) {
  return CURRENCIES.find(c => c.code === code)?.symbol || "$";
}

const GAMES = [
  {
    id: "grocery",
    title: "Budget Grocery Challenge",
    description: "You've got a budget and a grocery list to fill. Can you feed the family without going broke?",
    icon: ShoppingCart,
    difficulty: "Easy",
    color: "from-green-400 to-emerald-500",
    badgeColor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  {
    id: "speed",
    title: "Speed Investor",
    description: "Stocks are moving fast! Make split-second Buy, Hold, or Sell decisions before time runs out.",
    icon: Zap,
    difficulty: "Hard",
    color: "from-orange-400 to-red-500",
    badgeColor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  {
    id: "savings",
    title: "Savings Goal Planner",
    description: "Pick something you want to save for and discover how small daily choices add up to big results!",
    icon: Target,
    difficulty: "Medium",
    color: "from-blue-400 to-violet-500",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    id: "beatbudget",
    title: "Beat the Budget",
    description: "You have $100 for the week. Choose wisely between needs, wants, and surprise expenses!",
    icon: Wallet,
    difficulty: "Medium",
    color: "from-amber-400 to-yellow-500",
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  {
    id: "compound",
    title: "Compound It",
    description: "Watch your money grow over time! See the magic of compound interest in action.",
    icon: BarChart3,
    difficulty: "Easy",
    color: "from-teal-400 to-cyan-500",
    badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  },
  {
    id: "needswants",
    title: "Needs vs Wants",
    description: "Can you tell the difference between what you need and what you want? Race the clock!",
    icon: Timer,
    difficulty: "Easy",
    color: "from-purple-400 to-fuchsia-500",
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  {
    id: "futureme",
    title: "Future Me",
    description: "Would you take the money now or wait for more later? Test your patience!",
    icon: Hourglass,
    difficulty: "Medium",
    color: "from-indigo-400 to-blue-500",
    badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
];

const GROCERY_ITEMS = [
  { name: "White Rice (5 lb)", price: 6.50, emoji: "🍚" },
  { name: "Whole Wheat Bread", price: 4.25, emoji: "🍞" },
  { name: "Chicken Thighs (3 lb)", price: 12.00, emoji: "🍗" },
  { name: "Fresh Fish (1 lb)", price: 9.50, emoji: "🐟" },
  { name: "Eggs (dozen)", price: 5.00, emoji: "🥚" },
  { name: "Milk (1 gal)", price: 6.75, emoji: "🥛" },
  { name: "Cheddar Cheese", price: 5.50, emoji: "🧀" },
  { name: "Bananas (bunch)", price: 2.50, emoji: "🍌" },
  { name: "Orange Juice (64 oz)", price: 7.00, emoji: "🍊" },
  { name: "Canned Corned Beef", price: 4.50, emoji: "🥫" },
  { name: "Peas & Rice Mix", price: 3.75, emoji: "🫘" },
  { name: "Cooking Oil (32 oz)", price: 5.25, emoji: "🫗" },
  { name: "Sugar (2 lb)", price: 3.00, emoji: "🍬" },
  { name: "Grits / Oatmeal", price: 3.50, emoji: "🥣" },
  { name: "Crackers (box)", price: 4.00, emoji: "🍘" },
  { name: "Peanut Butter", price: 5.00, emoji: "🥜" },
  { name: "Frozen Vegetables", price: 4.50, emoji: "🥦" },
  { name: "Toilet Paper (4 roll)", price: 4.75, emoji: "🧻" },
  { name: "Dish Soap", price: 3.25, emoji: "🧴" },
  { name: "Snack Chips", price: 3.50, emoji: "🍿" },
];

const SPEED_STOCKS = [
  { name: "Bahamas Tourism Holdings", ticker: "BTH" },
  { name: "Caribbean Cement Co.", ticker: "CCC" },
  { name: "Island Telecom Ltd.", ticker: "ITL" },
  { name: "Junkanoo Media Group", ticker: "JMG" },
  { name: "Nassau Port Authority", ticker: "NPA" },
  { name: "Reef Energy Corp.", ticker: "REC" },
  { name: "Tropical Grocers Inc.", ticker: "TGI" },
  { name: "Conch Republic Bank", ticker: "CRB" },
  { name: "Palm Breeze Airlines", ticker: "PBA" },
  { name: "Blue Lagoon Resorts", ticker: "BLR" },
];

const SPEED_NEWS = [
  { text: "Tourism is booming this season in The Bahamas!", trend: "up" as const },
  { text: "Hurricane season warning issued for the Caribbean.", trend: "down" as const },
  { text: "New cruise port opens in Nassau — record visitors expected!", trend: "up" as const },
  { text: "Global oil prices rising, fuel costs spike across islands.", trend: "down" as const },
  { text: "Caribbean tech startup scene grows rapidly.", trend: "up" as const },
  { text: "Fishing industry reports record catch this quarter.", trend: "up" as const },
  { text: "Construction slowdown due to material shortages.", trend: "down" as const },
  { text: "International investors eye Caribbean real estate.", trend: "up" as const },
  { text: "Inflation concerns grow across the region.", trend: "down" as const },
  { text: "Renewable energy project launched on multiple islands.", trend: "up" as const },
  { text: "Supply chain delays impact local retailers.", trend: "down" as const },
  { text: "Major hotel chain announces Caribbean expansion.", trend: "up" as const },
  { text: "Regional bank reports lower profits this quarter.", trend: "down" as const },
  { text: "Local farmers market program boosts food production.", trend: "up" as const },
  { text: "Water shortage concerns in southern islands.", trend: "down" as const },
];

const SAVINGS_GOALS = [
  { name: "New Phone", amount: 800, emoji: "📱" },
  { name: "Gaming Console", amount: 500, emoji: "🎮" },
  { name: "Laptop for School", amount: 1200, emoji: "💻" },
  { name: "Sneakers", amount: 200, emoji: "👟" },
  { name: "Island Trip with Friends", amount: 600, emoji: "🏝️" },
  { name: "Bicycle", amount: 350, emoji: "🚲" },
];

const TRADEOFF_SCENARIOS = [
  { text: "Skip buying a snack at school every day", weeklySaving: 20, emoji: "🍫" },
  { text: "Do extra chores around the house for allowance", weeklySaving: 15, emoji: "🧹" },
  { text: "Skip the movie night out once a month", weeklySaving: 8, emoji: "🎬" },
  { text: "Make lunch at home instead of buying it", weeklySaving: 25, emoji: "🥪" },
  { text: "Sell old clothes or toys you don't use", weeklySaving: 10, emoji: "👕" },
  { text: "Walk or bike instead of taking a taxi", weeklySaving: 12, emoji: "🚶" },
  { text: "Skip buying a new game this month", weeklySaving: 5, emoji: "🎯" },
];

function GroceryGame({ currency }: { currency: string }) {
  const sym = getSymbol(currency);
  const [budget, setBudget] = useState(0);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [checkedOut, setCheckedOut] = useState(false);

  const randomizeBudget = useCallback(() => {
    setBudget(Math.floor(Math.random() * 101) + 50);
    setCart({});
    setCheckedOut(false);
  }, []);

  useEffect(() => { randomizeBudget(); }, [randomizeBudget]);

  const cartTotal = Object.entries(cart).reduce((sum, [idx, qty]) => {
    return sum + GROCERY_ITEMS[Number(idx)].price * qty;
  }, 0);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const addItem = (idx: number) => {
    setCart(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
  };
  const removeItem = (idx: number) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[idx] > 1) next[idx]--;
      else delete next[idx];
      return next;
    });
  };

  const usagePercent = budget > 0 ? Math.round((cartTotal / budget) * 100) : 0;
  const isOverBudget = cartTotal > budget;

  const getRating = () => {
    if (usagePercent >= 90 && usagePercent <= 100) return { label: "Smart Shopper!", emoji: "🌟", color: "text-yellow-500" };
    if (usagePercent >= 70) return { label: "Good Job!", emoji: "👍", color: "text-green-500" };
    if (usagePercent >= 50) return { label: "Not bad — stretch that budget more!", emoji: "💪", color: "text-blue-500" };
    return { label: "Try to use more of your budget wisely!", emoji: "🤔", color: "text-orange-500" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-2xl shadow-lg">
            🛒
          </div>
          <div>
            <h3 className="font-display text-xl font-bold" data-testid="text-grocery-budget">
              Your Budget: {sym}{budget.toFixed(2)}
            </h3>
            <p className="text-sm text-muted-foreground">Fill your cart without going over!</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`text-lg px-4 py-2 rounded-2xl font-bold ${isOverBudget ? "border-red-400 text-red-500 bg-red-50 dark:bg-red-950/30" : "border-green-400 text-green-600 bg-green-50 dark:bg-green-950/30"}`} data-testid="text-cart-total">
            <ShoppingBag className="w-4 h-4 mr-2" />
            {sym}{cartTotal.toFixed(2)} / {sym}{budget.toFixed(2)}
          </Badge>
          <Badge variant="outline" className="rounded-2xl px-3 py-2">
            {cartCount} items
          </Badge>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? "bg-red-500" : usagePercent > 80 ? "bg-amber-500" : "bg-green-500"}`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
      </div>

      {checkedOut ? (
        <Card className="glass-card-coral rounded-glass animate-bounce-in">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-6xl">{getRating().emoji}</div>
            <h3 className={`font-display text-2xl font-bold ${getRating().color}`} data-testid="text-grocery-result">
              {getRating().label}
            </h3>
            <p className="text-muted-foreground">
              You spent {sym}{cartTotal.toFixed(2)} out of {sym}{budget.toFixed(2)} ({usagePercent}% used)
            </p>
            <p className="text-sm text-muted-foreground">
              {cartCount} items purchased
            </p>
            <Button onClick={randomizeBudget} className="rounded-2xl gap-2 mt-4" data-testid="button-play-again-grocery">
              <RotateCcw className="w-4 h-4" />
              Play Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {GROCERY_ITEMS.map((item, idx) => {
              const qty = cart[idx] || 0;
              return (
                <Card key={idx} className="rounded-2xl border-2 hover:border-violet-300 dark:hover:border-violet-700 transition-all" data-testid={`card-grocery-item-${idx}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{item.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.name}</p>
                        <p className="text-sm font-bold text-primary">{sym}{item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {qty > 0 ? (
                        <>
                          <Button size="icon" variant="outline" className="rounded-xl" onClick={() => removeItem(idx)} data-testid={`button-remove-${idx}`}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-bold text-sm w-6 text-center">{qty}</span>
                          <Button size="icon" variant="outline" className="rounded-xl" onClick={() => addItem(idx)} data-testid={`button-add-more-${idx}`}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <span className="ml-auto text-xs text-muted-foreground font-semibold">
                            {sym}{(item.price * qty).toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <Button size="sm" className="rounded-xl w-full gap-1" onClick={() => addItem(idx)} data-testid={`button-add-${idx}`}>
                          <Plus className="w-3 h-3" /> Add
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {isOverBudget && (
            <div className="bg-red-50 dark:bg-red-950/30 border-2 border-dashed border-red-300 dark:border-red-700 rounded-2xl p-4 text-center">
              <p className="font-bold text-red-600 flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5" />
                Oops! You're {sym}{(cartTotal - budget).toFixed(2)} over budget! Remove some items.
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              size="lg"
              className="rounded-2xl gap-2 px-8 text-lg"
              disabled={cartCount === 0 || isOverBudget}
              onClick={() => setCheckedOut(true)}
              data-testid="button-checkout"
            >
              <CheckCircle2 className="w-5 h-5" />
              Checkout
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SpeedInvestorGame({ currency }: { currency: string }) {
  const sym = getSymbol(currency);
  const [gameState, setGameState] = useState<"instructions" | "countdown" | "playing" | "reveal" | "end">("instructions");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [balance, setBalance] = useState(1000);
  const [countdownNum, setCountdownNum] = useState(3);
  const [rounds, setRounds] = useState<Array<{ stock: typeof SPEED_STOCKS[0]; news: typeof SPEED_NEWS[0]; price: number; actualTrend: "up" | "down"; choice?: "buy" | "hold" | "sell"; correct?: boolean }>>([]);
  const [currentChoice, setCurrentChoice] = useState<"buy" | "hold" | "sell" | null>(null);
  const [roundTimer, setRoundTimer] = useState(10);

  const generateRounds = useCallback(() => {
    const shuffledStocks = [...SPEED_STOCKS].sort(() => Math.random() - 0.5);
    const newRounds = shuffledStocks.map((stock) => {
      const newsItem = SPEED_NEWS[Math.floor(Math.random() * SPEED_NEWS.length)];
      const price = Math.floor(Math.random() * 900) + 100;
      const actualTrend = newsItem.trend === "up" ? (Math.random() > 0.2 ? "up" : "down") as const : (Math.random() > 0.2 ? "down" : "up") as const;
      return { stock, news: newsItem, price, actualTrend };
    });
    return newRounds;
  }, []);

  const startCountdown = () => {
    setRounds(generateRounds());
    setRound(0);
    setScore(0);
    setBalance(1000);
    setCurrentChoice(null);
    setCountdownNum(3);
    setGameState("countdown");
  };

  useEffect(() => {
    if (gameState !== "countdown") return;
    if (countdownNum <= 0) {
      setRoundTimer(10);
      setGameState("playing");
      return;
    }
    const timer = setTimeout(() => setCountdownNum(n => n - 1), 800);
    return () => clearTimeout(timer);
  }, [countdownNum, gameState]);

  useEffect(() => {
    if (gameState !== "playing" || currentChoice) return;
    if (roundTimer <= 0) {
      makeChoice("hold");
      return;
    }
    const timer = setTimeout(() => setRoundTimer(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [roundTimer, gameState, currentChoice]);

  const makeChoice = (choice: "buy" | "hold" | "sell") => {
    if (gameState !== "playing" || currentChoice) return;
    const current = rounds[round];
    if (!current) return;

    let correct = false;
    if (choice === "buy" && current.actualTrend === "up") correct = true;
    if (choice === "sell" && current.actualTrend === "down") correct = true;
    if (choice === "hold") correct = false;

    const points = correct ? 100 : choice === "hold" ? 0 : -50;
    const balanceChange = correct ? 50 : choice === "hold" ? 0 : -25;

    setCurrentChoice(choice);
    setScore(s => s + points);
    setBalance(b => Math.max(0, b + balanceChange));

    const updatedRounds = [...rounds];
    updatedRounds[round] = { ...current, choice, correct };
    setRounds(updatedRounds);

    setGameState("reveal");
  };

  const nextRound = () => {
    if (round + 1 >= 10) {
      setGameState("end");
    } else {
      setRound(r => r + 1);
      setCurrentChoice(null);
      setRoundTimer(10);
      setGameState("playing");
    }
  };

  const getFinalRating = () => {
    if (score >= 800) return { label: "Wall Street Whiz!", emoji: "🏆", color: "text-yellow-500" };
    if (score >= 500) return { label: "Rising Investor!", emoji: "📈", color: "text-green-500" };
    if (score >= 200) return { label: "Getting There!", emoji: "💡", color: "text-blue-500" };
    return { label: "Keep Practicing!", emoji: "📚", color: "text-orange-500" };
  };

  const currentRound = rounds[round];

  if (gameState === "instructions") {
    return (
      <Card className="glass-card rounded-glass">
        <CardContent className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="text-6xl">⚡</div>
            <h3 className="font-display text-2xl font-bold text-gray-800">Speed Investor</h3>
            <p className="text-muted-foreground">Learn to make smart investment decisions!</p>
          </div>

          <div className="max-w-lg mx-auto space-y-6">
            <div className="space-y-4">
              <h4 className="font-display text-lg font-bold flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-sm font-bold text-orange-600">1</span>
                How It Works
              </h4>
              <p className="text-sm text-muted-foreground ml-9">
                You start with {sym}1,000 in virtual cash. Over 10 rounds, you'll see different Caribbean stocks
                along with a news headline that gives you a hint about what might happen next. You have <strong>10 seconds</strong> per round to decide!
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-display text-lg font-bold flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-sm font-bold text-orange-600">2</span>
                Your Choices
              </h4>
              <div className="ml-9 space-y-2">
                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 rounded-2xl p-3">
                  <TrendingUp className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Buy</p>
                    <p className="text-xs text-muted-foreground">Choose this if the news sounds good and you think the price will go UP</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-3">
                  <FlatIcon className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Hold</p>
                    <p className="text-xs text-muted-foreground">Not sure? Play it safe — you won't gain or lose anything</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-2xl p-3">
                  <TrendingDown className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Sell</p>
                    <p className="text-xs text-muted-foreground">Choose this if the news sounds bad and you think the price will go DOWN</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-display text-lg font-bold flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-sm font-bold text-orange-600">3</span>
                Scoring
              </h4>
              <div className="ml-9 text-sm text-muted-foreground space-y-1">
                <p>Correct call (Buy when price goes up, Sell when it goes down): <strong className="text-green-600">+100 pts</strong></p>
                <p>Wrong call: <strong className="text-red-500">-50 pts</strong></p>
                <p>Hold (safe play): <strong>0 pts</strong></p>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 border-2 border-dashed border-orange-200 dark:border-orange-800">
              <p className="text-sm text-center">
                <strong>Tip:</strong> Read the news headline carefully — it usually hints at whether the stock will go up or down! If time runs out, you'll automatically Hold.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Button size="lg" className="rounded-2xl gap-2 px-8 text-lg" onClick={startCountdown} data-testid="button-start-speed">
              <Zap className="w-5 h-5" /> I'm Ready!
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (gameState === "countdown") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          {countdownNum > 0 ? (
            <>
              <div className="text-8xl font-display font-bold text-orange-500 animate-bounce" key={countdownNum}>
                {countdownNum}
              </div>
              <p className="text-muted-foreground font-semibold text-lg">Get ready...</p>
            </>
          ) : (
            <>
              <div className="text-6xl font-display font-bold text-green-500 animate-bounce">
                GO!
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (gameState === "end") {
    const rating = getFinalRating();
    return (
      <Card className="glass-card-coral rounded-glass animate-bounce-in">
        <CardContent className="p-8 text-center space-y-4">
          <div className="text-6xl">{rating.emoji}</div>
          <h3 className={`font-display text-3xl font-bold ${rating.color}`} data-testid="text-speed-result">
            {rating.label}
          </h3>
          <div className="flex justify-center gap-6 text-lg">
            <div>
              <p className="text-muted-foreground text-sm">Final Score</p>
              <p className="font-bold text-xl" data-testid="text-speed-score">{score} pts</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Final Balance</p>
              <p className="font-bold text-xl">{sym}{balance.toFixed(2)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-lg mx-auto mt-4">
            {rounds.slice(0, 10).map((r, i) => (
              <div key={i} className={`rounded-xl p-2 text-center text-xs font-bold ${r.correct ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : r.choice === "hold" ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                R{i + 1}: {r.choice?.toUpperCase()}
                <br />
                {r.correct ? "✓" : r.choice === "hold" ? "—" : "✗"}
              </div>
            ))}
          </div>
          <Button onClick={startCountdown} className="rounded-2xl gap-2 mt-4" data-testid="button-play-again-speed">
            <RotateCcw className="w-4 h-4" /> Play Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="rounded-2xl px-4 py-2 text-sm font-bold">
            Round {round + 1} / 10
          </Badge>
          <Badge variant="outline" className="rounded-2xl px-4 py-2 text-sm font-bold">
            <Star className="w-3 h-3 mr-1" /> {score} pts
          </Badge>
          <Badge variant="outline" className="rounded-2xl px-4 py-2 text-sm font-bold">
            {sym}{balance.toFixed(2)}
          </Badge>
        </div>
        {gameState === "playing" && (
          <Badge variant="outline" className={`rounded-2xl px-4 py-2 text-sm font-bold ${roundTimer <= 3 ? "border-red-400 text-red-500 animate-pulse" : "border-orange-400 text-orange-600"}`} data-testid="text-round-timer">
            <Clock className="w-3 h-3 mr-1" /> {roundTimer}s
          </Badge>
        )}
      </div>

      {gameState === "playing" && (
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${roundTimer <= 3 ? "bg-red-500" : roundTimer <= 6 ? "bg-amber-500" : "bg-green-500"}`}
            style={{ width: `${(roundTimer / 10) * 100}%` }}
          />
        </div>
      )}
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-orange-400"
          style={{ width: `${((round + 1) / 10) * 100}%` }}
        />
      </div>

      {currentRound && (
        <Card className="rounded-3xl border-2 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{currentRound.stock.ticker}</p>
              <h3 className="font-display text-2xl font-bold">{currentRound.stock.name}</h3>
              <p className="text-3xl font-bold text-primary">{sym}{currentRound.price.toFixed(2)}</p>
            </div>

            <div className="bg-muted/50 rounded-2xl p-4 text-center border-2 border-dashed border-muted-foreground/20">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Breaking News</p>
              <p className="text-sm font-semibold" data-testid="text-speed-news">📰 {currentRound.news.text}</p>
            </div>

            {gameState === "reveal" ? (
              <div className="space-y-4">
                <div className={`rounded-2xl p-4 text-center font-bold text-lg ${currentRound.actualTrend === "up" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                  {currentRound.actualTrend === "up" ? (
                    <span className="flex items-center justify-center gap-2"><TrendingUp className="w-5 h-5" /> Price went UP!</span>
                  ) : (
                    <span className="flex items-center justify-center gap-2"><TrendingDown className="w-5 h-5" /> Price went DOWN!</span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    You chose <strong>{currentChoice?.toUpperCase()}</strong> —{" "}
                    {currentRound.correct ? <span className="text-green-600 font-bold">Nice call! +100 pts</span> : currentChoice === "hold" ? <span className="text-gray-500">Safe play, 0 pts</span> : <span className="text-red-500 font-bold">Wrong call! -50 pts</span>}
                  </p>
                </div>
                <div className="flex justify-center">
                  <Button onClick={nextRound} className="rounded-2xl gap-2" data-testid="button-next-round">
                    {round + 1 >= 10 ? "See Results" : "Next Round"} <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-xs text-muted-foreground font-semibold">What's your move?</p>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    size="lg"
                    className="rounded-2xl gap-2 bg-green-500 text-white"
                    onClick={() => makeChoice("buy")}
                    data-testid="button-buy"
                  >
                    <TrendingUp className="w-5 h-5" /> Buy
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-2xl gap-2 border-2"
                    onClick={() => makeChoice("hold")}
                    data-testid="button-hold"
                  >
                    <FlatIcon className="w-5 h-5" /> Hold
                  </Button>
                  <Button
                    size="lg"
                    className="rounded-2xl gap-2 bg-red-500 text-white"
                    onClick={() => makeChoice("sell")}
                    data-testid="button-sell"
                  >
                    <TrendingDown className="w-5 h-5" /> Sell
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SavingsGoalGame({ currency }: { currency: string }) {
  const sym = getSymbol(currency);
  const [step, setStep] = useState<"pick" | "calculate" | "quiz" | "result">("pick");
  const [selectedGoal, setSelectedGoal] = useState<typeof SAVINGS_GOALS[0] | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [customName, setCustomName] = useState("");
  const [months, setMonths] = useState(3);
  const [quizIndex, setQuizIndex] = useState(0);
  const [acceptedSavings, setAcceptedSavings] = useState<number[]>([]);
  const [scenarios, setScenarios] = useState<typeof TRADEOFF_SCENARIOS>([]);

  const goalAmount = selectedGoal?.amount || Number(customAmount) || 0;
  const goalName = selectedGoal?.name || customName || "your goal";
  const weeklyNeeded = goalAmount / (months * 4.33);
  const monthlyNeeded = goalAmount / months;

  const startCalculation = (goal: typeof SAVINGS_GOALS[0] | null) => {
    setSelectedGoal(goal);
    setStep("calculate");
  };

  const startQuiz = () => {
    const shuffled = [...TRADEOFF_SCENARIOS].sort(() => Math.random() - 0.5).slice(0, 5);
    setScenarios(shuffled);
    setQuizIndex(0);
    setAcceptedSavings([]);
    setStep("quiz");
  };

  const answerQuiz = (accept: boolean) => {
    if (accept) {
      setAcceptedSavings(prev => [...prev, scenarios[quizIndex].weeklySaving]);
    }
    if (quizIndex + 1 >= scenarios.length) {
      setStep("result");
    } else {
      setQuizIndex(i => i + 1);
    }
  };

  const totalWeeklySaving = acceptedSavings.reduce((a, b) => a + b, 0);
  const totalMonthlySaving = totalWeeklySaving * 4.33;
  const achievableMonths = totalMonthlySaving > 0 ? Math.ceil(goalAmount / totalMonthlySaving) : Infinity;

  const reset = () => {
    setStep("pick");
    setSelectedGoal(null);
    setCustomAmount("");
    setCustomName("");
    setMonths(3);
    setQuizIndex(0);
    setAcceptedSavings([]);
  };

  if (step === "pick") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🎯</div>
          <h3 className="font-display text-xl font-bold">What do you want to save for?</h3>
          <p className="text-sm text-muted-foreground">Pick a goal or create your own!</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SAVINGS_GOALS.map((goal, i) => (
            <Card
              key={i}
              className="rounded-2xl border-2 hover:border-violet-300 dark:hover:border-violet-700 cursor-pointer transition-all hover:shadow-md"
              onClick={() => startCalculation(goal)}
              data-testid={`card-savings-goal-${i}`}
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">{goal.emoji}</div>
                <p className="font-semibold text-sm">{goal.name}</p>
                <p className="text-primary font-bold">{sym}{goal.amount}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl border-2 border-dashed">
          <CardContent className="p-4">
            <p className="font-semibold text-sm mb-3 text-center">Or set your own goal:</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="What are you saving for?"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="flex-1 rounded-xl border-2 px-4 py-2 text-sm bg-background"
                data-testid="input-custom-goal-name"
              />
              <input
                type="number"
                placeholder="Amount"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="w-32 rounded-xl border-2 px-4 py-2 text-sm bg-background"
                data-testid="input-custom-goal-amount"
              />
              <Button
                className="rounded-xl"
                disabled={!customName || !customAmount || Number(customAmount) <= 0}
                onClick={() => startCalculation(null)}
                data-testid="button-custom-goal"
              >
                Go!
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "calculate") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">{selectedGoal?.emoji || "🎯"}</div>
          <h3 className="font-display text-xl font-bold">{goalName}</h3>
          <p className="text-3xl font-bold text-primary">{sym}{goalAmount.toFixed(2)}</p>
        </div>
        <Card className="rounded-2xl border-2">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">How many months do you have?</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={months}
                  onChange={e => setMonths(Number(e.target.value))}
                  className="flex-1 accent-primary"
                  data-testid="input-months-slider"
                />
                <Badge variant="outline" className="rounded-xl px-4 py-2 font-bold text-lg min-w-[60px] text-center">
                  {months}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{months} month{months > 1 ? "s" : ""}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 text-center">
                <p className="text-xs text-muted-foreground font-bold uppercase">Save per Week</p>
                <p className="text-xl font-bold text-violet-600" data-testid="text-weekly-savings">{sym}{weeklyNeeded.toFixed(2)}</p>
              </div>
              <div className="bg-pink-50 dark:bg-pink-900/20 rounded-2xl p-4 text-center">
                <p className="text-xs text-muted-foreground font-bold uppercase">Save per Month</p>
                <p className="text-xl font-bold text-pink-600" data-testid="text-monthly-savings">{sym}{monthlyNeeded.toFixed(2)}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              But can you actually save that much? Let's find out!
            </p>

            <div className="flex justify-center">
              <Button size="lg" className="rounded-2xl gap-2" onClick={startQuiz} data-testid="button-start-quiz">
                <Sparkles className="w-5 h-5" /> Take the Trade-Off Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "quiz") {
    const scenario = scenarios[quizIndex];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="rounded-2xl px-4 py-2 font-bold">
            Question {quizIndex + 1} / {scenarios.length}
          </Badge>
          <Badge variant="outline" className="rounded-2xl px-4 py-2 font-bold text-green-600">
            Saving: {sym}{(acceptedSavings.reduce((a, b) => a + b, 0) * 4.33).toFixed(2)}/mo so far
          </Badge>
        </div>

        <div className="w-full bg-muted rounded-full h-3">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${((quizIndex + 1) / scenarios.length) * 100}%` }}
          />
        </div>

        <Card className="rounded-3xl border-2 border-violet-200 dark:border-violet-700">
          <CardContent className="p-8 text-center space-y-6">
            <div className="text-5xl">{scenario.emoji}</div>
            <h3 className="font-display text-xl font-bold">Would you...</h3>
            <p className="text-lg">{scenario.text}?</p>
            <p className="text-sm text-muted-foreground">
              This would save you about <strong className="text-primary">{sym}{scenario.weeklySaving}/week</strong> ({sym}{(scenario.weeklySaving * 4.33).toFixed(2)}/month)
            </p>
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                className="rounded-2xl gap-2 bg-green-500 text-white px-8"
                onClick={() => answerQuiz(true)}
                data-testid="button-quiz-yes"
              >
                <CheckCircle2 className="w-5 h-5" /> Yes, I'd do that!
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-2xl gap-2 border-2 px-8"
                onClick={() => answerQuiz(false)}
                data-testid="button-quiz-no"
              >
                <XCircle className="w-5 h-5" /> Nah, not for me
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="rounded-3xl border-2 border-dashed border-violet-300 dark:border-violet-700">
      <CardContent className="p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">{selectedGoal?.emoji || "🎯"}</div>
          <h3 className="font-display text-2xl font-bold">Your Savings Plan</h3>
          <p className="text-muted-foreground">for <strong>{goalName}</strong> — {sym}{goalAmount.toFixed(2)}</p>
        </div>

        <div className="bg-muted/30 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Your potential monthly savings</span>
            <span className="text-xl font-bold text-green-600">{sym}{totalMonthlySaving.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Monthly amount needed</span>
            <span className="text-xl font-bold text-primary">{sym}{monthlyNeeded.toFixed(2)}</span>
          </div>
          <div className="border-t-2 border-dashed pt-4 flex justify-between items-center">
            <span className="text-sm font-semibold">Estimated time to reach goal</span>
            <span className={`text-xl font-bold ${achievableMonths <= months ? "text-green-600" : "text-orange-500"}`} data-testid="text-achievable-months">
              {achievableMonths === Infinity ? "♾️ (no savings!)" : `${achievableMonths} month${achievableMonths > 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        {totalMonthlySaving > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress potential</span>
              <span className="font-bold">{Math.min(Math.round((totalMonthlySaving / monthlyNeeded) * 100), 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${totalMonthlySaving >= monthlyNeeded ? "bg-green-500" : "bg-orange-400"}`}
                style={{ width: `${Math.min((totalMonthlySaving / monthlyNeeded) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className={`rounded-2xl p-4 text-center ${achievableMonths <= months ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700" : "bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700"}`}>
          {achievableMonths <= months ? (
            <p className="font-bold text-green-700 dark:text-green-300 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              You can reach your goal in time! Great choices!
            </p>
          ) : totalMonthlySaving > 0 ? (
            <p className="font-bold text-orange-600 dark:text-orange-300">
              You'll need {achievableMonths} months instead of {months}. Try saying "yes" to more trade-offs!
            </p>
          ) : (
            <p className="font-bold text-orange-600 dark:text-orange-300">
              You didn't accept any trade-offs! Try again and make some sacrifices to reach your goal.
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <Button onClick={reset} className="rounded-2xl gap-2" data-testid="button-play-again-savings">
            <RotateCcw className="w-4 h-4" /> Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const BUDGET_ITEMS = [
  { name: "School lunch for the week", price: 25, type: "need" as const, emoji: "🥪" },
  { name: "Bus fare to school", price: 15, type: "need" as const, emoji: "🚌" },
  { name: "New video game", price: 40, type: "want" as const, emoji: "🎮" },
  { name: "Movie night with friends", price: 20, type: "want" as const, emoji: "🎬" },
  { name: "Trendy sneakers", price: 55, type: "want" as const, emoji: "👟" },
  { name: "School supplies", price: 12, type: "need" as const, emoji: "📝" },
];

const SURPRISE_EXPENSES = [
  { name: "Your phone screen cracked!", cost: 30, emoji: "📱" },
  { name: "School field trip fee due tomorrow!", cost: 25, emoji: "🏫" },
  { name: "You need medicine from the pharmacy.", cost: 20, emoji: "💊" },
  { name: "Your backpack strap broke — need a new one!", cost: 18, emoji: "🎒" },
];

function BeatTheBudgetGame({ currency }: { currency: string }) {
  const sym = getSymbol(currency);
  const [balance, setBalance] = useState(100);
  const [selected, setSelected] = useState<number[]>([]);
  const [phase, setPhase] = useState<"shopping" | "surprise" | "result">("shopping");
  const [surprise, setSurprise] = useState(SURPRISE_EXPENSES[0]);
  const [paidSurprise, setPaidSurprise] = useState(false);
  const [skippedSurprise, setSkippedSurprise] = useState(false);

  const reset = () => {
    setBalance(100);
    setSelected([]);
    setPhase("shopping");
    setPaidSurprise(false);
    setSkippedSurprise(false);
    setSurprise(SURPRISE_EXPENSES[Math.floor(Math.random() * SURPRISE_EXPENSES.length)]);
  };

  useEffect(() => { reset(); }, []);

  const toggleItem = (idx: number) => {
    if (phase !== "shopping") return;
    const item = BUDGET_ITEMS[idx];
    if (selected.includes(idx)) {
      setSelected(s => s.filter(i => i !== idx));
      setBalance(b => b + item.price);
    } else {
      if (balance >= item.price) {
        setSelected(s => [...s, idx]);
        setBalance(b => b - item.price);
      }
    }
  };

  const finishShopping = () => {
    if (selected.length >= 2) setPhase("surprise");
  };

  const handleSurprise = (pay: boolean) => {
    if (pay && balance >= surprise.cost) {
      setBalance(b => b - surprise.cost);
      setPaidSurprise(true);
    } else {
      setSkippedSurprise(true);
    }
    setPhase("result");
  };

  const needsCovered = selected.filter(i => BUDGET_ITEMS[i].type === "need").length;
  const totalNeeds = BUDGET_ITEMS.filter(i => i.type === "need").length;
  const wantsBought = selected.filter(i => BUDGET_ITEMS[i].type === "want").length;

  const calcScore = () => {
    let score = 0;
    score += Math.min(needsCovered * 20, 40);
    score += Math.min(balance, 30);
    if (paidSurprise) score += 20;
    if (balance < 0) score -= 20;
    if (wantsBought > needsCovered && needsCovered < totalNeeds) score -= 10;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const futureScore = calcScore();

  const getFeedback = () => {
    const good: string[] = [];
    const improve: string[] = [];
    if (needsCovered === totalNeeds) good.push("You covered all your needs first — smart!");
    else improve.push("Try covering all your needs before spending on wants.");
    if (balance >= 10) good.push("You kept some money saved — nice cushion!");
    else if (balance >= 0) improve.push("Try to save a bit more for unexpected costs.");
    else improve.push("You ran out of money! Always keep a buffer.");
    if (paidSurprise) good.push("You handled the surprise expense like a pro!");
    if (skippedSurprise) improve.push("Surprise expenses happen in real life — try to keep money aside for them.");
    return { good, improve };
  };

  const feedback = getFeedback();

  if (phase === "result") {
    return (
      <Card className="glass-card-coral rounded-glass animate-bounce-in">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-6xl">{futureScore >= 70 ? "🌟" : futureScore >= 40 ? "💪" : "📚"}</div>
            <h3 className="font-display text-2xl font-bold text-gray-800">Your Future Self Score</h3>
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
                <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10" strokeLinecap="round"
                  className={futureScore >= 70 ? "text-green-500" : futureScore >= 40 ? "text-amber-500" : "text-red-400"}
                  strokeDasharray={`${(futureScore / 100) * 314} 314`}
                  style={{ transition: "stroke-dasharray 1s ease" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-display text-3xl font-bold" data-testid="text-future-score">
                {futureScore}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedback.good.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 border-2 border-green-200 dark:border-green-800">
                <p className="font-bold text-green-700 dark:text-green-300 text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> What you did well
                </p>
                <ul className="space-y-1">
                  {feedback.good.map((g, i) => <li key={i} className="text-sm text-green-600 dark:text-green-400">{g}</li>)}
                </ul>
              </div>
            )}
            {feedback.improve.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 border-2 border-orange-200 dark:border-orange-800">
                <p className="font-bold text-orange-700 dark:text-orange-300 text-sm mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4" /> Room to grow
                </p>
                <ul className="space-y-1">
                  {feedback.improve.map((g, i) => <li key={i} className="text-sm text-orange-600 dark:text-orange-400">{g}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 border-2 border-dashed border-violet-200 dark:border-violet-800 text-center">
            <p className="text-sm">
              <strong>Takeaway:</strong> In real life, covering your needs first and saving a little for surprises
              is the smartest way to handle money. Wants are great — but only after your needs and savings are sorted!
            </p>
          </div>

          <div className="flex justify-center">
            <Button onClick={reset} className="rounded-2xl gap-2" data-testid="button-play-again-beatbudget">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "surprise") {
    return (
      <Card className="border-2 border-dashed border-red-300 dark:border-red-700 rounded-3xl animate-in fade-in zoom-in-95 duration-500">
        <CardContent className="p-8 text-center space-y-6">
          <div className="text-6xl">{surprise.emoji}</div>
          <h3 className="font-display text-2xl font-bold text-red-600 dark:text-red-400">Surprise Expense!</h3>
          <p className="text-lg">{surprise.name}</p>
          <p className="text-2xl font-bold">{sym}{surprise.cost.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">
            You have <strong>{sym}{balance.toFixed(2)}</strong> left. What will you do?
          </p>
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              className="rounded-2xl gap-2 bg-green-500 text-white px-6"
              disabled={balance < surprise.cost}
              onClick={() => handleSurprise(true)}
              data-testid="button-pay-surprise"
            >
              <CheckCircle2 className="w-5 h-5" /> Pay It
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl gap-2 border-2 px-6"
              onClick={() => handleSurprise(false)}
              data-testid="button-skip-surprise"
            >
              <XCircle className="w-5 h-5" /> Skip It
            </Button>
          </div>
          {balance < surprise.cost && (
            <p className="text-sm text-red-500 font-semibold">You don't have enough to cover this!</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white text-2xl shadow-lg">
            💰
          </div>
          <div>
            <h3 className="font-display text-xl font-bold">Weekly Allowance: {sym}100</h3>
            <p className="text-sm text-muted-foreground">Choose what to spend on — but watch out for surprises!</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-lg px-4 py-2 rounded-2xl font-bold ${balance < 20 ? "border-red-400 text-red-500" : "border-green-400 text-green-600"}`} data-testid="text-beat-balance">
          {sym}{balance.toFixed(2)} left
        </Badge>
      </div>

      <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${balance < 20 ? "bg-red-500" : balance < 50 ? "bg-amber-500" : "bg-green-500"}`}
          style={{ width: `${balance}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BUDGET_ITEMS.map((item, idx) => {
          const isSelected = selected.includes(idx);
          const canAfford = balance >= item.price;
          return (
            <Card
              key={idx}
              className={`rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? "border-green-400 bg-green-50 dark:bg-green-900/20" : canAfford ? "hover:border-violet-300 dark:hover:border-violet-700" : "opacity-50"}`}
              onClick={() => (isSelected || canAfford) ? toggleItem(idx) : undefined}
              data-testid={`card-budget-item-${idx}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{item.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold">{sym}{item.price.toFixed(2)}</span>
                      <Badge className={`text-[10px] rounded-lg border-0 ${item.type === "need" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"}`}>
                        {item.type === "need" ? "Need" : "Want"}
                      </Badge>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          className="rounded-2xl gap-2 px-8"
          disabled={selected.length < 2}
          onClick={finishShopping}
          data-testid="button-done-shopping"
        >
          <ArrowRight className="w-5 h-5" /> Done Shopping
        </Button>
      </div>
    </div>
  );
}

function CompoundItGame({ currency }: { currency: string }) {
  const sym = getSymbol(currency);
  const [weeklySavings, setWeeklySavings] = useState(20);
  const [years, setYears] = useState(5);

  const annualRate = 0.07;
  const weeksPerYear = 52;
  const totalWeeks = years * weeksPerYear;
  const totalContributed = weeklySavings * totalWeeks;

  const yearlyData = [];
  let runningBalance = 0;
  for (let y = 1; y <= years; y++) {
    for (let w = 0; w < weeksPerYear; w++) {
      runningBalance += weeklySavings;
      runningBalance *= (1 + annualRate / weeksPerYear);
    }
    yearlyData.push({ year: y, balance: runningBalance, contributed: weeklySavings * weeksPerYear * y });
  }

  const totalEarned = runningBalance - totalContributed;
  const maxBar = runningBalance || 1;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">📈</div>
        <h3 className="font-display text-2xl font-bold">Compound It!</h3>
        <p className="text-sm text-muted-foreground">See how your savings grow with 7% annual compound interest</p>
      </div>

      <Card className="rounded-2xl border-2">
        <CardContent className="p-6 space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold">Save per week</label>
              <Badge variant="outline" className="rounded-xl px-3 py-1 font-bold text-lg">{sym}{weeklySavings}</Badge>
            </div>
            <input
              type="range" min={5} max={50} step={5} value={weeklySavings}
              onChange={e => setWeeklySavings(Number(e.target.value))}
              className="w-full accent-primary"
              data-testid="slider-weekly-savings"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{sym}5</span><span>{sym}50</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold">For how many years?</label>
              <Badge variant="outline" className="rounded-xl px-3 py-1 font-bold text-lg">{years} yr{years > 1 ? "s" : ""}</Badge>
            </div>
            <input
              type="range" min={1} max={20} value={years}
              onChange={e => setYears(Number(e.target.value))}
              className="w-full accent-primary"
              data-testid="slider-years"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 year</span><span>20 years</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-center">Your money growing over time</p>
        <div className="flex items-end gap-1 h-48 bg-muted/30 rounded-2xl p-4 border-2 overflow-hidden">
          {yearlyData.map((d, i) => {
            const height = (d.balance / maxBar) * 100;
            const contribHeight = (d.contributed / maxBar) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5 group relative">
                <div className="absolute -top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] rounded-lg px-2 py-1 whitespace-nowrap z-10 font-bold">
                  {sym}{Math.round(d.balance).toLocaleString()}
                </div>
                <div className="w-full rounded-t-lg relative overflow-hidden" style={{ height: `${height}%`, transition: `height 0.5s ease ${i * 50}ms` }}>
                  <div className="absolute bottom-0 w-full bg-teal-300 dark:bg-teal-700" style={{ height: `${contribHeight > 0 ? (d.contributed / d.balance) * 100 : 0}%` }} />
                  <div className="absolute top-0 w-full h-full bg-teal-500 dark:bg-teal-400" style={{ clipPath: `inset(${(d.contributed / d.balance) * 100}% 0 0 0)` }} />
                </div>
                {(i === 0 || i === yearlyData.length - 1 || (i + 1) % 5 === 0) && (
                  <span className="text-[9px] text-muted-foreground font-bold mt-1">Y{d.year}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-300 dark:bg-teal-700" /> What you put in</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-500 dark:bg-teal-400" /> Interest earned</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="rounded-2xl border-2 bg-teal-50 dark:bg-teal-900/20">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase">You Put In</p>
            <p className="text-lg font-bold text-teal-700 dark:text-teal-300" data-testid="text-contributed">{sym}{totalContributed.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-2 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase">Interest Earned</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-300" data-testid="text-earned">{sym}{Math.round(totalEarned).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-2 bg-violet-50 dark:bg-violet-900/20">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase">Total Value</p>
            <p className="text-lg font-bold text-violet-700 dark:text-violet-300" data-testid="text-total-compound">{sym}{Math.round(runningBalance).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-700">
        <CardContent className="p-4 text-center space-y-2">
          <p className="font-bold text-teal-700 dark:text-teal-300 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            You earned {sym}{Math.round(totalEarned).toLocaleString()} without working extra!
          </p>
          <p className="text-sm text-muted-foreground">
            Compound interest means your money earns money, and then <em>that</em> money earns money too.
            The longer you wait, the faster it grows — that's why starting early is a superpower!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const NEEDS_WANTS_ITEMS = [
  { name: "Drinking water", answer: "need" as const, emoji: "💧" },
  { name: "Latest iPhone", answer: "want" as const, emoji: "📱" },
  { name: "School textbooks", answer: "need" as const, emoji: "📚" },
  { name: "Designer sunglasses", answer: "want" as const, emoji: "🕶️" },
  { name: "Healthy breakfast", answer: "need" as const, emoji: "🥣" },
  { name: "Concert tickets", answer: "want" as const, emoji: "🎶" },
  { name: "Winter jacket", answer: "need" as const, emoji: "🧥" },
  { name: "Gaming headset", answer: "want" as const, emoji: "🎧" },
  { name: "Toothbrush & toothpaste", answer: "need" as const, emoji: "🪥" },
  { name: "Candy from the store", answer: "want" as const, emoji: "🍬" },
  { name: "Bus fare to school", answer: "need" as const, emoji: "🚌" },
  { name: "Streaming subscription", answer: "want" as const, emoji: "📺" },
  { name: "Soap & shampoo", answer: "need" as const, emoji: "🧴" },
  { name: "Stuffed animal toy", answer: "want" as const, emoji: "🧸" },
  { name: "Electricity for your home", answer: "need" as const, emoji: "⚡" },
  { name: "Brand-name sneakers", answer: "want" as const, emoji: "👟" },
  { name: "Medicine when you're sick", answer: "need" as const, emoji: "💊" },
  { name: "Fancy smoothie", answer: "want" as const, emoji: "🥤" },
  { name: "Rain boots in hurricane season", answer: "need" as const, emoji: "🥾" },
  { name: "Amusement park visit", answer: "want" as const, emoji: "🎢" },
];

function NeedsVsWantsGame() {
  const [gameState, setGameState] = useState<"start" | "playing" | "result">("start");
  const [items, setItems] = useState<typeof NEEDS_WANTS_ITEMS>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3);
  const [answers, setAnswers] = useState<Array<{ item: typeof NEEDS_WANTS_ITEMS[0]; chosen: string; correct: boolean }>>([]);
  const [showFeedback, setShowFeedback] = useState<"correct" | "wrong" | null>(null);

  const startGame = () => {
    const shuffled = [...NEEDS_WANTS_ITEMS].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    setCurrentIdx(0);
    setScore(0);
    setTimeLeft(3);
    setAnswers([]);
    setShowFeedback(null);
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState !== "playing" || showFeedback) return;
    if (timeLeft <= 0) {
      handleAnswer("skip");
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameState, showFeedback]);

  const handleAnswer = (choice: string) => {
    if (gameState !== "playing" || showFeedback) return;
    const item = items[currentIdx];
    if (!item) return;
    const correct = choice === item.answer;
    if (correct) setScore(s => s + 1);

    setAnswers(a => [...a, { item, chosen: choice, correct }]);
    setShowFeedback(correct ? "correct" : "wrong");

    setTimeout(() => {
      setShowFeedback(null);
      if (currentIdx + 1 >= items.length) {
        setGameState("result");
      } else {
        setCurrentIdx(i => i + 1);
        setTimeLeft(3);
      }
    }, 600);
  };

  const accuracy = items.length > 0 ? Math.round((score / items.length) * 100) : 0;

  if (gameState === "start") {
    return (
      <Card className="border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-3xl">
        <CardContent className="p-8 text-center space-y-6">
          <div className="text-6xl">⚡</div>
          <h3 className="font-display text-2xl font-bold">Needs vs Wants Speed Round</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            20 items will flash on screen one at a time. You have <strong>3 seconds</strong> to decide:
            is it a <strong>Need</strong> (something you must have) or a <strong>Want</strong> (something nice to have)?
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 text-center">
              <p className="font-bold text-blue-600">Need</p>
              <p className="text-xs text-muted-foreground">Essential for life</p>
            </div>
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-2xl p-3 text-center">
              <p className="font-bold text-pink-600">Want</p>
              <p className="text-xs text-muted-foreground">Nice but optional</p>
            </div>
          </div>
          <Button size="lg" className="rounded-2xl gap-2 px-8 text-lg" onClick={startGame} data-testid="button-start-needswants">
            <Zap className="w-5 h-5" /> Let's Go!
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (gameState === "result") {
    return (
      <Card className="glass-card-coral rounded-glass animate-bounce-in">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-6xl">{accuracy >= 80 ? "🏆" : accuracy >= 60 ? "💡" : "📚"}</div>
            <h3 className="font-display text-2xl font-bold text-gray-800" data-testid="text-nw-result">
              {accuracy >= 80 ? "Amazing!" : accuracy >= 60 ? "Good job!" : "Keep learning!"}
            </h3>
            <p className="text-lg">{score} / {items.length} correct — <strong>{accuracy}% accuracy</strong></p>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-w-lg mx-auto">
            {answers.map((a, i) => (
              <div key={i} className={`rounded-lg p-1.5 text-center ${a.correct ? "bg-green-100 dark:bg-green-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
                <span className="text-lg">{a.item.emoji}</span>
                <p className="text-[9px] font-bold truncate">{a.correct ? "✓" : "✗"}</p>
              </div>
            ))}
          </div>

          <Card className="rounded-2xl border-2 border-dashed">
            <CardContent className="p-4 space-y-3">
              <p className="font-bold text-sm text-center">Think about it...</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>🤔 <strong>Why is water a need but a smoothie a want?</strong> Because you need water to survive, but a smoothie is just a tasty treat.</p>
                <p>🤔 <strong>Could a "want" ever become a "need"?</strong> Sometimes! If you move somewhere cold, a warm jacket goes from "nice to have" to "must have."</p>
                <p>🤔 <strong>Does your age change the answer?</strong> A car might be a want for you now, but could become a need when you're an adult going to work.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button onClick={startGame} className="rounded-2xl gap-2" data-testid="button-play-again-needswants">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentItem = items[currentIdx];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <Badge variant="outline" className="rounded-2xl px-4 py-2 text-sm font-bold">
          {currentIdx + 1} / {items.length}
        </Badge>
        <Badge variant="outline" className="rounded-2xl px-4 py-2 text-sm font-bold">
          <Star className="w-3 h-3 mr-1" /> {score} correct
        </Badge>
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${timeLeft <= 1 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
          <span className={`font-bold text-lg ${timeLeft <= 1 ? "text-red-500" : ""}`}>{timeLeft}s</span>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div className="h-full rounded-full bg-purple-500 transition-all duration-300" style={{ width: `${((currentIdx + 1) / items.length) * 100}%` }} />
      </div>

      <Card className={`rounded-3xl border-2 transition-all duration-200 ${showFeedback === "correct" ? "border-green-400 bg-green-50/50 dark:bg-green-900/10" : showFeedback === "wrong" ? "border-red-400 bg-red-50/50 dark:bg-red-900/10" : "border-purple-200 dark:border-purple-800"}`}>
        <CardContent className="p-8 text-center space-y-6">
          <div className="text-7xl">{currentItem?.emoji}</div>
          <h3 className="font-display text-2xl font-bold">{currentItem?.name}</h3>
          {showFeedback ? (
            <div className={`text-xl font-bold ${showFeedback === "correct" ? "text-green-600" : "text-red-500"}`}>
              {showFeedback === "correct" ? "Correct! ✓" : `Nope! It's a ${currentItem?.answer} ✗`}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <Button
                size="lg"
                className="rounded-2xl gap-2 bg-blue-500 text-white text-lg py-6"
                onClick={() => handleAnswer("need")}
                data-testid="button-need"
              >
                Need
              </Button>
              <Button
                size="lg"
                className="rounded-2xl gap-2 bg-pink-500 text-white text-lg py-6"
                onClick={() => handleAnswer("want")}
                data-testid="button-want"
              >
                Want
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const FUTURE_ME_ROUNDS = [
  { nowAmount: 50, laterAmount: 200, laterTime: "1 year", explanation: "Waiting a year could quadruple your money. That's like turning one video game into four!" },
  { nowAmount: 10, laterAmount: 30, laterTime: "1 month", explanation: "In just one month, your $10 could become $30. Short waits can still pay off nicely." },
  { nowAmount: 100, laterAmount: 250, laterTime: "6 months", explanation: "Half a year of patience turns $100 into $250. That's a 150% gain!" },
  { nowAmount: 25, laterAmount: 40, laterTime: "2 weeks", explanation: "Even two weeks of waiting can grow your money by 60%. Small patience, real reward." },
  { nowAmount: 75, laterAmount: 500, laterTime: "2 years", explanation: "Two years is a long wait, but your money would grow almost 7 times. Big patience, big payoff!" },
];

function FutureMeGame({ currency }: { currency: string }) {
  const sym = getSymbol(currency);
  const [currentRound, setCurrentRound] = useState(0);
  const [choices, setChoices] = useState<Array<{ round: typeof FUTURE_ME_ROUNDS[0]; chose: "now" | "later" }>>([]);
  const [gameState, setGameState] = useState<"playing" | "result">("playing");
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastChoice, setLastChoice] = useState<"now" | "later" | null>(null);

  const makeChoice = (choice: "now" | "later") => {
    const round = FUTURE_ME_ROUNDS[currentRound];
    setChoices(c => [...c, { round, chose: choice }]);
    setLastChoice(choice);
    setShowExplanation(true);
  };

  const nextRound = () => {
    setShowExplanation(false);
    setLastChoice(null);
    if (currentRound + 1 >= FUTURE_ME_ROUNDS.length) {
      setGameState("result");
    } else {
      setCurrentRound(r => r + 1);
    }
  };

  const reset = () => {
    setCurrentRound(0);
    setChoices([]);
    setGameState("playing");
    setShowExplanation(false);
    setLastChoice(null);
  };

  const totalNow = choices.filter(c => c.chose === "now").reduce((s, c) => s + c.round.nowAmount, 0);
  const totalLater = choices.filter(c => c.chose === "later").reduce((s, c) => s + c.round.laterAmount, 0);
  const totalIfAllLater = FUTURE_ME_ROUNDS.reduce((s, r) => s + r.laterAmount, 0);
  const totalIfAllNow = FUTURE_ME_ROUNDS.reduce((s, r) => s + r.nowAmount, 0);
  const playerTotal = totalNow + totalLater;
  const laterCount = choices.filter(c => c.chose === "later").length;

  if (gameState === "result") {
    return (
      <Card className="glass-card-coral rounded-glass animate-bounce-in">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-6xl">{laterCount >= 4 ? "🏆" : laterCount >= 2 ? "💡" : "🎯"}</div>
            <h3 className="font-display text-2xl font-bold text-gray-800" data-testid="text-futureme-result">
              {laterCount >= 4 ? "Patient Investor!" : laterCount >= 2 ? "Balanced Thinker!" : "Live in the Moment!"}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl border-2 bg-orange-50 dark:bg-orange-900/20">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-bold uppercase">Money Now</p>
                <p className="text-xl font-bold text-orange-600">{sym}{totalNow}</p>
                <p className="text-xs text-muted-foreground">(instant)</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-2 bg-indigo-50 dark:bg-indigo-900/20">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-bold uppercase">Money Later</p>
                <p className="text-xl font-bold text-indigo-600">{sym}{totalLater}</p>
                <p className="text-xs text-muted-foreground">(with patience)</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-2">
            <CardContent className="p-4 text-center space-y-2">
              <p className="font-bold">Your total: <span className="text-xl">{sym}{playerTotal}</span></p>
              <p className="text-sm text-muted-foreground">
                If you chose "Now" every time: {sym}{totalIfAllNow}
              </p>
              <p className="text-sm text-muted-foreground">
                If you chose "Later" every time: {sym}{totalIfAllLater}
              </p>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                Difference: {sym}{totalIfAllLater - totalIfAllNow} more by being patient!
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-center">Your choices</p>
            <div className="space-y-2">
              {choices.map((c, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                  <Badge className={`rounded-lg border-0 ${c.chose === "later" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"}`}>
                    R{i + 1}
                  </Badge>
                  <span className="text-sm flex-1">
                    {c.chose === "now" ? `Took ${sym}${c.round.nowAmount} now` : `Waited for ${sym}${c.round.laterAmount} (${c.round.laterTime})`}
                  </span>
                  <span className="text-sm font-bold">
                    {c.chose === "later" ? `+${sym}${c.round.laterAmount - c.round.nowAmount}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Card className="rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800">
            <CardContent className="p-4 text-center space-y-2">
              <p className="text-sm">
                <strong>The lesson:</strong> Waiting for a reward isn't always easy, but it often pays off.
                In real investing, this is how compound interest works — your money grows more the longer you leave it alone.
                Neither choice is "wrong," but understanding the trade-off helps you make smarter decisions!
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button onClick={reset} className="rounded-2xl gap-2" data-testid="button-play-again-futureme">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const round = FUTURE_ME_ROUNDS[currentRound];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <Badge variant="outline" className="rounded-2xl px-4 py-2 text-sm font-bold">
          Round {currentRound + 1} / {FUTURE_ME_ROUNDS.length}
        </Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hourglass className="w-4 h-4" /> Take your time to decide
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${((currentRound + 1) / FUTURE_ME_ROUNDS.length) * 100}%` }} />
      </div>

      <Card className="rounded-3xl border-2 border-indigo-200 dark:border-indigo-800">
        <CardContent className="p-6 space-y-6">
          <h3 className="font-display text-xl font-bold text-center">Would you rather...</h3>

          {showExplanation ? (
            <div className="space-y-4">
              <div className={`rounded-2xl p-4 text-center ${lastChoice === "later" ? "bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-700" : "bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700"}`}>
                <p className="font-bold mb-1">
                  You chose: {lastChoice === "now" ? `${sym}${round.nowAmount} now` : `${sym}${round.laterAmount} in ${round.laterTime}`}
                </p>
                <p className="text-sm text-muted-foreground">{round.explanation}</p>
              </div>
              <div className="flex justify-center">
                <Button onClick={nextRound} className="rounded-2xl gap-2" data-testid="button-next-futureme">
                  {currentRound + 1 >= FUTURE_ME_ROUNDS.length ? "See Results" : "Next Round"} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Card
                className="rounded-2xl border-2 border-orange-200 dark:border-orange-700 cursor-pointer transition-all hover:shadow-lg hover:border-orange-400 group"
                onClick={() => makeChoice("now")}
                data-testid="button-choose-now"
              >
                <CardContent className="p-6 text-center space-y-3">
                  <div className="text-4xl">💵</div>
                  <p className="text-3xl font-bold text-orange-600">{sym}{round.nowAmount}</p>
                  <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-0 rounded-lg">
                    Right now
                  </Badge>
                </CardContent>
              </Card>
              <Card
                className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 cursor-pointer transition-all hover:shadow-lg hover:border-indigo-400 group"
                onClick={() => makeChoice("later")}
                data-testid="button-choose-later"
              >
                <CardContent className="p-6 text-center space-y-3">
                  <div className="text-4xl">🌱</div>
                  <p className="text-3xl font-bold text-indigo-600">{sym}{round.laterAmount}</p>
                  <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-0 rounded-lg">
                    In {round.laterTime}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MoneyGames() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [currency, setCurrency] = useState("BSD");

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {activeGame ? (
                <Button
                  variant="ghost"
                  className="rounded-2xl gap-2 mb-2"
                  onClick={() => setActiveGame(null)}
                  data-testid="button-back-to-games"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Games
                </Button>
              ) : null}
              <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 text-white flex items-center justify-center text-2xl shadow-lg animate-wiggle">
                  <Gamepad2 className="w-6 h-6" />
                </span>
                {activeGame ? GAMES.find(g => g.id === activeGame)?.title : "Money Games"}
              </h1>
              {!activeGame && (
                <p className="text-muted-foreground mt-1 ml-15">Learn money skills the fun way!</p>
              )}
            </div>
            <div className="w-48">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="rounded-2xl border-2 bg-white text-gray-800 font-medium" data-testid="select-currency-games">
                  <SelectValue placeholder="Currency" />
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

          {!activeGame ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {GAMES.map((game) => (
                <Card
                  key={game.id}
                  className="glass-card rounded-glass transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer group overflow-hidden"
                  onClick={() => setActiveGame(game.id)}
                  data-testid={`card-game-${game.id}`}
                >
                  <div className={`h-2 bg-gradient-to-r ${game.color}`} />
                  <CardContent className="p-6 text-center space-y-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-white mx-auto shadow-lg group-hover:scale-110 transition-transform`}>
                      <game.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold">{game.title}</h3>
                      <Badge className={`mt-2 rounded-xl ${game.badgeColor} border-0`}>
                        {game.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{game.description}</p>
                    <Button className="btn-coral rounded-2xl gap-2 w-full" data-testid={`button-play-${game.id}`}>
                      <Sparkles className="w-4 h-4" /> Play Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeGame === "grocery" ? (
            <GroceryGame currency={currency} />
          ) : activeGame === "speed" ? (
            <SpeedInvestorGame currency={currency} />
          ) : activeGame === "savings" ? (
            <SavingsGoalGame currency={currency} />
          ) : activeGame === "beatbudget" ? (
            <BeatTheBudgetGame currency={currency} />
          ) : activeGame === "compound" ? (
            <CompoundItGame currency={currency} />
          ) : activeGame === "needswants" ? (
            <NeedsVsWantsGame />
          ) : activeGame === "futureme" ? (
            <FutureMeGame currency={currency} />
          ) : null}
        </div>
      </main>
    </div>
  );
}
