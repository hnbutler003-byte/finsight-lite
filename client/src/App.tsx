import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";

// Pages
import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/Auth";
import Budgets from "@/pages/Budgets";
import Trends from "@/pages/Trends";
import SavingsGoals from "@/pages/SavingsGoals";
import InvestmentSimulator from "@/pages/InvestmentSimulator";
import MoneyGames from "@/pages/MoneyGames";
import MoneyGuide from "@/pages/MoneyGuide";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Redirect logic usually handled by auth-utils or backend 401, 
    // but explicit check helps prevent flash of content
    setLocation("/");
    return <AuthPage />;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/budgets" component={Budgets} />
      <Route path="/trends" component={Trends} />
      <Route path="/savings" component={SavingsGoals} />
      <Route path="/invest" component={InvestmentSimulator} />
      <Route path="/games" component={MoneyGames} />
      <Route path="/guide" component={MoneyGuide} />
      <Route path="/transactions">{() => <Redirect to="/" />}</Route>
      <Route path="/reports">{() => <Redirect to="/" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
