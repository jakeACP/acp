import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Loader2, 
  ArrowLeft, 
  ExternalLink, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  DollarSign,
  Info,
  Network,
  TrendingDown,
  TrendingUp,
  Vote,
  Trophy,
  BarChart3,
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
  influenceScore?: number | null;
  letterGrade?: string | null;
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

type ConnectedLobby = {
  id: string;
  name: string;
  tag: string;
  category: string;
  sentiment?: string;
  isAce?: boolean;
  sharedCount: number;
};

type SigProfileData = {
  sig: SIG;
  politicians: Politician[];
  totalContributions: number;
  communityScore: number | null;
  voteCount: number;
  userVote: number | null;
  connectedLobbies: ConnectedLobby[];
  top10Recipients: Politician[];
};

function isFecId(name: string): boolean {
  return /^C\d{8}$/.test(name.trim());
}

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

function gradeColor(grade?: string | null) {
  if (!grade) return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "bg-green-600 text-white";
  if (g.startsWith("B")) return "bg-blue-500 text-white";
  if (g.startsWith("C")) return "bg-yellow-400 text-gray-900";
  if (g.startsWith("D")) return "bg-orange-500 text-white";
  if (g.startsWith("F")) return "bg-red-600 text-white";
  return "bg-gray-200 text-gray-700";
}

function influenceGrade(score: number): string {
  if (score >= 40) return "A+";
  if (score >= 25) return "A";
  if (score >= 10) return "B";
  if (score >= 1) return "B-";
  if (score === 0) return "C";
  if (score >= -9) return "D+";
  if (score >= -24) return "D";
  if (score >= -39) return "F+";
  return "F";
}

function categoryBadgeClass(cat: string) {
  const map: Record<string, string> = {
    "Super PAC": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200",
    "pac": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200",
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

function lobbySentimentClass(s?: string) {
  if (s === "negative") return "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
  if (s === "positive") return "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200";
  return "border-border bg-muted/40 text-foreground";
}

function scoreLabel(score: number): string {
  if (score <= -35) return "Highly Corrupt";
  if (score <= -15) return "Likely Corrupt";
  if (score < 15) return "Mixed / Neutral";
  if (score < 35) return "Likely Clean";
  return "Community Trusted";
}

function scoreColor(score: number): string {
  if (score <= -20) return "text-red-600 dark:text-red-400";
  if (score < 0) return "text-orange-500 dark:text-orange-400";
  if (score === 0) return "text-muted-foreground";
  if (score < 20) return "text-blue-500 dark:text-blue-400";
  return "text-green-600 dark:text-green-400";
}

function influenceLabel(score: number): string {
  if (score >= 35) return "Highly Progressive / Reform Aligned";
  if (score >= 15) return "Progressive Leaning";
  if (score >= 1) return "Slightly Progressive";
  if (score === 0) return "Neutral";
  if (score >= -14) return "Slight Corruption Risk";
  if (score >= -34) return "Significant Corruption Influence";
  return "Highly Corrupting Influence";
}

function influenceBarColor(score: number): string {
  if (score > 0) return "bg-green-500";
  if (score < 0) return "bg-red-500";
  return "bg-gray-400";
}

function formatMoney(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000_000) return `$${(dollars / 1_000_000_000).toFixed(2)}B`;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}K`;
  return `$${dollars.toLocaleString()}`;
}

export default function SigProfilePage() {
  const { tag } = useParams<{ tag: string }>();
  const { toast } = useToast();
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [hasVoted, setHasVoted] = useState(false);

  const { data, isLoading, error } = useQuery<SigProfileData>({
    queryKey: ["/api/sigs", tag],
    queryFn: () => fetch(`/api/sigs/${tag}`).then(r => {
      if (!r.ok) throw new Error("SIG not found");
      return r.json();
    }),
    enabled: !!tag,
  });

  useEffect(() => {
    if (data?.userVote !== null && data?.userVote !== undefined) {
      setSliderValue(data.userVote);
      setHasVoted(true);
    }
  }, [data?.userVote]);

  const voteMutation = useMutation({
    mutationFn: (vote: number) =>
      apiRequest(`/api/sigs/${tag}/community-vote`, "POST", { vote }),
    onSuccess: () => {
      setHasVoted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/sigs", tag] });
      toast({ title: "Vote submitted", description: "Your community rating has been recorded." });
    },
    onError: (err: any) => {
      const msg = err?.message || "You may need to log in to vote.";
      toast({ title: "Could not submit vote", description: msg, variant: "destructive" });
    },
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

  const { sig, politicians, totalContributions, communityScore, voteCount, userVote, connectedLobbies, top10Recipients } = data;
  const pledged = politicians.filter(p => p.relationshipType === "pledged_against");
  const donors = politicians.filter(p => p.relationshipType !== "pledged_against");

  const displayScore = communityScore !== null ? Math.round(communityScore * 10) / 10 : null;
  const communityBarPct = displayScore !== null ? ((displayScore + 50) / 100) * 100 : 50;

  const effectiveGrade = sig.letterGrade || (sig.influenceScore !== null && sig.influenceScore !== undefined ? influenceGrade(sig.influenceScore) : null);
  const isPac = sig.category === "pac" || sig.category === "Super PAC";

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
            {effectiveGrade && (
              <span className={`text-xl font-black px-3 py-1 rounded-lg shrink-0 ${gradeColor(effectiveGrade)}`}>
                {effectiveGrade}
              </span>
            )}
            {sig.sentiment && (
              <Badge className={`text-sm px-3 py-1 ${sentimentBadgeClass(sig.sentiment)}`}>
                {sig.sentiment === "negative" ? <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
                {sentimentLabel(sig.sentiment)}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className={`w-fit ${categoryBadgeClass(sig.category)}`}>
            {sig.category === "pac" ? "SuperPAC / Committee" : sig.category}
          </Badge>
          {sig.description && (
            <p className="text-base text-foreground/80 leading-relaxed max-w-3xl">
              {sig.description}
            </p>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{politicians.length}</span>
              <span className="text-xs text-muted-foreground">Politicians Linked</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <DollarSign className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {totalContributions > 0 ? formatMoney(totalContributions) : "—"}
              </span>
              <span className="text-xs text-muted-foreground">Grand Total Spent</span>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <Vote className="h-5 w-5 text-blue-500" />
              <span className={`text-2xl font-bold ${displayScore !== null ? scoreColor(displayScore) : "text-muted-foreground"}`}>
                {displayScore !== null ? (displayScore > 0 ? `+${displayScore}` : `${displayScore}`) : "—"}
              </span>
              <span className="text-xs text-muted-foreground">Community Score ({voteCount} {voteCount === 1 ? "vote" : "votes"})</span>
            </CardContent>
          </Card>
        </div>

        {/* Admin Influence Score */}
        {sig.influenceScore !== null && sig.influenceScore !== undefined && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                ACP Influence Rating
                {effectiveGrade && (
                  <span className={`ml-auto text-sm font-black px-2 py-0.5 rounded ${gradeColor(effectiveGrade)}`}>
                    {effectiveGrade}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5 text-red-500" />Corruption Influence (-50)</span>
                <span>Neutral (0)</span>
                <span className="flex items-center gap-1">Progressive Influence (+50)<TrendingUp className="h-3.5 w-3.5 text-green-500" /></span>
              </div>
              <div className="relative h-5 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-400 to-green-500">
                <div className="absolute top-0 h-full w-px bg-white/60" style={{ left: "50%" }} />
                <div
                  className="absolute top-0 h-full w-1.5 bg-white border-x border-white/50 shadow-sm transition-all"
                  style={{ left: `calc(${((sig.influenceScore + 50) / 100) * 100}% - 3px)` }}
                />
              </div>
              <p className={`text-sm font-semibold text-center ${scoreColor(sig.influenceScore)}`}>
                Score: {sig.influenceScore > 0 ? "+" : ""}{sig.influenceScore} — {influenceLabel(sig.influenceScore)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Top 10 Recipients (for PACs/SuperPACs with data) */}
        {isPac && top10Recipients.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top Recipients of Funds
                <Badge variant="outline" className="text-xs ml-auto">Top {top10Recipients.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Politicians who received the most spending from this committee (FEC independent expenditures).
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {top10Recipients.map((p, i) => {
                  const maxAmt = top10Recipients[0]?.reportedAmount ?? 1;
                  const pct = Math.round(((p.reportedAmount ?? 0) / maxAmt) * 100);
                  return (
                    <Link key={p.id} href={`/politicians/${p.id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <span className="text-sm font-bold text-muted-foreground w-5 text-center shrink-0">#{i + 1}</span>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={p.photoUrl || ""} alt={p.fullName} />
                          <AvatarFallback className="text-xs font-bold">
                            {p.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{p.fullName}</span>
                            {p.corruptionGrade && (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${gradeColor(p.corruptionGrade)}`}>
                                {p.corruptionGrade}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 shrink-0">
                              {formatMoney(p.reportedAmount ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {totalContributions > 0 && (
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Grand Total (all recipients)</span>
                  <span className="text-lg font-black text-orange-600 dark:text-orange-400">{formatMoney(totalContributions)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Community Slide Scale */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Vote className="h-4 w-4 text-blue-500" />
              Community Corruption Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5 text-red-500" /> Corrupt (-50)</span>
                <span>Neutral (0)</span>
                <span className="flex items-center gap-1">Clean (+50) <TrendingUp className="h-3.5 w-3.5 text-green-500" /></span>
              </div>
              <div className="relative h-4 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-400 to-green-500">
                {displayScore !== null && (
                  <div
                    className="absolute top-0 h-full w-1 bg-white border-x border-white/50 shadow-sm transition-all"
                    style={{ left: `calc(${communityBarPct}% - 2px)` }}
                  />
                )}
                <div className="absolute top-0 h-full w-px bg-white/60" style={{ left: "50%" }} />
              </div>
              {displayScore !== null ? (
                <p className={`text-sm font-semibold text-center ${scoreColor(displayScore)}`}>
                  Community Average: {displayScore > 0 ? "+" : ""}{displayScore} — {scoreLabel(displayScore)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center">No community votes yet. Be the first to rate this group.</p>
              )}
            </div>

            <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
              <p className="text-sm font-medium text-center">Your Rating: <span className={`font-bold ${scoreColor(sliderValue)}`}>{sliderValue > 0 ? `+${sliderValue}` : sliderValue}</span> — {scoreLabel(sliderValue)}</p>
              <Slider
                min={-50}
                max={50}
                step={1}
                value={[sliderValue]}
                onValueChange={(v) => setSliderValue(v[0])}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Highly Corrupt</span>
                <span>Neutral</span>
                <span>Community Trusted</span>
              </div>
              <Button
                onClick={() => voteMutation.mutate(sliderValue)}
                disabled={voteMutation.isPending}
                className="w-full"
                variant={hasVoted ? "outline" : "default"}
              >
                {voteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {hasVoted
                  ? `Update My Vote (currently ${userVote !== null ? (userVote > 0 ? `+${userVote}` : userVote) : sliderValue})`
                  : "Submit Community Rating"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info strip */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg border">
          {sig.dataSourceName && sig.dataSourceUrl && (
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Data Source:</span>
              <a href={sig.dataSourceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400 font-medium">
                {sig.dataSourceName}<ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          {sig.website && (
            <div className="flex items-center gap-2">
              <a href={sig.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400">
                Official Website<ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          {sig.disclosureNotes && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Note:</span> {sig.disclosureNotes}
            </div>
          )}
        </div>

        {/* Connected Lobbies */}
        {connectedLobbies.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-4 w-4 text-purple-500" />
                Connected Lobbies
                <Badge variant="outline" className="text-xs ml-auto">{connectedLobbies.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Other organizations that fund the same politicians as this group.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {connectedLobbies.map(lobby => (
                  <Link key={lobby.id} href={`/sigs/${lobby.tag}`}>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium cursor-pointer transition-opacity hover:opacity-80 ${lobbySentimentClass(lobby.sentiment)}`}>
                      {lobby.name}
                      <span className="text-xs opacity-60 font-normal">×{lobby.sharedCount}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
              {pledged.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    Pledged Against ({pledged.length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pledged.map(p => <PoliticianCard key={p.id} politician={p} />)}
                  </div>
                </div>
              )}

              {donors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Linked Politicians ({donors.length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {donors.map(p => <PoliticianCard key={p.id} politician={p} />)}
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

  function gradeColor(grade?: string) {
    if (!grade) return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    const g = grade.toUpperCase();
    if (g.startsWith("A")) return "bg-green-600 text-white";
    if (g.startsWith("B")) return "bg-blue-500 text-white";
    if (g.startsWith("C")) return "bg-yellow-400 text-gray-900";
    if (g.startsWith("D")) return "bg-orange-500 text-white";
    if (g.startsWith("F")) return "bg-red-600 text-white";
    return "bg-gray-200 text-gray-700";
  }

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
                  {p.handle && <p className="text-xs text-blue-600 dark:text-blue-400">@{p.handle}</p>}
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
                <Badge variant="outline" className={`text-xs ${
                  p.relationshipType === "pledged_against" ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200" :
                  p.relationshipType === "endorsed" ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200" :
                  "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200"
                }`}>
                  {p.relationshipType === "pledged_against" ? "Pledged Against" : p.relationshipType === "endorsed" ? "Endorsed By" : "Donor"}
                </Badge>
                {typeof p.reportedAmount === "number" && p.reportedAmount > 0 && (
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                    {formatMoney(p.reportedAmount)}
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
