import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Globe, MapPin, Star, BarChart2, Users } from "lucide-react";
import { Navigation } from "@/components/navigation";

type Party = {
  id: string;
  name: string;
  acronym: string | null;
  slug: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  shortDescription: string | null;
  status: string;
  compassEconomic: number | null;
  compassSocial: number | null;
  transparencyScore: number | null;
  hasFederalBallotAccess: boolean | null;
  statesWithBallotAccess: number | null;
  foundedYear: number | null;
  colors: string[] | null;
  averageRating: number | null;
  ratingCount: number;
  endorsementCount: number;
};

const SORT_OPTIONS = [
  { value: "alpha", label: "A–Z" },
  { value: "transparency", label: "Transparency" },
  { value: "rating", label: "User Rating" },
  { value: "endorsements", label: "Most Endorsements" },
];

function CompassDot({ economic, social }: { economic: number | null; social: number | null }) {
  if (economic === null || social === null) return null;
  const cx = ((economic + 10) / 20) * 100;
  const cy = ((10 - social) / 20) * 100;
  return (
    <div className="relative w-10 h-10 border border-border rounded overflow-hidden flex-shrink-0 bg-muted/30" title={`Economic: ${economic > 0 ? "+" : ""}${economic}, Social: ${social > 0 ? "+" : ""}${social}`}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom right, rgba(59,130,246,0.1), rgba(239,68,68,0.1))" }} />
      <div className="absolute" style={{ left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%, -50%)" }}>
        <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary-foreground shadow" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full h-px bg-border opacity-40" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-full w-px bg-border opacity-40" />
      </div>
    </div>
  );
}

function PartyBadge({ name, logoUrl, primaryColor }: { name: string; logoUrl: string | null; primaryColor: string | null }) {
  if (logoUrl) {
    return (
      <div className="w-14 h-14 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-muted/20 flex items-center justify-center">
        <img src={logoUrl} alt={`${name} logo`} className="w-full h-full object-contain p-1" />
      </div>
    );
  }
  const initial = name.charAt(0).toUpperCase();
  const bg = primaryColor || "#6b7280";
  return (
    <div
      className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-xl shadow-sm"
      style={{ background: bg }}
    >
      {initial}
    </div>
  );
}

function TransparencyBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground text-xs">N/A</span>;
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-16">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{score}%</span>
    </div>
  );
}

export default function PartiesPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("alpha");
  const [ballotFilter, setBallotFilter] = useState("all");

  const { data: parties = [], isLoading } = useQuery<Party[]>({
    queryKey: ["/api/parties", { sort }],
    queryFn: async () => {
      const res = await fetch(`/api/parties?sort=${sort}`);
      if (!res.ok) throw new Error("Failed to load parties");
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    let list = [...parties];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.acronym?.toLowerCase().includes(q) || p.shortDescription?.toLowerCase().includes(q));
    }
    if (ballotFilter === "federal") list = list.filter(p => p.hasFederalBallotAccess);
    if (ballotFilter === "no") list = list.filter(p => !p.hasFederalBallotAccess);
    return list;
  }, [parties, search, ballotFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Political Parties</h1>
          <p className="text-muted-foreground mt-2">
            Explore U.S. political parties — their positions, transparency, and endorsements. All parties are presented equally.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parties..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ballotFilter} onValueChange={setBallotFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Ballot access" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parties</SelectItem>
              <SelectItem value="federal">Federal Ballot Access</SelectItem>
              <SelectItem value="no">No Federal Access</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">{filtered.length} {filtered.length === 1 ? "party" : "parties"}</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No parties match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(party => (
              <Link key={party.id} href={`/parties/${party.slug}`}>
                <Card
                  className="cursor-pointer hover:shadow-md transition-all h-full overflow-hidden"
                  style={party.colors?.[0] ? { borderTopColor: party.colors[0], borderTopWidth: "3px" } : undefined}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <PartyBadge name={party.name} logoUrl={party.logoUrl} primaryColor={party.colors?.[0] ?? null} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base leading-tight">{party.name}</CardTitle>
                          {party.acronym && (
                            <Badge variant="outline" className="text-xs font-mono shrink-0">{party.acronym}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {party.hasFederalBallotAccess && (
                            <Badge className="text-xs bg-blue-600 hover:bg-blue-600">Federal Access</Badge>
                          )}
                          {party.foundedYear && (
                            <span className="text-xs text-muted-foreground">Est. {party.foundedYear}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {party.shortDescription && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{party.shortDescription}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Transparency</span>
                        <TransparencyBar score={party.transparencyScore} />
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Ballot Access</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{party.statesWithBallotAccess ?? 0} states</span>
                        </div>
                      </div>
                    </div>

                    {(party.compassEconomic !== null || party.compassSocial !== null) && (
                      <div className="flex items-center gap-2">
                        <CompassDot economic={party.compassEconomic} social={party.compassSocial} />
                        <span className="text-xs text-muted-foreground">Political Compass</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Star className="h-3 w-3" />
                        {party.averageRating !== null ? (
                          <span>{party.averageRating > 0 ? "+" : ""}{party.averageRating} ({party.ratingCount})</span>
                        ) : (
                          <span>No ratings yet</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <BarChart2 className="h-3 w-3" />
                        <span>{party.endorsementCount} endorsements</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
