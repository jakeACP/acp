import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft, CheckCircle2, Search, SortAsc, Share2,
  PenLine, X, Filter, TrendingUp, Clock, Target, Loader2,
} from "lucide-react";
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
  creatorId?: string;
  authorId?: string;
  category?: string;
  isActive?: boolean;
}

type SortKey = "newest" | "popular" | "goal";
type FilterKey = "all" | "open" | "complete";

const SIGNED_KEY = "acp_signed_petitions";
function loadSigned(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SIGNED_KEY) ?? "[]")); } catch { return new Set(); }
}
function saveSigned(s: Set<string>) {
  try { localStorage.setItem(SIGNED_KEY, JSON.stringify(Array.from(s))); } catch {}
}

async function sharePetition(title: string, id: string) {
  const url = `${window.location.origin}/petitions/${id}`;
  if (navigator.share) {
    await navigator.share({ title: `Sign: ${title}`, url });
  } else {
    await navigator.clipboard.writeText(url);
    return "link_copied";
  }
}

function PetitionCard({ petition, hasSigned, onSigned }: {
  petition: Petition;
  hasSigned: boolean;
  onSigned: (id: string) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [anonymous, setAnonymous] = useState(false);
  const [showAnon, setShowAnon] = useState(false);

  const pct = petition.targetSignatures > 0
    ? Math.min(100, Math.round((petition.currentSignatures / petition.targetSignatures) * 100))
    : 0;

  const isMet = pct >= 100;

  const signMutation = useMutation({
    mutationFn: () => apiRequest(`/api/petitions/${petition.id}/sign`, "POST", { isAnonymous: anonymous }),
    onSuccess: () => {
      onSigned(petition.id);
      setShowAnon(false);
      toast({ title: "✍️ Signed!", description: anonymous ? "Signed anonymously." : "Your name was recorded." });
      queryClient.invalidateQueries({ queryKey: ["/api/petitions"] });
    },
    onError: () => {
      toast({ title: "Could not sign", description: "You may have already signed this petition.", variant: "destructive" });
    },
  });

  const handleShare = async () => {
    const result = await sharePetition(petition.title, petition.id).catch(() => null);
    if (result === "link_copied") toast({ title: "Link copied!" });
  };

  return (
    <div className="glass-card p-4" data-testid={`petition-card-${petition.id}`}>
      <h3 className="text-white font-semibold text-sm mb-1.5 leading-snug">{petition.title}</h3>
      <p className="text-white/50 text-xs mb-3 line-clamp-2 leading-relaxed">{petition.description}</p>

      {/* Progress */}
      <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: isMet ? "linear-gradient(to right,#4ade80,#22c55e)" : "linear-gradient(to right,#E6393A,#3B5BA9)" }} />
      </div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-white/50 text-xs font-medium">
          {petition.currentSignatures.toLocaleString()} signed
        </span>
        <span className={`text-xs font-semibold ${isMet ? "text-green-400" : "text-white/40"}`}>
          {isMet ? "✓ Goal reached" : `Goal: ${petition.targetSignatures.toLocaleString()}`}
        </span>
      </div>

      {/* Anonymous toggle (shown when about to sign) */}
      {showAnon && !hasSigned && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-2"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div>
            <p className="text-white text-xs font-medium">Sign anonymously</p>
            <p className="text-white/40 text-[10px]">Your name won't be shown publicly</p>
          </div>
          <button onClick={() => setAnonymous((v) => !v)}
            className="w-10 h-5 rounded-full flex-shrink-0 relative transition-all"
            style={{ background: anonymous ? "#3B5BA9" : "rgba(255,255,255,0.15)" }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: anonymous ? "calc(100% - 18px)" : 2 }} />
          </button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex gap-2">
        {hasSigned ? (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-green-400"
            style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)" }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Signed
          </div>
        ) : user ? (
          <button
            onClick={() => {
              if (!showAnon) { setShowAnon(true); return; }
              signMutation.mutate();
            }}
            disabled={signMutation.isPending}
            className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            style={{
              background: signMutation.isPending ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,rgba(230,57,58,0.4),rgba(59,91,169,0.4))",
              border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
            }}
            data-testid={`sign-btn-${petition.id}`}
          >
            {signMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {showAnon ? "Confirm & Sign" : "Sign Petition"}
          </button>
        ) : (
          <Link href="/auth" className="flex-1">
            <button className="w-full py-2 rounded-xl text-sm font-semibold text-white/60 border border-white/10 bg-white/5">
              Log in to Sign
            </button>
          </Link>
        )}

        {showAnon && !hasSigned && (
          <button onClick={() => setShowAnon(false)} className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <X className="w-4 h-4 text-white/40" />
          </button>
        )}

        <button onClick={handleShare}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Share2 className="w-4 h-4 text-white/40" />
        </button>
      </div>
    </div>
  );
}

export function MobilePetitionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [signed, setSigned] = useState<Set<string>>(loadSigned);

  const { data: petitions = [], isLoading } = useQuery<Petition[]>({
    queryKey: ["/api/petitions"],
    staleTime: 30_000,
  });

  const onSigned = (id: string) => {
    const next = new Set(signed); next.add(id); setSigned(next); saveSigned(next);
  };

  const processed = useMemo(() => {
    let list = petitions;
    if (query) list = list.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()) || p.description?.toLowerCase().includes(query.toLowerCase()));
    if (filter === "open") list = list.filter((p) => (p.currentSignatures / p.targetSignatures) < 1);
    if (filter === "complete") list = list.filter((p) => (p.currentSignatures / p.targetSignatures) >= 1);
    if (sort === "newest") list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sort === "popular") list = [...list].sort((a, b) => (b.currentSignatures ?? 0) - (a.currentSignatures ?? 0));
    if (sort === "goal") list = [...list].sort((a, b) => {
      const pA = a.targetSignatures > 0 ? a.currentSignatures / a.targetSignatures : 0;
      const pB = b.targetSignatures > 0 ? b.currentSignatures / b.targetSignatures : 0;
      return pB - pA;
    });
    return list;
  }, [petitions, query, sort, filter]);

  return (
    <div className="mobile-root" data-testid="mobile-petitions-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button"><ChevronLeft className="w-5 h-5 text-white" /></button>
          </Link>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">Petitions</h1>
            <p className="text-white/50 text-xs">{petitions.length} active · {Array.from(signed).length} signed</p>
          </div>
          <Link href="/mobile/create?type=petition">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(59,91,169,0.3)", border: "1px solid rgba(59,91,169,0.4)", color: "#fff" }}>
              <PenLine className="w-3.5 h-3.5" /> Start
            </button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search petitions…"
            className="w-full rounded-2xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
          {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      {/* Sort + Filter bar */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
        {(["newest", "popular", "goal"] as SortKey[]).map((s) => (
          <button key={s} onClick={() => setSort(s)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all"
            style={sort === s
              ? { background: "rgba(59,91,169,0.4)", color: "#fff", border: "1px solid rgba(59,91,169,0.5)" }
              : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {s === "newest" && <Clock className="w-3 h-3" />}
            {s === "popular" && <TrendingUp className="w-3 h-3" />}
            {s === "goal" && <Target className="w-3 h-3" />}
            {s === "newest" ? "Newest" : s === "popular" ? "Most Signed" : "Near Goal"}
          </button>
        ))}
        <div className="w-px bg-white/10 flex-shrink-0 self-stretch" />
        {(["all", "open", "complete"] as FilterKey[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all"
            style={filter === f
              ? { background: "rgba(230,57,58,0.3)", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }
              : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Filter className="w-3 h-3" />
            {f === "all" ? "All" : f === "open" ? "Open" : "Goal Met"}
          </button>
        ))}
      </div>

      <div className="px-4 pb-28 space-y-3">
        {isLoading ? (
          [1,2,3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/10 rounded w-full mb-1" />
              <div className="h-3 bg-white/10 rounded w-2/3 mb-3" />
              <div className="h-1.5 bg-white/10 rounded-full mb-2" />
              <div className="h-8 bg-white/10 rounded-xl" />
            </div>
          ))
        ) : processed.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-5xl mb-3">✍️</span>
            <p className="text-white/60 font-semibold">{query ? "No results" : "No petitions"}</p>
            <p className="text-white/35 text-sm mt-1">{query ? "Try a different search." : "Start one from the website."}</p>
          </div>
        ) : (
          <>
            <p className="text-white/35 text-xs px-1">{processed.length} petition{processed.length !== 1 ? "s" : ""}</p>
            {processed.map((p) => (
              <PetitionCard key={p.id} petition={p} hasSigned={signed.has(p.id)} onSigned={onSigned} />
            ))}
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
