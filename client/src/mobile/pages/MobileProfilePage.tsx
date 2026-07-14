import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useScrollLight } from "../hooks/useScrollLight";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { MobileAvatarPicker } from "../components/MobileAvatarPicker";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Edit3, Grid, Heart, Bookmark, Crown, Settings, Shield,
  ChevronRight, MapPin, Globe, FileText, BarChart3, Users2,
  Calendar, Building2, Bot, Radar, Cpu, Mail, Database,
  Map, SlidersHorizontal as Sliders, Flag, Lock, BadgeCheck,
  UserCheck, Users, Loader2,
} from "lucide-react";
import { Link } from "wouter";
import type { SignalWithAuthor } from "@shared/schema";
import "../mobile-theme.css";

function isAdminRole(role?: string | null) {
  return role === "admin" || role === "state_admin" || role === "moderator";
}

type ContentTab = "signals" | "posts" | "liked" | "saved";

function StatPill({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
      <span className="text-white font-bold text-lg leading-none">{value}</span>
      <span className="text-white/50 text-[11px]">{label}</span>
    </div>
  );
}

function SettingsRow({ href, icon: Icon, label, badge }: { href: string; icon: typeof Shield; label: string; badge?: string }) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 py-2.5 active:opacity-70 cursor-pointer">
        <Icon className="w-4 h-4 text-white/55 flex-shrink-0" />
        <span className="text-sm text-white flex-1">{label}</span>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
            badge === "approved" ? "bg-green-500/20 text-green-400"
            : badge === "pending" ? "bg-yellow-500/20 text-yellow-400"
            : "bg-red-500/20 text-red-400"
          }`}>{badge}</span>
        )}
        <ChevronRight className="w-4 h-4 text-white/25" />
      </div>
    </Link>
  );
}

interface CivicScorecard {
  postCount: number;
  followerCount: number;
  followingCount: number;
  trustGrade: string;
  engagementGrade: string;
}

export function MobileProfilePage() {
  useScrollLight();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [contentTab, setContentTab] = useState<ContentTab>("signals");

  const { data: signals = [] } = useQuery<SignalWithAuthor[]>({
    queryKey: ["/api/mobile/signals/user", user?.id],
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const { data: scorecard } = useQuery<CivicScorecard>({
    queryKey: ["/api/profile", user?.id, "scorecard"],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${user!.id}/activity-stats`, { credentials: "include" });
      if (!res.ok) return { postCount: 0, followerCount: 0, followingCount: 0, trustGrade: "N/A", engagementGrade: "N/A" };
      const data = await res.json();
      return {
        postCount: data.postsCount ?? 0,
        followerCount: 0,
        followingCount: 0,
        trustGrade: "N/A",
        engagementGrade: "N/A",
      };
    },
    enabled: !!user?.id,
    staleTime: 120000,
  });

  const { data: followerData } = useQuery<{ count: number }>({
    queryKey: ["/api/user/friends/count"],
    staleTime: 120000,
  });

  const { data: globalAdmin } = useQuery<{ isGlobalAdmin?: boolean }>({
    queryKey: ["/api/admin/is-global-admin"],
    retry: false,
  });

  const { data: posts = [] } = useQuery<any[]>({
    queryKey: ["/api/posts/user", user?.id],
    queryFn: () => fetch(`/api/posts/user/${user?.id}?limit=30`, { credentials: "include" }).then(r => r.json()),
    enabled: !!user?.id && contentTab === "posts",
    staleTime: 60000,
  });

  const { data: verification } = useQuery<{ status?: string } | null>({
    queryKey: ["/api/voter-verification/me"],
    retry: false,
  });

  const showAdmin = isAdminRole(user?.role) || !!globalAdmin?.isGlobalAdmin;
  const isPremium = user?.subscriptionStatus === "premium";
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.username ?? "";

  const adminSections = [
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
        { name: "Users", href: "/admin/users", icon: Users },
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

  const contentTabs: { id: ContentTab; icon: typeof Grid }[] = [
    { id: "signals", icon: Grid },
    { id: "posts", icon: FileText },
    { id: "liked", icon: Heart },
    { id: "saved", icon: Bookmark },
  ];

  return (
    <div className="mobile-root" data-testid="mobile-profile-page">
      {/* Header */}
      <div className="glass-top-bar">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-xl">Profile</h1>
          <div className="flex items-center gap-2">
            {showAdmin && (
              <Link href="/admin/dashboard">
                <button className="notification-button" data-testid="admin-dashboard-link">
                  <Shield className="w-5 h-5 text-white" />
                </button>
              </Link>
            )}
            <Link href="/mobile/settings">
              <button className="notification-button" data-testid="profile-settings-btn">
                <Settings className="w-5 h-5 text-white" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-28">
        {/* Profile card */}
        <div className="glass-card p-5 mb-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <MobileAvatarPicker avatar={user?.avatar} username={user?.username} />
              {isPremium && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center border-2 border-gray-900">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              )}
              {verification?.status === "approved" && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-gray-900">
                  <UserCheck className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Name & stats */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-white font-bold text-xl leading-tight truncate">{displayName}</h2>
                {isPremium && (
                  <span className="text-[10px] bg-yellow-500 text-black font-bold px-2 py-0.5 rounded flex-shrink-0">ACP+</span>
                )}
              </div>
              <p className="text-white/50 text-sm">@{user?.username}</p>
              {(user as any)?.location && (
                <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{(user as any).location}
                </p>
              )}

              <div className="flex gap-4 mt-3">
                <StatPill value={scorecard?.postCount ?? 0} label="Posts" />
                <StatPill value={followerData?.count ?? 0} label="Friends" />
                <StatPill value={signals.length} label="Signals" />
              </div>
            </div>
          </div>

          {(user as any)?.bio && (
            <p className="text-white/75 text-sm mt-4 leading-relaxed">{(user as any).bio}</p>
          )}

          {(user as any)?.website && (
            <a href={(user as any).website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-400 text-xs mt-2">
              <Globe className="w-3 h-3" />{(user as any).website.replace(/^https?:\/\//, "")}
            </a>
          )}

          <div className="flex gap-2 mt-4">
            <Link href="/mobile/profile/edit" className="flex-1">
              <button className="glass-button w-full text-sm" data-testid="edit-profile-btn">
                <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
              </button>
            </Link>
            <Link href="/mobile/settings">
              <button className="glass-button px-3.5 text-sm" data-testid="settings-btn">
                <Settings className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Content tabs */}
        <div className="flex border-b mb-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {contentTabs.map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => setContentTab(id)}
              className={`flex-1 flex items-center justify-center py-3 transition-colors ${
                contentTab === id ? "text-white border-b-2 border-red-500" : "text-white/35"
              }`}
              data-testid={`content-tab-${id}`}>
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>

        {/* Content: Signals */}
        {contentTab === "signals" && (
          <div className="grid grid-cols-3 gap-1">
            {signals.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-white/40 space-y-3">
                <Grid className="w-10 h-10 mx-auto opacity-30" />
                <p>No signals yet</p>
                <Link href="/mobile/create">
                  <button className="glass-button primary text-sm">Create Your First Signal</button>
                </Link>
              </div>
            ) : (
              signals.map((signal) => (
                <Link key={signal.id} href={`/mobile/signals/${signal.id}`}>
                  <div className="aspect-[9/16] rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}
                    data-testid={`profile-signal-${signal.id}`}>
                    {signal.thumbnailUrl
                      ? <img src={signal.thumbnailUrl} alt={signal.title || "Signal"} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-red-900/60 to-blue-900/60" />}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Content: Posts */}
        {contentTab === "posts" && (
          <div className="space-y-3">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <FileText className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p>No posts yet</p>
              </div>
            ) : (
              posts.map((post: any) => (
                <Link key={post.id} href={`/mobile/posts/${post.id}`}>
                  <div className="glass-card p-4 active:opacity-80" data-testid={`profile-post-${post.id}`}>
                    {post.title && <p className="text-white font-semibold text-sm mb-1">{post.title}</p>}
                    <p className="text-white/70 text-sm line-clamp-2">{post.content}</p>
                    <p className="text-white/30 text-xs mt-2">{new Date(post.createdAt).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Content: Liked */}
        {contentTab === "liked" && (
          <div className="text-center py-12 text-white/40">
            <Heart className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p>Liked posts appear here</p>
          </div>
        )}

        {/* Content: Saved */}
        {contentTab === "saved" && (
          <div className="text-center py-12 text-white/40">
            <Bookmark className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p>Saved posts appear here</p>
            <Link href="/mobile/civic/saved">
              <button className="mt-3 text-blue-400 text-xs underline">View Civic Saved</button>
            </Link>
          </div>
        )}

        {/* Admin section */}
        {showAdmin && (
          <div className="mt-6 space-y-4">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wide px-1">Admin</p>
            <Link href="/admin/dashboard">
              <div className="glass-card p-4 flex items-center gap-3 active:opacity-80 border border-white/15">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#3C3B6E" }}>
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Admin Dashboard</p>
                  <p className="text-xs text-white/45">Full analytics & platform insights</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/25" />
              </div>
            </Link>
            {adminSections.map((section) => (
              <div key={section.title} className="glass-card p-4">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">{section.title}</p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <SettingsRow key={item.name} href={item.href} icon={item.icon} label={item.name} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick settings */}
        <div className="glass-card p-4 mt-4">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">Account</p>
          <div className="space-y-0.5">
            <SettingsRow href="/mobile/settings/account" icon={Users2} label="Account Info" />
            <SettingsRow href="/mobile/settings/privacy" icon={Lock} label="Privacy & Blocked" />
            <SettingsRow href="/mobile/settings/security" icon={Shield} label="Security & 2FA" />
            <SettingsRow href="/mobile/settings/notifications" icon={BarChart3} label="Notifications" />
            {verification?.status && (
              <SettingsRow href="/mobile/settings/account" icon={UserCheck} label="Voter Verification" badge={verification.status} />
            )}
          </div>
        </div>

        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="w-full glass-card p-4 flex items-center justify-center gap-2 text-red-400 font-semibold text-sm active:opacity-70 mt-4"
          data-testid="button-logout">
          {logoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {logoutMutation.isPending ? "Logging out…" : "Log Out"}
        </button>
      </div>

      <MobileBottomNav />
    </div>
  );
}
