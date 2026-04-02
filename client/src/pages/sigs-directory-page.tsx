import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ExternalLink, AlertTriangle, TrendingUp, ShieldCheck, TrendingDown, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { useTheme } from "@/hooks/use-theme";

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
  influenceScore?: number | null;
  letterGrade?: string | null;
};

const CATEGORIES = ["All", "Anti-Corruption Endorsement", "Special Interest", "Super PAC", "Dark Money", "Industry PAC", "Pledge", "Labor Union", "Endorsement Org", "PAC / Committee"];
const SENTIMENTS = ["all", "negative", "positive", "neutral"];

function isFecId(name: string): boolean {
  return /^C\d{7,9}$/.test(name.trim());
}

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

/** Resolve sentiment from the explicit field, falling back to influenceScore sign */
function resolveSentiment(sig: SIG): "positive" | "negative" | "neutral" | null {
  if (sig.isAce) return "positive";
  if (sig.sentiment === "positive" || sig.sentiment === "negative" || sig.sentiment === "neutral") return sig.sentiment;
  if (sig.influenceScore !== null && sig.influenceScore !== undefined) {
    if (sig.influenceScore > 0) return "positive";
    if (sig.influenceScore < 0) return "negative";
    return "neutral";
  }
  return null;
}

function cardBgClass(sig: SIG): string {
  const s = resolveSentiment(sig);
  if (sig.isAce) return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700";
  if (s === "negative") return "bg-red-50 dark:bg-red-900/40 border-red-300 dark:border-red-700";
  if (s === "positive") return "bg-green-50 dark:bg-green-900/40 border-green-300 dark:border-green-700";
  return "";
}

function patriotCardStyle(sig: SIG): Record<string, string> {
  const s = resolveSentiment(sig);
  if (sig.isAce || s === "positive") {
    return {
      background: "linear-gradient(135deg, rgba(22,163,74,0.60) 0%, rgba(20,83,45,0.70) 100%)",
      borderColor: "rgba(74,222,128,0.6)",
      color: "#fff",
    };
  }
  if (s === "negative") {
    return {
      background: "linear-gradient(135deg, rgba(220,38,38,0.60) 0%, rgba(127,29,29,0.70) 100%)",
      borderColor: "rgba(248,113,113,0.6)",
      color: "#fff",
    };
  }
  return {};
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
    "Anti-Corruption Endorsement": "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
  };
  return map[cat] || "bg-muted text-muted-foreground";
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

function isPacCategory(cat: string): boolean {
  return cat === "pac" || cat === "PAC / Committee";
}

function SigCard({ sig }: { sig: SIG }) {
  const { actualTheme } = useTheme();
  const effectiveGrade = sig.letterGrade || (sig.influenceScore !== null && sig.influenceScore !== undefined ? influenceGrade(sig.influenceScore) : null);
  const hasInfluence = sig.influenceScore !== null && sig.influenceScore !== undefined;
  const scorePct = hasInfluence ? ((sig.influenceScore! + 50) / 100) * 100 : null;
  const isPatriot = actualTheme === "patriot";
  const cardStyle = isPatriot ? patriotCardStyle(sig) : undefined;

  return (
    <Card
      className={`flex flex-col hover:shadow-md transition-shadow ${isPatriot ? "" : cardBgClass(sig)}`}
      style={cardStyle}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight flex items-center gap-2">
            {sig.isAce && <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
            {sig.name}
          </CardTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            {effectiveGrade && (
              <span className={`text-xs font-black px-1.5 py-0.5 rounded ${gradeColor(effectiveGrade)}`}>
                {effectiveGrade}
              </span>
            )}
            <Badge className={`text-xs ${sentimentBadgeClass(sig.sentiment)}`}>
              {sig.isAce ? "ACE" : sentimentLabel(sig.sentiment)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={`text-xs w-fit ${categoryBadgeClass(sig.category)}`}>
            {sig.isAce ? "Anti-Corruption Endorsement" : sig.category === "pac" ? "PAC / Committee" : sig.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {sig.description || "No description available."}
        </p>

        {/* Influence mini-bar */}
        {hasInfluence && scorePct !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" />Corrupt</span>
              <span className="font-medium">{sig.influenceScore! > 0 ? "+" : ""}{sig.influenceScore}</span>
              <span className="flex items-center gap-1">Progressive<TrendingUp className="h-3 w-3 text-green-500" /></span>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-400 to-green-500">
              <div className="absolute top-0 h-full w-px bg-white/60" style={{ left: "50%" }} />
              <div
                className="absolute top-0 h-full w-1 bg-white border-x border-white/50 shadow-sm"
                style={{ left: `calc(${scorePct}% - 2px)` }}
              />
            </div>
          </div>
        )}

        {sig.dataSourceName && (
          <a href={sig.dataSourceUrl || "#"} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
            onClick={e => e.stopPropagation()}>
            <ExternalLink className="h-3 w-3" />{sig.dataSourceName}
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
  );
}

function PacRow({ sig }: { sig: SIG }) {
  const effectiveGrade = sig.letterGrade || (sig.influenceScore !== null && sig.influenceScore !== undefined ? influenceGrade(sig.influenceScore) : null);
  return (
    <Link href={`/sigs/${sig.tag || sig.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 border border-transparent hover:border-border cursor-pointer transition-all">
        <DollarSign className="h-4 w-4 text-orange-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate">{sig.name}</span>
          {sig.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{sig.description}</p>
          )}
        </div>
        {effectiveGrade && (
          <span className={`text-xs font-black px-1.5 py-0.5 rounded shrink-0 ${gradeColor(effectiveGrade)}`}>
            {effectiveGrade}
          </span>
        )}
        <Badge className={`text-xs shrink-0 ${sentimentBadgeClass(sig.sentiment)}`}>
          {sentimentLabel(sig.sentiment)}
        </Badge>
      </div>
    </Link>
  );
}

export default function SigsDirectoryPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSentiment, setActiveSentiment] = useState("all");
  const [search, setSearch] = useState("");
  const [pacsExpanded, setPacsExpanded] = useState(false);

  const { data: allSigs = [], isLoading } = useQuery<SIG[]>({
    queryKey: ["/api/sigs"],
  });

  // Filter out bare FEC committee IDs unless searching explicitly
  const sigs = allSigs.filter(sig => !isFecId(sig.name) || search.length > 0);

  // Split into main SIGs vs PAC committees
  const mainSigs = sigs.filter(sig => !isPacCategory(sig.category));
  const pacSigs = sigs.filter(sig => isPacCategory(sig.category));

  const filteredMain = mainSigs.filter(sig => {
    const matchCat = activeCategory === "All" || activeCategory === "PAC / Committee" ? true :
      (activeCategory === "Anti-Corruption Endorsement" ? sig.isAce : sig.category === activeCategory);
    const matchSent = activeSentiment === "all" || sig.sentiment === activeSentiment;
    const matchSearch = !search ||
      sig.name.toLowerCase().includes(search.toLowerCase()) ||
      sig.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSent && matchSearch;
  });

  const filteredPacs = pacSigs.filter(sig => {
    const matchCat = activeCategory === "All" || activeCategory === "PAC / Committee" || isPacCategory(sig.category);
    const matchSent = activeSentiment === "all" || sig.sentiment === activeSentiment;
    const matchSearch = !search ||
      sig.name.toLowerCase().includes(search.toLowerCase()) ||
      sig.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSent && matchSearch && (activeCategory === "All" || activeCategory === "PAC / Committee" || isPacCategory(activeCategory));
  });

  // When category is PAC / Committee, show only PACs in card grid
  const showPacGrid = activeCategory === "PAC / Committee";
  const showPacSection = (activeCategory === "All" || showPacGrid) && filteredPacs.length > 0;
  const showMainGrid = !showPacGrid && filteredMain.length > 0;

  const aceCount = allSigs.filter(s => s.isAce).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Interest Groups & Lobbies</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Track special interest groups, super PACs, dark money organizations, and the pledges politicians make.
            Understanding who funds our politicians is essential to holding them accountable.
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
            <AlertTriangle className="h-4 w-4" />
            {allSigs.filter(s => s.sentiment === "negative").length} Corrupting influences tracked
          </span>
          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
            <TrendingUp className="h-4 w-4" />
            {allSigs.filter(s => s.sentiment === "positive").length} Reform-aligned organizations
          </span>
          {aceCount > 0 && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-4 w-4" />
              {aceCount} Anti-Corruption Endorsements
            </span>
          )}
          {pacSigs.length > 0 && (
            <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-medium">
              <DollarSign className="h-4 w-4" />
              {pacSigs.length} SuperPAC / Committees tracked
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search organizations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
                : cat === "PAC / Committee" && activeCategory !== cat
                ? "border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
                : ""}
            >
              {cat === "Anti-Corruption Endorsement" && <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
              {cat === "PAC / Committee" && <DollarSign className="h-3.5 w-3.5 mr-1.5" />}
              {cat}
            </Button>
          ))}
        </div>

        {/* Sentiment filter */}
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">Sentiment:</span>
          {SENTIMENTS.map(s => (
            <Button key={s} variant={activeSentiment === s ? "default" : "outline"} size="sm"
              className={activeSentiment !== s && s === "negative" ? "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300" :
                activeSentiment !== s && s === "positive" ? "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300" : ""}
              onClick={() => setActiveSentiment(s)}>
              {s === "all" ? "All" : s === "negative" ? "Corrupting" : s === "positive" ? "Reform" : "Neutral"}
            </Button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Main SIGs grid */}
            {showPacGrid ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPacs.map(sig => <SigCard key={sig.id} sig={sig} />)}
              </div>
            ) : (
              <>
                {showMainGrid && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredMain.map(sig => <SigCard key={sig.id} sig={sig} />)}
                  </div>
                )}

                {/* PAC / Committees collapsible section */}
                {showPacSection && (
                  <div className="rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50/40 dark:bg-orange-950/10 overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                      onClick={() => setPacsExpanded(v => !v)}
                    >
                      <DollarSign className="h-5 w-5 text-orange-500 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-orange-800 dark:text-orange-300">
                          SuperPAC & Independent Expenditure Committees
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">
                          {filteredPacs.length} committee{filteredPacs.length !== 1 ? "s" : ""} tracked via FEC — click to {pacsExpanded ? "collapse" : "expand"}
                        </p>
                      </div>
                      {pacsExpanded
                        ? <ChevronUp className="h-5 w-5 text-orange-500 shrink-0" />
                        : <ChevronDown className="h-5 w-5 text-orange-500 shrink-0" />}
                    </button>
                    {pacsExpanded && (
                      <div className="px-4 pb-4 space-y-1 border-t border-orange-200 dark:border-orange-900 pt-3">
                        {filteredPacs.map(sig => <PacRow key={sig.id} sig={sig} />)}
                      </div>
                    )}
                  </div>
                )}

                {!showMainGrid && !showPacSection && (
                  <div className="text-center py-20 text-muted-foreground">
                    <p className="text-lg font-medium">No organizations match your filters</p>
                    <p className="text-sm mt-1">Try adjusting the category or sentiment filter</p>
                  </div>
                )}
              </>
            )}

            {!isLoading && allSigs.length === 0 && (
              <div className="text-center py-20 space-y-2 text-muted-foreground">
                <p className="text-lg font-medium">No organizations in the database yet</p>
                <p className="text-sm">Admins can seed the database from the admin panel.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
