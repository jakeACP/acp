import { useLocation, useSearch } from "wouter";
import { Navigation } from "@/components/navigation";
import { DistrictMap } from "@/components/elections/district-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronRight, MapPin, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface Politician {
  id: string;
  fullName: string;
  party: string | null;
  isCurrent: boolean;
  photoUrl: string | null;
  handle: string | null;
  corruptionGrade: string | null;
  totalContributions: number | null;
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
  seats: Seat[];
}

function getLevelLabel(level: string): string {
  const l = level?.toLowerCase();
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

function SeatCard({
  seat,
  stateCode,
  stateName,
  onViewRace,
}: {
  seat: Seat;
  stateCode: string;
  stateName: string;
  onViewRace: () => void;
}) {
  const incumbent = seat.incumbents[0] ?? null;
  const totalCount = seat.incumbents.length + seat.candidates.length;

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{seat.title}</CardTitle>
          <Badge variant={getLevelBadgeVariant(seat.level)} className="shrink-0 text-xs">
            {getLevelLabel(seat.level)}
          </Badge>
        </div>
        {incumbent ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{incumbent.fullName}</span>
            {incumbent.party && ` · ${incumbent.party}`}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No incumbent in ACP database</p>
        )}
        {seat.candidates.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {seat.candidates.length} candidate{seat.candidates.length !== 1 ? "s" : ""} running
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 pt-0">
        <DistrictMap officeName={seat.title} state={stateCode} />
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

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Your Elected Seats</h1>
          {address && (
            <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="text-sm">{address}</span>
            </div>
          )}
          {lookupData && (
            <p className="text-sm text-muted-foreground mt-1">
              Showing seats for <strong>{lookupData.stateName}</strong>
            </p>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full mt-3 rounded" />
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
              Found {lookupData.seats.length} elected positions in the ACP database for your area.
              Click <strong>View Race</strong> on any seat to see candidates and ACP grades.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {lookupData.seats.map(seat => (
                <SeatCard
                  key={seat.positionId}
                  seat={seat}
                  stateCode={lookupData.stateCode}
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
