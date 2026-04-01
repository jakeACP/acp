import { Switch, Route } from "wouter";
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
import { MobileMessagesPage } from "./pages/MobileMessagesPage";
import "../mobile/mobile-theme.css";

export function MobileApp() {
  return (
    <Switch>
      <Route path="/mobile" component={MobileSignalsPage} />
      <Route path="/mobile/signals" component={MobileSignalsPage} />
      <Route path="/mobile/signals/:id" component={SignalPlayerPage} />
      <Route path="/mobile/events" component={MobileEventsPage} />
      <Route path="/mobile/reps" component={MobileRepsPage} />
      <Route path="/mobile/messages" component={MobileMessagesPage} />
      <Route path="/mobile/signal-choice" component={SignalChoicePage} />
      <Route path="/mobile/create" component={SignalRecorderPage} />
      <Route path="/mobile/edit" component={SignalEditorPage} />
      <Route path="/mobile/groups" component={MobileGroupsPage} />
      <Route path="/mobile/friends" component={MobileFriendsPage} />
      <Route path="/mobile/profile/:userId" component={MobileUserProfilePage} />
      <Route path="/mobile/profile" component={MobileProfilePage} />
      <Route>
        <MobileSignalsPage />
      </Route>
    </Switch>
  );
}
