import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/Auth";
import Budgets from "@/pages/Budgets";
import Trends from "@/pages/Trends";
import SavingsGoals from "@/pages/SavingsGoals";
import InvestmentSimulator from "@/pages/InvestmentSimulator";
import MoneyGames from "@/pages/MoneyGames";
import MoneyGuide from "@/pages/MoneyGuide";
import MoneyLab from "@/pages/MoneyLab";
import MoneyLabUpload from "@/pages/MoneyLabUpload";
import MoneyLabPlay from "@/pages/MoneyLabPlay";
import MoneyLabTutor from "@/pages/MoneyLabTutor";
import MoneyLabLeaderboard from "@/pages/MoneyLabLeaderboard";
import TeacherLogin from "@/pages/TeacherLogin";
import TeacherRegister from "@/pages/TeacherRegister";
import TeacherDashboard from "@/pages/TeacherDashboard";
import TeacherClassDetail from "@/pages/TeacherClassDetail";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import DemoAccess from "@/pages/DemoAccess";
import Lessons from "@/pages/Lessons";

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
        <Route path="/demo" component={DemoAccess} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/teacher/login" component={TeacherLogin} />
        <Route path="/teacher/register" component={TeacherRegister} />
        <Route path="/teacher/dashboard" component={TeacherDashboard} />
        <Route path="/teacher/classes/:id" component={TeacherClassDetail} />
        <Route path="/teacher/classes" component={TeacherDashboard} />
        <Route path="/teacher">{() => <Redirect to="/teacher/login" />}</Route>
        <Route path="/" component={AuthPage} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/demo" component={DemoAccess} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/teacher/login" component={TeacherLogin} />
      <Route path="/teacher/register" component={TeacherRegister} />
      <Route path="/teacher/dashboard" component={TeacherDashboard} />
      <Route path="/teacher/classes/:id" component={TeacherClassDetail} />
      <Route path="/teacher/classes" component={TeacherDashboard} />
      <Route path="/teacher">{() => <Redirect to="/teacher/dashboard" />}</Route>
      <Route path="/" component={Dashboard} />
      <Route path="/budgets" component={Budgets} />
      <Route path="/trends" component={Trends} />
      <Route path="/savings" component={SavingsGoals} />
      <Route path="/invest" component={InvestmentSimulator} />
      <Route path="/games" component={MoneyGames} />
      <Route path="/guide" component={MoneyGuide} />
      <Route path="/moneylab" component={MoneyLab} />
      <Route path="/moneylab/upload" component={MoneyLabUpload} />
      <Route path="/moneylab/play" component={MoneyLabPlay} />
      <Route path="/moneylab/tutor" component={MoneyLabTutor} />
      <Route path="/moneylab/leaderboard" component={MoneyLabLeaderboard} />
      <Route path="/lessons" component={Lessons} />
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
