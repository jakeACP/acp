import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
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
import PollDetailPage from "@/pages/poll-detail-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import NotFound from "@/pages/not-found";

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
      <ProtectedRoute path="/messages" component={MessagesPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />  
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
