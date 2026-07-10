import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Sun, Moon, Flag, Eye, Lock,
  ShieldCheck, SlidersHorizontal, LogOut, Bell, Palette,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

export function MobileSettingsPage() {
  const [, navigate] = useLocation();
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
    mutationFn: (next: { phone: boolean; email: boolean }) =>
      apiRequest("/api/user/discoverability", "PATCH", {
        phoneNumber: user?.phoneNumber || "",
        discoverableByPhone: next.phone,
        discoverableByEmail: next.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Privacy updated" });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const themes: { id: "light" | "dark" | "patriot"; label: string; icon: typeof Sun }[] = [
    { id: "light",   label: "Light",   icon: Sun  },
    { id: "dark",    label: "Dark",    icon: Moon },
    { id: "patriot", label: "Patriot", icon: Flag },
  ];

  const verificationStatus = verification?.status;

  return (
    <div className="mobile-root" data-testid="mobile-settings-page">
      {/* Top bar */}
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={() => navigate("/mobile/profile")} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">

        {/* Appearance */}
        <div className="glass-card p-4">
          <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4" /> Appearance
          </p>
          <div className="grid grid-cols-3 gap-2">
            {themes.map((t) => {
              const Icon = t.icon;
              const active = actualTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); toast({ title: `${t.label} theme`, duration: 1200 }); }}
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

        {/* Privacy */}
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

        {/* Account */}
        <div className="glass-card p-4">
          <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Account
          </p>
          <div className="space-y-0.5">
            <div className="flex items-center gap-3 py-2.5">
              <ShieldCheck className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white flex-1">Voter Verification</span>
              {verificationStatus && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  verificationStatus === "approved" ? "bg-green-500/20 text-green-400"
                  : verificationStatus === "pending"  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-red-500/20 text-red-400"}`}>
                  {verificationStatus}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-white/30" />
            </div>
            <div className="flex items-center gap-3 py-2.5">
              <Lock className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white flex-1">Password & 2FA</span>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </div>
            <div className="flex items-center gap-3 py-2.5">
              <SlidersHorizontal className="w-4 h-4 text-white/60" />
              <button
                onClick={() => navigate("/mobile/profile/edit")}
                className="text-sm text-white flex-1 text-left"
              >
                Edit Profile
              </button>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </div>
          </div>
        </div>

        {/* Notifications placeholder */}
        <div className="glass-card p-4">
          <p className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </p>
          <p className="text-white/50 text-sm">Notification preferences coming soon.</p>
        </div>

        {/* Logout */}
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="w-full glass-card p-4 flex items-center justify-center gap-2 text-red-400 font-semibold text-sm active:opacity-70"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          {logoutMutation.isPending ? "Logging out…" : "Log Out"}
        </button>
      </div>

      <MobileBottomNav />
    </div>
  );
}
