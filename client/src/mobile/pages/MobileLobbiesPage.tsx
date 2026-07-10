import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Building2, ChevronRight, TrendingUp, Scale } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useScrollLight } from "../hooks/useScrollLight";
import "../mobile-theme.css";

type SIG = {
  id: string;
  name: string;
  acronym?: string;
  tag?: string;
  description?: string;
  category: string;
  sentiment?: string;
  influenceScore?: number | null;
  letterGrade?: string | null;
  spendRange?: string | null;
  partySplitDem?: number | null;
  partySplitRep?: number | null;
  industry?: string | null;
  isAce?: boolean;
};

function isFecId(name: string) {
  return /^C\d{7,9}$/.test((name || "").trim());
}

function effectiveSentiment(sig: SIG) {
  if (sig.sentiment === "positive" || sig.sentiment === "negative" || sig.sentiment === "neutral") return sig.sentiment;
  if (sig.influenceScore != null) {
    if (sig.influenceScore > 0) return "positive";
    if (sig.influenceScore < 0) return "negative";
  }
  return "neutral";
}

function sentimentLabel(s: string) {
  if (s === "positive") return "Reform";
  if (s === "negative") return "Corrupting";
  return "Neutral";
}

function sentimentColor(s: string) {
  if (s === "positive") return "text-green-400 bg-green-500/15";
  if (s === "negative") return "text-red-400 bg-red-500/15";
  return "text-white/60 bg-white/10";
}

function gradeColor(grade?: string | null) {
  if (!grade) return "text-white/50";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "text-green-400";
  if (g.startsWith("B")) return "text-blue-400";
  if (g.startsWith("C")) return "text-yellow-400";
  if (g.startsWith("D")) return "text-orange-400";
  return "text-red-400";
}

function parseSpendLower(spendRange?: string | null) {
  if (!spendRange) return 0;
  const m = spendRange.match(/\$([\d.]+)([BM]?)/);
  if (!m) return 0;
  const val = parseFloat(m[1]);
  return m[2] === "B" ? val * 1000 : val;
}

function LobbyCard({ sig }: { sig: SIG }) {
  const sentiment = effectiveSentiment(sig);
  const dem = sig.partySplitDem ?? 0;
  const rep = sig.partySplitRep ?? 0;
  const hasSplit = dem > 0 || rep > 0;
  return (
    <Link href={`/lobbies/${sig.tag || sig.id}`}>
      <div className="glass-card p-4 active:opacity-80 transition-opacity">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/15">
            <Building2 className="w-5 h-5 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm text-white leading-tight truncate">{sig.name}</p>
                {sig.acronym && <p className="text-[11px] text-white/50 mt-0.5">{sig.acronym}</p>}
              </div>
              {sig.letterGrade && (
                <span className={`text-lg font-black flex-shrink-0 ${gradeColor(sig.letterGrade)}`}>{sig.letterGrade}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${sentimentColor(sentiment)}`}>
                {sentimentLabel(sentiment)}
              </span>
              <span className="text-[10px] bg-white/10 text-white/60 rounded px-1.5 py-0.5 capitalize">{sig.category}</span>
              {sig.spendRange && (
                <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
                  <TrendingUp className="w-3 h-3" />{sig.spendRange}
                </span>
              )}
            </div>
            {hasSplit && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full overflow-hidden bg-white/10 flex">
                  <div className="bg-blue-500 h-full" style={{ width: `${dem}%` }} />
                  <div className="bg-red-500 h-full" style={{ width: `${rep}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-white/40 mt-0.5">
                  <span>D {dem}%</span>
                  <span>R {rep}%</span>
                </div>
              </div>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0 self-center" />
        </div>
      </div>
    </Link>
  );
}

export function MobileLobbiesPage() {
  useScrollLight();
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");
  const [sortBy, setSortBy] = useState<"spend" | "influence" | "name">("spend");

  const { data: allSigs = [], isLoading } = useQuery<SIG[]>({ queryKey: ["/api/sigs"] });

  const filtered = useMemo(() => {
    let list = allSigs.filter((s) => !isFecId(s.name));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.acronym || "").toLowerCase().includes(q) ||
          (s.category || "").toLowerCase().includes(q) ||
          (s.industry || "").toLowerCase().includes(q)
      );
    }
    if (sentimentFilter !== "all") {
      list = list.filter((s) => effectiveSentiment(s) === sentimentFilter);
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "influence") return Math.abs(b.influenceScore ?? 0) - Math.abs(a.influenceScore ?? 0);
      return parseSpendLower(b.spendRange) - parseSpendLower(a.spendRange);
    });
    return list;
  }, [allSigs, search, sentimentFilter, sortBy]);

  const filterChips: { id: typeof sentimentFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "negative", label: "Corrupting" },
    { id: "positive", label: "Reform" },
    { id: "neutral", label: "Neutral" },
  ];

  const sortChips: { id: typeof sortBy; label: string }[] = [
    { id: "spend", label: "Top Spend" },
    { id: "influence", label: "Influence" },
    { id: "name", label: "A–Z" },
  ];

  return (
    <div className="mobile-root" data-testid="mobile-lobbies-page">
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <Scale className="w-6 h-6 text-white" />
          <h1 className="text-white font-bold text-2xl">Lobbies</h1>
        </div>
        <p className="text-white/50 text-sm mt-1">Special interest groups & their influence</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-3">
        <div className="relative sticky top-0 z-10 pt-1 pb-2" style={{ background: "transparent" }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 mt-0.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lobbies, sectors..."
            className="w-full rounded-full pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none border border-white/15 focus:border-white/30 transition-colors"
            style={{ background: "rgba(255,255,255,0.08)" }}
            data-testid="input-lobby-search"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {filterChips.map((c) => (
            <button
              key={c.id}
              onClick={() => setSentimentFilter(c.id)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors ${
                sentimentFilter === c.id
                  ? "bg-white/20 border-white/30 text-white"
                  : "bg-white/5 border-white/10 text-white/60"
              }`}
            >
              {c.label}
            </button>
          ))}
          <div className="w-px bg-white/15 my-1 flex-shrink-0" />
          {sortChips.map((c) => (
            <button
              key={c.id}
              onClick={() => setSortBy(c.id)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors ${
                sortBy === c.id
                  ? "bg-blue-500/25 border-blue-400/40 text-white"
                  : "bg-white/5 border-white/10 text-white/60"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card p-4 flex gap-3">
                <div className="w-11 h-11 rounded-xl skeleton flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-white/50 space-y-2">
            <Building2 className="w-12 h-12 mx-auto text-white/20" />
            <p className="text-sm">No lobbies match your search.</p>
          </div>
        ) : (
          <>
            <p className="text-white/40 text-xs px-1">{filtered.length} lobbies</p>
            {filtered.map((sig) => (
              <LobbyCard key={sig.id} sig={sig} />
            ))}
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}