import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/lib/theme";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/Auth";
import Budgets from "@/pages/Budgets";
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
import Settings from "@/pages/Settings";
import OrgLogin from "@/pages/OrgLogin";
import OrgRegister from "@/pages/OrgRegister";
import OrgDashboard from "@/pages/OrgDashboard";
import OrgStudents from "@/pages/OrgStudents";
import OrgLessons from "@/pages/OrgLessons";
import OrgBranding from "@/pages/OrgBranding";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";

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

  // If loading AND the browser has a hint that this user was previously logged in,
  // hold on the spinner so we don't flash the auth page for a fraction of a second.
  const hadSession = typeof window !== "undefined" && !!localStorage.getItem("fsl_had_session");

  if (isLoading || (hadSession && !user && isLoading)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center caribbean-bg">
        <Loader2 className="w-8 h-8 animate-spin text-white/70" />
      </div>
    );
  }

  // Once confirmed logged in, keep the hint fresh
  if (user && typeof window !== "undefined") {
    localStorage.setItem("fsl_had_session", "1");
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
        <Route path="/org/login" component={OrgLogin} />
        <Route path="/org/register" component={OrgRegister} />
        <Route path="/org/dashboard" component={OrgDashboard} />
        <Route path="/org/students" component={OrgStudents} />
        <Route path="/org/lessons" component={OrgLessons} />
        <Route path="/org/branding" component={OrgBranding} />
        <Route path="/org">{() => <Redirect to="/org/login" />}</Route>
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
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
      <Route path="/org/login" component={OrgLogin} />
      <Route path="/org/register" component={OrgRegister} />
      <Route path="/org/dashboard" component={OrgDashboard} />
      <Route path="/org/students" component={OrgStudents} />
      <Route path="/org/lessons" component={OrgLessons} />
      <Route path="/org/branding" component={OrgBranding} />
      <Route path="/org">{() => <Redirect to="/org/dashboard" />}</Route>
      <Route path="/" component={Dashboard} />
      <Route path="/budgets" component={Budgets} />
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
      <Route path="/settings" component={Settings} />
      <Route path="/transactions">{() => <Redirect to="/" />}</Route>
      <Route path="/reports">{() => <Redirect to="/" />}</Route>
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
