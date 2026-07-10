import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ThumbsUp, Users } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

interface Initiative {
  id: string;
  title: string;
  description: string;
  status: string;
  supportCount?: number;
  authorId?: string;
  createdAt?: string;
}

function statusColor(s: string) {
  switch (s?.toLowerCase()) {
    case "active": return { bg: "rgba(74,222,128,0.15)", text: "#4ade80" };
    case "passed": return { bg: "rgba(59,91,169,0.2)", text: "#6b9fff" };
    case "failed": return { bg: "rgba(230,57,58,0.15)", text: "#f87171" };
    default:        return { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.4)" };
  }
}

function InitiativeRow({ initiative }: { initiative: Initiative }) {
  const col = statusColor(initiative.status);
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 active:bg-white/5 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: col.bg, color: col.text }}
          >
            {initiative.status ?? "Draft"}
          </span>
        </div>
        <p className="text-white text-sm font-medium leading-snug mt-1">{initiative.title}</p>
        <p className="text-white/45 text-xs mt-0.5 line-clamp-2">{initiative.description}</p>
        {initiative.supportCount != null && (
          <div className="flex items-center gap-1 mt-1.5 text-white/35">
            <ThumbsUp className="w-3 h-3" />
            <span className="text-xs">{initiative.supportCount.toLocaleString()} supporters</span>
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-white/25 flex-shrink-0 mt-1" />
    </div>
  );
}

export function MobileInitiativesPage() {
  const { data: initiatives = [], isLoading } = useQuery<Initiative[]>({
    queryKey: ["/api/initiatives"],
    staleTime: 60000,
  });

  return (
    <div className="mobile-root" data-testid="mobile-initiatives-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">Initiatives</h1>
            <p className="text-white/50 text-xs">Community proposals</p>
          </div>
        </div>
      </div>

      <div className="pt-3 pb-28">
        {isLoading ? (
          <div className="glass-card mx-4 overflow-hidden" style={{ borderRadius: 18 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3.5 border-b border-white/5 animate-pulse">
                <div className="h-3 bg-white/10 rounded w-1/4 mb-2" />
                <div className="h-4 bg-white/10 rounded w-3/4 mb-1" />
                <div className="h-3 bg-white/10 rounded w-full" />
              </div>
            ))}
          </div>
        ) : initiatives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <span className="text-5xl mb-4">🌱</span>
            <p className="text-white/60 text-base font-medium mb-1">No initiatives yet</p>
            <p className="text-white/35 text-sm">Start one from the full website.</p>
          </div>
        ) : (
          <div className="glass-card mx-4 overflow-hidden" style={{ borderRadius: 18 }}>
            {initiatives.map((initiative) => (
              <InitiativeRow key={initiative.id} initiative={initiative} />
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
