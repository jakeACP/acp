import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  ArrowLeft, 
  ExternalLink, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  DollarSign,
  Info
} from "lucide-react";

type SIG = {
  id: string;
  name: string;
  acronym?: string;
  tag?: string;
  description?: string;
  category: string;
  sentiment?: string;
  dataSourceName?: string;
  dataSourceUrl?: string;
  disclosureNotes?: string;
  website?: string;
};

type Politician = {
  id: string;
  fullName: string;
  state?: string;
  party?: string;
  photoUrl?: string;
  handle?: string;
  corruptionGrade?: string;
  relationshipType: string;
  reportedAmount?: number;
  disclosureUrl?: string;
  disclosureSource?: string;
};

function sentimentBadgeClass(s?: string) {
  if (s === "negative") return "bg-red-600 text-white";
  if (s === "positive") return "bg-green-600 text-white";
  return "bg-gray-400 text-white";
}

function sentimentLabel(s?: string) {
  if (s === "negative") return "Corrupting Influence";
  if (s === "positive") return "Reform Aligned";
  return "Neutral";
}

function gradeColor(grade?: string) {
  if (!grade) return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  const g = grade.toUpperCase();
  if (g === "A") return "bg-green-600 text-white";
  if (g === "B") return "bg-blue-500 text-white";
  if (g === "C") return "bg-yellow-400 text-gray-900";
  if (g === "D") return "bg-orange-500 text-white";
  if (g === "F") return "bg-red-600 text-white";
  return "bg-gray-200 text-gray-700";
}

function categoryBadgeClass(cat: string) {
  const map: Record<string, string> = {
    "Super PAC": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200",
    "Dark Money": "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-200",
    "Industry PAC": "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200",
    "Special Interest": "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200",
    "Pledge": "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200",
    "Labor Union": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200",
    "Endorsement Org": "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-200",
  };
  return map[cat] || "bg-muted text-muted-foreground";
}

function relationshipLabel(rel: string) {
  if (rel === "pledged_against") return "Pledged Against";
  if (rel === "endorsed") return "Endorsed By";
  if (rel === "affiliated") return "Affiliated";
  return "Donor";
}

function relationshipBadge(rel: string) {
  if (rel === "pledged_against") return "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200";
  if (rel === "endorsed") return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200";
  return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200";
}

export default function SigProfilePage() {
  const { tag } = useParams<{ tag: string }>();

  const { data, isLoading, error } = useQuery<{ sig: SIG; politicians: Politician[] }>({
    queryKey: ["/api/sigs", tag],
    queryFn: () => fetch(`/api/sigs/${tag}`).then(r => {
      if (!r.ok) throw new Error("SIG not found");
      return r.json();
    }),
    enabled: !!tag,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Organization Not Found</h1>
        <p className="text-muted-foreground mb-6">No special interest group with that identifier exists in our database.</p>
        <Link href="/sigs">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Influence Map
          </Button>
        </Link>
      </div>
    );
  }

  const { sig, politicians } = data;
  const pledged = politicians.filter(p => p.relationshipType === "pledged_against");
  const donors = politicians.filter(p => p.relationshipType !== "pledged_against");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Back */}
        <Link href="/sigs">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Influence Map
          </Button>
        </Link>

        {/* Hero */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="text-3xl font-bold text-foreground">{sig.name}</h1>
            {sig.sentiment && (
              <Badge className={`text-sm px-3 py-1 ${sentimentBadgeClass(sig.sentiment)}`}>
                {sig.sentiment === "negative" ? <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
                {sentimentLabel(sig.sentiment)}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className={`w-fit ${categoryBadgeClass(sig.category)}`}>
            {sig.category}
          </Badge>
          {sig.description && (
            <p className="text-base text-foreground/80 leading-relaxed max-w-3xl">
              {sig.description}
            </p>
          )}
        </div>

        {/* Info strip */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg border">
          {sig.dataSourceName && sig.dataSourceUrl && (
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Data Source:</span>
              <a
                href={sig.dataSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400 font-medium"
              >
                {sig.dataSourceName}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          {sig.website && (
            <div className="flex items-center gap-2">
              <a
                href={sig.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                Official Website
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          {sig.disclosureNotes && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Note:</span> {sig.disclosureNotes}
            </div>
          )}
        </div>

        {/* Politicians section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Politicians Linked to This Group</h2>
            <Badge variant="outline" className="text-xs">{politicians.length}</Badge>
          </div>

          {politicians.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No politicians currently linked to this group</p>
                <p className="text-sm mt-1">Links are added via the admin panel when campaign finance data is imported.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Pledged Against */}
              {pledged.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    Pledged Against ({pledged.length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pledged.map(p => (
                      <PoliticianCard key={p.id} politician={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* Donors / linked */}
              {donors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Linked Politicians ({donors.length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {donors.map(p => (
                      <PoliticianCard key={p.id} politician={p} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PoliticianCard({ politician: p }: { politician: Politician }) {
  const initials = p.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  
  return (
    <Link href={`/politicians/${p.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={p.photoUrl || ""} alt={p.fullName} />
              <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <div>
                  <p className="font-semibold text-sm leading-tight truncate">{p.fullName}</p>
                  {p.handle && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">@{p.handle}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {[p.party, p.state].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {p.corruptionGrade && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${gradeColor(p.corruptionGrade)}`}>
                    {p.corruptionGrade}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="outline" className={`text-xs ${relationshipBadge(p.relationshipType)}`}>
                  {relationshipLabel(p.relationshipType)}
                </Badge>
                {typeof p.reportedAmount === "number" && p.reportedAmount > 0 && (
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                    ${(p.reportedAmount / 100).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
