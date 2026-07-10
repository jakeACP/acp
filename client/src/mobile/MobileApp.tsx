import { Switch, Route, Redirect } from "wouter";
import { MobileFeedPage } from "./pages/MobileFeedPage";
import { MobileSignalsPage } from "./pages/MobileSignalsPage";
import { MobileGroupsPage } from "./pages/MobileGroupsPage";
import { MobileProfilePage } from "./pages/MobileProfilePage";
import { MobileUserProfilePage } from "./pages/MobileUserProfilePage";
import { MobileFriendsPage } from "./pages/MobileFriendsPage";
import { SignalRecorderPage } from "./pages/SignalRecorderPage";
import { SignalEditorPage } from "./pages/SignalEditorPage";
import { SignalChoicePage } from "./pages/SignalChoicePage";
import { SignalPlayerPage } from "./pages/SignalPlayerPage";
import MobileEventsPage from "./pages/MobileEventsPage";
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
      {/* Home — Signals/Feed */}
      <Route path="/mobile" component={MobileSignalsPage} />
      <Route path="/mobile/signals" component={MobileSignalsPage} />
      <Route path="/mobile/signals/:id" component={SignalPlayerPage} />

      {/* Civic Hub and sub-pages */}
      <Route path="/mobile/civic" component={MobileCivicHubPage} />
      <Route path="/mobile/civic/elections" component={MobileElectionsPage} />
      <Route path="/mobile/civic/petitions" component={MobilePetitionsPage} />
      <Route path="/mobile/civic/initiatives" component={MobileInitiativesPage} />
      <Route path="/mobile/civic/issues" component={MobileIssuesPage} />
      <Route path="/mobile/civic/run" component={MobileRunForOfficePage} />
      <Route path="/mobile/civic/whistleblower" component={MobileWhistleblowerPage} />
      <Route path="/mobile/civic/charities" component={MobileCharitiesPage} />
      <Route path="/mobile/civic/boycotts" component={MobileCharitiesPage} />

      {/* Retained pages (accessible via Civic Hub tiles) */}
      <Route path="/mobile/reps" component={MobileRepsPage} />
      <Route path="/mobile/events" component={MobileEventsPage} />

      {/* Create */}
      <Route path="/mobile/create" component={SignalRecorderPage} />
      <Route path="/mobile/signal-choice" component={SignalChoicePage} />
      <Route path="/mobile/edit" component={SignalEditorPage} />

      {/* Inbox */}
      <Route path="/mobile/messages" component={MobileMessagesPage} />

      {/* Profile */}
      <Route path="/mobile/profile" component={MobileProfilePage} />
      <Route path="/mobile/profile/:userId" component={MobileUserProfilePage} />

      {/* Legacy / kept for deep links */}
      <Route path="/mobile/groups" component={MobileGroupsPage} />
      <Route path="/mobile/friends" component={MobileFriendsPage} />
      <Route path="/mobile/lobbies" component={MobileLobbiesPage} />

      {/* Fallback */}
      <Route>
        <MobileSignalsPage />
      </Route>
    </Switch>
  );
}
