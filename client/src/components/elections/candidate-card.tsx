import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Star } from "lucide-react";

interface CandidateCardProps {
  politician: {
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
  };
}

const PARTY_COLORS: Record<string, string> = {
  "Democratic Party": "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  "Democrat": "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  "Republican Party": "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
  "Republican": "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
  "Independent": "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800",
  "Libertarian Party": "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",
  "Green Party": "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
};

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500 text-white",
  B: "bg-lime-500 text-white",
  C: "bg-yellow-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-red-600 text-white",
};

function getPartyShort(party: string | null): string {
  if (!party) return "Ind.";
  if (party.toLowerCase().includes("democrat")) return "D";
  if (party.toLowerCase().includes("republican")) return "R";
  if (party.toLowerCase().includes("libertarian")) return "L";
  if (party.toLowerCase().includes("green")) return "G";
  if (party.toLowerCase().includes("independent")) return "I";
  return party.slice(0, 2).toUpperCase();
}

function formatMoney(cents: number | null): string {
  if (!cents) return "N/A";
  const dollars = cents;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars}`;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export function CandidateCard({ politician }: CandidateCardProps) {
  const cardBg = PARTY_COLORS[politician.party ?? ""] ?? "bg-gray-50 border-gray-200 dark:bg-gray-900/30 dark:border-gray-700";
  const gradeColor = GRADE_COLORS[politician.corruptionGrade ?? ""] ?? "bg-gray-400 text-white";
  const partyShort = getPartyShort(politician.party);

  const profileUrl = politician.handle
    ? `/politicians/handle/${politician.handle}`
    : politician.id
    ? `/politicians/${politician.id}`
    : null;

  return (
    <Card className={`border ${cardBg} hover:shadow-md transition-shadow`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3 mb-2">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={politician.photoUrl ?? undefined} alt={politician.fullName} />
            <AvatarFallback className="text-xs font-semibold">
              {getInitials(politician.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate leading-tight">{politician.fullName}</p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {partyShort}
              </Badge>
              {politician.isCurrent && (
                <Badge className="text-xs px-1.5 py-0 bg-slate-700 text-white">Incumbent</Badge>
              )}
              {politician.isVerified && (
                <Badge className="text-xs px-1.5 py-0 bg-emerald-600 text-white">✓ Verified</Badge>
              )}
            </div>
          </div>
          {politician.corruptionGrade && (
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${gradeColor}`}>
              {politician.corruptionGrade}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 gap-2">
          <div className="flex items-center gap-1">
            <span className="font-medium">ACP Grade:</span>
            <span>{politician.corruptionGrade ?? "—"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">Contributions:</span>
            <span>{formatMoney(politician.totalContributions)}</span>
          </div>
        </div>

        {profileUrl && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs"
            onClick={() => window.open(profileUrl, "_blank")}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Profile
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
