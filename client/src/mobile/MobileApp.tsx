import { Switch, Route, Redirect } from "wouter";
import { MobileFeedPage } from "./pages/MobileFeedPage";
import { MobileSignalsPage } from "./pages/MobileSignalsPage";
import { MobileGroupsPage } from "./pages/MobileGroupsPage";
import { MobileGroupDetailPage } from "./pages/MobileGroupDetailPage";
import { MobileProfilePage } from "./pages/MobileProfilePage";
import { MobileProfileEditPage } from "./pages/MobileProfileEditPage";
import { MobileSettingsPage } from "./pages/MobileSettingsPage";
import { MobileUserProfilePage } from "./pages/MobileUserProfilePage";
import { MobileFriendsPage } from "./pages/MobileFriendsPage";
import { SignalRecorderPage } from "./pages/SignalRecorderPage";
import { SignalEditorPage } from "./pages/SignalEditorPage";
import { SignalChoicePage } from "./pages/SignalChoicePage";
import { MobileComposePage } from "./pages/MobileComposePage";
import { SignalPlayerPage } from "./pages/SignalPlayerPage";
import MobileEventsPage from "./pages/MobileEventsPage";
import { MobileEventDetailPage } from "./pages/MobileEventDetailPage";
import { MobilePostDetailPage } from "./pages/MobilePostDetailPage";
import { MobilePetitionSignPage } from "./pages/MobilePetitionSignPage";
import { MobilePoliticianDetailPage } from "./pages/MobilePoliticianDetailPage";
import { MobileRepsPage } from "./pages/MobileRepsPage";
import { MobileLobbiesPage } from "./pages/MobileLobbiesPage";
import { MobileMessagesPage } from "./pages/MobileMessagesPage";
import { MobileCivicHubPage } from "./pages/MobileCivicHubPage";
import { MobileElectionsPage } from "./pages/MobileElectionsPage";
import { MobilePetitionsPage } from "./pages/MobilePetitionsPage";
import { MobileInitiativesPage } from "./pages/MobileInitiativesPage";
import { MobileIssuesPage } from "./pages/MobileIssuesPage";
import { MobileRunForOfficePage } from "./pages/MobileRunForOfficePage";
import { MobileWhistleblowerPage } from "./pages/MobileWhistleblowerPage";
import { MobileCharitiesPage } from "./pages/MobileCharitiesPage";
import { MobileSavedCivicPage } from "./pages/MobileSavedCivicPage";
import { MobileNotFoundPage } from "./pages/MobileNotFoundPage";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import "../mobile/mobile-theme.css";

export function MobileApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <Switch>
      {/* ── Home — Signals / Feed ─────────────────────────────────────── */}
      <Route path="/mobile"           component={MobileSignalsPage} />
      <Route path="/mobile/signals"   component={MobileSignalsPage} />
      <Route path="/mobile/signals/:id" component={SignalPlayerPage} />

      {/* ── Civic Hub and sub-pages ──────────────────────────────────── */}
      <Route path="/mobile/civic"                         component={MobileCivicHubPage} />
      <Route path="/mobile/civic/elections"               component={MobileElectionsPage} />
      <Route path="/mobile/civic/petitions"               component={MobilePetitionsPage} />
      <Route path="/mobile/civic/initiatives"             component={MobileInitiativesPage} />
      <Route path="/mobile/civic/issues"                  component={MobileIssuesPage} />
      <Route path="/mobile/civic/run"                     component={MobileRunForOfficePage} />
      <Route path="/mobile/civic/whistleblower"           component={MobileWhistleblowerPage} />
      <Route path="/mobile/civic/charities"               component={MobileCharitiesPage} />
      <Route path="/mobile/civic/boycotts"                component={MobileCharitiesPage} />
      <Route path="/mobile/civic/saved"                   component={MobileSavedCivicPage} />
      {/* Politician detail — must be AFTER the static civic/* routes */}
      <Route path="/mobile/civic/politician/:id"          component={MobilePoliticianDetailPage} />

      {/* ── Posts ────────────────────────────────────────────────────── */}
      <Route path="/mobile/posts/:id" component={MobilePostDetailPage} />

      {/* ── Events ───────────────────────────────────────────────────── */}
      <Route path="/mobile/events"      component={MobileEventsPage} />
      <Route path="/mobile/events/:id"  component={MobileEventDetailPage} />

      {/* ── Petitions ────────────────────────────────────────────────── */}
      {/* Specific sub-path must come before :id catch-all */}
      <Route path="/mobile/petitions/:id/sign" component={MobilePetitionSignPage} />

      {/* ── Groups ───────────────────────────────────────────────────── */}
      <Route path="/mobile/groups"      component={MobileGroupsPage} />
      <Route path="/mobile/groups/:id"  component={MobileGroupDetailPage} />

      {/* ── Create — unified composer + signal sub-flow ──────────────── */}
      <Route path="/mobile/create"           component={MobileComposePage} />
      <Route path="/mobile/signal-choice"    component={SignalChoicePage} />
      <Route path="/mobile/signals/record"   component={SignalRecorderPage} />
      <Route path="/mobile/edit"             component={SignalEditorPage} />

      {/* ── Inbox ────────────────────────────────────────────────────── */}
      <Route path="/mobile/messages" component={MobileMessagesPage} />

      {/* ── Profile — IMPORTANT: static paths must come before :userId ─ */}
      <Route path="/mobile/profile/edit" component={MobileProfileEditPage} />
      <Route path="/mobile/settings"     component={MobileSettingsPage} />
      <Route path="/mobile/profile"      component={MobileProfilePage} />
      <Route path="/mobile/profile/:userId" component={MobileUserProfilePage} />

      {/* ── Legacy / deep-link retained pages ───────────────────────── */}
      <Route path="/mobile/friends"  component={MobileFriendsPage} />
      <Route path="/mobile/reps"     component={MobileRepsPage} />
      <Route path="/mobile/lobbies"  component={MobileLobbiesPage} />
      <Route path="/mobile/feed"     component={MobileFeedPage} />

      {/* ── Mobile 404 — helpful in-app fallback ─────────────────────── */}
      <Route component={MobileNotFoundPage} />
    </Switch>
  );
}
