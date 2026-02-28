import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import heroImg from "@assets/hero.jpg"; // Placeholder, assuming assets are handled or this is generic

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left Panel - Brand */}
      <div className="lg:w-1/2 bg-primary relative overflow-hidden flex flex-col justify-between p-8 lg:p-16 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2071&auto=format&fit=crop')] opacity-10 bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-blue-900/90" />
        
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <span className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center text-2xl font-bold shadow-lg">
              $
            </span>
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-display tracking-tight leading-none">FinSight Lite</span>
              <span className="text-[10px] text-primary-foreground/60 uppercase font-bold tracking-widest mt-1">by FinSight Ltd.</span>
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-display font-bold leading-tight mb-6">
            Master your money, <br/>
            <span className="text-secondary">live your life.</span>
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-md leading-relaxed">
            The simplest way to track expenses, set budgets, and achieve financial freedom across the Caribbean.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            "Track regional transactions seamlessly",
            "Visual insights into your spending habits",
            "Secure, bank-grade data protection"
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-secondary" />
              <span className="font-medium">{feature}</span>
            </div>
          ))}
        </div>

        <div className="relative z-10 mt-12 text-xs text-primary-foreground/40">
          © 2024 FinSight Financial Technologies. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold font-display text-foreground">Welcome Back</h2>
            <p className="mt-2 text-muted-foreground">Sign in to access your dashboard</p>
          </div>

          <div className="bg-card border border-border/50 shadow-xl rounded-2xl p-8 space-y-6">
            <div className="space-y-4">
              <Button 
                className="w-full h-12 text-lg font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" 
                onClick={() => window.location.href = "/api/login"}
              >
                Sign in with Replit
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Secure Access
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
