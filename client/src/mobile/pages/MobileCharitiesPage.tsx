import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Search, Heart, Ban } from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import "../mobile-theme.css";

interface Charity {
  id: string;
  name: string;
  description: string;
  category?: string;
  websiteUrl?: string;
  logoUrl?: string;
  isVerified?: boolean;
}

interface Boycott {
  id: string;
  name: string;
  description: string;
  reason?: string;
  targetCompany?: string;
  supportCount?: number;
  logoUrl?: string;
}

function CharityRow({ charity }: { charity: Charity }) {
  const initial = charity.name?.charAt(0) ?? "?";
  return (
    <Link href={`/charities/${charity.id}`}>
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 active:bg-white/5 transition-colors">
        <div
          className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
          style={{ background: "rgba(230,57,58,0.2)" }}
        >
          {charity.logoUrl ? (
            <img src={charity.logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{charity.name}</p>
          <p className="text-white/45 text-xs truncate line-clamp-1">{charity.description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/25 flex-shrink-0" />
      </div>
    </Link>
  );
}

function BoycottRow({ boycott }: { boycott: Boycott }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0">
      <div
        className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
        style={{ background: "rgba(230,57,58,0.15)" }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <Ban className="w-5 h-5 text-red-400" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{boycott.targetCompany ?? boycott.name}</p>
        <p className="text-white/45 text-xs line-clamp-1">{boycott.reason ?? boycott.description}</p>
      </div>
      {boycott.supportCount != null && (
        <span className="text-white/35 text-xs flex-shrink-0">{boycott.supportCount.toLocaleString()}</span>
      )}
    </div>
  );
}

export function MobileCharitiesPage() {
  const [tab, setTab] = useState<"charities" | "boycotts">("charities");
  const [query, setQuery] = useState("");

  const { data: charities = [], isLoading: charitiesLoading } = useQuery<Charity[]>({
    queryKey: ["/api/charities"],
    staleTime: 60000,
    enabled: tab === "charities",
  });

  const { data: boycotts = [], isLoading: boycottsLoading } = useQuery<Boycott[]>({
    queryKey: ["/api/boycotts"],
    staleTime: 60000,
    enabled: tab === "boycotts",
  });

  const filteredCharities = charities.filter(
    (c) => !query || c.name?.toLowerCase().includes(query.toLowerCase())
  );
  const filteredBoycotts = boycotts.filter(
    (b) =>
      !query ||
      (b.targetCompany ?? b.name)?.toLowerCase().includes(query.toLowerCase())
  );

  const isLoading = tab === "charities" ? charitiesLoading : boycottsLoading;

  return (
    <div className="mobile-root" data-testid="mobile-charities-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">
              {tab === "charities" ? "Charities" : "Boycotts"}
            </h1>
            <p className="text-white/50 text-xs">Consumer & civic action</p>
          </div>
        </div>
      </div>

      {/* Segmented tab */}
      <div className="px-4 pb-3 pt-1">
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {(["charities", "boycotts"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setQuery(""); }}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
              style={
                tab === t
                  ? { background: "rgba(255,255,255,0.15)", color: "#fff" }
                  : { color: "rgba(255,255,255,0.45)" }
              }
            >
              {t === "charities" ? <Heart className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
              {t === "charities" ? "Charities" : "Boycotts"}
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
            placeholder={`Search ${tab}…`}
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
      <div className="pb-28 px-4">
        <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-2 bg-white/10 rounded w-3/4" />
                </div>
              </div>
            ))
          ) : tab === "charities" ? (
            filteredCharities.length === 0 ? (
              <div className="py-12 text-center">
                <span className="text-4xl block mb-3">❤️</span>
                <p className="text-white/40 text-sm">No charities yet</p>
              </div>
            ) : (
              filteredCharities.map((c) => <CharityRow key={c.id} charity={c} />)
            )
          ) : filteredBoycotts.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-4xl block mb-3">✊</span>
              <p className="text-white/40 text-sm">No boycotts yet</p>
            </div>
          ) : (
            filteredBoycotts.map((b) => <BoycottRow key={b.id} boycott={b} />)
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
