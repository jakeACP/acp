import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Shield, Smartphone, Clock, FileText, Lock, Activity, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

interface ActivityItem {
  id: string;
  type: string;
  detail: string;
  created_at: string;
}

function typeIcon(type: string) {
  if (type === "post") return <FileText className="w-4 h-4 text-blue-400" />;
  if (type === "comment") return <FileText className="w-4 h-4 text-green-400" />;
  return <Activity className="w-4 h-4 text-purple-400" />;
}

function typeLabel(type: string) {
  if (type === "post") return "Published a post";
  if (type === "comment") return "Left a comment";
  if (type === "vote") return "Voted on a poll";
  return "Activity";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function MobileSettingsSecurityPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: activityLog = [], isLoading: actLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/user/activity-log"],
    staleTime: 60000,
  });

  const has2FA = !!(user as any)?.twoFactorEnabled;

  return (
    <div className="mobile-root" data-testid="settings-security-page">
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={() => navigate("/mobile/settings")} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Security</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">

        {/* 2FA */}
        <div className="glass-card p-4 space-y-4">
          <p className="text-white/45 text-xs font-semibold uppercase tracking-wide">Two-Factor Authentication</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: has2FA ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.07)" }}>
              <Smartphone className={`w-6 h-6 ${has2FA ? "text-emerald-400" : "text-white/50"}`} />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Authenticator App</p>
              <p className="text-white/40 text-xs mt-0.5">
                {has2FA ? "2FA is enabled — your account is protected" : "Not enabled — add extra security"}
              </p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${has2FA ? "bg-emerald-500/15 text-emerald-400" : "bg-white/8 text-white/40"}`}>
              {has2FA ? "ON" : "OFF"}
            </span>
          </div>
          <a href="/settings/security" target="_blank" rel="noopener noreferrer"
            className="block w-full text-center py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
            data-testid="manage-2fa-link">
            {has2FA ? "Manage 2FA" : "Enable 2FA"} →
          </a>
        </div>

        {/* Password */}
        <div className="glass-card p-4">
          <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-3">Password</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.07)" }}>
              <Lock className="w-5 h-5 text-white/50" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">Account password</p>
              <p className="text-white/35 text-xs">Last changed: unknown</p>
            </div>
            <button onClick={() => navigate("/mobile/settings/account")}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              Change
            </button>
          </div>
        </div>

        {/* Login info */}
        <div className="glass-card p-4">
          <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-3">Session</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-white/40 flex-shrink-0" />
              <div>
                <p className="text-white text-sm">Current device</p>
                <p className="text-white/35 text-xs">{navigator.userAgent.includes("Mobile") ? "Mobile browser" : "Desktop browser"}</p>
              </div>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Active</span>
            </div>
          </div>
        </div>

        {/* Activity log */}
        <div className="glass-card p-4">
          <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-3">Recent Activity</p>
          {actLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/40" /></div>
          ) : activityLog.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activityLog.slice(0, 15).map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    {typeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-xs font-medium">{typeLabel(item.type)}</p>
                    <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{item.detail}</p>
                  </div>
                  <p className="text-white/25 text-[10px] flex-shrink-0">{relativeTime(item.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trusted devices */}
        <div className="glass-card p-4">
          <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-2">Trusted Devices</p>
          <a href="/settings/security/trusted-devices" target="_blank" rel="noopener noreferrer"
            className="text-blue-400 text-sm">
            Manage trusted devices →
          </a>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
