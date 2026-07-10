import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MobileBottomNav } from "../components/MobileBottomNav";
import {
  ChevronLeft, ChevronRight, User, Lock, Bell, Shield,
  CreditCard, HelpCircle, FileText, Clock, Trash2, LogOut,
  Eye, Sun, Moon, Flag, Loader2,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import "../mobile-theme.css";

interface SettingRow {
  icon: typeof User;
  label: string;
  sub?: string;
  href?: string;
  action?: () => void;
  badge?: string;
  danger?: boolean;
}

function Row({ icon: Icon, label, sub, href, action, badge, danger }: SettingRow) {
  const content = (
    <div
      className="flex items-center gap-4 py-3.5 active:opacity-70 cursor-pointer"
      onClick={action}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.07)" }}>
        <Icon className={`w-5 h-5 ${danger ? "text-red-400" : "text-white/70"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? "text-red-400" : "text-white"}`}>{label}</p>
        {sub && <p className="text-white/35 text-xs mt-0.5 leading-tight">{sub}</p>}
      </div>
      {badge && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(59,91,169,0.25)", color: "#93c5fd" }}>
          {badge}
        </span>
      )}
      {(href || action) && !danger && (
        <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
      )}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export function MobileSettingsPage() {
  const [, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { actualTheme, setTheme } = useTheme();
  const { toast } = useToast();

  const isPremium = user?.subscriptionStatus === "premium";

  const themes: { id: "light" | "dark" | "patriot"; label: string; icon: typeof Sun }[] = [
    { id: "light",   label: "Light",   icon: Sun },
    { id: "dark",    label: "Dark",    icon: Moon },
    { id: "patriot", label: "Patriot", icon: Flag },
  ];

  const sections = [
    {
      title: "Account",
      rows: [
        { icon: User,       label: "Account",       sub: `@${user?.username}`,     href: "/mobile/settings/account" },
        { icon: Eye,        label: "Privacy",        sub: "Visibility & blocked",   href: "/mobile/settings/privacy" },
        { icon: Bell,       label: "Notifications",  sub: "Push & email alerts",    href: "/mobile/settings/notifications" },
        { icon: Shield,     label: "Security",       sub: "Password, 2FA & sessions", href: "/mobile/settings/security" },
        { icon: CreditCard, label: "Subscription",   sub: isPremium ? "ACP+ Active" : "Free plan", href: "/mobile/settings/subscription", badge: isPremium ? "ACP+" : undefined },
      ] as SettingRow[],
    },
    {
      title: "Activity",
      rows: [
        { icon: Clock, label: "Activity Log", sub: "Your recent actions", href: "/mobile/settings/security" },
      ] as SettingRow[],
    },
    {
      title: "Support",
      rows: [
        { icon: HelpCircle, label: "Help & Contact", sub: "FAQ and support",         href: "/mobile/settings/help" },
        { icon: FileText,   label: "Terms of Service", sub: "Legal",                  href: "/terms" },
        { icon: Lock,       label: "Privacy Policy",   sub: "How we use your data",   href: "/privacy" },
      ] as SettingRow[],
    },
    {
      title: "Danger Zone",
      rows: [
        { icon: Trash2, label: "Delete Account", sub: "Permanently remove your data", href: "/mobile/settings/delete-account", danger: true },
      ] as SettingRow[],
    },
  ];

  return (
    <div className="mobile-root" data-testid="mobile-settings-page">
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={() => navigate("/mobile/profile")} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-xl flex-1">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-5">

        {/* User identity card */}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {user?.avatar
              ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-white text-lg font-bold">{user?.username?.[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username}
            </p>
            <p className="text-white/40 text-xs">@{user?.username}</p>
          </div>
          <Link href="/mobile/profile/edit">
            <button className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              Edit
            </button>
          </Link>
        </div>

        {/* Appearance */}
        <div className="glass-card p-4">
          <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-3">Appearance</p>
          <div className="grid grid-cols-3 gap-2">
            {themes.map((t) => {
              const Icon = t.icon;
              const active = actualTheme === t.id;
              return (
                <button key={t.id} onClick={() => { setTheme(t.id); toast({ title: `${t.label} theme`, duration: 1000 }); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors"
                  style={active
                    ? { background: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.4)", color: "#fff" }
                    : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                  data-testid={`theme-${t.id}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings rows */}
        {sections.map((section) => (
          <div key={section.title} className="glass-card p-4">
            <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-1">{section.title}</p>
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {section.rows.map((row) => (
                <Row key={row.label} {...row} />
              ))}
            </div>
          </div>
        ))}

        {/* Log out */}
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="w-full glass-card p-4 flex items-center justify-center gap-2 font-semibold text-sm active:opacity-70"
          style={{ color: "#f87171" }}
          data-testid="button-logout">
          {logoutMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <LogOut className="w-4 h-4" />}
          {logoutMutation.isPending ? "Logging out…" : "Log Out"}
        </button>

        <p className="text-white/20 text-xs text-center pb-4">ACP Democracy • v1.0</p>
      </div>

      <MobileBottomNav />
    </div>
  );
}
