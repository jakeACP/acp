import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { FloatingVideoProvider } from "./contexts/floating-video-context";
import { FloatingVideoPlayer } from "./components/floating-video-player";
import { ProtectedRoute } from "./lib/protected-route";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import GroupsPage from "@/pages/groups-page";
import PollsPage from "@/pages/polls-page";
import CandidatesPage from "@/pages/candidates-page";
import CandidateProfilePage from "@/pages/candidate-profile-page";
import MessagesPage from "@/pages/messages-page";
import RepresentativesPage from "@/pages/representatives-page";
import SettingsPage from "@/pages/settings-page";
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
import AdminUserBansPage from "@/pages/admin-user-bans-page";
import AdminIpBlocksPage from "@/pages/admin-ip-blocks-page";
import AdminPoliticiansPage from "@/pages/admin-politicians-page";
import AdminSecurityPage from "@/pages/admin-security-page";
import AdminDatabasePage from "@/pages/admin-database-page";
import AdminAlgorithmPage from "@/pages/admin-algorithm-page";
import AdminAcpPlusPage from "@/pages/admin-acp-plus-page";
import AdminSettingsPage from "@/pages/admin-settings-page";
import NotFound from "@/pages/not-found";
import { AlertTriangle } from "lucide-react";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/groups" component={GroupsPage} />
      <ProtectedRoute path="/polls" component={PollsPage} />
      <ProtectedRoute path="/polls/:id" component={PollDetailPage} />
      <ProtectedRoute path="/candidates" component={CandidatesPage} />
      <ProtectedRoute path="/candidates/:id" component={CandidateProfilePage} />
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
      <ProtectedRoute path="/initiatives" component={InitiativesPage} />
      <ProtectedRoute path="/initiatives/new" component={InitiativeFormPage} />
      <ProtectedRoute path="/initiatives/edit/:id" component={InitiativeFormPage} />
      <ProtectedRoute path="/initiatives/:id" component={InitiativeDetailPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/profile/:userId" component={ProfilePage} />
      <ProtectedRoute path="/subscription" component={SubscriptionPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboardPage} />
      <ProtectedRoute path="/admin/moderation" component={AdminModerationPage} />
      <ProtectedRoute path="/admin/bans" component={AdminUserBansPage} />
      <ProtectedRoute path="/admin/ip-blocks" component={AdminIpBlocksPage} />
      <ProtectedRoute path="/admin/invitations" component={AdminInvitationsPage} />
      <ProtectedRoute path="/admin/representatives" component={AdminRepresentativesPage} />
      <ProtectedRoute path="/admin/politicians" component={AdminPoliticiansPage} />
      <ProtectedRoute path="/admin/security" component={AdminSecurityPage} />
      <ProtectedRoute path="/admin/database" component={AdminDatabasePage} />
      <ProtectedRoute path="/admin/algorithm" component={AdminAlgorithmPage} />
      <ProtectedRoute path="/admin/acp-plus" component={AdminAcpPlusPage} />
      <ProtectedRoute path="/admin/settings" component={AdminSettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />  
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function BetaBanner() {
  return (
    <div className="bg-amber-500 dark:bg-amber-600 text-white py-2 px-4 text-center text-sm font-medium sticky top-0 z-[100] shadow-md">
      <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <span>
          <strong>Beta Testing Mode:</strong> This app is currently in testing. All data and users will be wiped when the final version is published.
        </span>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="acp-ui-theme">
        <AuthProvider>
          <FloatingVideoProvider>
            <TooltipProvider>
              <BetaBanner />
              <Toaster />
              <Router />
              <FloatingVideoPlayer />
            </TooltipProvider>
          </FloatingVideoProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
