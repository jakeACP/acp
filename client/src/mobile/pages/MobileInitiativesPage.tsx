import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Search, ThumbsUp, Filter, X, ExternalLink } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

interface Initiative {
  id: string;
  title: string;
  description: string;
  status: string;
  supportCount?: number;
  createdBy?: string;
  createdAt?: string;
  jurisdictionId?: string;
}

type StatusFilter = "all" | "active" | "collecting" | "qualified" | "passed" | "failed" | "draft";

const STATUS_OPTIONS: { value: StatusFilter; label: string; color: string; bg: string }[] = [
  { value: "all",        label: "All",        color: "rgba(255,255,255,0.6)",  bg: "rgba(255,255,255,0.08)" },
  { value: "active",     label: "Active",     color: "#4ade80",                bg: "rgba(74,222,128,0.12)" },
  { value: "collecting", label: "Collecting", color: "#60a5fa",                bg: "rgba(96,165,250,0.12)" },
  { value: "qualified",  label: "Qualified",  color: "#c084fc",                bg: "rgba(192,132,252,0.12)" },
  { value: "passed",     label: "Passed",     color: "#34d399",                bg: "rgba(52,211,153,0.12)" },
  { value: "failed",     label: "Failed",     color: "#f87171",                bg: "rgba(248,113,113,0.12)" },
  { value: "draft",      label: "Draft",      color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)" },
];

function statusStyle(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s?.toLowerCase()) ?? STATUS_OPTIONS[0];
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function InitiativeCard({ initiative }: { initiative: Initiative }) {
  const st = statusStyle(initiative.status);
  return (
    <a href={`/initiatives/${initiative.id}`} target="_blank" rel="noopener noreferrer">
      <div className="flex items-start gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 active:bg-white/5 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}22` }}>
              {initiative.status ?? "draft"}
            </span>
            {initiative.createdAt && (
              <span className="text-white/25 text-[10px]">{timeAgo(initiative.createdAt)}</span>
            )}
          </div>
          <p className="text-white text-sm font-medium leading-snug">{initiative.title}</p>
          <p className="text-white/45 text-xs mt-0.5 line-clamp-2 leading-relaxed">{initiative.description}</p>

          {initiative.supportCount != null && initiative.supportCount > 0 && (
            <div className="flex items-center gap-1 mt-1.5 text-blue-400/70">
              <ThumbsUp className="w-3 h-3" />
              <span className="text-[10px]">{initiative.supportCount.toLocaleString()} supporters</span>
            </div>
          )}
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-white/20 flex-shrink-0 mt-1" />
      </div>
    </a>
  );
}

export function MobileInitiativesPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: initiatives = [], isLoading } = useQuery<Initiative[]>({
    queryKey: ["/api/initiatives"],
    staleTime: 60_000,
  });

  const processed = useMemo(() => {
    let list = initiatives;
    if (statusFilter !== "all") list = list.filter((i) => i.status?.toLowerCase() === statusFilter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
    }
    return list;
  }, [initiatives, query, statusFilter]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of initiatives) {
      const k = i.status?.toLowerCase() ?? "draft";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [initiatives]);

  return (
    <div className="mobile-root" data-testid="mobile-initiatives-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button"><ChevronLeft className="w-5 h-5 text-white" /></button>
          </Link>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">Initiatives</h1>
            <p className="text-white/50 text-xs">{initiatives.length} community proposals</p>
          </div>
          <a href="/initiatives/new" target="_blank" rel="noopener noreferrer">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(59,91,169,0.3)", border: "1px solid rgba(59,91,169,0.4)", color: "#fff" }}>
              + New
            </button>
          </a>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search initiatives…"
            className="w-full rounded-2xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
          {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
        {STATUS_OPTIONS.map((opt) => {
          const count = opt.value === "all" ? initiatives.length : (countByStatus[opt.value] ?? 0);
          if (opt.value !== "all" && count === 0) return null;
          return (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all"
              style={statusFilter === opt.value
                ? { background: opt.bg, color: opt.color, border: `1px solid ${opt.color}55` }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {opt.label}
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-28">
        {isLoading ? (
          <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
            {[1,2,3].map((i) => (
              <div key={i} className="px-4 py-3.5 border-b border-white/5 animate-pulse">
                <div className="h-3 bg-white/10 rounded w-1/4 mb-2" />
                <div className="h-4 bg-white/10 rounded w-3/4 mb-1" />
                <div className="h-3 bg-white/10 rounded w-full" />
              </div>
            ))}
          </div>
        ) : processed.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-5xl mb-3">🌱</span>
            <p className="text-white/60 font-semibold">{query ? "No results" : "No initiatives"}</p>
            <p className="text-white/35 text-sm mt-1">
              {query ? "Try a different search term." : "Start one from the full website."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-white/35 text-xs px-1 mb-2">{processed.length} initiative{processed.length !== 1 ? "s" : ""}</p>
            <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
              {processed.map((i) => <InitiativeCard key={i.id} initiative={i} />)}
            </div>
            <p className="text-white/25 text-xs text-center mt-3 flex items-center justify-center gap-1">
              <ExternalLink className="w-3 h-3" /> Tap any initiative to view details on the full site
            </p>
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
