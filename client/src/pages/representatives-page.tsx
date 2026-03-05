import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Search, ExternalLink, DollarSign, ShieldCheck, AlertTriangle, Info, Loader2 } from "lucide-react";

type PoliticianResult = {
  id: string;
  fullName: string;
  party?: string;
  corruptionGrade?: string;
  corruptionScorecard?: string;
  totalLobbyAmount: number;
  sigAcronyms: string[];
  rejectsAIPAC: boolean;
  position?: {
    title: string;
    officeType: string;
    level: string;
    jurisdiction: string;
    district?: string;
    termLength?: number;
  };
};

type ZipLookupResult = {
  state: string;
  districtLabel: string;
  zipCode: string;
  politicians: PoliticianResult[];
};

function gradeColor(grade?: string): string {
  switch (grade) {
    case "A": return "bg-green-600 text-white border-green-700";
    case "B": return "bg-blue-500 text-white border-blue-600";
    case "C": return "bg-yellow-400 text-yellow-900 border-yellow-500";
    case "D": return "bg-orange-500 text-white border-orange-600";
    case "F": return "bg-red-600 text-white border-red-700";
    default: return "bg-slate-400 text-white border-slate-500";
  }
}

function partyColor(party?: string): string {
  if (!party) return "secondary";
  const p = party.toLowerCase();
  if (p.includes("republican") || p === "r") return "destructive";
  if (p.includes("democrat") || p === "d") return "default";
  return "secondary";
}

function isSenator(position?: PoliticianResult["position"]): boolean {
  return !!position?.title?.includes("Senator");
}

export default function RepresentativesPage() {
  const { toast } = useToast();
  const [inputZip, setInputZip] = useState("");
  const [activeZip, setActiveZip] = useState<string | null>(null);

  const { data, isFetching, error } = useQuery<ZipLookupResult>({
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

  const handleSearch = () => {
    const zip = inputZip.trim().slice(0, 5);
    if (!/^\d{5}$/.test(zip)) {
      toast({
        title: "Invalid zip code",
        description: "Please enter a 5-digit US zip code.",
        variant: "destructive",
      });
      return;
    }
    setActiveZip(zip);
  };

  const senators = data?.politicians.filter(p => isSenator(p.position)) ?? [];
  const houseReps = data?.politicians.filter(p => !isSenator(p.position)) ?? [];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Current Representatives</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Find your federal Congress members by zip code. Data sourced from the ACP politician database.
          </p>
        </div>

        {/* Search card */}
        <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              Find Your Representatives
            </CardTitle>
            <CardDescription>
              Enter your zip code to see your U.S. senators and house representative from our database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Enter 5-digit zip code (e.g. 55414)"
                value={inputZip}
                maxLength={5}
                onChange={(e) => setInputZip(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="max-w-xs"
                disabled={isFetching}
              />
              <Button
                onClick={handleSearch}
                disabled={isFetching}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isFetching ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Looking up...</>
                ) : (
                  <><Search className="h-4 w-4 mr-2" />Search</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Federal-only notice */}
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 mb-6 text-sm text-blue-800 dark:text-blue-300">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Currently showing <strong>federal Congress members</strong> only (U.S. Senate + House of Representatives).
            State and local coverage is coming soon.
          </span>
        </div>

        {/* Error state */}
        {error && (
          <Card className="mb-6 border-red-200 dark:border-red-800">
            <CardContent className="flex items-center gap-3 py-6 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{(error as Error).message}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {data && !isFetching && (
          <>
            <div className="mb-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Showing federal representatives for ZIP <strong>{data.zipCode}</strong> —{" "}
                <strong>{data.state}</strong>, {data.districtLabel}
              </p>
            </div>

            {/* Senators */}
            {senators.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                  U.S. Senators — {data.state}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {senators.map(pol => (
                    <PoliticianCard key={pol.id} politician={pol} />
                  ))}
                </div>
              </div>
            )}

            {/* House Reps */}
            {houseReps.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">
                  U.S. House Representative{houseReps.length > 1 ? "s" : ""} — {data.districtLabel}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {houseReps.map(pol => (
                    <PoliticianCard key={pol.id} politician={pol} />
                  ))}
                </div>
              </div>
            )}

            {data.politicians.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center">
                  <MapPin className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="font-medium text-slate-700 dark:text-slate-300">No profiles found in our database yet</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Your representatives for {data.state}'s {data.districtLabel} may not be imported yet.
                    Run the Congress import from the admin panel to populate the database.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Empty / initial state */}
        {!data && !isFetching && !error && (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Enter Your Zip Code</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We'll look up your congressional district and show your current federal representatives
                from the ACP politician database, including corruption grades and special interest group data.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PoliticianCard({ politician: pol }: { politician: PoliticianResult }) {
  return (
    <Card className="border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{pol.fullName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
              {pol.position?.title}
            </p>
          </div>
          {pol.corruptionGrade && (
            <span className={`text-lg font-bold px-2.5 py-1 rounded border text-center min-w-[2.5rem] shrink-0 ${gradeColor(pol.corruptionGrade)}`}>
              {pol.corruptionGrade}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {pol.party && (
            <Badge variant={partyColor(pol.party) as any} className="text-xs">
              {pol.party}
            </Badge>
          )}
          {pol.rejectsAIPAC && (
            <Badge className="text-xs bg-green-600 text-white border border-green-700">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Rejects AIPAC
            </Badge>
          )}
        </div>

        {pol.totalLobbyAmount > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-orange-700 dark:text-orange-400 mb-3">
            <DollarSign className="w-4 h-4 shrink-0" />
            <span>
              <span className="font-medium">${(pol.totalLobbyAmount / 100).toLocaleString()}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">Israel lobby total</span>
            </span>
          </div>
        )}

        {pol.sigAcronyms.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {pol.sigAcronyms.slice(0, 6).map(acronym => (
              <span
                key={acronym}
                className="text-xs px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300"
              >
                {acronym}
              </span>
            ))}
            {pol.sigAcronyms.length > 6 && (
              <span className="text-xs text-slate-400">+{pol.sigAcronyms.length - 6} more</span>
            )}
          </div>
        )}

        <Link href={`/politicians/${pol.id}`}>
          <Button variant="outline" size="sm" className="w-full mt-1">
            <ExternalLink className="w-3.5 h-3.5 mr-2" />
            View Full Profile
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
