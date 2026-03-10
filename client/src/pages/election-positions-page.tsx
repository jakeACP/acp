import { useLocation, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/navigation";
import { DistrictMap } from "@/components/elections/district-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronRight, MapPin, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface Office {
  name: string;
  officialIndices: number[];
  levels?: string[];
  roles?: string[];
  divisionId?: string;
}

interface Official {
  name: string;
  party?: string;
  phones?: string[];
  urls?: string[];
  photoUrl?: string;
  address?: Array<{ line1?: string; city?: string; state?: string; zip?: string }>;
}

interface CivicResponse {
  offices: Office[];
  officials: Official[];
  normalizedInput?: { locationName?: string };
  kind?: string;
}

function getStateCode(response: CivicResponse): string {
  const addr = response.normalizedInput?.locationName ?? "";
  const match = addr.match(/\b([A-Z]{2})\b/);
  return match?.[1] ?? "";
}

function getLevelLabel(levels?: string[]): string {
  if (!levels) return "Unknown";
  if (levels.includes("country")) return "Federal";
  if (levels.includes("administrativeArea1")) return "State";
  if (levels.includes("administrativeArea2")) return "County";
  if (levels.includes("locality")) return "Local";
  return "Other";
}

function getLevelBadgeColor(levels?: string[]): string {
  if (!levels) return "secondary";
  if (levels.includes("country")) return "default";
  if (levels.includes("administrativeArea1")) return "secondary";
  return "outline";
}

function PositionCard({
  office,
  officials,
  stateCode,
  onViewRace,
}: {
  office: Office;
  officials: Official[];
  stateCode: string;
  onViewRace: () => void;
}) {
  const levelLabel = getLevelLabel(office.levels);
  const incumbent = officials[0];

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{office.name}</CardTitle>
          <Badge variant={getLevelBadgeColor(office.levels) as any} className="shrink-0 text-xs">
            {levelLabel}
          </Badge>
        </div>
        {incumbent && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{incumbent.name}</span>
            {incumbent.party && ` · ${incumbent.party}`}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 pt-0">
        <DistrictMap officeName={office.name} state={stateCode} />
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

  const [civicData, setCivicData] = useState<CivicResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    apiRequest("/api/representatives/search", "POST", { address })
      .then(res => res.json())
      .then((data: CivicResponse) => setCivicData(data))
      .catch((err: any) => setError(err.message ?? "Failed to load representatives"))
      .finally(() => setIsLoading(false));
  }, [address]);

  const stateCode = civicData ? getStateCode(civicData) : "";

  const handleViewRace = (office: Office) => {
    const query = new URLSearchParams({
      office: office.name,
      state: stateCode,
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
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
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
              <p className="font-medium">Could not load representatives</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {civicData && !isLoading && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Found {civicData.offices?.length ?? 0} elected positions for your address.
              Click <strong>View Race</strong> on any seat to see candidates and ACP grades.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(civicData.offices ?? []).map((office, idx) => {
                const officeOfficials = (office.officialIndices ?? []).map(
                  (i: number) => civicData.officials[i]
                ).filter(Boolean);
                return (
                  <PositionCard
                    key={idx}
                    office={office}
                    officials={officeOfficials}
                    stateCode={stateCode}
                    onViewRace={() => handleViewRace(office)}
                  />
                );
              })}
            </div>
          </>
        )}

        {!isLoading && !error && !civicData && address && (
          <div className="text-center py-16 text-muted-foreground">
            <p>No data returned. Please try a different address.</p>
          </div>
        )}
      </div>
    </div>
  );
}
