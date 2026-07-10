import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Edit3, Grid, Heart, Bookmark, Crown, User as UserIcon, SlidersHorizontal, Shield,
  Sun, Moon, Flag, LogOut, ChevronRight, ShieldCheck, Eye, Lock, ExternalLink,
  Users, FileText, BarChart3, Users2, Calendar, Building2, Bot, Radar, Cpu,
  Mail, MapPin, Database, BadgeCheck, Map, SlidersHorizontal as Sliders,
} from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import type { SignalWithAuthor } from "@shared/schema";

type ProfileTab = "personal" | "settings" | "admin";

function isAdminRole(role?: string | null) {
  return role === "admin" || role === "state_admin" || role === "moderator";
}

function PersonalTab({ signals }: { signals: SignalWithAuthor[] }) {
  const { user } = useAuth();
  const isPremium = user?.subscriptionStatus === "premium";

  return (
    <>
      <div className="glass-card p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </span>
              )}
            </div>
            {isPremium && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center border-2 border-gray-900">
                <Crown className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-xl truncate">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username}
              </h2>
              {isPremium && (
                <span className="text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded">ACP+</span>
              )}
            </div>
            <p className="text-white/60 text-sm">@{user?.username}</p>

            <div className="flex gap-4 mt-3">
              <div className="text-center">
                <p className="text-white font-bold">{signals.length}</p>
                <p className="text-white/60 text-xs">Signals</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">0</p>
                <p className="text-white/60 text-xs">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">0</p>
                <p className="text-white/60 text-xs">Following</p>
              </div>
            </div>
          </div>
        </div>

        {user?.bio && <p className="text-white/80 text-sm mt-4">{user.bio}</p>}

        <div className="flex gap-2 mt-4">
          <Link href="/mobile/profile/edit" className="flex-1">
            <button className="glass-button w-full text-sm">
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          </Link>
          <Link href="/profile">
            <button className="glass-button px-4 text-sm">
              <ExternalLink className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>

      <div className="flex border-b border-white/10 mb-4">
        <button className="flex-1 flex items-center justify-center gap-2 py-3 text-white border-b-2 border-red-500">
          <Grid className="w-5 h-5" />
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 text-white/50">
          <Heart className="w-5 h-5" />
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 text-white/50">
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {signals.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-white/60">
            <p>No signals yet</p>
            <Link href="/mobile/create">
              <button className="glass-button primary mt-4">Create Your First Signal</button>
            </Link>
          </div>
        ) : (
          signals.map((signal) => (
            <Link key={signal.id} href={`/mobile/signals/${signal.id}`}>
              <div className="aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden" data-testid={`profile-signal-${signal.id}`}>
                {signal.thumbnailUrl ? (
                  <img src={signal.thumbnailUrl} alt={signal.title || "Signal"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-900 to-blue-900" />
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}

function SettingsTab() {
  const { user, logoutMutation } = useAuth();
  const { actualTheme, setTheme } = useTheme();
  const { toast } = useToast();

  const { data: verification } = useQuery<{ status?: string } | null>({
    queryKey: ["/api/voter-verification/me"],
    retry: false,
  });

  const [discoverablePhone, setDiscoverablePhone] = useState(!!user?.discoverableByPhone);
  const [discoverableEmail, setDiscoverableEmail] = useState(!!user?.discoverableByEmail);

  const discoverabilityMutation = useMutation({
    mutationFn: async (next: { phone: boolean; email: boolean }) => {
      await apiRequest("/api/user/discoverability", "PATCH", {
        phoneNumber: user?.phoneNumber || "",
        discoverableByPhone: next.phone,
        discoverableByEmail: next.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Privacy updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    },
  });

  const themes: { id: "light" | "dark" | "patriot"; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "patriot", label: "Patriot", icon: Flag },
  ];

  const verificationStatus = verification?.status;

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" /> Appearance
        </p>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => {
            const Icon = t.icon;
            const active = actualTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  toast({ title: `${t.label} theme`, duration: 1200 });
                }}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors ${
                  active ? "bg-white/20 border-white/40 text-white" : "bg-white/5 border-white/10 text-white/60"
                }`}
                data-testid={`theme-${t.id}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-4">
        <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4" /> Privacy & Discoverability
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <p className="text-sm text-white">Discoverable by phone</p>
              <p className="text-xs text-white/50">Let friends find you via your phone number</p>
            </div>
            <Switch
              checked={discoverablePhone}
              onCheckedChange={(v) => {
                setDiscoverablePhone(v);
                discoverabilityMutation.mutate({ phone: v, email: discoverableEmail });
              }}
              data-testid="switch-discoverable-phone"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <p className="text-sm text-white">Discoverable by email</p>
              <p className="text-xs text-white/50">Let friends find you via your email</p>
            </div>
            <Switch
              checked={discoverableEmail}
              onCheckedChange={(v) => {
                setDiscoverableEmail(v);
                discoverabilityMutation.mutate({ phone: discoverablePhone, email: v });
              }}
              data-testid="switch-discoverable-email"
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Account
        </p>
        <div className="space-y-1">
          <Link href="/settings">
            <div className="flex items-center gap-3 py-2.5 active:opacity-70">
              <ShieldCheck className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white flex-1">Voter Verification</span>
              {verificationStatus && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    verificationStatus === "approved"
                      ? "bg-green-500/20 text-green-400"
                      : verificationStatus === "pending"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {verificationStatus}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-white/30" />
            </div>
          </Link>
          <Link href="/settings">
            <div className="flex items-center gap-3 py-2.5 active:opacity-70">
              <Lock className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white flex-1">Password & Security (2FA)</span>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </div>
          </Link>
          <Link href="/settings">
            <div className="flex items-center gap-3 py-2.5 active:opacity-70">
              <SlidersHorizontal className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white flex-1">All Settings</span>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </div>
          </Link>
        </div>
      </div>

      <button
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
        className="w-full glass-card p-4 flex items-center justify-center gap-2 text-red-400 font-semibold text-sm active:opacity-70"
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4" />
        {logoutMutation.isPending ? "Logging out..." : "Log Out"}
      </button>
    </div>
  );
}

interface AdminAnalytics {
  userCount?: number;
  postCount?: number;
  pollCount?: number;
  groupCount?: number;
  eventCount?: number;
  charityCount?: number;
}

function AdminTab() {
  const { data: analytics, isLoading } = useQuery<AdminAnalytics>({
    queryKey: ["/api/admin/analytics"],
    retry: false,
  });

  const stats = [
    { label: "Users", value: analytics?.userCount ?? 0, icon: Users },
    { label: "Posts", value: analytics?.postCount ?? 0, icon: FileText },
    { label: "Polls", value: analytics?.pollCount ?? 0, icon: BarChart3 },
    { label: "Groups", value: analytics?.groupCount ?? 0, icon: Users2 },
    { label: "Events", value: analytics?.eventCount ?? 0, icon: Calendar },
    { label: "Charities", value: analytics?.charityCount ?? 0, icon: Heart },
  ];

  const sections: { title: string; items: { name: string; href: string; icon: typeof Users }[] }[] = [
    {
      title: "Moderation",
      items: [
        { name: "Flags", href: "/admin/moderation", icon: Flag },
        { name: "Security", href: "/admin/security", icon: Lock },
        { name: "Trading Flags", href: "/admin/trading-flags", icon: Flag },
      ],
    },
    {
      title: "Content & People",
      items: [
        { name: "Users", href: "/admin/users", icon: UserIcon },
        { name: "Politicians", href: "/admin/politicians", icon: Users },
        { name: "Lobbies", href: "/admin/sigs", icon: Building2 },
        { name: "Parties", href: "/admin/parties", icon: Flag },
        { name: "ACE Pledges", href: "/admin/ace-pledges", icon: BadgeCheck },
        { name: "State Data", href: "/admin/state-data", icon: MapPin },
        { name: "Budget Baselines", href: "/admin/budget-baselines", icon: Database },
        { name: "Districts", href: "/admin/districts", icon: Map },
      ],
    },
    {
      title: "Automation",
      items: [
        { name: "Algorithm", href: "/admin/algorithm", icon: Cpu },
        { name: "AI Writer", href: "/admin/ai-parameters", icon: Cpu },
        { name: "News Scanner", href: "/admin/scanner", icon: Radar },
        { name: "Agent API", href: "/admin/agentic-ai", icon: Bot },
      ],
    },
    {
      title: "System",
      items: [
        { name: "Defaults", href: "/admin/settings", icon: Sliders },
        { name: "Email Templates", href: "/admin/email-templates", icon: Mail },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <Link href="/admin/dashboard">
        <div className="glass-card p-4 flex items-center gap-3 active:opacity-80 border border-white/15">
          <div className="w-10 h-10 rounded-full bg-[#3C3B6E] flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Admin Dashboard</p>
            <p className="text-xs text-white/50">Full analytics & platform insights</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </div>
      </Link>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass-card p-3 text-center">
              <Icon className="w-4 h-4 text-white/50 mx-auto mb-1" />
              <p className="text-white font-bold text-lg leading-none">
                {isLoading ? "–" : s.value.toLocaleString()}
              </p>
              <p className="text-white/50 text-[10px] mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {sections.map((section) => (
        <div key={section.title} className="glass-card p-4">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2">{section.title}</p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <div className="flex items-center gap-3 py-2.5 active:opacity-70" data-testid={`admin-link-${item.name.toLowerCase().replace(/\s/g, "-")}`}>
                    <Icon className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white flex-1">{item.name}</span>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MobileProfilePage() {
  useScrollLight();
  const { user } = useAuth();
  const [tab, setTab] = useState<ProfileTab>("personal");

  const { data: signals = [] } = useQuery<SignalWithAuthor[]>({
    queryKey: ["/api/mobile/signals/user", user?.id],
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const { data: globalAdmin } = useQuery<{ isGlobalAdmin?: boolean }>({
    queryKey: ["/api/admin/is-global-admin"],
    retry: false,
  });

  const showAdmin = isAdminRole(user?.role) || !!globalAdmin?.isGlobalAdmin;

  const tabs: { id: ProfileTab; label: string; icon: typeof UserIcon }[] = [
    { id: "personal", label: "Profile", icon: UserIcon },
    { id: "settings", label: "Settings", icon: SlidersHorizontal },
    ...(showAdmin ? [{ id: "admin" as ProfileTab, label: "Admin", icon: Shield }] : []),
  ];

  return (
    <div className="mobile-root" data-testid="mobile-profile-page">
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-white font-bold text-2xl">Profile</h1>
        <div className="flex gap-2 mt-3">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
                  tab === t.id
                    ? "bg-white/20 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-white/60"
                }`}
                data-testid={`profile-tab-${t.id}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-28">
        {tab === "personal" && <PersonalTab signals={signals} />}
        {tab === "settings" && <SettingsTab />}
        {tab === "admin" && showAdmin && <AdminTab />}
      </div>

      <MobileBottomNav />
    </div>
  );
}
