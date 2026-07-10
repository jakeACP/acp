import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, Loader2, UserPlus, MessageCircle, Heart, BarChart2, Calendar, FileSignature, Mail, Shield, Bell } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

interface NotifPrefs {
  newFollower: boolean;
  newComment: boolean;
  newLike: boolean;
  newMessage: boolean;
  pollResults: boolean;
  eventReminder: boolean;
  petitionUpdate: boolean;
  weeklyDigest: boolean;
  systemAlerts: boolean;
}

const GROUPS: { title: string; items: { key: keyof NotifPrefs; icon: typeof Bell; label: string; sub: string }[] }[] = [
  {
    title: "Social",
    items: [
      { key: "newFollower",    icon: UserPlus,        label: "New follower",      sub: "When someone follows you" },
      { key: "newComment",     icon: MessageCircle,   label: "New comment",       sub: "On your posts and signals" },
      { key: "newLike",        icon: Heart,           label: "New like",          sub: "When someone likes your content" },
      { key: "newMessage",     icon: Mail,            label: "New message",       sub: "Direct messages and inbox" },
    ],
  },
  {
    title: "Civic",
    items: [
      { key: "pollResults",    icon: BarChart2,       label: "Poll results",      sub: "When a poll you voted in closes" },
      { key: "eventReminder",  icon: Calendar,        label: "Event reminders",   sub: "24h before events you've joined" },
      { key: "petitionUpdate", icon: FileSignature,   label: "Petition updates",  sub: "On petitions you've signed" },
    ],
  },
  {
    title: "Platform",
    items: [
      { key: "weeklyDigest",   icon: Mail,            label: "Weekly digest",     sub: "Summary of your activity" },
      { key: "systemAlerts",   icon: Shield,          label: "System alerts",     sub: "Important account notices" },
    ],
  },
];

export function MobileSettingsNotificationsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: prefs, isLoading } = useQuery<NotifPrefs>({
    queryKey: ["/api/user/notification-prefs"],
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<NotifPrefs>) => apiRequest("/api/user/notification-prefs", "PATCH", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/notification-prefs"] }),
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const defaults: NotifPrefs = {
    newFollower: true, newComment: true, newLike: true, newMessage: true,
    pollResults: true, eventReminder: true, petitionUpdate: true,
    weeklyDigest: true, systemAlerts: true,
  };

  const settings = prefs ?? defaults;

  const toggle = (key: keyof NotifPrefs) => mutation.mutate({ [key]: !settings[key] });

  const allOn = Object.values(settings).every(Boolean);
  const toggleAll = () => {
    const patch = Object.fromEntries(Object.keys(defaults).map(k => [k, !allOn])) as Partial<NotifPrefs>;
    mutation.mutate(patch);
  };

  return (
    <div className="mobile-root" data-testid="settings-notifications-page">
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={() => navigate("/mobile/settings")} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Notifications</h1>
        {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-white/40" />}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">

        {/* Toggle all */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">All notifications</p>
            <p className="text-white/40 text-xs mt-0.5">{allOn ? "All enabled" : "Some disabled"}</p>
          </div>
          <Switch checked={allOn} onCheckedChange={toggleAll} data-testid="toggle-all-notifs" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
        ) : (
          GROUPS.map((group) => (
            <div key={group.title} className="glass-card p-4 space-y-0.5">
              <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-3">{group.title}</p>
              {group.items.map(({ key, icon: Icon, label, sub }) => (
                <div key={key} className="flex items-center gap-3 py-2.5">
                  <Icon className="w-4 h-4 text-white/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{label}</p>
                    <p className="text-white/35 text-xs leading-tight">{sub}</p>
                  </div>
                  <Switch
                    checked={settings[key]}
                    onCheckedChange={() => toggle(key)}
                    data-testid={`toggle-notif-${key}`}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
