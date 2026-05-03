import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Globe, MapPin, Star, AlertTriangle, BarChart2, Users, ExternalLink, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type PartyDetail = {
  id: string;
  name: string;
  acronym: string | null;
  slug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  status: string;
  compassEconomic: number | null;
  compassSocial: number | null;
  transparencyScore: number | null;
  transparencyNotes: string | null;
  hasFederalBallotAccess: boolean | null;
  statesWithBallotAccess: number | null;
  foundedYear: number | null;
  headquartersState: string | null;
  membershipEstimate: string | null;
  colors: string[] | null;
  leaders: { id: string; name: string; title: string | null; photoUrl: string | null; startYear: number | null; endYear: number | null; isPrimary: boolean }[];
  ballotAccess: { stateCode: string; accessLevel: string; notes: string | null }[];
  positions: { id: string; issueId: string; issueLabel: string | null; issueCategory: string | null; positionValue: number | null; positionLabel: string | null; notes: string | null }[];
  ratingStats: { average: number; count: number; distribution: Record<string, number> };
  endorsementCount: number;
};

function CompassChart({ economic, social }: { economic: number | null; social: number | null }) {
  const hasData = economic !== null && social !== null;
  const cx = hasData ? ((economic! + 10) / 20) * 100 : 50;
  const cy = hasData ? ((10 - social!) / 20) * 100 : 50;

  return (
    <div className="relative w-full aspect-square max-w-[220px] mx-auto border border-border rounded overflow-hidden bg-muted/20">
      {/* Quadrant colors */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-10">
        <div className="bg-blue-500" />
        <div className="bg-red-500" />
        <div className="bg-green-600" />
        <div className="bg-orange-500" />
      </div>
      {/* Center lines */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-border" />
      </div>
      <div className="absolute inset-0 flex justify-center">
        <div className="h-full w-px bg-border" />
      </div>
      {/* Labels */}
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground">Auth</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground">Lib</span>
      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">Left</span>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">Right</span>
      {/* Dot */}
      {hasData && (
        <div className="absolute" style={{ left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%, -50%)" }}>
          <div className="w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground shadow-lg" />
        </div>
      )}
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">N/A</div>
      )}
    </div>
  );
}

function TransparencyBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">N/A</span>;
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  const label = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{score}%</span>
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

const STATE_CODES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

function BallotMap({ ballotAccess }: { ballotAccess: { stateCode: string; accessLevel: string }[] }) {
  const accessMap = Object.fromEntries(ballotAccess.map(b => [b.stateCode, b.accessLevel]));
  const getColor = (code: string) => {
    const level = accessMap[code];
    if (level === "full") return "bg-green-500";
    if (level === "partial") return "bg-yellow-500";
    if (level === "petition") return "bg-orange-400";
    return "bg-muted";
  };
  return (
    <div className="flex flex-wrap gap-1">
      {STATE_CODES.map(code => (
        <div key={code} className={`w-6 h-5 rounded text-[7px] flex items-center justify-center text-white font-bold ${getColor(code)}`} title={`${code}: ${accessMap[code] || "none"}`}>
          {code}
        </div>
      ))}
    </div>
  );
}

export default function PartyProfilePage() {
  const { partyId } = useParams<{ partyId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ratingValue, setRatingValue] = useState<number>(0);

  const { data: party, isLoading } = useQuery<PartyDetail>({
    queryKey: ["/api/parties", partyId],
    queryFn: async () => {
      const res = await fetch(`/api/parties/${partyId}`);
      if (!res.ok) throw new Error("Party not found");
      return res.json();
    },
    enabled: !!partyId,
  });

  const { data: myRating } = useQuery<{ rating: number; letterGrade: string | null } | null>({
    queryKey: ["/api/parties", partyId, "my-rating"],
    queryFn: async () => {
      const res = await fetch(`/api/parties/${partyId}/my-rating`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!partyId && !!user,
  });

  const { data: endorsements = [] } = useQuery<any[]>({
    queryKey: ["/api/parties", partyId, "endorsements"],
    queryFn: async () => {
      const res = await fetch(`/api/parties/${partyId}/endorsements`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!partyId,
  });

  const { data: controversies = [] } = useQuery<any[]>({
    queryKey: ["/api/parties", partyId, "controversies"],
    queryFn: async () => {
      const res = await fetch(`/api/parties/${partyId}/controversies`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!partyId,
  });

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      return apiRequest(`/api/parties/${partyId}/rate`, "POST", { rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties", partyId, "my-rating"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parties", partyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/parties"] });
      toast({ title: "Rating saved" });
    },
    onError: () => {
      toast({ title: "Failed to save rating", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Party Not Found</h1>
          <Link href="/parties">
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Parties
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayRating = myRating?.rating ?? ratingValue;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back nav */}
        <Link href="/parties">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Parties
          </Button>
        </Link>

        {/* Hero */}
        <Card className="mb-6 overflow-hidden" style={party.colors?.[0] ? { borderTopColor: party.colors[0], borderTopWidth: "4px" } : undefined}>
          {party.colors?.[0] && (
            <div className="h-1.5 w-full" style={{ background: party.colors.length > 1 ? `linear-gradient(to right, ${party.colors.join(", ")})` : party.colors[0] }} />
          )}
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                {party.logoUrl ? (
                  <div className="w-24 h-24 rounded-xl border border-border bg-muted/20 flex items-center justify-center overflow-hidden">
                    <img src={party.logoUrl} alt={`${party.name} logo`} className="w-full h-full object-contain p-2" />
                  </div>
                ) : (
                  <div
                    className="w-24 h-24 rounded-xl flex items-center justify-center text-white font-bold text-4xl shadow"
                    style={{ background: party.colors?.[0] || "#6b7280" }}
                  >
                    {party.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <CompassChart economic={party.compassEconomic} social={party.compassSocial} />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{party.name}</h1>
                  {party.acronym && <Badge variant="outline" className="font-mono">{party.acronym}</Badge>}
                  {party.hasFederalBallotAccess && <Badge className="bg-blue-600 hover:bg-blue-600">Federal Ballot Access</Badge>}
                </div>

                {party.shortDescription && (
                  <p className="text-muted-foreground mb-4">{party.shortDescription}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  {party.foundedYear && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Founded</p>
                      <p className="font-medium">{party.foundedYear}</p>
                    </div>
                  )}
                  {party.headquartersState && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">HQ State</p>
                      <p className="font-medium">{party.headquartersState}</p>
                    </div>
                  )}
                  {party.membershipEstimate && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Members</p>
                      <p className="font-medium">{party.membershipEstimate}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Ballot States</p>
                    <p className="font-medium">{party.statesWithBallotAccess ?? 0} / 50</p>
                  </div>
                </div>

                {party.websiteUrl && (
                  <a href={party.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary mt-4 hover:underline">
                    <Globe className="h-4 w-4" />
                    Official Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="positions">Policy Positions</TabsTrigger>
                <TabsTrigger value="ballot">Ballot Access</TabsTrigger>
                <TabsTrigger value="endorsements">Endorsements ({party.endorsementCount})</TabsTrigger>
                {controversies.length > 0 && <TabsTrigger value="controversies">Controversies</TabsTrigger>}
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {party.fullDescription && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">About</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{party.fullDescription}</p>
                    </CardContent>
                  </Card>
                )}

                {party.leaders.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Leadership</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {party.leaders.map(leader => (
                          <div key={leader.id} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                              {leader.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{leader.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {leader.title}{leader.startYear ? ` · Since ${leader.startYear}` : ""}
                                {leader.endYear ? ` – ${leader.endYear}` : (leader.startYear ? " (current)" : "")}
                              </p>
                            </div>
                            {leader.isPrimary && <Badge variant="secondary" className="ml-auto text-xs">Primary</Badge>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Political Compass details */}
                {(party.compassEconomic !== null || party.compassSocial !== null) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Political Compass Placement</CardTitle>
                      <CardDescription>Scale: -10 (far left/authoritarian) to +10 (far right/libertarian)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {party.compassEconomic !== null && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Economic Axis</span>
                            <span className="font-medium">{party.compassEconomic > 0 ? "+" : ""}{party.compassEconomic}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${((party.compassEconomic + 10) / 20) * 100}%` }} />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                            <span>Left (socialist)</span>
                            <span>Right (capitalist)</span>
                          </div>
                        </div>
                      )}
                      {party.compassSocial !== null && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Social Axis</span>
                            <span className="font-medium">{party.compassSocial > 0 ? "+" : ""}{party.compassSocial}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${((party.compassSocial + 10) / 20) * 100}%` }} />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                            <span>Authoritarian</span>
                            <span>Libertarian</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="positions" className="space-y-3">
                {party.positions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No policy positions on record yet.
                    </CardContent>
                  </Card>
                ) : (
                  (() => {
                    const byCategory = party.positions.reduce((acc, pos) => {
                      const cat = pos.issueCategory || "Other";
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(pos);
                      return acc;
                    }, {} as Record<string, typeof party.positions>);
                    return Object.entries(byCategory).map(([cat, positions]) => (
                      <Card key={cat}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{cat}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {positions.map(pos => (
                            <div key={pos.id} className="flex items-center justify-between gap-2 py-1">
                              <span className="text-sm">{pos.issueLabel || pos.issueId}</span>
                              {pos.positionLabel ? (
                                <Badge variant="outline" className="text-xs shrink-0">{pos.positionLabel}</Badge>
                              ) : pos.positionValue !== null ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${((pos.positionValue - 1) / 4) * 100}%` }} />
                                  </div>
                                  <span>{pos.positionValue}/5</span>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ));
                  })()
                )}
              </TabsContent>

              <TabsContent value="ballot">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">State Ballot Access</CardTitle>
                    <CardDescription>
                      {party.statesWithBallotAccess ?? 0} of 50 states
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4 text-xs">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Full access</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500 inline-block" /> Partial</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block" /> Petition</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted inline-block" /> None</span>
                    </div>
                    <BallotMap ballotAccess={party.ballotAccess} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="endorsements" className="space-y-3">
                {endorsements.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No endorsements on record yet.
                    </CardContent>
                  </Card>
                ) : (
                  endorsements.map((e: any) => (
                    <Card key={e.id}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{e.candidateName || "Unknown Candidate"}</p>
                            <p className="text-xs text-muted-foreground">
                              {e.office}{e.state ? ` · ${e.state}` : ""}{e.electionCycle ? ` · ${e.electionCycle}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">{e.endorsementType}</Badge>
                            {e.politicianId && (
                              <Link href={`/politicians/${e.politicianId}`}>
                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                  Profile <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {controversies.length > 0 && (
                <TabsContent value="controversies" className="space-y-3">
                  {controversies.map((c: any) => (
                    <Card key={c.id}>
                      <CardContent className="py-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${c.severity === "major" ? "text-red-500" : c.severity === "moderate" ? "text-yellow-500" : "text-muted-foreground"}`} />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{c.title}</p>
                              {c.date && <span className="text-xs text-muted-foreground">{c.date}</span>}
                              <Badge variant="outline" className="text-xs capitalize">{c.severity}</Badge>
                            </div>
                            {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                            {c.sourceUrl && (
                              <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                                Source <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Transparency */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Transparency Score</CardTitle>
              </CardHeader>
              <CardContent>
                <TransparencyBar score={party.transparencyScore} />
                {party.transparencyNotes && (
                  <p className="text-xs text-muted-foreground mt-2">{party.transparencyNotes}</p>
                )}
              </CardContent>
            </Card>

            {/* Rating stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Community Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                {party.ratingStats.count > 0 ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">
                      {party.ratingStats.average > 0 ? "+" : ""}{party.ratingStats.average}
                    </p>
                    <p className="text-xs text-muted-foreground">{party.ratingStats.count} ratings</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No ratings yet</p>
                )}
              </CardContent>
            </Card>

            {/* User rating input */}
            {user && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Your Rating</CardTitle>
                  <CardDescription className="text-xs">-50 (very negative) to +50 (very positive)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center text-lg font-bold">
                    {displayRating > 0 ? "+" : ""}{displayRating}
                  </div>
                  <Slider
                    min={-50}
                    max={50}
                    step={1}
                    value={[displayRating]}
                    onValueChange={([v]) => setRatingValue(v)}
                    className="w-full"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => rateMutation.mutate(displayRating)}
                    disabled={rateMutation.isPending}
                  >
                    {rateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (myRating ? "Update Rating" : "Submit Rating")}
                  </Button>
                  {myRating && (
                    <p className="text-xs text-center text-muted-foreground">Your current rating: {myRating.rating > 0 ? "+" : ""}{myRating.rating}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {party.foundedYear && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Founded</span>
                    <span>{party.foundedYear}</span>
                  </div>
                )}
                {party.headquartersState && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HQ</span>
                    <span>{party.headquartersState}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Federal Ballot</span>
                  <span>{party.hasFederalBallotAccess ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">States</span>
                  <span>{party.statesWithBallotAccess ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Endorsements</span>
                  <span>{party.endorsementCount}</span>
                </div>
                {party.membershipEstimate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members</span>
                    <span className="text-right text-xs max-w-[120px]">{party.membershipEstimate}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
