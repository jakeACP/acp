import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import "../mobile-theme.css";

interface Petition {
  id: string;
  title: string;
  description: string;
  currentSignatures: number;
  targetSignatures: number;
  createdAt: string;
  authorId?: string;
}

function PetitionCard({ petition }: { petition: Petition }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const pct =
    petition.targetSignatures > 0
      ? Math.min(100, Math.round((petition.currentSignatures / petition.targetSignatures) * 100))
      : 0;

  const signMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/petitions/${petition.id}/sign`, "POST", {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Signed!", description: "Your signature was recorded." });
      queryClient.invalidateQueries({ queryKey: ["/api/petitions"] });
    },
    onError: () => {
      toast({ title: "Could not sign", description: "You may have already signed this petition.", variant: "destructive" });
    },
  });

  return (
    <div className="glass-card p-4 mx-4 mb-3" style={{ height: "auto" }}>
      <h3 className="text-white font-semibold text-sm mb-2 leading-snug">{petition.title}</h3>
      <p className="text-white/50 text-xs mb-3 line-clamp-2">{petition.description}</p>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(to right, #E6393A, #3B5BA9)",
          }}
        />
      </div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-white/40 text-xs">
          {petition.currentSignatures.toLocaleString()} signatures
        </span>
        <span className="text-white/40 text-xs">
          Goal: {petition.targetSignatures.toLocaleString()}
        </span>
      </div>

      <button
        onClick={() => {
          if (!user) {
            toast({ title: "Log in required" });
            return;
          }
          signMutation.mutate();
        }}
        disabled={signMutation.isPending}
        className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        style={{
          background: signMutation.isPending
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(135deg, rgba(230,57,58,0.4), rgba(59,91,169,0.4))",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff",
        }}
      >
        <CheckCircle2 className="w-4 h-4" />
        {signMutation.isPending ? "Signing…" : "Sign Petition"}
      </button>
    </div>
  );
}

export function MobilePetitionsPage() {
  const { data: petitions = [], isLoading } = useQuery<Petition[]>({
    queryKey: ["/api/petitions"],
    staleTime: 30000,
  });

  return (
    <div className="mobile-root" data-testid="mobile-petitions-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">Petitions</h1>
            <p className="text-white/50 text-xs">Sign and create petitions</p>
          </div>
        </div>
      </div>

      <div className="pt-3 pb-28">
        {isLoading ? (
          <div className="space-y-3 px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-4 animate-pulse" style={{ height: 160 }}>
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-full mb-1" />
                <div className="h-3 bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : petitions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <span className="text-5xl mb-4">✍️</span>
            <p className="text-white/60 text-base font-medium mb-1">No active petitions</p>
            <p className="text-white/35 text-sm">Be the first to start one from the web.</p>
          </div>
        ) : (
          petitions.map((p) => <PetitionCard key={p.id} petition={p} />)
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
