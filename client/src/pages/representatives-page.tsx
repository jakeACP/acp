import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Search, ExternalLink, DollarSign, ShieldCheck,
  AlertTriangle, Loader2, Users, X
} from "lucide-react";

type RepEntry = {
  id: string;
  fullName: string;
  party?: string;
  corruptionGrade?: string;
  totalLobbyAmount: number;
  sigAcronyms: string[];
  rejectsAIPAC: boolean;
  photoUrl?: string;
  isVerified?: boolean;
  profileType?: string;
  position?: {
    title: string;
    officeType: string;
    level: string;
    jurisdiction: string;
    district?: string;
    termLength?: number;
  };
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
  if (!party) return "";
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
  if (rep.position?.level?.toLowerCase().includes(lower)) return true;
  if (rep.sigAcronyms.some(s => s.toLowerCase().includes(lower))) return true;
  if (rep.profileType?.toLowerCase().includes(lower)) return true;
  return false;
}

function RepCard({ rep, compact = false }: { rep: RepEntry; compact?: boolean }) {
  const initials = rep.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const g = gradeColors(rep.corruptionGrade);

  return (
    <Link href={`/politicians/${rep.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-sm transition-all cursor-pointer group">
        <div className="relative shrink-0">
          {rep.photoUrl ? (
            <img
              src={rep.photoUrl}
              alt={rep.fullName}
              className={`w-12 h-12 rounded-full object-cover border-2 ${rep.isVerified ? "border-green-500" : "border-slate-300 dark:border-slate-600"}`}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-slate-300 dark:border-slate-600">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-300">{initials}</span>
            </div>
          )}
          {rep.corruptionGrade && (
            <span className={`absolute -bottom-1 -right-1 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border ${g.bg} ${g.text} ${g.border}`}>
              {rep.corruptionGrade}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {rep.fullName}
            </span>
            {rep.party && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${partyBadgeClass(rep.party)}`}>
                {partyShort(rep.party)}
              </span>
            )}
            {rep.rejectsAIPAC && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" />No AIPAC
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {rep.position?.title || (rep.profileType === "candidate" ? "Candidate" : "Representative")}
          </p>
          {!compact && (
            <div className="flex flex-wrap gap-1 mt-1">
              {rep.sigAcronyms.slice(0, 4).map(a => (
                <span key={a} className="text-[10px] font-medium px-1 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                  {a}
                </span>
              ))}
              {rep.sigAcronyms.length > 4 && (
                <span className="text-[10px] text-slate-400">+{rep.sigAcronyms.length - 4}</span>
              )}
              {rep.totalLobbyAmount > 0 && (
                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                  ${(rep.totalLobbyAmount / 100).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        <ExternalLink className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors shrink-0" />
      </div>
    </Link>
  );
}

function ZipRepCard({ pol }: { pol: RepEntry }) {
  const initials = pol.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const g = gradeColors(pol.corruptionGrade);
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
            {pol.isVerified && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" title="Verified" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{pol.fullName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{pol.position?.title}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {pol.party && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${partyBadgeClass(pol.party)}`}>{pol.party}</span>
              )}
              {pol.rejectsAIPAC && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />Rejects AIPAC
                </span>
              )}
            </div>
            {pol.totalLobbyAmount > 0 && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-orange-600 dark:text-orange-400">
                <DollarSign className="w-3 h-3" />
                <span className="font-bold">${(pol.totalLobbyAmount / 100).toLocaleString()}</span>
                <span className="text-slate-400">total lobbying</span>
              </div>
            )}
            {pol.sigAcronyms.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {pol.sigAcronyms.slice(0, 5).map(a => (
                  <span key={a} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">{a}</span>
                ))}
                {pol.sigAcronyms.length > 5 && <span className="text-[10px] text-slate-400">+{pol.sigAcronyms.length - 5}</span>}
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

const GRADE_FILTERS = ["All", "A", "B", "C", "D", "F"] as const;
type GradeFilter = typeof GRADE_FILTERS[number];

export default function RepresentativesPage() {
  const { toast } = useToast();
  const [zipInput, setZipInput] = useState("");
  const [activeZip, setActiveZip] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("All");
  const [mapSrc, setMapSrc] = useState(
    "https://maps.google.com/maps?q=United+States&output=embed&z=4&ll=39.5,-98.35"
  );

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

  const clearZipSearch = () => {
    setActiveZip(null);
    setZipInput("");
    setMapSrc("https://maps.google.com/maps?q=United+States&output=embed&z=4&ll=39.5,-98.35");
  };

  if (zipData && !zipFetching) {
    const newSrc = `https://maps.google.com/maps?q=${encodeURIComponent(`${zipData.state} ${zipData.districtLabel} congressional district`)}&output=embed&z=7`;
    if (mapSrc !== newSrc) setMapSrc(newSrc);
  }

  const filteredReps = useMemo(() => {
    const filtered = allReps.filter(rep => {
      if (gradeFilter !== "All" && rep.corruptionGrade !== gradeFilter) return false;
      if (searchQuery && !matchesSearch(rep, searchQuery)) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      const ga = GRADE_ORDER[a.corruptionGrade ?? ""] ?? 6;
      const gb = GRADE_ORDER[b.corruptionGrade ?? ""] ?? 6;
      if (ga !== gb) return ga - gb;
      return a.totalLobbyAmount - b.totalLobbyAmount;
    });
  }, [allReps, searchQuery, gradeFilter]);

  const gradeCount = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const r of allReps) {
      if (r.corruptionGrade && counts[r.corruptionGrade] !== undefined) counts[r.corruptionGrade]++;
    }
    return counts;
  }, [allReps]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Current Representatives</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Find your representatives by zip code, search by name, state, SIG, or browse all reps sorted by grade.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left column: search + rep list ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Zip code search */}
            <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-900">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <MapPin className="w-4 h-4" />Find Your Reps by Zip Code
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 55414"
                    value={zipInput}
                    maxLength={5}
                    onChange={e => setZipInput(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={e => e.key === "Enter" && handleZipSearch()}
                    className="flex-1 text-sm"
                    disabled={zipFetching}
                  />
                  <Button onClick={handleZipSearch} disabled={zipFetching} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                    {zipFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                  {activeZip && (
                    <Button variant="ghost" size="sm" onClick={clearZipSearch} className="shrink-0 px-2">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {zipError && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {(zipError as Error).message}
                  </div>
                )}

                {zipData && !zipFetching && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      Showing reps for <strong>{zipData.zipCode}</strong> — <strong>{zipData.state}</strong>, {zipData.districtLabel}
                    </p>
                    {zipData.politicians.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No profiles found for this district yet.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {zipData.politicians.map(p => <ZipRepCard key={p.id} pol={p} />)}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Browse / search list */}
            <Card className="border-slate-200 dark:border-slate-700 flex-1">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Users className="w-4 h-4" />
                  Browse All Reps
                  {!repsLoading && (
                    <span className="ml-auto text-xs font-normal text-slate-400">{filteredReps.length} shown</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {/* Search input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Search name, state, SIG, position, district…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Grade filter pills */}
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {GRADE_FILTERS.map(g => {
                    const colors = gradeColors(g === "All" ? undefined : g);
                    const isActive = gradeFilter === g;
                    const count = g === "All" ? allReps.length : gradeCount[g];
                    return (
                      <button
                        key={g}
                        onClick={() => setGradeFilter(g)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                          isActive
                            ? g === "All"
                              ? "bg-slate-700 text-white border-slate-700"
                              : `${colors.bg} ${colors.text} ${colors.border}`
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {g === "All" ? `All (${count})` : `${g} (${count})`}
                      </button>
                    );
                  })}
                </div>

                {/* Rep list */}
                {repsLoading ? (
                  <div className="flex items-center justify-center py-8 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading representatives…
                  </div>
                ) : filteredReps.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No representatives match your search.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-[600px] overflow-y-auto pr-1">
                    {filteredReps.map(rep => (
                      <RepCard key={rep.id} rep={rep} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Right column: map ── */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden sticky top-6">
              <div className="relative">
                <iframe
                  key={mapSrc}
                  title="US Congressional Districts Map"
                  src={mapSrc}
                  className="w-full border-0"
                  style={{ height: "calc(100vh - 180px)", minHeight: "500px" }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                {!activeZip && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none p-4">
                    <p className="text-white text-sm font-medium">Enter your zip code to zoom to your district</p>
                    <p className="text-white/70 text-xs">Or browse all representatives in the list</p>
                  </div>
                )}
                {activeZip && zipData && (
                  <div className="absolute top-3 left-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg px-3 py-2 text-sm pointer-events-none">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      {zipData.state} — {zipData.districtLabel}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
