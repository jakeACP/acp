import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { CandidateCard } from "@/components/elections/candidate-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Award, Users, AlertCircle } from "lucide-react";

interface Politician {
  id: string;
  fullName: string;
  party: string | null;
  photoUrl: string | null;
  corruptionGrade: string | null;
  totalContributions: number | null;
  isCurrent: boolean;
  isVerified: boolean;
  handle: string | null;
  profileType: string | null;
}

interface RaceData {
  office: string;
  state: string;
  politicians: Politician[];
}

const PARTY_ORDER = ["Democratic Party", "Republican Party", "Independent", "Libertarian Party", "Green Party"];
const PARTY_COLORS: Record<string, { header: string; badge: string }> = {
  "Democratic Party": { header: "bg-blue-600 text-white", badge: "bg-blue-100 text-blue-800 border-blue-200" },
  "Democrat": { header: "bg-blue-600 text-white", badge: "bg-blue-100 text-blue-800 border-blue-200" },
  "Republican Party": { header: "bg-red-600 text-white", badge: "bg-red-100 text-red-800 border-red-200" },
  "Republican": { header: "bg-red-600 text-white", badge: "bg-red-100 text-red-800 border-red-200" },
  "Independent": { header: "bg-purple-600 text-white", badge: "bg-purple-100 text-purple-800 border-purple-200" },
  "Libertarian Party": { header: "bg-yellow-600 text-white", badge: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  "Green Party": { header: "bg-green-600 text-white", badge: "bg-green-100 text-green-800 border-green-200" },
};

function normalizeParty(party: string | null): string {
  if (!party) return "Independent";
  const p = party.toLowerCase();
  if (p.includes("democrat")) return "Democratic Party";
  if (p.includes("republican")) return "Republican Party";
  if (p.includes("libertarian")) return "Libertarian Party";
  if (p.includes("green")) return "Green Party";
  return party;
}

function groupByParty(politicians: Politician[]): Record<string, Politician[]> {
  const groups: Record<string, Politician[]> = {};
  for (const p of politicians) {
    const party = normalizeParty(p.party);
    if (!groups[party]) groups[party] = [];
    groups[party].push(p);
  }
  return groups;
}

function sortedParties(groups: Record<string, Politician[]>): string[] {
  const keys = Object.keys(groups);
  return [
    ...PARTY_ORDER.filter(p => keys.includes(p)),
    ...keys.filter(p => !PARTY_ORDER.includes(p)),
  ];
}

function PartyLane({ party, politicians }: { party: string; politicians: Politician[] }) {
  const colors = PARTY_COLORS[party] ?? { header: "bg-slate-600 text-white", badge: "bg-slate-100 text-slate-800 border-slate-200" };
  const incumbent = politicians.find(p => p.isCurrent);
  const candidates = politicians.filter(p => !p.isCurrent);

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border shadow-sm">
      <div className={`px-4 py-3 font-semibold text-sm text-center ${colors.header}`}>
        {party}
        <span className="ml-2 text-xs opacity-80">({politicians.length} {politicians.length === 1 ? "person" : "people"})</span>
      </div>
      <div className="bg-card flex-1 p-3 space-y-2">
        {incumbent && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
              <Award className="h-3 w-3" /> Incumbent
            </p>
            <CandidateCard politician={incumbent} />
          </div>
        )}
        {candidates.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
              <Users className="h-3 w-3" /> {incumbent ? "Challengers" : "Candidates"}
            </p>
            <div className="space-y-2">
              {candidates.map(p => (
                <CandidateCard key={p.id} politician={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ElectionRacePage() {
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const office = params.get("office") ?? "";
  const state = params.get("state") ?? "";

  const { data, isLoading, error } = useQuery<RaceData>({
    queryKey: ["/api/elections/race", office, state],
    queryFn: () => {
      const q = new URLSearchParams({ office, state });
      return fetch(`/api/elections/race?${q.toString()}`, { credentials: "include" }).then(r => r.json());
    },
    enabled: !!office,
  });

  const groups = data?.politicians ? groupByParty(data.politicians) : {};
  const parties = sortedParties(groups);
  const incumbent = data?.politicians?.find(p => p.isCurrent);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Seats
        </Button>

        {/* LEVEL 1 — THE SEAT */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 mb-8 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Award className="h-7 w-7 text-white/80" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight mb-1">{office || "Race"}</h1>
              {state && (
                <p className="text-slate-300 text-sm mb-2">{state}</p>
              )}
              {incumbent ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-300 text-sm">Current Incumbent:</span>
                  <span className="font-semibold">{incumbent.fullName}</span>
                  {incumbent.party && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      {incumbent.party}
                    </Badge>
                  )}
                  {incumbent.corruptionGrade && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      ACP Grade: {incumbent.corruptionGrade}
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No incumbent found in ACP database</p>
              )}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border">
                <Skeleton className="h-12 w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Could not load race data</p>
              <p className="text-sm">{(error as any).message}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {/* LEVEL 2 + 3 — Party Lanes with candidates */}
            {parties.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">
                    {data.politicians.length} {data.politicians.length === 1 ? "Person" : "People"} in ACP Database
                  </h2>
                </div>
                <div className={`grid gap-4 ${parties.length === 1 ? "grid-cols-1 max-w-sm" : parties.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
                  {parties.map(party => (
                    <PartyLane key={party} party={party} politicians={groups[party]} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-muted/30 rounded-xl border">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No Profiles Found</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  No candidates for <strong>{office}</strong> are currently in the ACP database.
                  Profiles are added as candidates file and data becomes available.
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-6 text-center">
              ACP grades and contribution data are pulled from FEC filings and ACP analysis.
              Profiles are updated regularly as new data becomes available.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
