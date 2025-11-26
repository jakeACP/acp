import { Switch, Route } from "wouter";
import { MobileFeedPage } from "./pages/MobileFeedPage";
import { MobileSignalsPage } from "./pages/MobileSignalsPage";
import { MobileGroupsPage } from "./pages/MobileGroupsPage";
import { MobileProfilePage } from "./pages/MobileProfilePage";
import { MobileUserProfilePage } from "./pages/MobileUserProfilePage";
import { MobileFriendsPage } from "./pages/MobileFriendsPage";
import { SignalRecorderPage } from "./pages/SignalRecorderPage";
import MobileEventsPage from "./pages/MobileEventsPage";
import "../mobile/mobile-theme.css";

export function MobileApp() {
  return (
    <Switch>
      <Route path="/mobile" component={MobileFeedPage} />
      <Route path="/mobile/signals" component={MobileSignalsPage} />
      <Route path="/mobile/events" component={MobileEventsPage} />
      <Route path="/mobile/create" component={SignalRecorderPage} />
      <Route path="/mobile/groups" component={MobileGroupsPage} />
      <Route path="/mobile/friends" component={MobileFriendsPage} />
      <Route path="/mobile/profile/:userId" component={MobileUserProfilePage} />
      <Route path="/mobile/profile" component={MobileProfilePage} />
      <Route>
        <MobileFeedPage />
      </Route>
    </Switch>
  );
}
