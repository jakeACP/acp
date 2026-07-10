import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, User, Mail, Phone, AtSign, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-white/45 text-xs font-semibold uppercase tracking-wide mb-1.5">{children}</p>;
}
function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
  );
}

export function MobileSettingsAccountPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phoneNumber ?? "");

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const { data: verification } = useQuery<{ status?: string } | null>({
    queryKey: ["/api/voter-verification/me"],
    retry: false,
  });

  const profileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/user/profile", "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Account updated ✓" });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/user/change-password", "POST", data),
    onSuccess: () => {
      toast({ title: "Password changed ✓" });
      setCurPw(""); setNewPw(""); setConfPw("");
    },
    onError: (e: Error) => toast({ title: "Password change failed", description: e.message, variant: "destructive" }),
  });

  const handleSaveAccount = () => {
    const changes: any = {};
    if (username !== user?.username) changes.username = username;
    if (email !== user?.email) changes.email = email;
    if (phone !== user?.phoneNumber) changes.phoneNumber = phone;
    if (Object.keys(changes).length === 0) return toast({ title: "No changes" });
    profileMutation.mutate(changes);
  };

  const handleChangePassword = () => {
    if (newPw.length < 8) return toast({ title: "Password too short", description: "Minimum 8 characters", variant: "destructive" });
    if (newPw !== confPw) return toast({ title: "Passwords don't match", variant: "destructive" });
    passwordMutation.mutate({ currentPassword: curPw, newPassword: newPw });
  };

  const verificationColors: Record<string, string> = {
    approved: "text-green-400 bg-green-500/15",
    pending:  "text-yellow-400 bg-yellow-500/15",
    rejected: "text-red-400 bg-red-500/15",
  };

  return (
    <div className="mobile-root" data-testid="settings-account-page">
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={() => navigate("/mobile/settings")} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">Account</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-5">

        {/* Identity */}
        <div className="glass-card p-4 space-y-4">
          <FieldLabel>Identity</FieldLabel>

          <div>
            <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><AtSign className="w-3 h-3" /> Username</p>
            <StyledInput value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="username" data-testid="input-username" />
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
            <StyledInput type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" data-testid="input-email" />
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</p>
            <StyledInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000" data-testid="input-phone" />
          </div>

          <button onClick={handleSaveAccount} disabled={profileMutation.isPending}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#E6393A,#3B5BA9)" }}
            data-testid="save-account-btn">
            {profileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Changes
          </button>
        </div>

        {/* Voter verification status */}
        {verification?.status && (
          <div className="glass-card p-4">
            <FieldLabel>Voter Verification</FieldLabel>
            <div className="flex items-center gap-3 mt-2">
              <User className="w-5 h-5 text-white/50" />
              <div className="flex-1">
                <p className="text-white text-sm">Verification Status</p>
                <p className="text-white/40 text-xs">Verified voters get a badge on their profile</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${verificationColors[verification.status] ?? "text-white/50 bg-white/10"}`}>
                {verification.status}
              </span>
            </div>
          </div>
        )}

        {/* Change password */}
        <div className="glass-card p-4 space-y-4">
          <FieldLabel>Change Password</FieldLabel>

          <div>
            <p className="text-white/40 text-xs mb-1">Current password</p>
            <div className="relative">
              <StyledInput type={showCurPw ? "text" : "password"} value={curPw}
                onChange={(e) => setCurPw(e.target.value)} placeholder="Current password"
                data-testid="input-current-pw" />
              <button onClick={() => setShowCurPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                {showCurPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">New password</p>
            <div className="relative">
              <StyledInput type={showNewPw ? "text" : "password"} value={newPw}
                onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 8 characters"
                data-testid="input-new-pw" />
              <button onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Confirm new password</p>
            <StyledInput type="password" value={confPw} onChange={(e) => setConfPw(e.target.value)}
              placeholder="Repeat new password" data-testid="input-confirm-pw" />
            {confPw && newPw !== confPw && (
              <p className="text-red-400 text-xs mt-1">Passwords don't match</p>
            )}
          </div>

          <button onClick={handleChangePassword}
            disabled={passwordMutation.isPending || !curPw || !newPw || newPw !== confPw}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            data-testid="change-password-btn">
            {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Change Password
          </button>
        </div>

        {/* Danger */}
        <div className="glass-card p-4 space-y-2"
          style={{ borderColor: "rgba(239,68,68,0.2)" }}>
          <FieldLabel>Danger Zone</FieldLabel>
          <button onClick={() => navigate("/mobile/settings/delete-account")}
            className="w-full flex items-center gap-3 py-2.5 text-red-400 active:opacity-70"
            data-testid="go-delete-account">
            <span className="text-sm font-medium">Delete my account</span>
            <ChevronLeft className="w-4 h-4 ml-auto rotate-180" />
          </button>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
