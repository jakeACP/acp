import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ExternalLink, AlertTriangle, TrendingUp, ShieldCheck } from "lucide-react";
import { Navigation } from "@/components/navigation";

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
  gradeWeight?: number;
  isAce?: boolean;
};

const CATEGORIES = ["All", "Anti-Corruption Endorsement", "Special Interest", "Super PAC", "Dark Money", "Industry PAC", "Pledge", "Labor Union", "Endorsement Org"];
const SENTIMENTS = ["all", "negative", "positive", "neutral"];

function sentimentLabel(s?: string) {
  if (s === "negative") return "Corrupting Influence";
  if (s === "positive") return "Reform Aligned";
  return "Neutral";
}

function sentimentBadgeClass(s?: string) {
  if (s === "negative") return "bg-red-600 text-white hover:bg-red-700";
  if (s === "positive") return "bg-green-600 text-white hover:bg-green-700";
  return "bg-gray-400 text-white hover:bg-gray-500";
}

function cardBgClass(sig: SIG): string {
  if (sig.isAce) return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700";
  if (sig.sentiment === "negative") return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900";
  if (sig.sentiment === "positive") return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900";
  return "";
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
    "Anti-Corruption Endorsement": "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
  };
  return map[cat] || "bg-muted text-muted-foreground";
}

export default function SigsDirectoryPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSentiment, setActiveSentiment] = useState("all");
  const [search, setSearch] = useState("");

  const { data: sigs = [], isLoading } = useQuery<SIG[]>({
    queryKey: ["/api/sigs"],
  });

  const filtered = sigs.filter(sig => {
    const matchCat = activeCategory === "All" ||
      (activeCategory === "Anti-Corruption Endorsement" ? sig.isAce : sig.category === activeCategory);
    const matchSent = activeSentiment === "all" || sig.sentiment === activeSentiment;
    const matchSearch = !search ||
      sig.name.toLowerCase().includes(search.toLowerCase()) ||
      sig.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSent && matchSearch;
  });

  const aceCount = sigs.filter(s => s.isAce).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Interest Groups</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Track special interest groups, super PACs, dark money organizations, and the pledges that politicians make.
            Understanding who funds our politicians is essential to holding them accountable.
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
            <AlertTriangle className="h-4 w-4" />
            {sigs.filter(s => s.sentiment === "negative").length} Corrupting influences tracked
          </span>
          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
            <TrendingUp className="h-4 w-4" />
            {sigs.filter(s => s.sentiment === "positive").length} Reform-aligned organizations
          </span>
          {aceCount > 0 && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-4 w-4" />
              {aceCount} Anti-Corruption Endorsements
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className={cat === "Anti-Corruption Endorsement" && activeCategory !== cat
                ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                : ""}
            >
              {cat === "Anti-Corruption Endorsement" && <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
              {cat}
            </Button>
          ))}
        </div>

        {/* Sentiment filter */}
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">Sentiment:</span>
          {SENTIMENTS.map(s => (
            <Button
              key={s}
              variant={activeSentiment === s ? "default" : "outline"}
              size="sm"
              className={activeSentiment !== s && s === "negative" ? "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300" :
                activeSentiment !== s && s === "positive" ? "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300" : ""}
              onClick={() => setActiveSentiment(s)}
            >
              {s === "all" ? "All" : s === "negative" ? "Corrupting" : s === "positive" ? "Reform" : "Neutral"}
            </Button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No organizations match your filters</p>
            <p className="text-sm mt-1">Try adjusting the category or sentiment filter</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(sig => (
              <Card key={sig.id} className={`flex flex-col hover:shadow-md transition-shadow ${cardBgClass(sig)}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight flex items-center gap-2">
                      {sig.isAce && <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      {sig.name}
                    </CardTitle>
                    <Badge className={`text-xs shrink-0 ${sentimentBadgeClass(sig.sentiment)}`}>
                      {sig.isAce ? "ACE" : sentimentLabel(sig.sentiment)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={`text-xs w-fit ${categoryBadgeClass(sig.category)}`}>
                      {sig.isAce ? "Anti-Corruption Endorsement" : sig.category}
                    </Badge>
                    {sig.gradeWeight !== undefined && sig.gradeWeight !== 1.0 && (
                      <Badge variant="outline" className="text-xs w-fit bg-slate-50 dark:bg-slate-800">
                        {Math.round(sig.gradeWeight * 100)}% weight
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 gap-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {sig.description || "No description available."}
                  </p>
                  {sig.dataSourceName && (
                    <a
                      href={sig.dataSourceUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {sig.dataSourceName}
                    </a>
                  )}
                  <div className="mt-auto">
                    <Link href={`/sigs/${sig.tag || sig.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Profile →
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state if no SIGs at all */}
        {!isLoading && sigs.length === 0 && (
          <div className="text-center py-20 space-y-2 text-muted-foreground">
            <p className="text-lg font-medium">No organizations in the database yet</p>
            <p className="text-sm">Admins can seed the database from the admin panel.</p>
          </div>
        )}
      </div>
    </div>
  );
}
