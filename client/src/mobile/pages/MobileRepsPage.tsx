import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileTopBar } from "../components/MobileTopBar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, User, DollarSign, ShieldCheck, ShieldX, ChevronRight, Star, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import "../mobile-theme.css";

interface Demerit {
  label: string;
  type: string;
}

interface Politician {
  id: number;
  name: string;
  party: string;
  position: string;
  state: string;
  district?: string | null;
  photoUrl?: string | null;
  grade?: string | null;
  isCurrent?: boolean;
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

function partyColor(party: string) {
  const p = party?.toLowerCase() ?? "";
  if (p.includes("democrat")) return "bg-blue-600";
  if (p.includes("republican")) return "bg-red-600";
  if (p.includes("anti-corruption") || p.includes("acp")) return "bg-purple-600";
  return "bg-slate-600";
}

function partyInitial(party: string) {
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

function RepCard({ rep }: { rep: Politician }) {
  return (
    <Link href={`/politicians/${rep.id}`}>
      <div className="glass-card p-4 flex items-start gap-3 active:opacity-80 transition-opacity">
        <div className="flex-shrink-0">
          {rep.photoUrl ? (
            <img
              src={rep.photoUrl}
              alt={rep.name}
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
            <div>
              <p className="font-bold text-sm text-white leading-tight">{rep.name}</p>
              <p className="text-xs text-white/60 mt-0.5 leading-snug">{rep.position}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {rep.grade && (
                <span className={`text-lg font-black ${gradeColor(rep.grade)}`}>{rep.grade}</span>
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

export function MobileRepsPage() {
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

  const senators = data?.politicians.filter((p) =>
    p.position?.toLowerCase().includes("senator")
  ) ?? [];
  const reps = data?.politicians.filter((p) =>
    !p.position?.toLowerCase().includes("senator")
  ) ?? [];

  return (
    <div className="mobile-root" data-testid="mobile-reps-page">
      <MobileTopBar title="REPS" subtitle="Find Your Representatives" />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
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
            />
          </div>
          <Button
            type="submit"
            disabled={zipInput.length !== 5 || isLoading}
            className="bg-[#3C3B6E] hover:bg-[#4d4c8a] text-white border-0"
          >
            <Search className="w-4 h-4" />
          </Button>
        </form>

        {!activeZip && (
          <div className="text-center py-12 text-white/50 space-y-2">
            <MapPin className="w-12 h-12 mx-auto text-white/20" />
            <p className="text-base font-semibold">Search Your Zip Code</p>
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
              <span>
                {data.state} · {data.districtLabel}
              </span>
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

      <MobileBottomNav />
    </div>
  );
}
