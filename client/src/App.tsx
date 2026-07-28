import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { FloatingVideoProvider } from "./contexts/floating-video-context";
import { ProtectedRoute } from "./lib/protected-route";
import { useScrollLight } from "./hooks/useScrollLight";
import { useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";
import { TwoFactorReminder } from "./components/two-factor-reminder";
import { ErrorBoundary } from "./components/error-boundary";
import { installNativeAppHandlers, isNativeApp, normalizeNativeInternalPath } from "./lib/native";

const MobileApp = lazy(() => import("./mobile/MobileApp").then(m => ({ default: m.MobileApp })));
const MobileAuthPage = lazy(() => import("./mobile/pages/MobileAuthPage").then(m => ({ default: m.MobileAuthPage })));

const HomePage = lazy(() => import("@/pages/home-page"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const GroupsPage = lazy(() => import("@/pages/groups-page"));
const PollsPage = lazy(() => import("@/pages/polls-page"));
const CandidatesPage = lazy(() => import("@/pages/candidates-page"));
const CandidateProfilePage = lazy(() => import("@/pages/candidate-profile-page"));
const ElectionsPage = lazy(() => import("@/pages/elections-page"));
const ElectionPositionsPage = lazy(() => import("@/pages/election-positions-page"));
const ElectionRacePage = lazy(() => import("@/pages/election-race-page"));
const PoliticianProfilePage = lazy(() => import("@/pages/politician-profile-page"));
const MessagesPage = lazy(() => import("@/pages/messages-page"));
const RepresentativesPage = lazy(() => import("@/pages/representatives-page"));
const SettingsPage = lazy(() => import("@/pages/settings-page"));
const PrivacySettingsPage = lazy(() => import("@/pages/privacy-settings-page"));
const EventsPage = lazy(() => import("@/pages/events-page"));
const FriendsPage = lazy(() => import("@/pages/friends-page"));
const UserFriendsPage = lazy(() => import("@/pages/user-friends-page"));
const PollDetailPage = lazy(() => import("@/pages/poll-detail-page"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password-page"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password-page"));
const CryptoDashboardPage = lazy(() => import("@/pages/crypto-dashboard-page"));
const ProfilePage = lazy(() => import("@/pages/profile-page"));
const CandidateEditProfilePage = lazy(() => import("@/pages/candidate-edit-profile-page"));
const CharitiesPage = lazy(() => import("@/pages/charities-page"));
const CharityDetailPage = lazy(() => import("@/pages/charity-detail-page"));
const BoycottsPage = lazy(() => import("@/pages/boycotts-page"));
const InitiativesPage = lazy(() => import("@/pages/InitiativesPage"));
const InitiativeFormPage = lazy(() => import("@/pages/InitiativeFormPage"));
const InitiativeDetailPage = lazy(() => import("@/pages/InitiativeDetailPage"));
const SubscriptionPage = lazy(() => import("@/pages/subscription-page"));
const LivePage = lazy(() => import("@/pages/LivePage").then(m => ({ default: m.LivePage })));
const SignalsPage = lazy(() => import("@/pages/signals-page"));
const SignalEditorPage = lazy(() => import("@/pages/signal-editor-page"));
const MyStreamsPage = lazy(() => import("@/pages/MyStreamsPage"));
const AdminInvitationsPage = lazy(() => import("@/pages/admin-invitations-page"));
const AdminRepresentativesPage = lazy(() => import("@/pages/admin-representatives-page"));
const AdminDashboardPage = lazy(() => import("@/pages/admin-dashboard-page"));
const AdminModerationPage = lazy(() => import("@/pages/admin-moderation-page"));
const AdminUsersPage = lazy(() => import("@/pages/admin-users-page"));
const AdminUserBansPage = lazy(() => import("@/pages/admin-user-bans-page"));
const AdminIpBlocksPage = lazy(() => import("@/pages/admin-ip-blocks-page"));
const AdminPoliticiansPage = lazy(() => import("@/pages/admin-politicians-page"));
const AdminPollsPage = lazy(() => import("@/pages/admin-polls-page"));
const AdminSecurityPage = lazy(() => import("@/pages/admin-security-page"));
const AdminDatabasePage = lazy(() => import("@/pages/admin-database-page"));
const AdminAlgorithmPage = lazy(() => import("@/pages/admin-algorithm-page"));
const AdminAiParametersPage = lazy(() => import("@/pages/admin-ai-parameters-page"));
const AdminAcpPlusPage = lazy(() => import("@/pages/admin-acp-plus-page"));
const AdminSettingsPage = lazy(() => import("@/pages/admin-settings-page"));
const AdminVoterVerificationPage = lazy(() => import("@/pages/admin-voter-verification-page"));
const AdminSigsPage = lazy(() => import("@/pages/admin-sigs-page"));
const AdminStateDataPage = lazy(() => import("@/pages/admin-state-data-page"));
const AdminImportExportPage = lazy(() => import("@/pages/admin-import-export-page"));
const AdminTradingFlagsPage = lazy(() => import("@/pages/admin-trading-flags-page"));
const AdminAcePledgesPage = lazy(() => import("@/pages/admin-ace-pledges-page"));
const AdminPledgeRequestsPage = lazy(() => import("@/pages/admin-pledge-requests-page"));
const AdminScannerPage = lazy(() => import("@/pages/admin-scanner-page"));
const AdminAgenticAiPage = lazy(() => import("@/pages/admin-agentic-ai-page"));
const BudgetSimulatorPage = lazy(() => import("@/pages/budget-simulator-page"));
const AdminBudgetBaselinesPage = lazy(() => import("@/pages/admin-budget-baselines-page"));
const AdminDistrictsPage = lazy(() => import("@/pages/admin-districts-page"));
const AdminDistrictFormPage = lazy(() => import("@/pages/admin-district-form-page"));
const AdminDistrictDetailPage = lazy(() => import("@/pages/admin-district-detail-page"));
const SigsDirectoryPage = lazy(() => import("@/pages/sigs-directory-page"));
const SigProfilePage = lazy(() => import("@/pages/sig-profile-page"));
const PartiesPage = lazy(() => import("@/pages/parties-page"));
const PartyProfilePage = lazy(() => import("@/pages/party-profile-page"));
const AdminPartiesPage = lazy(() => import("@/pages/admin-parties-page"));
const WhistleblowingPage = lazy(() => import("@/pages/whistleblowing-page"));
const PoliticalCompassPage = lazy(() => import("@/pages/political-compass"));
const CreateArticlePage = lazy(() => import("@/pages/create-article-page"));
const ArticlePage = lazy(() => import("@/pages/article-page"));
const PublicLandingPage = lazy(() => import("@/pages/public-landing-page"));
const PublicArticlePage = lazy(() => import("@/pages/public-article-page"));
const PublicPostPage = lazy(() => import("@/pages/public-post-page"));
const PublicSignalPage = lazy(() => import("@/pages/public-signal-page"));
const DeveloperPage = lazy(() => import("@/pages/developer-page"));
const RunForOfficePage = lazy(() => import("@/pages/run-for-office-page"));
const IssuesPage = lazy(() => import("@/pages/issues-page"));
const TermsOfServicePage = lazy(() => import("@/pages/terms-of-service-page"));
const AdminEmailTemplatesPage = lazy(() => import("@/pages/admin-email-templates-page"));
const CanvassingMapPage = lazy(() => import("@/pages/canvassing-map-page"));
const CanvassingContactsPage = lazy(() => import("@/pages/canvassing-contacts-page"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
    </div>
  );
}

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
    return <PageLoader />;
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
    return <PageLoader />;
  }
  
  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicLandingPage />
      </Suspense>
    );
  }
  
  return (
    <Suspense fallback={<PageLoader />}>
      <HomePage />
    </Suspense>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={HomeRoute} />
        <Route path="/news" component={PublicLandingPage} />
        <Route path="/terms" component={TermsOfServicePage} />
        <Route path="/read/:id" component={PublicArticlePage} />
        <Route path="/posts/:id" component={PublicPostPage} />
        <Route path="/signals/:id" component={PublicSignalPage} />
        <ProtectedRoute path="/groups" component={GroupsPage} />
        <ProtectedRoute path="/polls" component={PollsPage} />
        <ProtectedRoute path="/polls/:id" component={PollDetailPage} />
        <Route path="/elections" component={ElectionsPage} />
        <ProtectedRoute path="/elections/positions" component={ElectionPositionsPage} />
        <ProtectedRoute path="/elections/race" component={ElectionRacePage} />
        <ProtectedRoute path="/candidates" component={CandidatesPage} />
        <ProtectedRoute path="/candidates/:id" component={CandidateProfilePage} />
        <ProtectedRoute path="/politicians/handle/:handle" component={PoliticianHandleRedirect} />
        <Route path="/politicians/:id" component={PoliticianProfilePage} />
        <ProtectedRoute path="/representatives" component={RepresentativesPage} />
        <ProtectedRoute path="/events" component={EventsPage} />
        <ProtectedRoute path="/signals/edit" component={SignalEditorPage} />
        <ProtectedRoute path="/signals" component={SignalsPage} />
        <ProtectedRoute path="/live" component={LivePage} />
        <ProtectedRoute path="/my-streams" component={MyStreamsPage} />
        <ProtectedRoute path="/friends" component={FriendsPage} />
        <Route path="/profile/:userId/friends" component={UserFriendsPage} />
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
        <ProtectedRoute path="/run-for-office" component={RunForOfficePage} />
        <ProtectedRoute path="/issues" component={IssuesPage} />
        <ProtectedRoute path="/political-profile" component={CandidateEditProfilePage} />
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
        <Route path="/lobbies" component={SigsDirectoryPage} />
        <Route path="/lobbies/:tag" component={SigProfilePage} />
        <Route path="/sigs">{() => { window.location.replace("/lobbies"); return null; }}</Route>
        <Route path="/sigs/:tag">{(params) => { window.location.replace(`/lobbies/${params.tag}`); return null; }}</Route>
        <Route path="/parties" component={PartiesPage} />
        <Route path="/parties/:partyId" component={PartyProfilePage} />
        <ProtectedRoute path="/admin/sigs" component={AdminSigsPage} />
        <ProtectedRoute path="/admin/parties" component={AdminPartiesPage} />
        <ProtectedRoute path="/admin/state-data" component={AdminStateDataPage} />
        <ProtectedRoute path="/admin/import-export" component={AdminImportExportPage} />
        <ProtectedRoute path="/admin/trading-flags" component={AdminTradingFlagsPage} />
        <ProtectedRoute path="/admin/ace-pledges" component={AdminAcePledgesPage} />
        <ProtectedRoute path="/admin/scanner" component={AdminScannerPage} />
        <ProtectedRoute path="/admin/agentic-ai" component={AdminAgenticAiPage} />
        <ProtectedRoute path="/admin/polls" component={AdminPollsPage} />
        <ProtectedRoute path="/admin/security" component={AdminSecurityPage} />
        <ProtectedRoute path="/admin/database" component={AdminDatabasePage} />
        <ProtectedRoute path="/admin/algorithm" component={AdminAlgorithmPage} />
        <ProtectedRoute path="/admin/ai-parameters" component={AdminAiParametersPage} />
        <ProtectedRoute path="/admin/acp-plus" component={AdminAcpPlusPage} />
        <ProtectedRoute path="/admin/voter-verification" component={AdminVoterVerificationPage} />
        <ProtectedRoute path="/admin/settings" component={AdminSettingsPage} />
        <ProtectedRoute path="/admin/email-templates" component={AdminEmailTemplatesPage} />
        <ProtectedRoute path="/admin/pledge-requests" component={AdminPledgeRequestsPage} />
        <ProtectedRoute path="/budget-simulator" component={BudgetSimulatorPage} />
        <ProtectedRoute path="/admin/budget-baselines" component={AdminBudgetBaselinesPage} />
        <ProtectedRoute path="/admin/districts" component={AdminDistrictsPage} />
        <ProtectedRoute path="/admin/districts/new" component={AdminDistrictFormPage} />
        <ProtectedRoute path="/admin/districts/:districtId/edit" component={AdminDistrictFormPage} />
        <ProtectedRoute path="/admin/districts/:districtId" component={AdminDistrictDetailPage} />
        <ProtectedRoute path="/canvassing" component={CanvassingMapPage} />
        <ProtectedRoute path="/canvassing/contacts" component={CanvassingContactsPage} />
        <Route path="/political-compass" component={PoliticalCompassPage} />
        <Route path="/developer" component={DeveloperPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />  
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}


function AppContent() {
  const [location, navigate] = useLocation();
  const isMobile = location.startsWith('/mobile');
  const isNativeAuth = isNativeApp() && location.startsWith('/auth');
  
  useScrollLight();

  useEffect(() => installNativeAppHandlers(navigate), [navigate]);

  useEffect(() => {
    if (isNativeApp()) {
      import("./mobile/services/native").then(m => m.initNativeApp()).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isNativeApp()) {
      const nativePath = normalizeNativeInternalPath(location);
      if (nativePath !== location) {
        navigate(nativePath, { replace: true });
      }
    }
  }, [location, navigate]);

  if (isMobile) {
    return (
      <>
        <Toaster />
        <Suspense fallback={<PageLoader />}>
          <MobileApp />
        </Suspense>
      </>
    );
  }

  if (isNativeAuth) {
    return (
      <>
        <Toaster />
        <Suspense fallback={<PageLoader />}>
          <MobileAuthPage />
        </Suspense>
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
