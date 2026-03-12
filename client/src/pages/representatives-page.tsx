import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Search, ExternalLink, DollarSign, ShieldCheck, ShieldAlert,
  AlertTriangle, Loader2, Users, X, ChevronUp, ChevronDown,
} from "lucide-react";

type RepEntry = {
  id: string;
  fullName: string;
  party?: string;
  corruptionGrade?: string;
  totalLobbyAmount: number;
  totalContributions?: number;
  sigAcronyms: string[];
  rejectsAIPAC: boolean;
  photoUrl?: string;
  isVerified?: boolean;
  isCurrent?: boolean;
  profileType?: string;
  position?: {
    title: string;
    officeType: string;
    level: string;
    jurisdiction: string;
    district?: string;
    termLength?: number;
  };
  targetPosition?: {
    title: string;
    jurisdiction: string;
  } | null;
  demerits?: Array<{ label: string; type: string }>;
};

type ZipResult = {
  state: string;
  districtLabel: string;
  zipCode: string;
  politicians: RepEntry[];
};

const GRADE_ORDER: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, F: 5 };

function gradeColors(grade?: string) {
  switch (grade) {
    case "A": return { bg: "bg-green-600", text: "text-white", border: "border-green-700", light: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" };
    case "B": return { bg: "bg-blue-500", text: "text-white", border: "border-blue-600", light: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" };
    case "C": return { bg: "bg-yellow-400", text: "text-yellow-900", border: "border-yellow-500", light: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" };
    case "D": return { bg: "bg-orange-500", text: "text-white", border: "border-orange-600", light: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" };
    case "F": return { bg: "bg-red-600", text: "text-white", border: "border-red-700", light: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" };
    default: return { bg: "bg-slate-400", text: "text-white", border: "border-slate-500", light: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
  }
}

function partyShort(party?: string): string {
  if (!party) return "—";
  const p = party.toLowerCase();
  if (p.includes("republican")) return "R";
  if (p.includes("democrat")) return "D";
  if (p.includes("independent")) return "I";
  return party.slice(0, 1).toUpperCase();
}

function partyBadgeClass(party?: string): string {
  const p = (party || "").toLowerCase();
  if (p.includes("republican")) return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  if (p.includes("democrat")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function matchesSearch(rep: RepEntry, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  if (rep.fullName.toLowerCase().includes(lower)) return true;
  if (rep.party?.toLowerCase().includes(lower)) return true;
  if (rep.position?.title?.toLowerCase().includes(lower)) return true;
  if (rep.position?.jurisdiction?.toLowerCase().includes(lower)) return true;
  if (rep.position?.district?.toLowerCase().includes(lower)) return true;
  if (rep.sigAcronyms.some(s => s.toLowerCase().includes(lower))) return true;
  if (rep.profileType?.toLowerCase().includes(lower)) return true;
  return false;
}

function grandTotal(rep: RepEntry): number | null {
  const hasBp = rep.totalContributions != null && rep.totalContributions > 0;
  if (hasBp) return rep.totalContributions!;
  if (rep.totalLobbyAmount > 0) return Math.round(rep.totalLobbyAmount / 100);
  return null;
}

function ZipRepCard({ pol }: { pol: RepEntry }) {
  const initials = pol.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const g = gradeColors(pol.corruptionGrade);
  const total = grandTotal(pol);
  return (
    <Card className="border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {pol.photoUrl ? (
              <img src={pol.photoUrl} alt={pol.fullName}
                className={`w-14 h-14 rounded-full object-cover border-2 ${pol.isVerified ? "border-green-500" : "border-slate-300"}`} />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-slate-300">
                <span className="text-lg font-bold text-slate-500">{initials}</span>
              </div>
            )}
            {pol.corruptionGrade && (
              <span className={`absolute -bottom-1 -right-1 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 ${g.bg} ${g.text}`}>
                {pol.corruptionGrade}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{pol.fullName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pol.position?.title}</p>
            {pol.targetPosition && (
              <p className="text-[10px] text-blue-500 dark:text-blue-400">→ Running for: {pol.targetPosition.title}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${partyBadgeClass(pol.party)}`}>{partyShort(pol.party)}</span>
              {pol.isCurrent !== false
                ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Incumbent</span>
                : <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Candidate</span>}
            </div>
            {total != null && (
              <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                <DollarSign className="w-3 h-3" />
                <span className="font-bold">${total.toLocaleString()}</span>
                <span className="text-slate-400">grand total</span>
              </div>
            )}
            {(pol.rejectsAIPAC || pol.sigAcronyms.length > 0 || (pol.demerits && pol.demerits.length > 0)) && (
              <div className="flex flex-wrap gap-1 mt-1">
                {pol.demerits?.map((d, i) => (
                  <span key={`dem-${i}`} className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 flex items-center gap-0.5">
                    <ShieldAlert className="w-2.5 h-2.5" />{d.label}
                  </span>
                ))}
                {pol.rejectsAIPAC && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" />No AIPAC
                  </span>
                )}
                {pol.sigAcronyms.slice(0, 4).map(a => (
                  <span key={a} className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">{a}</span>
                ))}
                {pol.sigAcronyms.length > 4 && <span className="text-[10px] text-slate-400">+{pol.sigAcronyms.length - 4}</span>}
              </div>
            )}
          </div>
        </div>
        <Link href={`/politicians/${pol.id}`}>
          <Button variant="outline" size="sm" className="w-full mt-3 text-xs">
            <ExternalLink className="w-3 h-3 mr-1.5" />View Full Profile
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

type SortCol = "name" | "party" | "position" | "state" | "sigs" | "total" | "grade";

const GRADE_FILTERS = ["All", "A", "B", "C", "D", "F"] as const;
type GradeFilter = typeof GRADE_FILTERS[number];

export default function RepresentativesPage() {
  const { toast } = useToast();
  const [zipInput, setZipInput] = useState("");
  const [activeZip, setActiveZip] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("All");
  const [sortCol, setSortCol] = useState<SortCol>("grade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [displayLimit, setDisplayLimit] = useState(150);

  const { data: zipData, isFetching: zipFetching, error: zipError } = useQuery<ZipResult>({
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
  });

  const { data: allReps = [], isLoading: repsLoading } = useQuery<RepEntry[]>({
    queryKey: ["/api/reps/list"],
    staleTime: 5 * 60 * 1000,
  });

  const handleZipSearch = () => {
    const zip = zipInput.trim().slice(0, 5);
    if (!/^\d{5}$/.test(zip)) {
      toast({ title: "Invalid zip code", description: "Please enter a 5-digit US zip code.", variant: "destructive" });
      return;
    }
    setActiveZip(zip);
  };

  const clearZipSearch = () => { setActiveZip(null); setZipInput(""); };

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setDisplayLimit(150);
  }

  const filteredReps = useMemo(() => {
    const filtered = allReps.filter(rep => {
      if (gradeFilter !== "All" && rep.corruptionGrade !== gradeFilter) return false;
      if (searchQuery && !matchesSearch(rep, searchQuery)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortCol) {
        case "name":     return dir * a.fullName.localeCompare(b.fullName);
        case "party":    return dir * (partyShort(a.party).localeCompare(partyShort(b.party)));
        case "position": return dir * ((a.position?.title ?? "").localeCompare(b.position?.title ?? ""));
        case "state":    return dir * ((a.position?.jurisdiction ?? "").localeCompare(b.position?.jurisdiction ?? ""));
        case "sigs":     return dir * (a.sigAcronyms.length - b.sigAcronyms.length);
        case "total": {
          const ta = grandTotal(a) ?? 0;
          const tb = grandTotal(b) ?? 0;
          return dir * (ta - tb);
        }
        case "grade": {
          const ga = GRADE_ORDER[a.corruptionGrade ?? ""] ?? 6;
          const gb = GRADE_ORDER[b.corruptionGrade ?? ""] ?? 6;
          if (ga !== gb) return dir * (ga - gb);
          return (grandTotal(a) ?? 0) - (grandTotal(b) ?? 0);
        }
        default: return 0;
      }
    });
  }, [allReps, searchQuery, gradeFilter, sortCol, sortDir]);

  const gradeCount = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const r of allReps) {
      if (r.corruptionGrade && counts[r.corruptionGrade] !== undefined) counts[r.corruptionGrade]++;
    }
    return counts;
  }, [allReps]);

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ChevronUp className="w-3 h-3 text-slate-300 dark:text-slate-600" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-500" />
      : <ChevronDown className="w-3 h-3 text-blue-500" />;
  }

  function SortableHeader({ col, label, className = "" }: { col: SortCol; label: string; className?: string }) {
    return (
      <th
        onClick={() => toggleSort(col)}
        className={`px-3 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors whitespace-nowrap ${className}`}
      >
        <span className="flex items-center gap-1">
          {label}
          <SortIcon col={col} />
        </span>
      </th>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <Navigation />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6">

        {/* ── Page header ── */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Current Representatives</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Browse all current officeholders sorted by grade, search by name, state, position, or SIG affiliation.
          </p>
        </div>

        {/* ── Zip code lookup (collapsible top bar) ── */}
        <Card className="mb-5 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-900">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm font-semibold shrink-0">
                <MapPin className="w-4 h-4" />Find Your Reps by Zip Code
              </div>
              <div className="flex gap-2 flex-1 min-w-[220px] max-w-xs">
                <Input
                  placeholder="e.g. 55414"
                  value={zipInput}
                  maxLength={5}
                  onChange={e => setZipInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handleZipSearch()}
                  className="flex-1 text-sm h-8"
                  disabled={zipFetching}
                />
                <Button onClick={handleZipSearch} disabled={zipFetching} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 shrink-0">
                  {zipFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                </Button>
                {activeZip && (
                  <Button variant="ghost" size="sm" onClick={clearZipSearch} className="h-8 px-2 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {zipError && (
                <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {(zipError as Error).message}
                </div>
              )}
              {zipData && !zipFetching && (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  <strong>{zipData.state}</strong> — {zipData.districtLabel} &middot; {zipData.politicians.length} found
                </span>
              )}
            </div>

            {/* Zip results grid */}
            {zipData && !zipFetching && zipData.politicians.length > 0 && (
              <div className="mt-4 border-t border-blue-200 dark:border-blue-800 pt-4">
                {zipData.politicians.filter(p => p.isCurrent !== false).length > 0 && (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2">Current Officeholders</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-3">
                  {zipData.politicians.filter(p => p.isCurrent !== false).map(p => <ZipRepCard key={p.id} pol={p} />)}
                </div>
                {zipData.politicians.filter(p => p.isCurrent === false).length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2 mt-3">Candidates &amp; Challengers</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {zipData.politicians.filter(p => p.isCurrent === false).map(p => <ZipRepCard key={p.id} pol={p} />)}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Search + grade filters ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Search name, state, SIG, position…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 text-sm h-8"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {GRADE_FILTERS.map(g => {
              const colors = gradeColors(g === "All" ? undefined : g);
              const isActive = gradeFilter === g;
              const count = g === "All" ? allReps.length : gradeCount[g];
              return (
                <button
                  key={g}
                  onClick={() => { setGradeFilter(g); setDisplayLimit(150); }}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    isActive
                      ? g === "All" ? "bg-slate-700 text-white border-slate-700" : `${colors.bg} ${colors.text} ${colors.border}`
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400"
                  }`}
                >
                  {g === "All" ? `All (${count})` : `${g} (${count})`}
                </button>
              );
            })}
          </div>

          {!repsLoading && (
            <span className="text-xs text-slate-400 ml-auto shrink-0">
              {filteredReps.length} representatives
            </span>
          )}
        </div>

        {/* ── Full-width representative table ── */}
        <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
          {repsLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading representatives…
            </div>
          ) : filteredReps.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No representatives match your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">#</th>
                    <th className="px-3 py-2.5 w-12 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Photo</th>
                    <SortableHeader col="name" label="Name" />
                    <SortableHeader col="party" label="Party" />
                    <SortableHeader col="position" label="Position" />
                    <SortableHeader col="state" label="State / Jurisdiction" />
                    <SortableHeader col="sigs" label="SIGs/PACs/ACEs" />
                    <SortableHeader col="total" label="Grand Total" />
                    <SortableHeader col="grade" label="Grade" />
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredReps.slice(0, displayLimit).map((rep, idx) => {
                    const g = gradeColors(rep.corruptionGrade);
                    const initials = rep.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                    const total = grandTotal(rep);
                    const hasBp = rep.totalContributions != null && rep.totalContributions > 0;
                    const sigTotal = rep.totalLobbyAmount > 0 ? Math.round(rep.totalLobbyAmount / 100) : null;

                    return (
                      <tr key={rep.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">

                        {/* Row number */}
                        <td className="px-3 py-2 text-xs text-slate-400 tabular-nums">{idx + 1}</td>

                        {/* Photo */}
                        <td className="px-3 py-2">
                          <div className="relative w-9 h-9 shrink-0">
                            {rep.photoUrl ? (
                              <img src={rep.photoUrl} alt={rep.fullName}
                                className={`w-9 h-9 rounded-full object-cover border-2 ${rep.isVerified ? "border-green-500" : "border-slate-300 dark:border-slate-600"}`} />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-slate-300 dark:border-slate-600">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300">{initials}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="px-3 py-2">
                          <Link href={`/politicians/${rep.id}`}>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer">
                              {rep.fullName}
                            </span>
                          </Link>
                          {rep.isVerified && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Verified</span>
                            </div>
                          )}
                        </td>

                        {/* Party */}
                        <td className="px-3 py-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${partyBadgeClass(rep.party)}`}>
                            {partyShort(rep.party)}
                          </span>
                        </td>

                        {/* Position */}
                        <td className="px-3 py-2">
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {rep.position?.title || (rep.profileType === "candidate" ? "Candidate" : "Representative")}
                          </span>
                          {rep.targetPosition && (
                            <div className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">
                              → Running for: {rep.targetPosition.title}
                            </div>
                          )}
                        </td>

                        {/* State / Jurisdiction */}
                        <td className="px-3 py-2">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {rep.position?.jurisdiction || "—"}
                          </span>
                          {rep.position?.district && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{rep.position.district}</div>
                          )}
                        </td>

                        {/* SIGs / PACs / ACEs */}
                        <td className="px-3 py-2">
                          {rep.sigAcronyms.length === 0 && !rep.rejectsAIPAC && (!rep.demerits || rep.demerits.length === 0) ? (
                            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {rep.demerits?.map((d, i) => (
                                <span key={`dem-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-medium flex items-center gap-0.5">
                                  <ShieldAlert className="w-2.5 h-2.5" />{d.label}
                                </span>
                              ))}
                              {rep.rejectsAIPAC && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-medium flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5" />No AIPAC
                                </span>
                              )}
                              {rep.sigAcronyms.slice(0, 5).map(a => (
                                <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 font-medium">
                                  {a}
                                </span>
                              ))}
                              {rep.sigAcronyms.length > 5 && (
                                <span className="text-[10px] text-slate-400">+{rep.sigAcronyms.length - 5}</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Grand Total */}
                        <td className="px-3 py-2">
                          {total != null ? (
                            <div>
                              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                                ${total.toLocaleString()}
                              </span>
                              {hasBp && sigTotal != null && (
                                <div className="text-[10px] text-orange-500 dark:text-orange-400 mt-0.5">
                                  SIG: ${sigTotal.toLocaleString()}
                                </div>
                              )}
                              {hasBp && (
                                <div className="text-[10px] text-slate-400">career total</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* Grade */}
                        <td className="px-3 py-2">
                          {rep.corruptionGrade ? (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border ${g.bg} ${g.text} ${g.border}`}>
                              {rep.corruptionGrade}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* Profile link */}
                        <td className="px-3 py-2 text-right">
                          <Link href={`/politicians/${rep.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Load more footer */}
          {filteredReps.length > displayLimit && (
            <div className="flex flex-col items-center gap-1 py-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setDisplayLimit(l => l + 150)}>
                Load More ({filteredReps.length - displayLimit} remaining)
              </Button>
              <span className="text-xs text-slate-400">Showing {Math.min(displayLimit, filteredReps.length)} of {filteredReps.length}</span>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
