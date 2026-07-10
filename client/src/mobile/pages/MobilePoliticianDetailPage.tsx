import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2, ExternalLink, BarChart2, Shield, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

export function MobilePoliticianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: politician, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/politician-profiles", id],
    queryFn: async () => {
      const res = await fetch(`/api/politician-profiles/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
    staleTime: 60000,
  });

  const handleBack = () => navigate("/mobile/civic/elections");

  const gradeColor = (grade?: string) => {
    if (!grade) return "rgba(255,255,255,0.3)";
    const g = grade.toUpperCase();
    if (g.startsWith("A")) return "#4ade80";
    if (g.startsWith("B")) return "#a3e635";
    if (g.startsWith("C")) return "#facc15";
    if (g.startsWith("D")) return "#fb923c";
    return "#f87171";
  };

  if (isLoading) {
    return (
      <div className="mobile-root flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        <MobileBottomNav />
      </div>
    );
  }

  if (isError || !politician) {
    return (
      <div className="mobile-root">
        <div className="glass-top-bar flex items-center gap-3">
          <button onClick={handleBack} className="p-2 rounded-full active:bg-white/10">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-semibold">Politician</span>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
          <span className="text-5xl mb-4">🏛️</span>
          <p className="text-white font-semibold mb-1">Profile not found</p>
          <p className="text-white/50 text-sm mb-6">This politician profile may not exist yet.</p>
          <button onClick={handleBack} className="px-6 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(230,57,58,0.2)", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }}>
            Back
          </button>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  const grade = politician.corruptionGrade;
  const gColor = gradeColor(grade);
  const demerits: any[] = politician.demerits || [];
  const sigs: any[] = politician.sigs || politician.specialInterestGroups || [];

  return (
    <div className="mobile-root" data-testid="mobile-politician-detail-page">
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={handleBack} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-base flex-1 truncate">{politician.fullName}</h1>
        <a href={`/politicians/${id}`} target="_blank" rel="noopener noreferrer"
          className="p-2 rounded-full active:bg-white/10 text-white/50">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Hero */}
        <div className="px-4 pt-4 space-y-4">
          {/* Profile card */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                {politician.photoUrl
                  ? <img src={politician.photoUrl} alt={politician.fullName} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-white/40 text-3xl">🏛️</div>}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-xl">{politician.fullName}</h2>
                {politician.party && <p className="text-white/60 text-sm">{politician.party}</p>}
                {politician.position?.title && (
                  <p className="text-white/50 text-xs mt-1">{politician.position.title}</p>
                )}
                {politician.state && (
                  <p className="text-white/40 text-xs">{politician.state}</p>
                )}
              </div>
              {grade && (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center border-2"
                    style={{ borderColor: gColor, background: `${gColor}20` }}>
                    <span className="text-xl font-black" style={{ color: gColor }}>{grade}</span>
                  </div>
                  <span className="text-white/40 text-[10px] mt-1">ACP Grade</span>
                </div>
              )}
            </div>
          </div>

          {/* Funding breakdown */}
          {sigs.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" /> Top Funders
              </p>
              <div className="space-y-2">
                {sigs.slice(0, 5).map((sig: any, i: number) => (
                  <div key={sig.id || i} className="flex items-center gap-2">
                    <span className="text-white/40 text-xs w-4">{i + 1}.</span>
                    <span className="text-white/80 text-sm flex-1 truncate">{sig.name || sig.tag}</span>
                    {sig.amount && (
                      <span className="text-white/50 text-xs">${(sig.amount / 1000).toFixed(0)}k</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demerits */}
          {demerits.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Demerits
              </p>
              <div className="space-y-2">
                {demerits.map((d: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "rgba(251,146,60,0.08)" }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white/70 text-sm">{d.label || d.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full profile link */}
          <a
            href={`/politicians/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <ExternalLink className="w-4 h-4" />
            Full Profile (Desktop)
          </a>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
