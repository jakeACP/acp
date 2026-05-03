import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATE_NAME_TO_ABBREV: Record<string, string> = {
  alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca",
  colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga",
  hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia",
  kansas: "ks", kentucky: "ky", louisiana: "la", maine: "me", maryland: "md",
  massachusetts: "ma", michigan: "mi", minnesota: "mn", mississippi: "ms",
  missouri: "mo", montana: "mt", nebraska: "ne", nevada: "nv",
  "new hampshire": "nh", "new jersey": "nj", "new mexico": "nm", "new york": "ny",
  "north carolina": "nc", "north dakota": "nd", ohio: "oh", oklahoma: "ok",
  oregon: "or", pennsylvania: "pa", "rhode island": "ri", "south carolina": "sc",
  "south dakota": "sd", tennessee: "tn", texas: "tx", utah: "ut", vermont: "vt",
  virginia: "va", washington: "wa", "west virginia": "wv", wisconsin: "wi",
  wyoming: "wy", "district of columbia": "dc",
};

export function jurisdictionToStateKey(jurisdiction: string | null | undefined): string | null {
  if (!jurisdiction) return null;
  const lower = jurisdiction.toLowerCase().trim();
  if (lower === "united states" || lower === "us" || lower === "federal") return "national";
  if (STATE_NAME_TO_ABBREV[lower]) return STATE_NAME_TO_ABBREV[lower];
  if (lower.length === 2) return lower;
  return null;
}

type DistrictAggregateResponse = {
  state: string;
  districtData: {
    district: string;
    count: number;
    avgDeficit: number;
    labelDistribution: Record<string, number>;
  } | null;
  national: {
    count: number;
    avgDeficit: number;
    labelDistribution: Record<string, number>;
  };
};

function getTopLabel(dist: Record<string, number>): string | null {
  const entries = Object.entries(dist);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function formatDeficit(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}T`;
  if (abs >= 1) return `$${abs.toFixed(0)}B`;
  return `$${(abs * 1000).toFixed(0)}M`;
}

interface Props {
  stateKey: string | null;
  districtLabel?: string;
}

export default function DistrictBudgetWidget({ stateKey, districtLabel }: Props) {
  const queryKey = stateKey ?? "national";

  const { data, isLoading, isError } = useQuery<DistrictAggregateResponse>({
    queryKey: ["/api/budget/district-aggregate", queryKey],
    queryFn: async () => {
      const res = await fetch(`/api/budget/district-aggregate/${encodeURIComponent(queryKey)}`);
      if (!res.ok) throw new Error("Failed to fetch budget data");
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });

  if (isError) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            District Budget Priorities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { districtData, national } = data;
  const showDistrict = !!districtData && queryKey !== "national";
  const displayLabel = districtLabel ?? (showDistrict ? districtData!.district.toUpperCase() : "National");
  const districtTopLabel = showDistrict ? getTopLabel(districtData!.labelDistribution) : null;
  const nationalTopLabel = getTopLabel(national.labelDistribution);
  const deficitDiff = showDistrict ? districtData!.avgDeficit - national.avgDeficit : null;

  if (!showDistrict && national.count === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            District Budget Priorities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No public simulations yet. Try the Economic Policy Simulator to contribute data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          District Budget Priorities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {showDistrict ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">{displayLabel} simulations</span>
              <div className="flex items-center gap-1 text-xs font-medium">
                <Users className="w-3 h-3" />
                {districtData!.count}
              </div>
            </div>

            {districtTopLabel && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avg. philosophy</p>
                <Badge variant="secondary" className="text-xs">{districtTopLabel}</Badge>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-md bg-muted/50 p-2 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">{displayLabel} avg deficit</p>
                <p className="font-semibold text-sm">{formatDeficit(districtData!.avgDeficit)}</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">National avg deficit</p>
                <p className="font-semibold text-sm">{formatDeficit(national.avgDeficit)}</p>
              </div>
            </div>

            {deficitDiff !== null && (
              <div className={`flex items-center gap-1 text-xs font-medium ${deficitDiff > 0 ? "text-red-500" : "text-green-600"}`}>
                {deficitDiff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {displayLabel} runs {Math.abs(deficitDiff) < 0.5
                  ? "roughly the same deficit as"
                  : `${formatDeficit(Math.abs(deficitDiff))} ${deficitDiff > 0 ? "more" : "less"} deficit than`
                } the national average
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Public simulations</span>
              <div className="flex items-center gap-1 text-xs font-medium">
                <Users className="w-3 h-3" />
                {national.count}
              </div>
            </div>

            {nationalTopLabel && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Most common philosophy</p>
                <Badge variant="secondary" className="text-xs">{nationalTopLabel}</Badge>
              </div>
            )}

            <div className="rounded-md bg-muted/50 p-2 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">National avg deficit</p>
              <p className="font-semibold text-sm">{formatDeficit(national.avgDeficit)}</p>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground border-t pt-2">
          Based on public Economic Policy Simulator submissions
        </p>
      </CardContent>
    </Card>
  );
}
