import { useLocation, useSearch } from "wouter";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronRight, MapPin, AlertCircle, User, DollarSign, Info, Navigation2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation as useWouterLocation } from "wouter";

interface Politician {
  id: string;
  fullName: string;
  party: string | null;
  isCurrent: boolean;
  photoUrl: string | null;
  handle: string | null;
  corruptionGrade: string | null;
  totalContributions: number | null;
  superpacTotal: number;
  isVerified: boolean;
  profileType: string | null;
}

interface Seat {
  positionId: string;
  title: string;
  officeType: string;
  level: string;
  jurisdiction: string;
  district: string | null;
  displayOrder: number | null;
  incumbents: Politician[];
  candidates: Politician[];
}

interface LookupResponse {
  stateName: string;
  stateCode: string;
  cdDistrict: string | null;
  slduDistrict: string | null;
  sldsDistrict: string | null;
  districtKnown: boolean;
  seats: Seat[];
}

function getLevelLabel(level: string, officeType?: string): string {
  const l = level?.toLowerCase();
  const o = officeType?.toLowerCase() ?? '';
  if (o.includes('executive') || o.includes('governor')) return "Governor";
  if (l === "country" || l === "national" || l === "federal") return "Federal";
  if (l === "state") return "State";
  if (l === "local") return "Local";
  return "Other";
}

function getLevelBadgeVariant(level: string): "default" | "secondary" | "outline" {
  const l = level?.toLowerCase();
  if (l === "country" || l === "national" || l === "federal") return "default";
  if (l === "state") return "secondary";
  return "outline";
}

function gradeColor(grade: string | null): string {
  if (!grade) return "bg-slate-500";
  const g = grade.toUpperCase();
  if (g === "A+" || g === "A") return "bg-emerald-500";
  if (g === "A-" || g === "B+") return "bg-green-500";
  if (g === "B" || g === "B-") return "bg-lime-500";
  if (g === "C+" || g === "C") return "bg-yellow-500";
  if (g === "C-" || g === "D+") return "bg-orange-400";
  if (g === "D" || g === "D-") return "bg-orange-500";
  return "bg-red-600";
}

function formatDollars(cents: number): string {
  if (!cents || cents === 0) return "$0";
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
}

function SeatCard({
  seat,
  stateName,
  onViewRace,
}: {
  seat: Seat;
  stateName: string;
  onViewRace: () => void;
}) {
  const incumbent = seat.incumbents[0] ?? null;
  const [imgError, setImgError] = useState(false);

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow overflow-hidden">
      {/* Photo — portrait aspect ratio */}
      <div className="relative w-full aspect-[3/4] bg-muted shrink-0">
        {incumbent?.photoUrl && !imgError ? (
          <img
            src={incumbent.photoUrl}
            alt={incumbent.fullName}
            className="absolute inset-0 w-full h-full object-cover object-top"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
            <User className="h-16 w-16 text-slate-400 dark:text-slate-500" />
          </div>
        )}
        {/* Level badge — top left */}
        <Badge
          variant={getLevelBadgeVariant(seat.level)}
          className="absolute top-2 left-2 text-xs shadow"
        >
          {getLevelLabel(seat.level, seat.officeType)}
        </Badge>
        {/* Grade badge — top right */}
        {incumbent?.corruptionGrade && (
          <div className={`absolute top-2 right-2 rounded-md px-2 py-0.5 text-white font-bold text-sm shadow ${gradeColor(incumbent.corruptionGrade)}`}>
            {incumbent.corruptionGrade}
          </div>
        )}
      </div>

      <CardHeader className="pb-1 pt-3">
        <CardTitle className="text-sm leading-snug line-clamp-2">{seat.title}</CardTitle>
        {incumbent ? (
          <div className="space-y-0.5 mt-0.5">
            <p className="text-sm font-medium text-foreground">{incumbent.fullName}</p>
            {incumbent.party && (
              <p className="text-xs text-muted-foreground">{incumbent.party}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic mt-0.5">No incumbent in ACP database</p>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-2 pt-0 pb-3">
        {incumbent && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>
              SuperPAC:{" "}
              <span className={`font-semibold ${incumbent.superpacTotal > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {incumbent.superpacTotal > 0 ? formatDollars(incumbent.superpacTotal) : "No data"}
              </span>
            </span>
          </div>
        )}
        {seat.candidates.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {seat.candidates.length} challenger{seat.candidates.length !== 1 ? "s" : ""} in ACP database
          </p>
        )}
        <Button size="sm" className="w-full mt-auto" onClick={onViewRace}>
          View Race
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ElectionPositionsPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const address = params.get("address") ?? "";

  const [lookupData, setLookupData] = useState<LookupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    fetch(`/api/elections/lookup?address=${encodeURIComponent(address)}`, { credentials: "include" })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Failed to load seats");
        return data as LookupResponse;
      })
      .then(data => setLookupData(data))
      .catch((err: any) => setError(err.message ?? "Failed to load seats"))
      .finally(() => setIsLoading(false));
  }, [address]);

  const handleViewRace = (seat: Seat, stateName: string) => {
    const query = new URLSearchParams({
      positionId: seat.positionId,
      title: seat.title,
      state: stateName,
    });
    navigate(`/elections/race?${query.toString()}`);
  };

  const ordinalLabel = (n: string | null) => {
    if (!n) return null;
    const ordinals: Record<string, string> = {
      '1':'1st','2':'2nd','3':'3rd','4':'4th','5':'5th','6':'6th',
      '7':'7th','8':'8th','9':'9th','10':'10th','11':'11th','12':'12th',
    };
    return ordinals[n] ?? `${n}th`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/elections")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>

        <div className="mb-4">
          <h1 className="text-3xl font-bold">Your Elected Seats</h1>
          {address && (
            <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="text-sm">{address}</span>
            </div>
          )}
          {lookupData && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Showing seats for <strong>{lookupData.stateName}</strong>
              {lookupData.cdDistrict && (
                <span> · Congressional District <strong>{ordinalLabel(lookupData.cdDistrict)}</strong></span>
              )}
            </p>
          )}
        </div>

        {/* District-awareness banner */}
        {lookupData && !lookupData.districtKnown && !isLoading && (
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-5">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-300">Showing all {lookupData.stateName} districts</p>
              <p className="text-blue-700 dark:text-blue-400 mt-0.5">
                Enter a full street address (e.g. <em>123 Main St, Minneapolis, MN 55401</em>) to see only the races for your specific district.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={() => navigate("/elections")}
              >
                <Navigation2 className="h-3 w-3 mr-1" />
                Refine my address
              </Button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full aspect-[3/4]" />
                <CardHeader className="pb-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-full rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4 mb-6">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Could not load seats</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {lookupData && !isLoading && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Found {lookupData.seats.length} position{lookupData.seats.length !== 1 ? "s" : ""} in the ACP database for your area.
              Click <strong>View Race</strong> to see candidates and ACP grades.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {lookupData.seats.map(seat => (
                <SeatCard
                  key={seat.positionId}
                  seat={seat}
                  stateName={lookupData.stateName}
                  onViewRace={() => handleViewRace(seat, lookupData.stateName)}
                />
              ))}
            </div>
          </>
        )}

        {!isLoading && !error && !lookupData && address && (
          <div className="text-center py-16 text-muted-foreground">
            <p>No data returned. Please try a different address.</p>
          </div>
        )}
      </div>
    </div>
  );
}
