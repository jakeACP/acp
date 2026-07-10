/**
 * MobileSettingsDeletePage
 *
 * Apple App Store required: apps that allow account creation must provide
 * an in-app way to delete the account. This page implements that flow.
 *
 * Flow:
 *   1. Warning screen — explains what will be deleted
 *   2. Confirmation screen — user types "DELETE MY ACCOUNT"
 *   3. DELETE /api/user — anonymizes all personal data, logs out
 *   4. Redirect to /auth
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, Trash2, AlertTriangle, Check, Loader2, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import "../mobile-theme.css";

type Step = "warning" | "confirm" | "done";

const CONSEQUENCES = [
  "Your profile, posts, signals, and comments",
  "Your followers and following relationships",
  "Your civic activity, signed petitions, and RSVPs",
  "Your subscription (no refund)",
  "Your messages and conversation history",
  "All personal information stored on our servers",
];

export function MobileSettingsDeletePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("warning");
  const [confirmText, setConfirmText] = useState("");
  const REQUIRED = "DELETE MY ACCOUNT";

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("/api/user", "DELETE", { confirmText: REQUIRED }),
    onSuccess: () => {
      setStep("done");
      setTimeout(() => navigate("/auth"), 2000);
    },
    onError: (e: Error) => {
      toast({ title: "Deletion failed", description: e.message, variant: "destructive" });
    },
  });

  const handleDelete = () => {
    if (confirmText !== REQUIRED) {
      toast({ title: `Type "${REQUIRED}" to confirm`, variant: "destructive" });
      return;
    }
    deleteMutation.mutate();
  };

  if (step === "done") {
    return (
      <div className="mobile-root flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-white font-bold text-xl mb-2">Account Deleted</p>
          <p className="text-white/50 text-sm">Your data has been removed. Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-root" data-testid="settings-delete-page">
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={() => step === "confirm" ? setStep("warning") : navigate("/mobile/settings")}
          className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Delete Account</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-16 space-y-5">

        {step === "warning" && (
          <>
            {/* Warning header */}
            <div className="glass-card p-5 text-center"
              style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.15)" }}>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-white font-bold text-xl mb-2">This action is permanent</p>
              <p className="text-white/55 text-sm leading-relaxed">
                Deleting your account cannot be undone. All your data will be permanently removed from our servers.
              </p>
            </div>

            {/* What will be deleted */}
            <div className="glass-card p-4">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-3">What will be deleted</p>
              <div className="space-y-2">
                {CONSEQUENCES.map((c) => (
                  <div key={c} className="flex items-start gap-2.5">
                    <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-white/70 text-sm">{c}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alternatives */}
            <div className="glass-card p-4"
              style={{ borderColor: "rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.04)" }}>
              <p className="text-blue-400 font-semibold text-sm mb-2">Before you go…</p>
              <p className="text-white/55 text-sm leading-relaxed">
                You can also just log out or adjust your privacy settings to limit your visibility without losing your data.
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => navigate("/mobile/settings/privacy")}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
                  Privacy Settings
                </button>
                <button onClick={() => navigate("/mobile/settings")}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  Back to Settings
                </button>
              </div>
            </div>

            {/* Continue to deletion */}
            <button onClick={() => setStep("confirm")}
              className="w-full py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
              data-testid="proceed-to-confirm-delete">
              <Trash2 className="w-4 h-4" /> I understand, proceed to deletion
            </button>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="glass-card p-5 text-center"
              style={{ borderColor: "rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.07)" }}>
              <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-white font-bold text-lg mb-1">Confirm Deletion</p>
              <p className="text-white/50 text-sm">
                Type <strong className="text-red-400 font-mono">{REQUIRED}</strong> to permanently delete <strong className="text-white">@{user?.username}</strong>
              </p>
            </div>

            <div className="glass-card p-4 space-y-3">
              <label className="text-white/45 text-xs font-semibold uppercase tracking-wide block">
                Type confirmation below
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={REQUIRED}
                className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none font-mono"
                style={{
                  background: "rgba(239,68,68,0.07)",
                  border: `1px solid ${confirmText === REQUIRED ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.3)"}`,
                }}
                data-testid="delete-confirm-input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
              {confirmText.length > 0 && confirmText !== REQUIRED && (
                <p className="text-red-400/70 text-xs">
                  {REQUIRED.startsWith(confirmText) ? "Keep typing…" : "Text doesn't match"}
                </p>
              )}
              {confirmText === REQUIRED && (
                <p className="text-emerald-400 text-xs flex items-center gap-1">
                  <Check className="w-3 h-3" /> Confirmed — ready to delete
                </p>
              )}
            </div>

            <button
              onClick={handleDelete}
              disabled={confirmText !== REQUIRED || deleteMutation.isPending}
              className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ background: "rgb(185,28,28)", color: "#fff" }}
              data-testid="confirm-delete-btn">
              {deleteMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
                : <><Trash2 className="w-4 h-4" /> Delete My Account Forever</>}
            </button>

            <p className="text-white/25 text-xs text-center leading-relaxed px-4">
              By proceeding you agree that this action is irreversible. ACP Democracy will anonymize your data immediately upon confirmation.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
