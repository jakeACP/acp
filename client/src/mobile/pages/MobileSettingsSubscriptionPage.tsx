import { useLocation } from "wouter";
import { ChevronLeft, Crown, Check, Zap, Shield, BarChart2, Video, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

const PERKS = [
  { icon: Video,      label: "10-min Signals",  sub: "Extended video time (vs 3 min free)" },
  { icon: BarChart2,  label: "Advanced polls",   sub: "Ranked choice & blockchain verification" },
  { icon: Shield,     label: "Verified badge",   sub: "ACP+ badge on your profile" },
  { icon: Zap,        label: "Priority support", sub: "Faster responses from our team" },
  { icon: Star,       label: "Early access",     sub: "New features before anyone else" },
];

export function MobileSettingsSubscriptionPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isPremium = user?.subscriptionStatus === "premium";

  return (
    <div className="mobile-root" data-testid="settings-subscription-page">
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={() => navigate("/mobile/settings")} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Subscription</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-5">

        {/* Status card */}
        <div className="glass-card p-5"
          style={isPremium ? { borderColor: "rgba(234,179,8,0.35)", background: "rgba(234,179,8,0.06)" } : {}}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: isPremium ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.07)" }}>
              <Crown className={`w-7 h-7 ${isPremium ? "text-yellow-400" : "text-white/40"}`} />
            </div>
            <div>
              <p className="text-white font-bold text-lg">{isPremium ? "ACP+" : "Free Plan"}</p>
              <p className="text-white/50 text-sm">
                {isPremium ? "You're supporting the movement 🎉" : "Upgrade to support the Anti-Corruption Party"}
              </p>
            </div>
          </div>
          {isPremium && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-400 text-sm font-medium">Active subscription</p>
            </div>
          )}
        </div>

        {/* Perks */}
        <div className="glass-card p-4">
          <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-3">ACP+ Perks</p>
          <div className="space-y-3">
            {PERKS.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(234,179,8,0.12)" }}>
                  <Icon className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${isPremium ? "text-white" : "text-white/60"}`}>{label}</p>
                  <p className="text-white/30 text-xs">{sub}</p>
                </div>
                {isPremium && <Check className="w-4 h-4 text-emerald-400 ml-auto flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* CTA or manage */}
        {isPremium ? (
          <div className="glass-card p-4 space-y-3">
            <p className="text-white/45 text-xs font-semibold uppercase tracking-wide">Manage</p>
            <a href="/subscription" target="_blank" rel="noopener noreferrer"
              className="block w-full text-center py-3 rounded-2xl text-sm font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              Manage Billing →
            </a>
          </div>
        ) : (
          <div className="glass-card p-5 text-center"
            style={{ border: "1px solid rgba(234,179,8,0.3)" }}>
            <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <p className="text-white font-bold text-base mb-1">Upgrade to ACP+</p>
            <p className="text-white/50 text-sm mb-4">
              Your subscription directly funds the Anti-Corruption Party's mission for transparent governance.
            </p>
            <a href="/subscription" target="_blank" rel="noopener noreferrer"
              className="block w-full py-3 rounded-2xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#ca8a04,#eab308)" }}>
              Upgrade Now
            </a>
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
