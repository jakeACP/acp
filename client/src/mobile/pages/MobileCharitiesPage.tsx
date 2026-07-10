import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft, ChevronRight, Search, Heart, Ban, X,
  ExternalLink, Users, CheckCircle2, Globe, Loader2,
} from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import "../mobile-theme.css";

interface Charity {
  id: string;
  name: string;
  description: string;
  category?: string;
  websiteUrl?: string;
  logoUrl?: string;
  isVerified?: boolean;
  isActive?: boolean;
  totalDonations?: string | number;
}

interface Boycott {
  id: string;
  name: string;
  description: string;
  reason?: string;
  targetCompany?: string;
  subscriberCount?: number;
  supportCount?: number;
  logoUrl?: string;
  isActive?: boolean;
  tags?: string[];
}

interface UserBoycott { id: string; boycottId: string; }

function CharityCard({ charity }: { charity: Charity }) {
  const initial = charity.name?.charAt(0) ?? "?";
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0">
      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
        style={{ background: "rgba(230,57,58,0.15)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {charity.logoUrl
          ? <img src={charity.logoUrl} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-400" />
            </div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-white text-sm font-medium truncate">{charity.name}</p>
          {charity.isVerified && <CheckCircle2 className="w-3 h-3 text-blue-400 flex-shrink-0" />}
        </div>
        <p className="text-white/45 text-xs truncate">{charity.description}</p>
        {charity.category && (
          <span className="text-[10px] text-blue-400/70 font-medium">{charity.category}</span>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {charity.websiteUrl && (
          <a href={charity.websiteUrl} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
            style={{ background: "rgba(59,91,169,0.2)", color: "rgba(147,197,253,0.9)", border: "1px solid rgba(59,91,169,0.3)" }}>
            <Globe className="w-3 h-3" /> Visit
          </a>
        )}
        <a href={`/charities/${charity.id}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <ExternalLink className="w-3 h-3" /> Details
        </a>
      </div>
    </div>
  );
}

function BoycottCard({ boycott, isFollowing, onToggle }: {
  boycott: Boycott;
  isFollowing: boolean;
  onToggle: (id: string, follow: boolean) => void;
}) {
  const count = boycott.subscriberCount ?? boycott.supportCount ?? 0;

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-white/5 last:border-0">
      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)" }}>
        {boycott.logoUrl
          ? <img src={boycott.logoUrl} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-400" />
            </div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{boycott.targetCompany ?? boycott.name}</p>
        <p className="text-white/45 text-xs mt-0.5 line-clamp-2 leading-relaxed">{boycott.reason ?? boycott.description}</p>
        {count > 0 && (
          <div className="flex items-center gap-1 mt-1 text-white/35">
            <Users className="w-3 h-3" />
            <span className="text-[10px]">{count.toLocaleString()} supporting</span>
          </div>
        )}
        {(boycott.tags ?? []).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {(boycott.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded text-white/40 bg-white/5">#{tag}</span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => onToggle(boycott.id, !isFollowing)}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.95]"
        style={isFollowing
          ? { background: "rgba(239,68,68,0.15)", color: "rgba(248,113,113,0.9)", border: "1px solid rgba(239,68,68,0.3)" }
          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}
        data-testid={`boycott-follow-${boycott.id}`}>
        {isFollowing ? "✓ Following" : "+ Join"}
      </button>
    </div>
  );
}

export function MobileCharitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isBoycottsRoute = window.location.pathname.includes("boycotts");
  const [tab, setTab] = useState<"charities" | "boycotts">(isBoycottsRoute ? "boycotts" : "charities");
  const [query, setQuery] = useState("");

  const { data: charities = [], isLoading: charitiesLoading } = useQuery<Charity[]>({
    queryKey: ["/api/charities"],
    staleTime: 60_000,
    enabled: tab === "charities",
  });

  const { data: boycotts = [], isLoading: boycottsLoading } = useQuery<Boycott[]>({
    queryKey: ["/api/boycotts"],
    staleTime: 60_000,
    enabled: tab === "boycotts",
  });

  const { data: userBoycotts = [] } = useQuery<UserBoycott[]>({
    queryKey: ["/api/user/boycotts"],
    enabled: !!user && tab === "boycotts",
    staleTime: 30_000,
  });

  const followedIds = new Set(userBoycotts.map((b) => b.boycottId));

  const followMutation = useMutation({
    mutationFn: ({ id, follow }: { id: string; follow: boolean }) =>
      follow
        ? apiRequest(`/api/boycotts/${id}/subscribe`, "POST", {})
        : apiRequest(`/api/boycotts/${id}/subscribe`, "DELETE"),
    onSuccess: (_, { follow }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/boycotts"] });
      toast({ title: follow ? "Joined boycott" : "Left boycott" });
    },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const handleBoycottToggle = (id: string, follow: boolean) => {
    if (!user) { toast({ title: "Log in to follow boycotts" }); return; }
    followMutation.mutate({ id, follow });
  };

  const filteredCharities = useMemo(() =>
    charities.filter((c) => !query || c.name?.toLowerCase().includes(query.toLowerCase()) || c.category?.toLowerCase().includes(query.toLowerCase())),
    [charities, query]);

  const filteredBoycotts = useMemo(() =>
    boycotts.filter((b) => !query || (b.targetCompany ?? b.name)?.toLowerCase().includes(query.toLowerCase()) || b.reason?.toLowerCase().includes(query.toLowerCase())),
    [boycotts, query]);

  const isLoading = tab === "charities" ? charitiesLoading : boycottsLoading;

  return (
    <div className="mobile-root" data-testid="mobile-charities-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button"><ChevronLeft className="w-5 h-5 text-white" /></button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">{tab === "charities" ? "Charities" : "Boycotts"}</h1>
            <p className="text-white/50 text-xs">Consumer &amp; civic action</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 pt-1">
        <div className="flex rounded-2xl p-1 gap-1"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {(["charities", "boycotts"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setQuery(""); }}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
              style={tab === t ? { background: "rgba(255,255,255,0.15)", color: "#fff" } : { color: "rgba(255,255,255,0.45)" }}>
              {t === "charities" ? <Heart className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
              {t === "charities" ? "Charities" : "Boycotts"}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <input type="search" placeholder={`Search ${tab}…`} value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-white/30 outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
          {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      {/* Following summary for boycotts */}
      {tab === "boycotts" && user && followedIds.size > 0 && (
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <Ban className="w-3.5 h-3.5 text-red-400" />
          <p className="text-red-400/80 text-xs font-medium">Following {followedIds.size} boycott{followedIds.size !== 1 ? "s" : ""}</p>
        </div>
      )}

      {/* List */}
      <div className="pb-28 px-4">
        <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
          {isLoading ? (
            [1,2,3,4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 animate-pulse">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex-shrink-0" />
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
                <p className="text-white/40 text-sm">{query ? "No results" : "No charities yet"}</p>
              </div>
            ) : (
              filteredCharities.map((c) => <CharityCard key={c.id} charity={c} />)
            )
          ) : (
            filteredBoycotts.length === 0 ? (
              <div className="py-12 text-center">
                <span className="text-4xl block mb-3">✊</span>
                <p className="text-white/40 text-sm">{query ? "No results" : "No boycotts yet"}</p>
              </div>
            ) : (
              filteredBoycotts.map((b) => (
                <BoycottCard key={b.id} boycott={b}
                  isFollowing={followedIds.has(b.id)}
                  onToggle={handleBoycottToggle} />
              ))
            )
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
