/**
 * MobileRepsPage — Civic › My Representatives & Elections
 *
 * Tabs: My Reps | Elections | ACP Candidates
 *
 * Location policy:
 *  - Default: manual ZIP entry, cached in localStorage("acp_mobile_zip")
 *  - Optional: device location only after the user taps the location button
 *    AND approves an in-app purpose dialog. Navigator.geolocation is never
 *    called until that explicit double-confirm.
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  MapPin, Search, Locate, ChevronRight, ChevronLeft,
  User, DollarSign, ShieldCheck, ShieldX, AlertTriangle,
  Phone, Mail, Globe, Star, Heart, Users, UserPlus,
  Bell, BellOff, ExternalLink, X, Loader2,
} from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import "../mobile-theme.css";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  totalContributions?: number;
  sigAcronyms?: string[];
  rejectsAIPAC?: boolean;
  demerits?: { label: string; type: string }[];
}

interface RepsResponse {
  state: string;
  districtLabel: string;
  zipCode: string;
  politicians: Politician[];
}

interface ElectionSeat {
  positionId: string;
  title: string;
  officeType: string;
  level: string;
  jurisdiction: string;
  district: string | null;
  displayOrder: number;
  incumbents: ElectionPolitician[];
  candidates: ElectionPolitician[];
}

interface ElectionPolitician {
  id: string;
  fullName: string;
  party: string | null;
  isCurrent: boolean;
  profileType: string | null;
  photoUrl: string | null;
  handle: string | null;
  corruptionGrade: string | null;
  totalContributions: number | null;
  isVerified: boolean;
  superpacTotal: number;
}

interface ElectionsResponse {
  stateName: string;
  stateCode: string;
  cdDistrict: string | null;
  districtKnown: boolean;
  seats: ElectionSeat[];
}

interface FollowedRep {
  id: string | number;
  name: string;
  office: string;
  party: string | null;
}

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ZIP_CACHE_KEY = "acp_mobile_zip";

function useZipCache() {
  const [zip, setZipState] = useState<string>(() => {
    try { return localStorage.getItem(ZIP_CACHE_KEY) ?? ""; } catch { return ""; }
  });
  const setZip = useCallback((z: string) => {
    setZipState(z);
    try { localStorage.setItem(ZIP_CACHE_KEY, z); } catch {}
  }, []);
  return [zip, setZip] as const;
}

function gradeColor(grade: string | null | undefined) {
  if (!grade) return "text-white/40";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "text-emerald-400";
  if (g.startsWith("B")) return "text-green-400";
  if (g.startsWith("C")) return "text-yellow-400";
  if (g.startsWith("D")) return "text-orange-400";
  return "text-red-400";
}

function gradeRingColor(grade: string | null | undefined) {
  if (!grade) return "rgba(255,255,255,0.2)";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "rgba(52,211,153,0.6)";
  if (g.startsWith("B")) return "rgba(74,222,128,0.5)";
  if (g.startsWith("C")) return "rgba(250,204,21,0.5)";
  if (g.startsWith("D")) return "rgba(251,146,60,0.5)";
  return "rgba(248,113,113,0.5)";
}

function partyBadgeStyle(party: string | null) {
  const p = party?.toLowerCase() ?? "";
  if (p.includes("democrat")) return { bg: "#1d4ed8", label: "D" };
  if (p.includes("republican")) return { bg: "#dc2626", label: "R" };
  if (p.includes("anti-corruption") || p.includes("acp")) return { bg: "#7c3aed", label: "ACP" };
  if (p.includes("independent")) return { bg: "#4b5563", label: "I" };
  return { bg: "#374151", label: party?.slice(0, 3).toUpperCase() ?? "?" };
}

function formatMoney(amount: number | null | undefined) {
  if (!amount || amount <= 0) return null;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function isSenator(p: { position?: PoliticianPosition }) {
  const t = p.position?.title?.toLowerCase() ?? "";
  return t.includes("senator") || t.includes("senate");
}

function congressContactUrl(rep: Politician) {
  const name = rep.fullName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "");
  const isSen = isSenator(rep);
  // Capitol switchboard as fallback; ideally we'd have an official contact URL
  if (isSen) return `https://www.senate.gov/senators/`;
  return `https://www.house.gov/representatives/`;
}

function capitalSwitchboard(rep: Politician) {
  return isSenator(rep) ? "202-224-3121" : "202-225-3121";
}

// ─── Location Permission Dialog ──────────────────────────────────────────────

interface LocationDialogProps {
  onAllow: () => void;
  onDeny: () => void;
}

function LocationPermissionDialog({ onAllow, onDeny }: LocationDialogProps) {
  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ zIndex: 200, background: "rgba(0,0,0,0.7)" }}
      onClick={onDeny}
    >
      <div
        className="w-full max-w-sm mx-auto rounded-t-3xl p-6"
        style={{ background: "rgba(15,20,40,0.98)", border: "1px solid rgba(255,255,255,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS-style icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))", border: "1px solid rgba(139,92,246,0.4)" }}>
            <MapPin className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <h2 className="text-white font-bold text-lg text-center mb-1">
          Allow "ACP Democracy" to access your location?
        </h2>

        <p className="text-white/60 text-sm text-center leading-relaxed mb-2">
          Your location is used <span className="text-white">only to look up your congressional district</span>.
          It is never stored, shared, or used for any other purpose.
        </p>

        <p className="text-white/35 text-xs text-center mb-6">
          You can always enter a ZIP code instead — no location needed.
        </p>

        <div className="space-y-2">
          <button
            onClick={onAllow}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(139,92,246,0.3))", border: "1px solid rgba(139,92,246,0.5)" }}
            data-testid="location-allow-btn"
          >
            Allow Once
          </button>
          <button
            onClick={onDeny}
            className="w-full py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
            data-testid="location-deny-btn"
          >
            Don't Allow · Use ZIP Instead
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ZIP Search Bar ──────────────────────────────────────────────────────────

interface ZipSearchBarProps {
  zipInput: string;
  setZipInput: (v: string) => void;
  onSearch: () => void;
  onLocationTap: () => void;
  isLoading?: boolean;
  label?: string;
}

function ZipSearchBar({ zipInput, setZipInput, onSearch, onLocationTap, isLoading, label }: ZipSearchBarProps) {
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") onSearch(); };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <input
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
            onKeyDown={handleKey}
            placeholder="Enter ZIP code"
            inputMode="numeric"
            maxLength={5}
            className="w-full rounded-2xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none"
            style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.14)" }}
            data-testid="input-zip"
          />
        </div>
        <button
          onClick={onSearch}
          disabled={zipInput.length !== 5 || !!isLoading}
          className="flex items-center gap-1.5 px-4 rounded-2xl text-sm font-semibold disabled:opacity-40 transition-all"
          style={{ background: "rgba(59,91,169,0.4)", color: "#fff", border: "1px solid rgba(59,91,169,0.5)" }}
          data-testid="button-zip-search"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
        <button
          onClick={onLocationTap}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
          style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "rgba(147,197,253,0.9)" }}
          title="Use my location"
          data-testid="button-use-location"
          aria-label="Use my location to find representatives"
        >
          <Locate className="w-4 h-4" />
        </button>
      </div>
      {label && (
        <div className="flex items-center gap-1.5 text-white/50 text-xs px-1">
          <MapPin className="w-3 h-3" />
          <span>{label}</span>
        </div>
      )}
    </div>
  );
}

// ─── Rep Detail Card ─────────────────────────────────────────────────────────

function RepCard({
  rep,
  followed,
  onFollowToggle,
}: {
  rep: Politician;
  followed: boolean;
  onFollowToggle: (rep: Politician, follow: boolean) => void;
}) {
  const party = partyBadgeStyle(rep.party);
  const money = formatMoney(rep.totalLobbyAmount ?? rep.totalContributions);
  const contactUrl = congressContactUrl(rep);
  const phone = capitalSwitchboard(rep);

  return (
    <div className="glass-card overflow-hidden" data-testid={`rep-card-${rep.id}`}>
      {/* Main row */}
      <div className="p-4 flex items-start gap-3">
        <Link href={`/mobile/civic/politician/${rep.id}`} className="flex-shrink-0">
          <div className="relative">
            <div
              className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: `2px solid ${gradeRingColor(rep.corruptionGrade)}` }}
            >
              {rep.photoUrl ? (
                <img src={rep.photoUrl} alt={rep.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                  style={{ background: `${party.bg}33` }}>
                  <User className="w-6 h-6 text-white/40" />
                </div>
              )}
            </div>
            {/* Party badge */}
            <div
              className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold text-white px-1 py-0.5 rounded"
              style={{ background: party.bg, minWidth: 16, textAlign: "center" }}
            >
              {party.label}
            </div>
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 justify-between">
            <div className="min-w-0">
              <Link href={`/mobile/civic/politician/${rep.id}`}>
                <p className="font-bold text-sm text-white leading-tight">{rep.fullName}</p>
                <p className="text-xs text-white/55 mt-0.5 truncate">{rep.position?.title}</p>
              </Link>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {rep.corruptionGrade && (
                <span className={`text-xl font-black ${gradeColor(rep.corruptionGrade)}`}>
                  {rep.corruptionGrade}
                </span>
              )}
            </div>
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {rep.rejectsAIPAC && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                <ShieldCheck className="w-2.5 h-2.5" /> Rejects AIPAC
              </span>
            )}
            {money && (
              <span className="flex items-center gap-0.5 text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                <DollarSign className="w-2.5 h-2.5" /> {money} lobby
              </span>
            )}
            {(rep.demerits ?? []).length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                <AlertTriangle className="w-2.5 h-2.5" /> {rep.demerits![0].label}
                {rep.demerits!.length > 1 && <span className="text-white/30">+{rep.demerits!.length - 1}</span>}
              </span>
            )}
            {rep.isVerified && (
              <span className="flex items-center gap-0.5 text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                <ShieldCheck className="w-2.5 h-2.5" /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div
        className="flex border-t"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        {/* Contact / Email */}
        <a
          href={contactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex flex-col items-center gap-1 py-2.5 text-white/50 active:bg-white/5 transition-colors"
          data-testid={`contact-web-${rep.id}`}
        >
          <Globe className="w-4 h-4" />
          <span className="text-[10px]">Contact</span>
        </a>

        {/* Phone */}
        <a
          href={`tel:${phone.replace(/-/g, "")}`}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 text-white/50 active:bg-white/5 transition-colors border-l"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
          data-testid={`contact-phone-${rep.id}`}
        >
          <Phone className="w-4 h-4" />
          <span className="text-[10px]">Call</span>
        </a>

        {/* Profile */}
        <Link
          href={`/mobile/civic/politician/${rep.id}`}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 text-white/50 active:bg-white/5 transition-colors border-l"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <User className="w-4 h-4" />
          <span className="text-[10px]">Profile</span>
        </Link>

        {/* Follow / Save */}
        <button
          onClick={() => onFollowToggle(rep, !followed)}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors active:bg-white/5 border-l"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            color: followed ? "rgba(251,191,36,0.9)" : "rgba(255,255,255,0.5)",
          }}
          data-testid={`follow-btn-${rep.id}`}
        >
          {followed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          <span className="text-[10px]">{followed ? "Saved" : "Save"}</span>
        </button>
      </div>
    </div>
  );
}

// ─── My Reps Tab ─────────────────────────────────────────────────────────────

function MyRepsTab() {
  const { toast } = useToast();
  const [cachedZip, setCachedZip] = useZipCache();
  const [zipInput, setZipInput] = useState(cachedZip);
  const [activeZip, setActiveZip] = useState<string | null>(cachedZip || null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<RepsResponse>({
    queryKey: ["/api/representatives/by-zip", activeZip],
    queryFn: async () => {
      const res = await fetch(`/api/representatives/by-zip/${activeZip}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Lookup failed");
      }
      return res.json();
    },
    enabled: !!activeZip,
    retry: false,
    staleTime: 300_000,
  });

  const { data: followedList = [] } = useQuery<FollowedRep[]>({
    queryKey: ["/api/representatives/followed"],
    retry: false,
    staleTime: 60_000,
  });

  const followedNames = new Set(followedList.map((f) => f.name));

  const followMutation = useMutation({
    mutationFn: ({ name, office, party, remove }: { name: string; office: string; party: string | null; remove: boolean }) => {
      if (remove) return apiRequest("/api/representatives/unfollow", "DELETE", { name });
      return apiRequest("/api/representatives/follow", "POST", { name, office, party });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/representatives/followed"] });
      toast({ title: vars.remove ? "Removed from saved" : "Saved representative" });
    },
    onError: () => toast({ title: "Could not update", variant: "destructive" }),
  });

  const handleSearch = () => {
    const clean = zipInput.trim().slice(0, 5);
    if (/^\d{5}$/.test(clean)) {
      setActiveZip(clean);
      setCachedZip(clean);
    } else {
      toast({ title: "Enter a valid 5-digit ZIP code", variant: "destructive" });
    }
  };

  const handleLocationGranted = async (lat: number, lng: number) => {
    setLocationLoading(true);
    try {
      // Reverse geocode to get ZIP via free API (no key needed)
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const geo = await res.json();
        const zip = geo?.postcode?.replace(/\D/g, "").slice(0, 5);
        if (zip && /^\d{5}$/.test(zip)) {
          setZipInput(zip);
          setActiveZip(zip);
          setCachedZip(zip);
          toast({ title: `Using ZIP ${zip}` });
          return;
        }
      }
      // Fallback: use coords directly as address for elections lookup
      const approxZip = "00000"; // signal to show coords-based message
      toast({ title: "Location found — enter ZIP to confirm district", variant: "default" });
    } catch {
      toast({ title: "Location lookup failed. Please enter ZIP manually.", variant: "destructive" });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleLocationAllow = () => {
    setShowLocationDialog(false);
    if (!("geolocation" in navigator)) {
      toast({ title: "Your browser doesn't support location", variant: "destructive" });
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => handleLocationGranted(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast({ title: "Location access denied. Please enter your ZIP code.", variant: "destructive" });
        } else {
          toast({ title: "Could not get location. Please enter ZIP manually.", variant: "destructive" });
        }
      },
      { timeout: 10_000, maximumAge: 300_000 }
    );
  };

  const handleFollowToggle = (rep: Politician, follow: boolean) => {
    followMutation.mutate({
      name: rep.fullName,
      office: rep.position?.title ?? "",
      party: rep.party,
      remove: !follow,
    });
  };

  const senators = data?.politicians.filter(isSenator) ?? [];
  const reps = data?.politicians.filter((p) => !isSenator(p)) ?? [];

  return (
    <div className="space-y-4">
      {/* ZIP Search Bar */}
      <ZipSearchBar
        zipInput={zipInput}
        setZipInput={setZipInput}
        onSearch={handleSearch}
        onLocationTap={() => setShowLocationDialog(true)}
        isLoading={isLoading || locationLoading}
        label={
          data ? `${data.state} · ${data.districtLabel} · ${data.politicians.length} representative${data.politicians.length !== 1 ? "s" : ""}`
          : cachedZip && !activeZip ? `Cached ZIP: ${cachedZip}`
          : undefined
        }
      />

      {/* Privacy note */}
      {!activeZip && (
        <div className="text-center py-10 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
            style={{ background: "rgba(59,91,169,0.15)", border: "1px solid rgba(59,91,169,0.3)" }}>
            <MapPin className="w-8 h-8 text-blue-400/70" />
          </div>
          <p className="text-white font-semibold">Find Your Representatives</p>
          <p className="text-white/50 text-sm px-6">
            Enter your ZIP code to see your U.S. Senators and House Representative with their ACP corruption grades.
          </p>
          <p className="text-white/30 text-xs px-8">
            🔒 Your location is never stored or shared. ZIP lookup uses a public database.
          </p>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 flex gap-3 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-white/10 rounded w-2/3" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
                <div className="h-3 bg-white/10 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="glass-card p-5 text-center space-y-2">
          <ShieldX className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-red-400 font-semibold text-sm">Could not load representatives</p>
          <p className="text-white/40 text-xs">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <>
          {senators.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                <p className="text-xs font-bold text-white/60 uppercase tracking-wide">U.S. Senators</p>
                <span className="text-white/30 text-xs ml-auto">{data.state}</span>
              </div>
              {senators.map((rep) => (
                <RepCard
                  key={rep.id}
                  rep={rep}
                  followed={followedNames.has(rep.fullName)}
                  onFollowToggle={handleFollowToggle}
                />
              ))}
            </div>
          )}

          {reps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Star className="w-3.5 h-3.5 text-blue-400" />
                <p className="text-xs font-bold text-white/60 uppercase tracking-wide">House Representative</p>
                <span className="text-white/30 text-xs ml-auto">{data.districtLabel}</span>
              </div>
              {reps.map((rep) => (
                <RepCard
                  key={rep.id}
                  rep={rep}
                  followed={followedNames.has(rep.fullName)}
                  onFollowToggle={handleFollowToggle}
                />
              ))}
            </div>
          )}

          {data.politicians.length === 0 && (
            <div className="glass-card p-6 text-center">
              <p className="text-white/60 text-sm">No representatives found for ZIP {data.zipCode}.</p>
              <p className="text-white/40 text-xs mt-1">Our database may not have this district yet. Try a nearby ZIP.</p>
            </div>
          )}

          {/* Followed reps */}
          {followedList.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Bell className="w-3 h-3" /> Saved Representatives ({followedList.length})
              </p>
              <div className="space-y-1.5">
                {followedList.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                    <p className="text-white/80 text-sm flex-1 truncate">{f.name}</p>
                    <p className="text-white/40 text-xs truncate">{f.office}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Location permission dialog */}
      {showLocationDialog && (
        <LocationPermissionDialog
          onAllow={handleLocationAllow}
          onDeny={() => setShowLocationDialog(false)}
        />
      )}
    </div>
  );
}

// ─── Elections Tab (Ballot-style) ─────────────────────────────────────────────

function ElectionPoliticianRow({ pol, showBadge }: { pol: ElectionPolitician; showBadge: "incumbent" | "challenger" }) {
  const party = partyBadgeStyle(pol.party);
  const money = formatMoney(pol.superpacTotal ?? pol.totalContributions);

  return (
    <Link href={`/mobile/civic/politician/${pol.id}`}>
      <div className="flex items-center gap-3 py-2.5 px-4 active:bg-white/5 transition-colors">
        <div
          className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
          style={{ border: `1.5px solid ${gradeRingColor(pol.corruptionGrade)}` }}
        >
          {pol.photoUrl
            ? <img src={pol.photoUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: `${party.bg}55` }}>
                {pol.fullName.charAt(0)}
              </div>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-white text-sm font-medium leading-tight">{pol.fullName}</p>
            {pol.isVerified && <ShieldCheck className="w-3 h-3 text-blue-400 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
              style={{ background: party.bg }}>
              {party.label}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
              showBadge === "incumbent"
                ? "bg-blue-400/15 text-blue-400"
                : "bg-orange-400/15 text-orange-400"
            }`}>
              {showBadge === "incumbent" ? "Incumbent" : "Challenger"}
            </span>
            {money && (
              <span className="text-[10px] text-yellow-400/80">{money} PAC</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {pol.corruptionGrade && (
            <span className={`text-base font-black ${gradeColor(pol.corruptionGrade)}`}>
              {pol.corruptionGrade}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-white/30" />
        </div>
      </div>
    </Link>
  );
}

function SeatCard({ seat }: { seat: ElectionSeat }) {
  const [expanded, setExpanded] = useState(true);
  const total = seat.incumbents.length + seat.candidates.length;

  const levelColor = () => {
    const l = seat.level?.toLowerCase();
    if (l === "country" || l === "national") return "rgba(251,191,36,0.8)";
    if (l === "state") return "rgba(147,197,253,0.8)";
    return "rgba(167,243,208,0.8)";
  };

  return (
    <div className="glass-card overflow-hidden" data-testid={`seat-card-${seat.positionId}`}>
      {/* Seat header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left active:bg-white/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-bold text-sm">{seat.title}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: `${levelColor()}22`, color: levelColor(), border: `1px solid ${levelColor()}44` }}>
              {seat.level}
            </span>
          </div>
          <p className="text-white/45 text-xs mt-0.5">
            {seat.jurisdiction}
            {seat.district ? ` · ${seat.district}` : ""}
            <span className="ml-2 text-white/30">· {total} politician{total !== 1 ? "s" : ""}</span>
          </p>
        </div>
        <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {/* Politician rows */}
      {expanded && (
        <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {seat.incumbents.map((pol) => (
            <ElectionPoliticianRow key={pol.id} pol={pol} showBadge="incumbent" />
          ))}
          {seat.candidates.map((pol) => (
            <ElectionPoliticianRow key={pol.id} pol={pol} showBadge="challenger" />
          ))}
          {total === 0 && (
            <div className="px-4 py-3 text-white/40 text-xs">No candidates on file for this seat.</div>
          )}
        </div>
      )}
    </div>
  );
}

function ElectionsTab() {
  const { toast } = useToast();
  const [cachedZip, setCachedZip] = useZipCache();
  const [zipInput, setZipInput] = useState(cachedZip);
  const [activeZip, setActiveZip] = useState<string | null>(cachedZip || null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch } = useQuery<ElectionsResponse>({
    queryKey: ["/api/elections/lookup", activeZip],
    queryFn: async () => {
      const res = await fetch(`/api/elections/lookup?address=${encodeURIComponent(activeZip ?? "")}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Elections lookup failed");
      }
      return res.json();
    },
    enabled: !!activeZip,
    retry: false,
    staleTime: 300_000,
  });

  const handleSearch = () => {
    const clean = zipInput.trim().slice(0, 5);
    if (/^\d{5}$/.test(clean)) {
      setActiveZip(clean);
      setCachedZip(clean);
    } else {
      toast({ title: "Enter a valid 5-digit ZIP code", variant: "destructive" });
    }
  };

  const handleLocationGranted = async (lat: number, lng: number) => {
    setLocationLoading(true);
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const geo = await res.json();
        const zip = geo?.postcode?.replace(/\D/g, "").slice(0, 5);
        if (zip && /^\d{5}$/.test(zip)) {
          setZipInput(zip);
          setActiveZip(zip);
          setCachedZip(zip);
          toast({ title: `Using ZIP ${zip}` });
          return;
        }
      }
      toast({ title: "Could not determine ZIP. Please enter it manually.", variant: "destructive" });
    } catch {
      toast({ title: "Location lookup failed.", variant: "destructive" });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleLocationAllow = () => {
    setShowLocationDialog(false);
    if (!("geolocation" in navigator)) {
      toast({ title: "Location not supported. Enter ZIP manually.", variant: "destructive" });
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => handleLocationGranted(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        setLocationLoading(false);
        const msg = err.code === err.PERMISSION_DENIED
          ? "Location denied. Please enter your ZIP."
          : "Location unavailable. Please enter ZIP manually.";
        toast({ title: msg, variant: "destructive" });
      },
      { timeout: 10_000, maximumAge: 300_000 }
    );
  };

  // Filter seats by search
  const filteredSeats = (data?.seats ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q)
      || s.jurisdiction.toLowerCase().includes(q)
      || s.incumbents.some((p) => p.fullName.toLowerCase().includes(q))
      || s.candidates.some((p) => p.fullName.toLowerCase().includes(q));
  });

  const nationalSeats  = filteredSeats.filter((s) => ["country", "national"].includes(s.level?.toLowerCase()));
  const stateSeats     = filteredSeats.filter((s) => s.level?.toLowerCase() === "state");
  const districtSeats  = filteredSeats.filter((s) => !["country", "national", "state"].includes(s.level?.toLowerCase()));

  const renderSection = (title: string, seats: ElectionSeat[], icon: string) => {
    if (seats.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span>{icon}</span>
          <p className="text-xs font-bold text-white/55 uppercase tracking-wide">{title}</p>
          <span className="text-white/25 text-xs ml-auto">{seats.length} seat{seats.length !== 1 ? "s" : ""}</span>
        </div>
        {seats.map((s) => <SeatCard key={s.positionId} seat={s} />)}
      </div>
    );
  };

  const totalPols = (data?.seats ?? []).reduce((acc, s) => acc + s.incumbents.length + s.candidates.length, 0);

  return (
    <div className="space-y-4">
      <ZipSearchBar
        zipInput={zipInput}
        setZipInput={setZipInput}
        onSearch={handleSearch}
        onLocationTap={() => setShowLocationDialog(true)}
        isLoading={isLoading || locationLoading}
        label={
          data
            ? `${data.stateName}${data.cdDistrict ? ` · District ${data.cdDistrict}` : ""} · ${data.seats.length} races · ${totalPols} politicians`
            : undefined
        }
      />

      {/* Search within results */}
      {data && !isLoading && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, race, or office…"
            className="w-full rounded-2xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!activeZip && !isLoading && (
        <div className="text-center py-10 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
            style={{ background: "rgba(230,57,58,0.1)", border: "1px solid rgba(230,57,58,0.25)" }}>
            <Star className="w-8 h-8 text-red-400/70" />
          </div>
          <p className="text-white font-semibold">Your Local Ballot</p>
          <p className="text-white/50 text-sm px-6">
            Enter your ZIP to see federal and state races relevant to your district.
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/2 mb-2" />
              <div className="h-3 bg-white/10 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="glass-card p-5 text-center space-y-2">
          <ShieldX className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-red-400 font-semibold text-sm">Could not load elections</p>
          <p className="text-white/40 text-xs">{(error as Error).message}</p>
          <button onClick={() => refetch()} className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
            Try Again
          </button>
        </div>
      )}

      {/* Ballot results */}
      {data && !isLoading && (
        <>
          {filteredSeats.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <p className="text-white/50 text-sm">{search ? "No results matching your search." : "No election data for this district."}</p>
            </div>
          ) : (
            <>
              {renderSection("National Races", nationalSeats, "🇺🇸")}
              {renderSection("State Races", stateSeats, "🏛️")}
              {renderSection("District Races", districtSeats, "📍")}
            </>
          )}

          {/* District note */}
          {data.districtKnown && (
            <div className="flex items-start gap-2 p-3 rounded-xl"
              style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-300/70 text-xs leading-relaxed">
                Showing races for Congressional District {data.cdDistrict}, {data.stateName}. House races not in your district are excluded.
              </p>
            </div>
          )}
        </>
      )}

      {showLocationDialog && (
        <LocationPermissionDialog
          onAllow={handleLocationAllow}
          onDeny={() => setShowLocationDialog(false)}
        />
      )}
    </div>
  );
}

// ─── ACP Candidates Tab ──────────────────────────────────────────────────────

function CandidateCard({ candidate }: { candidate: CandidateWithUser }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const displayName = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || candidate.username;

  const { data: supportStatus } = useQuery<{ isSupporting?: boolean } | null>({
    queryKey: ["/api/candidates", candidate.id, "support-status"],
    queryFn: async () => {
      const res = await fetch(`/api/candidates/${candidate.id}/support-status`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
    retry: false,
  });

  const [localSupported, setLocalSupported] = useState<boolean | null>(null);
  const isSupported = localSupported ?? supportStatus?.isSupporting ?? false;

  const supportMutation = useMutation({
    mutationFn: (next: boolean) =>
      next
        ? apiRequest(`/api/candidates/${candidate.id}/support`, "POST")
        : apiRequest(`/api/candidates/${candidate.id}/support`, "DELETE"),
    onSuccess: (_, next) => {
      setLocalSupported(next);
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({ title: next ? "Endorsement added" : "Endorsement removed" });
    },
    onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="glass-card overflow-hidden" data-testid={`candidate-card-${candidate.id}`}>
      <Link href={`/mobile/civic/politician/${candidate.userId}`}>
        <div className="flex items-center gap-3 p-4 active:opacity-80 transition-opacity">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(230,57,58,0.25), rgba(59,91,169,0.25))", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="text-white font-bold text-lg">
              {(candidate.firstName?.[0] ?? candidate.username?.[0] ?? "?").toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">{displayName}</p>
            <p className="text-white/55 text-xs mt-0.5">{candidate.position}</p>
            <div className="flex items-center gap-1 mt-1">
              <Heart className="w-3 h-3 text-pink-400" />
              <span className="text-[10px] text-pink-400">{candidate.endorsements} endorsements</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
        </div>
      </Link>

      {candidate.platform && (
        <div className="px-4 pb-3">
          <p className="text-white/50 text-xs leading-relaxed line-clamp-2">{candidate.platform}</p>
        </div>
      )}

      {user && user.id !== candidate.userId && (
        <div className="border-t px-4 py-2.5" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <button
            onClick={() => supportMutation.mutate(!isSupported)}
            disabled={supportMutation.isPending}
            className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            style={isSupported
              ? { background: "rgba(236,72,153,0.15)", color: "rgba(244,114,182,0.9)", border: "1px solid rgba(236,72,153,0.3)" }
              : { background: "rgba(59,91,169,0.2)", color: "#fff", border: "1px solid rgba(59,91,169,0.35)" }}
            data-testid={`button-support-${candidate.id}`}
          >
            <Heart className={`w-3.5 h-3.5 ${isSupported ? "fill-pink-400" : ""}`} />
            {isSupported ? "Endorsed" : "Endorse This Candidate"}
          </button>
        </div>
      )}
    </div>
  );
}

function CandidatesTab() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: candidates = [], isLoading } = useQuery<CandidateWithUser[]>({
    queryKey: ["/api/candidates"],
    staleTime: 60_000,
  });

  const active = candidates.filter((c) => c.isActive);
  const filtered = search
    ? active.filter((c) => {
        const name = [c.firstName, c.lastName, c.username].filter(Boolean).join(" ").toLowerCase();
        return name.includes(search.toLowerCase()) || c.position.toLowerCase().includes(search.toLowerCase());
      })
    : active;

  return (
    <div className="space-y-4">
      {/* Run for office CTA */}
      {user && (
        <Link href="/mobile/civic/run">
          <div className="glass-card p-4 flex items-center gap-3 active:opacity-80 transition-opacity border"
            style={{ borderColor: "rgba(59,91,169,0.3)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(59,91,169,0.3)" }}>
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Run for office</p>
              <p className="text-xs text-white/50">Register as an ACP candidate</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30" />
          </div>
        </Link>
      )}

      {/* Search */}
      {active.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates…"
            className="w-full rounded-2xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 flex gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-white/10 rounded w-2/3" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 space-y-3">
          <Users className="w-12 h-12 mx-auto text-white/20" />
          <p className="text-white/60 font-semibold">
            {search ? "No candidates found" : "No active ACP candidates yet"}
          </p>
          <p className="text-white/40 text-sm">
            {search ? "Try a different search term." : "Be the first to register and run!"}
          </p>
        </div>
      ) : (
        <>
          <p className="text-white/35 text-xs px-1">{filtered.length} candidate{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.map((c) => <CandidateCard key={c.id} candidate={c} />)}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "reps" | "elections" | "candidates";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "reps",       label: "My Reps",    icon: "👤" },
  { id: "elections",  label: "Elections",  icon: "🗳️" },
  { id: "candidates", label: "Candidates", icon: "⭐" },
];

export function MobileRepsPage() {
  const [tab, setTab] = useState<Tab>("reps");

  return (
    <div className="mobile-root" data-testid="mobile-reps-page">
      {/* Top bar */}
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button" aria-label="Back to Civic Hub">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">Representatives & Elections</h1>
            <p className="text-white/50 text-xs">Your district · ZIP-based lookup</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 pb-3">
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={
                tab === t.id
                  ? { background: "rgba(255,255,255,0.16)", color: "#fff" }
                  : { color: "rgba(255,255,255,0.45)" }
              }
              data-testid={`tab-${t.id}`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {tab === "reps"       && <MyRepsTab />}
        {tab === "elections"  && <ElectionsTab />}
        {tab === "candidates" && <CandidatesTab />}
      </div>

      <MobileBottomNav />
    </div>
  );
}
