import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { FloatingVideoProvider } from "./contexts/floating-video-context";
import { ProtectedRoute } from "./lib/protected-route";
import { MobileApp } from "./mobile/MobileApp";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import GroupsPage from "@/pages/groups-page";
import PollsPage from "@/pages/polls-page";
import CandidatesPage from "@/pages/candidates-page";
import CandidateProfilePage from "@/pages/candidate-profile-page";
import ElectionsPage from "@/pages/elections-page";
import ElectionPositionsPage from "@/pages/election-positions-page";
import ElectionRacePage from "@/pages/election-race-page";
import PoliticianProfilePage from "@/pages/politician-profile-page";
import MessagesPage from "@/pages/messages-page";
import RepresentativesPage from "@/pages/representatives-page";
import SettingsPage from "@/pages/settings-page";
import PrivacySettingsPage from "@/pages/privacy-settings-page";
import EventsPage from "@/pages/events-page";
import FriendsPage from "@/pages/friends-page";
import PollDetailPage from "@/pages/poll-detail-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import CryptoDashboardPage from "@/pages/crypto-dashboard-page";
import ProfilePage from "@/pages/profile-page";
import CharitiesPage from "@/pages/charities-page";
import CharityDetailPage from "@/pages/charity-detail-page";
import BoycottsPage from "@/pages/boycotts-page";
import InitiativesPage from "@/pages/InitiativesPage";
import InitiativeFormPage from "@/pages/InitiativeFormPage";
import InitiativeDetailPage from "@/pages/InitiativeDetailPage";
import SubscriptionPage from "@/pages/subscription-page";
import { LivePage } from "@/pages/LivePage";
import MyStreamsPage from "@/pages/MyStreamsPage";
import AdminInvitationsPage from "@/pages/admin-invitations-page";
import AdminRepresentativesPage from "@/pages/admin-representatives-page";
import AdminDashboardPage from "@/pages/admin-dashboard-page";
import AdminModerationPage from "@/pages/admin-moderation-page";
import AdminUsersPage from "@/pages/admin-users-page";
import AdminUserBansPage from "@/pages/admin-user-bans-page";
import AdminIpBlocksPage from "@/pages/admin-ip-blocks-page";
import AdminPoliticiansPage from "@/pages/admin-politicians-page";
import AdminPollsPage from "@/pages/admin-polls-page";
import AdminSecurityPage from "@/pages/admin-security-page";
import AdminDatabasePage from "@/pages/admin-database-page";
import AdminAlgorithmPage from "@/pages/admin-algorithm-page";
import AdminAlgorithmSettingsPage from "@/pages/admin-algorithm-settings-page";
import AdminAiParametersPage from "@/pages/admin-ai-parameters-page";
import AdminAcpPlusPage from "@/pages/admin-acp-plus-page";
import AdminSettingsPage from "@/pages/admin-settings-page";
import AdminVoterVerificationPage from "@/pages/admin-voter-verification-page";
import AdminSigsPage from "@/pages/admin-sigs-page";
import AdminStateDataPage from "@/pages/admin-state-data-page";
import SigsDirectoryPage from "@/pages/sigs-directory-page";
import SigProfilePage from "@/pages/sig-profile-page";
import WhistleblowingPage from "@/pages/whistleblowing-page";
import CreateArticlePage from "@/pages/create-article-page";
import ArticlePage from "@/pages/article-page";
import PublicLandingPage from "@/pages/public-landing-page";
import PublicArticlePage from "@/pages/public-article-page";
import NotFound from "@/pages/not-found";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useScrollLight } from "./hooks/useScrollLight";
import { useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";
import { TwoFactorReminder } from "./components/two-factor-reminder";
import { ErrorBoundary } from "./components/error-boundary";

function PoliticianHandleRedirect({ params }: { params?: { handle?: string } }) {
  const [, navigate] = useLocation();
  const handle = params?.handle ?? "";

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/politicians/by-handle", handle],
    queryFn: async () => {
      const res = await fetch(`/api/politicians/by-handle/${encodeURIComponent(handle)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!handle,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (data?.id) {
    navigate(`/politicians/${data.id}`, { replace: true });
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Politician @{handle} not found.</p>
    </div>
  );
}

function HomeRoute() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  if (!user) {
    return <PublicLandingPage />;
  }
  
  return <HomePage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/news" component={PublicLandingPage} />
      <Route path="/read/:id" component={PublicArticlePage} />
      <ProtectedRoute path="/groups" component={GroupsPage} />
      <ProtectedRoute path="/polls" component={PollsPage} />
      <ProtectedRoute path="/polls/:id" component={PollDetailPage} />
      <ProtectedRoute path="/elections" component={ElectionsPage} />
      <ProtectedRoute path="/elections/positions" component={ElectionPositionsPage} />
      <ProtectedRoute path="/elections/race" component={ElectionRacePage} />
      <ProtectedRoute path="/candidates" component={CandidatesPage} />
      <ProtectedRoute path="/candidates/:id" component={CandidateProfilePage} />
      <ProtectedRoute path="/politicians/handle/:handle" component={PoliticianHandleRedirect} />
      <ProtectedRoute path="/politicians/:id" component={PoliticianProfilePage} />
      <ProtectedRoute path="/representatives" component={RepresentativesPage} />
      <ProtectedRoute path="/events" component={EventsPage} />
      <ProtectedRoute path="/live" component={LivePage} />
      <ProtectedRoute path="/my-streams" component={MyStreamsPage} />
      <ProtectedRoute path="/friends" component={FriendsPage} />
      <ProtectedRoute path="/messages" component={MessagesPage} />
      <ProtectedRoute path="/crypto" component={CryptoDashboardPage} />
      <ProtectedRoute path="/charities" component={CharitiesPage} />
      <ProtectedRoute path="/charities/:id" component={CharityDetailPage} />
      <ProtectedRoute path="/boycotts" component={BoycottsPage} />
      <ProtectedRoute path="/whistleblowing" component={WhistleblowingPage} />
      <ProtectedRoute path="/write" component={CreateArticlePage} />
      <ProtectedRoute path="/write/:id" component={CreateArticlePage} />
      <ProtectedRoute path="/article/:id" component={ArticlePage} />
      <ProtectedRoute path="/initiatives" component={InitiativesPage} />
      <ProtectedRoute path="/initiatives/new" component={InitiativeFormPage} />
      <ProtectedRoute path="/initiatives/edit/:id" component={InitiativeFormPage} />
      <ProtectedRoute path="/initiatives/:id" component={InitiativeDetailPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/profile/:userId" component={ProfilePage} />
      <ProtectedRoute path="/subscription" component={SubscriptionPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/privacy-settings" component={PrivacySettingsPage} />
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboardPage} />
      <ProtectedRoute path="/admin/moderation" component={AdminModerationPage} />
      <ProtectedRoute path="/admin/users" component={AdminUsersPage} />
      <ProtectedRoute path="/admin/bans" component={AdminUserBansPage} />
      <ProtectedRoute path="/admin/ip-blocks" component={AdminIpBlocksPage} />
      <ProtectedRoute path="/admin/invitations" component={AdminInvitationsPage} />
      <ProtectedRoute path="/admin/representatives" component={AdminRepresentativesPage} />
      <ProtectedRoute path="/admin/politicians" component={AdminPoliticiansPage} />
      <Route path="/sigs" component={SigsDirectoryPage} />
      <Route path="/sigs/:tag" component={SigProfilePage} />
      <ProtectedRoute path="/admin/sigs" component={AdminSigsPage} />
      <ProtectedRoute path="/admin/state-data" component={AdminStateDataPage} />
      <ProtectedRoute path="/admin/polls" component={AdminPollsPage} />
      <ProtectedRoute path="/admin/security" component={AdminSecurityPage} />
      <ProtectedRoute path="/admin/database" component={AdminDatabasePage} />
      <ProtectedRoute path="/admin/algorithm" component={AdminAlgorithmPage} />
      <ProtectedRoute path="/admin/algorithm-settings" component={AdminAlgorithmSettingsPage} />
      <ProtectedRoute path="/admin/ai-parameters" component={AdminAiParametersPage} />
      <ProtectedRoute path="/admin/acp-plus" component={AdminAcpPlusPage} />
      <ProtectedRoute path="/admin/voter-verification" component={AdminVoterVerificationPage} />
      <ProtectedRoute path="/admin/settings" component={AdminSettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />  
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function BetaBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="bg-amber-500 dark:bg-amber-600 text-white py-1 px-4 text-center text-xs sticky bottom-0 z-[100]">
      <div className="flex items-center justify-center gap-1.5 max-w-7xl mx-auto relative">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        <span>
          <strong>Beta Testing Mode:</strong> Data and users may be wiped when the final version is published. &copy; Copyright 2026
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-0 p-0.5 rounded hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const [location] = useLocation();
  const isMobile = location.startsWith('/mobile');
  
  useScrollLight();

  if (isMobile) {
    return (
      <>
        <Toaster />
        <MobileApp />
      </>
    );
  }

  return (
    <>
      <Toaster />
      <TwoFactorReminder />
      <ErrorBoundary>
        <Router />
      </ErrorBoundary>
      <BetaBanner />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="acp-ui-theme">
        <AuthProvider>
          <FloatingVideoProvider>
            <TooltipProvider>
              <AppContent />
            </TooltipProvider>
          </FloatingVideoProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
