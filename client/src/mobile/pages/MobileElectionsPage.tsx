import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Search, Shield, ShieldX, Star } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

interface Politician {
  id: string;
  fullName: string;
  party: string | null;
  state: string | null;
  photoUrl: string | null;
  corruptionGrade: string | null;
  numericScore: number | null;
  handle: string | null;
  position?: { title: string; officeType: string; level: string };
}

function gradeColor(grade: string | null) {
  if (!grade) return "text-white/40";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "text-emerald-400";
  if (g.startsWith("B")) return "text-green-400";
  if (g.startsWith("C")) return "text-yellow-400";
  if (g.startsWith("D")) return "text-orange-400";
  return "text-red-400";
}

function PoliticianRow({ p }: { p: Politician }) {
  const initial = p.fullName?.charAt(0) ?? "?";
  return (
    <Link href={`/mobile/civic/politician/${p.id}`}>
      <div className="flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors border-b border-white/5 last:border-0">
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-600 to-red-600">
          {p.photoUrl ? (
            <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
              {initial}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{p.fullName}</p>
          <p className="text-white/50 text-xs truncate">
            {p.position?.title ?? "Candidate"}{p.state ? ` · ${p.state}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {p.corruptionGrade && (
            <span className={`text-sm font-bold ${gradeColor(p.corruptionGrade)}`}>
              {p.corruptionGrade}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-white/30" />
        </div>
      </div>
    </Link>
  );
}

export function MobileElectionsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"politicians" | "candidates">("politicians");

  const { data: politicians = [], isLoading: polLoading } = useQuery<Politician[]>({
    queryKey: ["/api/politicians"],
    staleTime: 60000,
  });

  const { data: candidates = [], isLoading: candLoading } = useQuery<any[]>({
    queryKey: ["/api/candidates"],
    staleTime: 60000,
    enabled: tab === "candidates",
  });

  const filteredPols = politicians.filter((p) =>
    !query || p.fullName?.toLowerCase().includes(query.toLowerCase()) ||
    p.state?.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCands = candidates.filter((c: any) =>
    !query || c.username?.toLowerCase().includes(query.toLowerCase()) ||
    (c.firstName + " " + c.lastName).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mobile-root" data-testid="mobile-elections-page">
      {/* Top bar */}
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">Elections</h1>
            <p className="text-white/50 text-xs">Candidates & politicians</p>
          </div>
        </div>
      </div>

      {/* Segmented tab */}
      <div className="px-4 pb-3 pt-1">
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {(["politicians", "candidates"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
              style={
                tab === t
                  ? { background: "rgba(255,255,255,0.15)", color: "#fff" }
                  : { color: "rgba(255,255,255,0.45)" }
              }
            >
              {t === "politicians" ? "Politicians" : "ACP Candidates"}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name or state…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />
        </div>
      </div>

      {/* List */}
      <div className="glass-card mx-4 mb-24 overflow-hidden" style={{ borderRadius: 18 }}>
        {tab === "politicians" ? (
          polLoading ? (
            <div className="space-y-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                    <div className="h-2 bg-white/10 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPols.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-sm">No politicians found</div>
          ) : (
            filteredPols.slice(0, 80).map((p) => <PoliticianRow key={p.id} p={p} />)
          )
        ) : (
          candLoading ? (
            <div className="space-y-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                    <div className="h-2 bg-white/10 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCands.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-sm">No ACP candidates yet</div>
          ) : (
            filteredCands.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(c.firstName?.[0] ?? c.username?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.username}
                  </p>
                  <p className="text-white/50 text-xs truncate">{c.position}</p>
                </div>
                <div className="flex items-center gap-1 text-yellow-400 flex-shrink-0">
                  <Star className="w-3 h-3" />
                  <span className="text-xs">{c.endorsements ?? 0}</span>
                </div>
              </div>
            ))
          )
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
