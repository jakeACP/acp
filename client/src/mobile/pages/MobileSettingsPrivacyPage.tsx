import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, Globe, Users, Lock, MessageCircle, UserPlus, Eye, EyeOff, Loader2, UserX, VolumeX, ChevronDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

type VisibilityOption = "public" | "followers" | "private";
type ContactOption = "everyone" | "followers" | "nobody";

interface PrivacySettings {
  profileVisibility: VisibilityOption;
  postVisibility: VisibilityOption;
  whoCanMessage: ContactOption;
  whoCanFriendRequest: ContactOption;
  showActivityStatus: boolean;
  showFollowersCount: boolean;
}

interface BlockedUser { id: string; username: string; first_name?: string; last_name?: string; avatar?: string; }
interface MutedUser  { id: string; username: string; first_name?: string; last_name?: string; avatar?: string; }

function VisibilityPicker({ label, value, onChange }: { label: string; value: VisibilityOption; onChange: (v: VisibilityOption) => void }) {
  const opts: { v: VisibilityOption; icon: typeof Globe; label: string }[] = [
    { v: "public",    icon: Globe,  label: "Public" },
    { v: "followers", icon: Users,  label: "Followers" },
    { v: "private",   icon: Lock,   label: "Only me" },
  ];
  return (
    <div className="flex items-center justify-between">
      <p className="text-white text-sm">{label}</p>
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl relative"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <select value={value} onChange={(e) => onChange(e.target.value as VisibilityOption)}
          className="bg-transparent text-white text-xs font-medium outline-none pr-4 appearance-none cursor-pointer">
          {opts.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 pointer-events-none" />
      </div>
    </div>
  );
}

function ContactPicker({ label, value, onChange }: { label: string; value: ContactOption; onChange: (v: ContactOption) => void }) {
  const opts: ContactOption[] = ["everyone", "followers", "nobody"];
  return (
    <div className="flex items-center justify-between">
      <p className="text-white text-sm">{label}</p>
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl relative"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <select value={value} onChange={(e) => onChange(e.target.value as ContactOption)}
          className="bg-transparent text-white text-xs font-medium outline-none pr-4 appearance-none cursor-pointer">
          {opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
        <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 pointer-events-none" />
      </div>
    </div>
  );
}

function UserChip({ user, onRemove, label }: { user: BlockedUser; onRemove: () => void; label: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500/40 to-blue-500/40 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
        {user.avatar
          ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          : user.username[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">
          {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : `@${user.username}`}
        </p>
        <p className="text-white/40 text-xs">@{user.username}</p>
      </div>
      <button onClick={onRemove}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold"
        style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
        {label}
      </button>
    </div>
  );
}

export function MobileSettingsPrivacyPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"privacy" | "blocked" | "muted">("privacy");

  const { data: privacySettings, isLoading: privLoading } = useQuery<PrivacySettings>({
    queryKey: ["/api/user/privacy-settings"],
    staleTime: 30000,
  });

  const { data: blockedUsers = [], isLoading: blockedLoading } = useQuery<BlockedUser[]>({
    queryKey: ["/api/user/blocked"],
    staleTime: 30000,
    enabled: tab === "blocked",
  });

  const { data: mutedUsers = [], isLoading: mutedLoading } = useQuery<MutedUser[]>({
    queryKey: ["/api/user/muted"],
    staleTime: 30000,
    enabled: tab === "muted",
  });

  const privacyMutation = useMutation({
    mutationFn: (data: Partial<PrivacySettings>) => apiRequest("/api/user/privacy-settings", "PATCH", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/privacy-settings"] }),
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => apiRequest(`/api/user/block/${userId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/blocked"] });
      toast({ title: "User unblocked" });
    },
  });

  const unmuteMutation = useMutation({
    mutationFn: (userId: string) => apiRequest(`/api/user/mute/${userId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/muted"] });
      toast({ title: "User unmuted" });
    },
  });

  const settings = privacySettings ?? {
    profileVisibility: "public" as VisibilityOption,
    postVisibility: "public" as VisibilityOption,
    whoCanMessage: "everyone" as ContactOption,
    whoCanFriendRequest: "everyone" as ContactOption,
    showActivityStatus: true,
    showFollowersCount: true,
  };

  const updateSetting = (patch: Partial<PrivacySettings>) => privacyMutation.mutate(patch);

  const tabs = [
    { id: "privacy" as const, label: "Privacy" },
    { id: "blocked" as const, label: `Blocked${blockedUsers.length ? ` (${blockedUsers.length})` : ""}` },
    { id: "muted" as const,   label: `Muted${mutedUsers.length ? ` (${mutedUsers.length})` : ""}` },
  ];

  return (
    <div className="mobile-root" data-testid="settings-privacy-page">
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={() => navigate("/mobile/settings")} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Privacy</h1>
        {privacyMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={tab === t.id
              ? { background: "rgba(59,91,169,0.3)", color: "#fff", border: "1px solid rgba(59,91,169,0.4)" }
              : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
            data-testid={`privacy-tab-${t.id}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">

        {/* Privacy settings */}
        {tab === "privacy" && (
          <>
            {privLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
            ) : (
              <>
                <div className="glass-card p-4 space-y-4">
                  <p className="text-white/45 text-xs font-semibold uppercase tracking-wide">Visibility</p>
                  <VisibilityPicker label="Profile visibility" value={settings.profileVisibility}
                    onChange={(v) => updateSetting({ profileVisibility: v })} />
                  <VisibilityPicker label="Post visibility" value={settings.postVisibility}
                    onChange={(v) => updateSetting({ postVisibility: v })} />
                </div>

                <div className="glass-card p-4 space-y-4">
                  <p className="text-white/45 text-xs font-semibold uppercase tracking-wide">Interactions</p>
                  <ContactPicker label="Who can message me" value={settings.whoCanMessage}
                    onChange={(v) => updateSetting({ whoCanMessage: v })} />
                  <ContactPicker label="Who can send friend requests" value={settings.whoCanFriendRequest}
                    onChange={(v) => updateSetting({ whoCanFriendRequest: v })} />
                </div>

                <div className="glass-card p-4 space-y-4">
                  <p className="text-white/45 text-xs font-semibold uppercase tracking-wide">Activity</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Show activity status</p>
                      <p className="text-white/35 text-xs">Let others see when you're active</p>
                    </div>
                    <Switch checked={settings.showActivityStatus}
                      onCheckedChange={(v) => updateSetting({ showActivityStatus: v })}
                      data-testid="toggle-activity-status" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Show follower count</p>
                      <p className="text-white/35 text-xs">Display how many friends/followers you have</p>
                    </div>
                    <Switch checked={settings.showFollowersCount}
                      onCheckedChange={(v) => updateSetting({ showFollowersCount: v })}
                      data-testid="toggle-followers-count" />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Blocked users */}
        {tab === "blocked" && (
          <div className="glass-card p-4">
            <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-3">
              Blocked Users
            </p>
            {blockedLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/40" /></div>
            ) : blockedUsers.length === 0 ? (
              <div className="text-center py-8">
                <UserX className="w-10 h-10 mx-auto text-white/20 mb-2" />
                <p className="text-white/40 text-sm">No blocked users</p>
                <p className="text-white/25 text-xs mt-1">Blocked users can't see your profile or contact you</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {blockedUsers.map((u) => (
                  <UserChip key={u.id} user={u} onRemove={() => unblockMutation.mutate(u.id)} label="Unblock" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Muted users */}
        {tab === "muted" && (
          <div className="glass-card p-4">
            <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-3">
              Muted Users
            </p>
            {mutedLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/40" /></div>
            ) : mutedUsers.length === 0 ? (
              <div className="text-center py-8">
                <VolumeX className="w-10 h-10 mx-auto text-white/20 mb-2" />
                <p className="text-white/40 text-sm">No muted users</p>
                <p className="text-white/25 text-xs mt-1">Muted users' posts won't appear in your feed</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {mutedUsers.map((u) => (
                  <UserChip key={u.id} user={u as BlockedUser} onRemove={() => unmuteMutation.mutate(u.id)} label="Unmute" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
