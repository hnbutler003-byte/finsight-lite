import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, ShoppingCart, Zap, Target, Plus, Minus, CheckCircle2,
  XCircle, Timer, TrendingUp, TrendingDown, Minus as FlatIcon,
  Trophy, Star, Sparkles, RotateCcw, ShoppingBag, PiggyBank,
  Gamepad2, ArrowRight
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
        <Card className="border-2 border-dashed border-green-300 dark:border-green-700 rounded-3xl">
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
  const [gameState, setGameState] = useState<"start" | "playing" | "reveal" | "end">("start");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [balance, setBalance] = useState(1000);
  const [timeLeft, setTimeLeft] = useState(10);
  const [rounds, setRounds] = useState<Array<{ stock: typeof SPEED_STOCKS[0]; news: typeof SPEED_NEWS[0]; price: number; actualTrend: "up" | "down"; choice?: "buy" | "hold" | "sell"; correct?: boolean }>>([]);
  const [currentChoice, setCurrentChoice] = useState<"buy" | "hold" | "sell" | null>(null);

  const generateRounds = useCallback(() => {
    const shuffledStocks = [...SPEED_STOCKS].sort(() => Math.random() - 0.5);
    const newRounds = shuffledStocks.map((stock, i) => {
      const newsItem = SPEED_NEWS[Math.floor(Math.random() * SPEED_NEWS.length)];
      const price = Math.floor(Math.random() * 900) + 100;
      const actualTrend = newsItem.trend === "up" ? (Math.random() > 0.2 ? "up" : "down") as const : (Math.random() > 0.2 ? "down" : "up") as const;
      return { stock, news: newsItem, price, actualTrend };
    });
    return newRounds;
  }, []);

  const startGame = () => {
    setRounds(generateRounds());
    setRound(0);
    setScore(0);
    setBalance(1000);
    setTimeLeft(10);
    setCurrentChoice(null);
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState !== "playing") return;
    if (timeLeft <= 0) {
      makeChoice("hold");
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameState]);

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
      setTimeLeft(10);
      setCurrentChoice(null);
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

  if (gameState === "start") {
    return (
      <Card className="border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-3xl">
        <CardContent className="p-8 text-center space-y-6">
          <div className="text-6xl">⚡</div>
          <h3 className="font-display text-2xl font-bold">Speed Investor</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            You start with {sym}1,000. Each round, a stock appears with a news headline.
            You have <strong>10 seconds</strong> to decide: Buy, Hold, or Sell.
            Make smart choices to grow your money!
          </p>
          <ul className="text-sm text-left max-w-sm mx-auto space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" /> Buy if you think the price will go UP</li>
            <li className="flex items-center gap-2"><FlatIcon className="w-4 h-4 text-gray-400" /> Hold to play it safe (no gain, no loss)</li>
            <li className="flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" /> Sell if you think the price will go DOWN</li>
          </ul>
          <Button size="lg" className="rounded-2xl gap-2 px-8 text-lg" onClick={startGame} data-testid="button-start-speed">
            <Zap className="w-5 h-5" /> Start Game
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (gameState === "end") {
    const rating = getFinalRating();
    return (
      <Card className="border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-3xl">
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
          <Button onClick={startGame} className="rounded-2xl gap-2 mt-4" data-testid="button-play-again-speed">
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
        <div className="flex items-center gap-2">
          <Timer className={`w-5 h-5 ${timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
          <span className={`font-bold text-lg ${timeLeft <= 3 ? "text-red-500" : ""}`}>{timeLeft}s</span>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 3 ? "bg-red-500" : "bg-orange-400"}`}
          style={{ width: `${(timeLeft / 10) * 100}%` }}
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

export default function MoneyGames() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [currency, setCurrency] = useState("BSD");

  return (
    <div className="flex min-h-screen bg-background">
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
                <SelectTrigger className="rounded-2xl border-2" data-testid="select-currency-games">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {GAMES.map((game) => (
                <Card
                  key={game.id}
                  className="rounded-3xl border-2 border-dashed hover:border-violet-300 dark:hover:border-violet-700 transition-all hover:shadow-xl cursor-pointer group overflow-hidden"
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
                    <Button className="rounded-2xl gap-2 w-full" data-testid={`button-play-${game.id}`}>
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
          ) : null}
        </div>
      </main>
    </div>
  );
}
