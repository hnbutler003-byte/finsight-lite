import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Wallet, Gamepad2, TrendingUp, Bot, GraduationCap,
  ChevronRight, ChevronLeft, X, Sparkles, PartyPopper,
} from "lucide-react";

const TOUR_STEPS = [
  {
    emoji: "👋",
    icon: Sparkles,
    title: "Welcome to FinSight Lite!",
    description: "Let's take a quick tour so you know where everything is. This will only take a minute!",
    color: "from-violet-500 to-pink-500",
  },
  {
    emoji: "💰",
    icon: Wallet,
    title: "My Money Dashboard",
    description: "This is your home base. Track your income, spending, and see how your money moves, all in one place.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    emoji: "🎮",
    icon: Gamepad2,
    title: "Money Games",
    description: "Play 7 fun games that teach you real-world money skills: budgeting, saving, investing, and more!",
    color: "from-amber-500 to-orange-500",
  },
  {
    emoji: "📈",
    icon: TrendingUp,
    title: "Investment Simulator",
    description: "Practice buying and selling stocks with virtual cash. Learn how the market works, zero risk!",
    color: "from-blue-500 to-cyan-500",
  },
  {
    emoji: "🤖",
    icon: Bot,
    title: "AI Money Guide",
    description: "Got a money question? Ask your personal AI mentor anything. No question is too simple!",
    color: "from-purple-500 to-violet-500",
  },
  {
    emoji: "🎓",
    icon: GraduationCap,
    title: "MoneyLab Exams",
    description: "Test what you've learned with real exams, earn XP, and climb the leaderboard. Show what you know!",
    color: "from-pink-500 to-rose-500",
  },
  {
    emoji: "🎉",
    icon: PartyPopper,
    title: "You're All Set!",
    description: "Start exploring and have fun learning about money. You've got this!",
    color: "from-violet-500 via-pink-500 to-amber-500",
  },
];

interface GuidedTourProps {
  onComplete: () => void;
}

export function GuidedTour({ onComplete }: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" data-testid="guided-tour-overlay">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onComplete} />

      <div className="relative glass-card-heavy rounded-3xl shadow-2xl max-w-md w-full p-8 animate-bounce-in" data-testid="guided-tour-card">
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          data-testid="button-tour-skip-x"
          aria-label="Skip tour"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-5">
          <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-xl animate-float`}>
            <span className="text-4xl">{current.emoji}</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-gray-900" data-testid="text-tour-title">
              {current.title}
            </h2>
            <p className="text-gray-600 font-medium leading-relaxed" data-testid="text-tour-description">
              {current.description}
            </p>
          </div>

          <div className="flex items-center gap-1.5 py-2" data-testid="tour-progress-dots">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-6 h-2.5 bg-gradient-to-r from-violet-500 to-pink-500"
                    : i < step
                    ? "w-2.5 h-2.5 bg-violet-300"
                    : "w-2.5 h-2.5 bg-gray-200"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 w-full pt-2">
            {!isFirst && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="rounded-2xl border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold px-5"
                data-testid="button-tour-back"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}

            {isFirst && (
              <Button
                variant="ghost"
                onClick={onComplete}
                className="rounded-2xl text-gray-400 hover:text-gray-600 font-semibold px-5"
                data-testid="button-tour-skip"
              >
                Skip
              </Button>
            )}

            <div className="flex-1" />

            {isLast ? (
              <Button
                onClick={onComplete}
                className="rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold px-8 shadow-lg shadow-purple-300/50 transition-all hover:scale-105"
                data-testid="button-tour-finish"
              >
                Let's Go!
              </Button>
            ) : (
              <Button
                onClick={() => setStep(step + 1)}
                className="rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold px-8 shadow-lg shadow-purple-300/50 transition-all hover:scale-105"
                data-testid="button-tour-next"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
