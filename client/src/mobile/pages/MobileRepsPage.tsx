import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, User, DollarSign, ShieldCheck, ShieldX, ChevronRight, Star, AlertTriangle, Users, UserPlus, Heart } from "lucide-react";
import { Link } from "wouter";
import "../mobile-theme.css";

interface CandidateWithUser {
  id: string;
  userId: string;
  position: string;
  platform?: string;
  proposals: { id: string; title: string; description: string }[];
  endorsements: number;
  isActive: boolean;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface Demerit {
  label: string;
  type: string;
}

interface PoliticianPosition {
  id: string;
  title: string;
  officeType: string;
  level: string;
  jurisdiction: string;
  district: string | null;
  termLength: number | null;
  isElected: boolean;
  displayOrder: number;
}

interface Politician {
  id: string;
  fullName: string;
  party: string | null;
  position: PoliticianPosition;
  state: string | null;
  photoUrl: string | null;
  corruptionGrade: string | null;
  numericScore: number | null;
  isCurrent: boolean;
  isVerified: boolean;
  profileType: string | null;
  handle: string | null;
  totalLobbyAmount?: number;
  sigAcronyms?: string[];
  rejectsAIPAC?: boolean;
  demerits?: Demerit[];
}

interface RepsResponse {
  state: string;
  districtLabel: string;
  zipCode: string;
  politicians: Politician[];
}

function gradeColor(grade: string | null | undefined) {
  if (!grade) return "text-white/50";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "text-green-400";
  if (g.startsWith("B")) return "text-blue-400";
  if (g.startsWith("C")) return "text-yellow-400";
  if (g.startsWith("D")) return "text-orange-400";
  return "text-red-400";
}

function partyColor(party: string | null) {
  const p = party?.toLowerCase() ?? "";
  if (p.includes("democrat")) return "bg-blue-600";
  if (p.includes("republican")) return "bg-red-600";
  if (p.includes("anti-corruption") || p.includes("acp")) return "bg-purple-600";
  return "bg-slate-600";
}

function partyInitial(party: string | null) {
  const p = party?.toLowerCase() ?? "";
  if (p.includes("democrat")) return "D";
  if (p.includes("republican")) return "R";
  if (p.includes("anti-corruption") || p.includes("acp")) return "ACP";
  return party?.charAt(0)?.toUpperCase() ?? "?";
}

function formatMoney(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function isSenator(rep: Politician) {
  const title = rep.position?.title?.toLowerCase() ?? "";
  return title.includes("senator") || title.includes("senate");
}

function RepCard({ rep }: { rep: Politician }) {
  return (
    <Link href={`/politicians/${rep.id}`}>
      <div className="glass-card p-4 flex items-start gap-3 active:opacity-80 transition-opacity">
        <div className="flex-shrink-0">
          {rep.photoUrl ? (
            <img
              src={rep.photoUrl}
              alt={rep.fullName}
              className="w-14 h-14 rounded-full object-cover border-2 border-white/20"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20">
              <User className="w-7 h-7 text-white/50" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm text-white leading-tight">{rep.fullName}</p>
              <p className="text-xs text-white/60 mt-0.5 leading-snug truncate">{rep.position?.title}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {rep.corruptionGrade && (
                <span className={`text-lg font-black ${gradeColor(rep.corruptionGrade)}`}>{rep.corruptionGrade}</span>
              )}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${partyColor(rep.party)} text-white`}>
                {partyInitial(rep.party)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {rep.rejectsAIPAC && (
              <div className="flex items-center gap-1 text-green-400">
                <ShieldCheck className="w-3 h-3" />
                <span className="text-[10px] font-semibold">Rejects AIPAC</span>
              </div>
            )}
            {(rep.totalLobbyAmount ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <DollarSign className="w-3 h-3" />
                <span className="text-[10px]">{formatMoney(rep.totalLobbyAmount!)} lobby</span>
              </div>
            )}
            {(rep.sigAcronyms ?? []).slice(0, 2).map((sig) => (
              <span key={sig} className="text-[10px] bg-white/10 text-white/70 rounded px-1.5 py-0.5">
                {sig}
              </span>
            ))}
          </div>

          {(rep.demerits ?? []).length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 text-red-400">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span className="text-[10px]">{rep.demerits![0].label}</span>
              {rep.demerits!.length > 1 && (
                <span className="text-[10px] text-white/40">+{rep.demerits!.length - 1} more</span>
              )}
            </div>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0 self-center" />
      </div>
    </Link>
  );
}

function CurrentRepsTab() {
  const [zipInput, setZipInput] = useState("");
  const [activeZip, setActiveZip] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<RepsResponse>({
    queryKey: ["/api/representatives/by-zip", activeZip],
    queryFn: async () => {
      const res = await fetch(`/api/representatives/by-zip/${activeZip}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Lookup failed");
      }
      return res.json();
    },
    enabled: !!activeZip,
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = zipInput.trim().slice(0, 5);
    if (/^\d{5}$/.test(clean)) {
      setActiveZip(clean);
    }
  };

  const senators = data?.politicians.filter(isSenator) ?? [];
  const reps = data?.politicians.filter((p) => !isSenator(p)) ?? [];

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="Enter ZIP code"
            inputMode="numeric"
            maxLength={5}
            className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
            data-testid="input-zip"
          />
        </div>
        <Button
          type="submit"
          disabled={zipInput.length !== 5 || isLoading}
          className="bg-[#3C3B6E] hover:bg-[#4d4c8a] text-white border-0"
          data-testid="button-zip-search"
        >
          <Search className="w-4 h-4" />
        </Button>
      </form>

      {!activeZip && (
        <div className="text-center py-12 text-white/50 space-y-2">
          <MapPin className="w-12 h-12 mx-auto text-white/20" />
          <p className="text-base font-semibold">Search Your ZIP Code</p>
          <p className="text-sm">Find the U.S. Senators and House Representative for your district.</p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 flex gap-3">
              <div className="w-14 h-14 rounded-full skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="glass-card p-4 text-center">
          <ShieldX className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-400 font-semibold">Could not find results</p>
          <p className="text-xs text-white/50 mt-1">{(error as Error).message}</p>
        </div>
      )}

      {data && !isLoading && (
        <>
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <MapPin className="w-3.5 h-3.5" />
            <span>{data.state} · {data.districtLabel}</span>
            <span className="ml-auto text-white/40">{data.politicians.length} reps found</span>
          </div>

          {senators.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                <p className="text-xs font-bold text-white/70 uppercase tracking-wide">U.S. Senators</p>
              </div>
              {senators.map((rep) => (
                <RepCard key={rep.id} rep={rep} />
              ))}
            </div>
          )}

          {reps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-blue-400" />
                <p className="text-xs font-bold text-white/70 uppercase tracking-wide">House Representative</p>
              </div>
              {reps.map((rep) => (
                <RepCard key={rep.id} rep={rep} />
              ))}
            </div>
          )}

          {data.politicians.length === 0 && (
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-white/60">No representatives found for ZIP {data.zipCode}.</p>
              <p className="text-xs text-white/40 mt-1">Try searching a neighboring zip code.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: CandidateWithUser }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const displayName =
    [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || candidate.username;

  const { data: myCandidacy } = useQuery<{ isSupporting?: boolean } | null>({
    queryKey: ["/api/candidates", candidate.id, "support-status"],
    queryFn: async () => {
      const res = await fetch(`/api/candidates/${candidate.id}/support-status`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  const [supported, setSupported] = useState<boolean | null>(null);
  const isSupported = supported ?? myCandidacy?.isSupporting ?? false;

  const supportMutation = useMutation({
    mutationFn: async (nextSupport: boolean) => {
      if (nextSupport) {
        await apiRequest(`/api/candidates/${candidate.id}/support`, "POST");
      } else {
        await apiRequest(`/api/candidates/${candidate.id}/support`, "DELETE");
      }
      return nextSupport;
    },
    onSuccess: (nextSupport) => {
      setSupported(nextSupport);
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({ title: nextSupport ? "Endorsement added" : "Endorsement removed" });
    },
    onError: (e: Error) => {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="glass-card p-4 space-y-3">
      <Link href={`/candidates/${candidate.id}`}>
        <div className="flex items-start gap-3 active:opacity-80 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20 flex-shrink-0">
            <User className="w-6 h-6 text-white/50" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white leading-tight">{displayName}</p>
            <p className="text-xs text-white/60 mt-0.5">{candidate.position}</p>
            <div className="flex items-center gap-1 mt-1 text-pink-400">
              <Heart className="w-3 h-3" />
              <span className="text-[10px]">{candidate.endorsements} endorsements</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0 self-center" />
        </div>
      </Link>

      {candidate.platform && (
        <p className="text-xs text-white/60 leading-snug line-clamp-2">{candidate.platform}</p>
      )}

      {user && user.id !== candidate.userId && (
        <Button
          onClick={() => supportMutation.mutate(!isSupported)}
          disabled={supportMutation.isPending}
          className={`w-full h-9 text-xs border-0 ${
            isSupported
              ? "bg-white/15 hover:bg-white/20 text-white"
              : "bg-[#3C3B6E] hover:bg-[#4d4c8a] text-white"
          }`}
          data-testid={`button-support-${candidate.id}`}
        >
          <Heart className={`w-3.5 h-3.5 mr-1.5 ${isSupported ? "fill-pink-400 text-pink-400" : ""}`} />
          {isSupported ? "Endorsed" : "Endorse"}
        </Button>
      )}
    </div>
  );
}

function CandidatesTab() {
  const { user } = useAuth();
  const { data: candidates = [], isLoading } = useQuery<CandidateWithUser[]>({
    queryKey: ["/api/candidates"],
  });

  const active = candidates.filter((c) => c.isActive);

  return (
    <div className="space-y-4">
      {user && (
        <Link href="/political-profile">
          <div className="glass-card p-4 flex items-center gap-3 active:opacity-80 transition-opacity border border-white/15">
            <div className="w-10 h-10 rounded-full bg-[#3C3B6E] flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Run for office</p>
              <p className="text-xs text-white/50">Register as a candidate & share your platform</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30" />
          </div>
        </Link>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 flex gap-3">
              <div className="w-12 h-12 rounded-full skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="text-center py-12 text-white/50 space-y-2">
          <Users className="w-12 h-12 mx-auto text-white/20" />
          <p className="text-base font-semibold">No active candidates yet</p>
          <p className="text-sm">Check back soon or register to run for office.</p>
        </div>
      ) : (
        <>
          <p className="text-white/40 text-xs px-1">{active.length} candidates running</p>
          {active.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </>
      )}
    </div>
  );
}

export function MobileRepsPage() {
  const [tab, setTab] = useState<"reps" | "candidates">("reps");

  return (
    <div className="mobile-root" data-testid="mobile-reps-page">
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-white font-bold text-2xl">Representatives</h1>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setTab("reps")}
            className={`flex-1 py-2 rounded-full text-xs font-semibold border transition-colors ${
              tab === "reps"
                ? "bg-white/20 border-white/30 text-white"
                : "bg-white/5 border-white/10 text-white/60"
            }`}
            data-testid="tab-current-reps"
          >
            Current Representatives
          </button>
          <button
            onClick={() => setTab("candidates")}
            className={`flex-1 py-2 rounded-full text-xs font-semibold border transition-colors ${
              tab === "candidates"
                ? "bg-white/20 border-white/30 text-white"
                : "bg-white/5 border-white/10 text-white/60"
            }`}
            data-testid="tab-candidates"
          >
            Election Candidates
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-28">
        {tab === "reps" ? <CurrentRepsTab /> : <CandidatesTab />}
      </div>

      <MobileBottomNav />
    </div>
  );
}
