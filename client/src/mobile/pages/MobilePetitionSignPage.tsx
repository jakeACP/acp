import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, CheckCircle, Loader2, PenLine } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MobileBottomNav } from "../components/MobileBottomNav";
import type { Petition } from "@shared/schema";
import "../mobile-theme.css";

export function MobilePetitionSignPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [signed, setSigned] = useState(false);

  const { data: petition, isLoading, isError } = useQuery<Petition>({
    queryKey: ["/api/petitions", id],
    queryFn: async () => {
      const res = await fetch(`/api/petitions/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
    staleTime: 30000,
  });

  const signMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/petitions/${id}/sign`, { comment: comment.trim() || undefined }),
    onSuccess: () => {
      setSigned(true);
      queryClient.invalidateQueries({ queryKey: ["/api/petitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petitions", id] });
      toast({ title: "Signed!", description: "Your signature has been recorded." });
    },
    onError: (e: any) => {
      const msg = e?.message?.includes("already")
        ? "You've already signed this petition."
        : "Could not sign — please try again.";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const handleBack = () => navigate("/mobile/civic/petitions");

  if (isLoading) {
    return (
      <div className="mobile-root flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        <MobileBottomNav />
      </div>
    );
  }

  if (isError || !petition) {
    return (
      <div className="mobile-root">
        <div className="glass-top-bar flex items-center gap-3">
          <button onClick={handleBack} className="p-2 rounded-full active:bg-white/10">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-semibold">Sign Petition</span>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
          <span className="text-5xl mb-4">📜</span>
          <p className="text-white font-semibold mb-1">Petition not found</p>
          <p className="text-white/50 text-sm mb-6">This petition may have expired or been removed.</p>
          <button onClick={handleBack} className="px-6 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(230,57,58,0.2)", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }}>
            Back to Petitions
          </button>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  const progress = petition.targetSignatures
    ? Math.min(100, Math.round(((petition.currentSignatures ?? 0) / petition.targetSignatures) * 100))
    : 0;

  if (signed) {
    return (
      <div className="mobile-root" data-testid="mobile-petition-sign-success">
        <div className="glass-top-bar flex items-center gap-3">
          <button onClick={handleBack} className="p-2 rounded-full active:bg-white/10">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-semibold">Signed!</span>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: "rgba(74,222,128,0.2)", border: "2px solid rgba(74,222,128,0.4)" }}>
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-white font-bold text-2xl mb-2">Thank you!</h2>
          <p className="text-white/70 text-base mb-1">Your signature has been recorded.</p>
          <p className="text-white/50 text-sm mb-8">"{petition.title}"</p>
          <button onClick={handleBack} className="px-8 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(74,222,128,0.2)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
            Back to Petitions
          </button>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="mobile-root" data-testid="mobile-petition-sign-page">
      {/* Top bar */}
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={handleBack} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-base flex-1">Sign Petition</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
        {/* Petition summary */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="type-tag petition text-[10px] px-2 py-0.5 rounded-full">Petition</span>
            {petition.isActive && (
              <span className="flex items-center gap-1 text-green-400 text-xs">
                <CheckCircle className="w-3 h-3" /> Official
              </span>
            )}
          </div>
          <h2 className="text-white font-bold text-lg leading-snug mb-3">{petition.title}</h2>
          {petition.objective && (
            <p className="text-white/70 text-sm leading-relaxed mb-4">{petition.objective}</p>
          )}
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
              <span><span className="text-white font-semibold">{(petition.currentSignatures ?? 0).toLocaleString()}</span> signed</span>
              <span>Goal: {(petition.targetSignatures ?? 0).toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg, #E6393A, #3b82f6)" }} />
            </div>
            <p className="text-white/40 text-xs mt-1">{progress}% of goal</p>
          </div>
        </div>

        {/* Sign form */}
        {user ? (
          <div className="glass-card p-4 space-y-4">
            <p className="text-white font-semibold text-sm flex items-center gap-2">
              <PenLine className="w-4 h-4" /> Add your signature
            </p>

            {/* Signer info (read-only) */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                {user.avatar
                  ? <img src={user.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                  : <span className="text-white font-bold text-sm">{user.username?.[0]?.toUpperCase()}</span>}
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                </p>
                <p className="text-white/50 text-xs">@{user.username}</p>
              </div>
            </div>

            {/* Optional comment */}
            <div>
              <label className="text-white/60 text-xs font-semibold uppercase tracking-wide block mb-2">
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Add a personal message to your signature…"
                className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30 resize-none"
                data-testid="petition-comment"
              />
              <p className="text-white/30 text-xs text-right mt-1">{comment.length}/300</p>
            </div>

            <button
              onClick={() => signMutation.mutate()}
              disabled={signMutation.isPending}
              className="w-full py-3 rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, rgba(230,57,58,0.3), rgba(59,130,246,0.2))", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }}
              data-testid="petition-sign-btn"
            >
              {signMutation.isPending ? "Signing…" : "✍ Sign This Petition"}
            </button>

            <p className="text-white/30 text-xs text-center">
              By signing you confirm this is your genuine view. Your name will be shown publicly with your signature.
            </p>
          </div>
        ) : (
          <div className="glass-card p-6 text-center">
            <p className="text-white font-semibold mb-2">Sign in to sign this petition</p>
            <p className="text-white/50 text-sm mb-4">You need to be logged in to add your signature.</p>
            <a href="/auth" className="px-6 py-2.5 rounded-full text-sm font-semibold inline-block"
              style={{ background: "rgba(230,57,58,0.2)", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }}>
              Sign In
            </a>
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
