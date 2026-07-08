import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/lib/theme";
import { Loader2, Eye, X } from "lucide-react";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/Auth";
import Budgets from "@/pages/Budgets";
import SavingsGoals from "@/pages/SavingsGoals";
import InvestmentSimulator from "@/pages/InvestmentSimulator";
import MoneyGames from "@/pages/MoneyGames";
import MoneyGuide from "@/pages/MoneyGuide";
import Leaderboard from "@/pages/MoneyLabLeaderboard";
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
import OrgApply from "@/pages/OrgApply";
import OrgDashboard from "@/pages/OrgDashboard";
import OrgStudents from "@/pages/OrgStudents";
import OrgTeachers from "@/pages/OrgTeachers";
import OrgLessons from "@/pages/OrgLessons";
import OrgBranding from "@/pages/OrgBranding";
import TeacherHelp from "@/pages/TeacherHelp";
import OrgHelp from "@/pages/OrgHelp";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import OurStory from "@/pages/OurStory";

// Persistent banner shown during founder admin preview mode.
// Queries /api/admin/preview/status every 10 s; only visible when previewMode is true.
// Stays mounted across all routes so the admin always knows they are in preview.
function PreviewBanner() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: status } = useQuery<{
    previewMode: boolean;
    previewRole: string | null;
    previewActorName: string | null;
  }>({
    queryKey: ["/api/admin/preview/status"],
    queryFn: () =>
      fetch("/api/admin/preview/status", { credentials: "include" }).then(r =>
        r.ok ? r.json() : { previewMode: false, previewRole: null, previewActorName: null }
      ),
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: false,
  });

  const exitPreview = useMutation({
    mutationFn: () =>
      fetch("/api/admin/preview/exit", { method: "POST", credentials: "include" }).then(r =>
        r.json()
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/preview/status"] });
      setLocation("/admin");
    },
  });

  if (!status?.previewMode) return null;

  const roleLabel =
    status.previewRole === "student"
      ? "Student"
      : status.previewRole === "teacher"
      ? "Teacher"
      : "Org Admin";

  return (
    <div
      className="fixed top-0 inset-x-0 z-50 bg-amber-400 text-amber-950 flex items-center justify-between gap-3 px-4 py-2 text-sm font-semibold shadow-lg"
      data-testid="banner-preview-mode"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="w-4 h-4 shrink-0" />
        <span className="truncate">
          Previewing as <strong>{status.previewActorName}</strong> ({roleLabel}) in FinSight Demo
          School [TEST]
        </span>
      </div>
      <button
        onClick={() => exitPreview.mutate()}
        disabled={exitPreview.isPending}
        className="shrink-0 flex items-center gap-1.5 bg-amber-950/15 hover:bg-amber-950/30 rounded-lg px-3 py-1 transition-colors"
        data-testid="button-exit-preview"
      >
        {exitPreview.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <X className="w-3.5 h-3.5" />
        )}
        Exit Preview
      </button>
    </div>
  );
}

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
        <Route path="/teacher/help" component={TeacherHelp} />
        <Route path="/teacher">{() => <Redirect to="/teacher/login" />}</Route>
        <Route path="/org/login" component={OrgLogin} />
        <Route path="/org/register" component={OrgRegister} />
        <Route path="/org/apply" component={OrgApply} />
        <Route path="/org/dashboard" component={OrgDashboard} />
        <Route path="/org/students" component={OrgStudents} />
        <Route path="/org/teachers" component={OrgTeachers} />
        <Route path="/org/lessons" component={OrgLessons} />
        <Route path="/org/branding" component={OrgBranding} />
        <Route path="/org/help" component={OrgHelp} />
        <Route path="/org">{() => <Redirect to="/org/login" />}</Route>
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/our-story" component={OurStory} />
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
      <Route path="/org/apply" component={OrgApply} />
      <Route path="/org/dashboard" component={OrgDashboard} />
      <Route path="/org/students" component={OrgStudents} />
      <Route path="/org/teachers" component={OrgTeachers} />
      <Route path="/org/lessons" component={OrgLessons} />
      <Route path="/org/branding" component={OrgBranding} />
      <Route path="/org">{() => <Redirect to="/org/dashboard" />}</Route>
      <Route path="/" component={Dashboard} />
      <Route path="/budgets" component={Budgets} />
      <Route path="/savings" component={SavingsGoals} />
      <Route path="/invest" component={InvestmentSimulator} />
      <Route path="/games" component={MoneyGames} />
      <Route path="/guide" component={MoneyGuide} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/lessons" component={Lessons} />
      <Route path="/settings" component={Settings} />
      <Route path="/transactions">{() => <Redirect to="/" />}</Route>
      <Route path="/reports">{() => <Redirect to="/" />}</Route>
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/our-story" component={OurStory} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <PreviewBanner />
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
