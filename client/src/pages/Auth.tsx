import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Rocket, Coins, GraduationCap, TrendingUp } from "lucide-react";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <div className="lg:w-1/2 relative overflow-hidden flex flex-col justify-between p-8 lg:p-16 text-white bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-300/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-300/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <span className="w-12 h-12 rounded-2xl bg-white text-purple-600 flex items-center justify-center text-3xl font-bold shadow-lg animate-float">
              $
            </span>
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-display tracking-tight leading-none">FinSight Lite</span>
              <span className="text-[10px] text-white/60 uppercase font-bold tracking-widest mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                by FinSight Ltd.
              </span>
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-display font-bold leading-tight mb-6">
            Learn money,<br/>
            <span className="text-yellow-300">have fun!</span>
          </h1>
          <p className="text-white/80 text-lg max-w-md leading-relaxed">
            A safe place for kids to learn about saving, budgeting, and investing with virtual money. No real risk!
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: Coins, text: "Track your allowance and spending" },
            { icon: TrendingUp, text: "Try investing with pretend money" },
            { icon: GraduationCap, text: "Learn about stocks, bonds, and more" },
            { icon: Rocket, text: "Build smart money habits for life" },
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-sm border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <feature.icon className="w-4 h-4 text-yellow-300" />
              </div>
              <span className="font-semibold text-sm">{feature.text}</span>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-12 text-xs text-white/30">
          &copy; 2024 FinSight Financial Technologies. All rights reserved.
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-b from-violet-50 to-background dark:from-violet-950/20 dark:to-background">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-300/50 dark:shadow-purple-900/50 animate-float">
              <span className="text-4xl">&#x1F44B;</span>
            </div>
            <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500">Hey there!</h2>
            <p className="mt-2 text-muted-foreground font-medium">Ready to start your money journey?</p>
          </div>

          <div className="bg-card border-2 border-dashed border-violet-200 dark:border-violet-800 shadow-xl rounded-3xl p-8 space-y-6">
            <div className="space-y-4">
              <Button 
                className="w-full h-14 text-lg font-bold shadow-lg shadow-violet-300/50 dark:shadow-violet-900/50 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 transition-all hover:scale-[1.02] hover:shadow-xl" 
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-login"
              >
                Let's Go!
                <Rocket className="ml-2 w-5 h-5" />
              </Button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t-2 border-dashed border-violet-100 dark:border-violet-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Safe & Secure
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Sign in with your Replit account to get started. Your data stays private and safe!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
