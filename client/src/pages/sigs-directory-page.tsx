import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, Search, ExternalLink, AlertTriangle, TrendingUp, ShieldCheck,
  TrendingDown, DollarSign, Building2, ArrowUpDown,
} from "lucide-react";
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
  spendRange?: string | null;
  partySplitDem?: number | null;
  partySplitRep?: number | null;
};

/* ─── helpers ─── */

function isFecId(name: string) { return /^C\d{7,9}$/.test(name.trim()); }

function sentimentLabel(s?: string) {
  if (s === "negative") return "Corrupting";
  if (s === "positive") return "Reform";
  return "Neutral";
}
function sentimentBadgeClass(s?: string) {
  if (s === "negative") return "bg-red-600 text-white hover:bg-red-700";
  if (s === "positive") return "bg-green-600 text-white hover:bg-green-700";
  return "bg-gray-400 text-white hover:bg-gray-500";
}
function resolveSentiment(sig: SIG): "positive" | "negative" | "neutral" | null {
  if (sig.isAce) return "positive";
  if (sig.sentiment === "positive" || sig.sentiment === "negative" || sig.sentiment === "neutral") return sig.sentiment;
  if (sig.influenceScore != null) {
    if (sig.influenceScore > 0) return "positive";
    if (sig.influenceScore < 0) return "negative";
    return "neutral";
  }
  return null;
}
function cardBgClass(sig: SIG) {
  const s = resolveSentiment(sig);
  if (sig.isAce) return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700";
  if (s === "negative") return "bg-red-50 dark:bg-red-900/40 border-red-300 dark:border-red-700";
  if (s === "positive") return "bg-green-50 dark:bg-green-900/40 border-green-300 dark:border-green-700";
  return "";
}
function patriotCardStyle(sig: SIG): Record<string, string> {
  const s = resolveSentiment(sig);
  if (sig.isAce || s === "positive")
    return { background: "linear-gradient(135deg,rgba(22,163,74,.60) 0%,rgba(20,83,45,.70) 100%)", borderColor: "rgba(74,222,128,.6)", color: "#fff" };
  if (s === "negative")
    return { background: "linear-gradient(135deg,rgba(220,38,38,.60) 0%,rgba(127,29,29,.70) 100%)", borderColor: "rgba(248,113,113,.6)", color: "#fff" };
  return {};
}
function categoryBadgeClass(cat: string) {
  const map: Record<string, string> = {
    "Super PAC": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200",
    pac: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200",
    "Dark Money": "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-200",
    "Industry PAC": "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200",
    "Special Interest": "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200",
    Pledge: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200",
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
function influenceGrade(score: number) {
  if (score >= 30) return "A";
  if (score >= 10) return "B";
  if (score >= -10) return "C";
  if (score >= -30) return "D";
  return "F";
}
function isPacCategory(cat: string) { return cat === "pac" || cat === "PAC / Committee"; }
function parseSpendLower(spendRange?: string | null) {
  if (!spendRange) return 0;
  const m = spendRange.match(/\$([\d.]+)([BM]?)/);
  if (!m) return 0;
  const val = parseFloat(m[1]);
  return m[2] === "B" ? val * 1000 : val;
}
function gradeSort(sig: SIG) { return sig.influenceScore ?? -999; }

/* ─── sub-components ─── */

function LobbyIndustrySectorCard({ sig }: { sig: SIG }) {
  const { actualTheme } = useTheme();
  const hasInfluence = sig.influenceScore != null;
  const communityGrade = hasInfluence ? influenceGrade(sig.influenceScore!) : null;
  const displayGrade = sig.letterGrade || communityGrade;
  const isPatriot = actualTheme === "patriot";
  const s = resolveSentiment(sig);

  const borderAccent =
    s === "negative" ? "border-red-300 dark:border-red-700" :
    s === "positive" ? "border-green-300 dark:border-green-700" : "border-border";
  const headerBg =
    s === "negative" ? "bg-gradient-to-r from-red-900/80 to-red-800/80" :
    s === "positive" ? "bg-gradient-to-r from-green-900/80 to-emerald-800/80" :
    "bg-gradient-to-r from-slate-800/90 to-slate-700/90";
  const cardBg = isPatriot ? "" :
    s === "negative" ? "bg-red-50/60 dark:bg-red-950/20" :
    s === "positive" ? "bg-green-50/60 dark:bg-green-950/20" : "bg-background";

  return (
    <Card
      className={`flex flex-col overflow-hidden border ${borderAccent} hover:shadow-lg transition-all ${cardBg}`}
      style={isPatriot ? patriotCardStyle(sig) : undefined}
    >
      <div className={`${headerBg} px-4 py-3 flex items-start justify-between gap-2`}>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm leading-tight line-clamp-2">{sig.name}</h3>
          {sig.acronym && <span className="text-white/60 text-xs font-mono">{sig.acronym}</span>}
        </div>
        {displayGrade && (
          <span className={`text-base font-black px-2 py-0.5 rounded-lg shadow border-2 border-white/20 shrink-0 ${gradeColor(displayGrade)}`}>
            {displayGrade}
          </span>
        )}
      </div>
      <CardContent className="flex flex-col flex-1 gap-3 p-4">
        <div className="flex items-center flex-wrap gap-2">
          {sig.spendRange && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700">
              <DollarSign className="h-3 w-3" />{sig.spendRange} / yr
            </span>
          )}
          <Badge className={`text-xs ${sentimentBadgeClass(sig.sentiment)}`}>{sentimentLabel(sig.sentiment)}</Badge>
        </div>
        {sig.partySplitDem != null && sig.partySplitRep != null && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-semibold">
              <span className="text-blue-600 dark:text-blue-400">Dem {sig.partySplitDem}%</span>
              <span className="text-red-600 dark:text-red-400">{sig.partySplitRep}% Rep</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-500" style={{ width: `${sig.partySplitDem}%` }} />
              <div className="h-full bg-red-500 flex-1" />
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed flex-1">
          {sig.description || "No description available."}
        </p>
        {hasInfluence && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><TrendingDown className="h-2.5 w-2.5 text-red-500" />Corrupt</span>
              <span className="font-medium text-xs">{sig.influenceScore! > 0 ? "+" : ""}{sig.influenceScore}</span>
              <span className="flex items-center gap-0.5">Reform<TrendingUp className="h-2.5 w-2.5 text-green-500" /></span>
            </div>
            <div className="relative h-1.5 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-400 to-green-500">
              <div className="absolute top-0 h-full w-px bg-white/60" style={{ left: "50%" }} />
              <div className="absolute top-0 h-full w-1 bg-white border-x border-white/50 shadow-sm"
                style={{ left: `calc(${((sig.influenceScore! + 50) / 100) * 100}% - 2px)` }} />
            </div>
          </div>
        )}
        {sig.dataSourceName && sig.dataSourceUrl && (
          <a href={sig.dataSourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
            onClick={e => e.stopPropagation()}>
            <ExternalLink className="h-3 w-3" />{sig.dataSourceName}
          </a>
        )}
        <Link href={`/lobbies/${sig.tag || sig.id}`}>
          <Button variant="outline" size="sm" className="w-full mt-auto">View Sector Profile →</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function SigCard({ sig }: { sig: SIG }) {
  const { actualTheme } = useTheme();
  const hasInfluence = sig.influenceScore != null;
  const communityGrade = hasInfluence ? influenceGrade(sig.influenceScore!) : null;
  const scorePct = hasInfluence ? ((sig.influenceScore! + 50) / 100) * 100 : null;
  const isPatriot = actualTheme === "patriot";

  return (
    <Card
      className={`flex flex-col hover:shadow-md transition-shadow relative ${isPatriot ? "" : cardBgClass(sig)}`}
      style={isPatriot ? patriotCardStyle(sig) : undefined}
    >
      {communityGrade && (
        <div className={`absolute -top-3 -right-3 z-10 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800 text-xl font-black ${gradeColor(communityGrade)}`}>
          {communityGrade}
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight flex items-center gap-2 pr-10">
            {sig.isAce && <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
            {sig.name}
          </CardTitle>
          <Badge className={`text-xs shrink-0 ${sentimentBadgeClass(sig.sentiment)}`}>
            {sig.isAce ? "ACE" : sentimentLabel(sig.sentiment)}
          </Badge>
        </div>
        <Badge variant="outline" className={`text-xs w-fit ${categoryBadgeClass(sig.category)}`}>
          {sig.isAce ? "Anti-Corruption Endorsement" : sig.category === "pac" ? "PAC / Committee" : sig.category}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {sig.description || "No description available."}
        </p>
        {hasInfluence && scorePct !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" />Corrupt</span>
              <span className="font-medium">{sig.influenceScore! > 0 ? "+" : ""}{sig.influenceScore}</span>
              <span className="flex items-center gap-1">Reform<TrendingUp className="h-3 w-3 text-green-500" /></span>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-400 to-green-500">
              <div className="absolute top-0 h-full w-px bg-white/60" style={{ left: "50%" }} />
              <div className="absolute top-0 h-full w-1 bg-white border-x border-white/50 shadow-sm"
                style={{ left: `calc(${scorePct}% - 2px)` }} />
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
          <Link href={`/lobbies/${sig.tag || sig.id}`}>
            <Button variant="outline" size="sm" className="w-full">View Profile →</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function PacRow({ sig }: { sig: SIG }) {
  const effectiveGrade = sig.letterGrade || (sig.influenceScore != null ? influenceGrade(sig.influenceScore) : null);
  return (
    <Link href={`/lobbies/${sig.tag || sig.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 border border-transparent hover:border-border cursor-pointer transition-all">
        <DollarSign className="h-4 w-4 text-orange-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate">{sig.name}</span>
          {sig.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{sig.description}</p>}
        </div>
        {effectiveGrade && (
          <span className={`text-xs font-black px-1.5 py-0.5 rounded shrink-0 ${gradeColor(effectiveGrade)}`}>{effectiveGrade}</span>
        )}
        <Badge className={`text-xs shrink-0 ${sentimentBadgeClass(sig.sentiment)}`}>{sentimentLabel(sig.sentiment)}</Badge>
      </div>
    </Link>
  );
}

/* ─── condensed filter bar ─── */

type FilterBarProps = {
  search: string; onSearch: (v: string) => void;
  sentiment?: string; onSentiment?: (v: string) => void;
  sort?: string; onSort?: (v: string) => void;
  sortOptions?: { value: string; label: string }[];
  partyLean?: string; onPartyLean?: (v: string) => void;
  placeholder?: string;
};

function FilterBar({ search, onSearch, sentiment, onSentiment, sort, onSort, sortOptions, partyLean, onPartyLean, placeholder }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={placeholder || "Search…"}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Sentiment */}
      {onSentiment && (
        <Select value={sentiment} onValueChange={onSentiment}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sentiments</SelectItem>
            <SelectItem value="negative">Corrupting</SelectItem>
            <SelectItem value="positive">Reform</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Sort */}
      {onSort && sortOptions && (
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select value={sort} onValueChange={onSort}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Party lean */}
      {onPartyLean && (
        <Select value={partyLean} onValueChange={onPartyLean}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue placeholder="Party lean" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All parties</SelectItem>
            <SelectItem value="dem">Dem-leaning</SelectItem>
            <SelectItem value="rep">Rep-leaning</SelectItem>
            <SelectItem value="split">Even split</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

/* ─── empty state ─── */
function EmptyState({ icon: Icon, message, sub }: { icon: React.ElementType; message: string; sub?: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Icon className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">{message}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
    </div>
  );
}

/* ─── main page ─── */

const LOBBY_SORT_OPTIONS = [
  { value: "spend", label: "Spend (high → low)" },
  { value: "grade", label: "ACP Grade (best first)" },
  { value: "dem", label: "Most Dem-leaning" },
  { value: "rep", label: "Most Rep-leaning" },
  { value: "name", label: "Name A → Z" },
];
const SIG_SORT_OPTIONS = [
  { value: "grade", label: "ACP Grade (best first)" },
  { value: "name", label: "Name A → Z" },
];

export default function SigsDirectoryPage() {
  // Per-tab state
  const [lobbySearch, setLobbySearch] = useState("");
  const [lobbySort, setLobbySort] = useState("spend");
  const [lobbyPartyLean, setLobbyPartyLean] = useState("all");
  const [lobbySentiment, setLobbySentiment] = useState("all");

  const [interestSearch, setInterestSearch] = useState("");
  const [interestSentiment, setInterestSentiment] = useState("all");
  const [interestSort, setInterestSort] = useState("grade");

  const [pacSearch, setPacSearch] = useState("");
  const [pacSentiment, setPacSentiment] = useState("all");

  const [aceSearch, setAceSearch] = useState("");

  const { data: allSigs = [], isLoading } = useQuery<SIG[]>({ queryKey: ["/api/sigs"] });

  const sigs = allSigs.filter(sig => !isFecId(sig.name));

  // Segment by tab
  const lobbySectors = sigs.filter(s => s.category?.toLowerCase() === "lobby");
  const interestSigs = sigs.filter(s => s.category?.toLowerCase() !== "lobby" && !isPacCategory(s.category) && !s.isAce);
  const pacSigs = sigs.filter(s => isPacCategory(s.category));
  const aceSigs = sigs.filter(s => s.isAce);

  // Lobbies — filtered + sorted
  const filteredLobbies = useMemo(() => {
    let list = lobbySectors.filter(s => {
      const matchSent = lobbySentiment === "all" || s.sentiment === lobbySentiment;
      const matchSearch = !lobbySearch ||
        s.name.toLowerCase().includes(lobbySearch.toLowerCase()) ||
        s.description?.toLowerCase().includes(lobbySearch.toLowerCase());
      return matchSent && matchSearch;
    });
    if (lobbyPartyLean === "dem") list = list.filter(s => (s.partySplitDem ?? 0) > (s.partySplitRep ?? 0));
    else if (lobbyPartyLean === "rep") list = list.filter(s => (s.partySplitRep ?? 0) > (s.partySplitDem ?? 0));
    else if (lobbyPartyLean === "split") list = list.filter(s => Math.abs((s.partySplitDem ?? 50) - (s.partySplitRep ?? 50)) <= 10);

    return [...list].sort((a, b) => {
      if (lobbySort === "spend") return parseSpendLower(b.spendRange) - parseSpendLower(a.spendRange);
      if (lobbySort === "grade") return gradeSort(b) - gradeSort(a);
      if (lobbySort === "dem") return (b.partySplitDem ?? 0) - (a.partySplitDem ?? 0);
      if (lobbySort === "rep") return (b.partySplitRep ?? 0) - (a.partySplitRep ?? 0);
      if (lobbySort === "name") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [lobbySectors, lobbySearch, lobbySentiment, lobbySort, lobbyPartyLean]);

  // Interest groups — filtered + sorted
  const filteredInterest = useMemo(() => {
    let list = interestSigs.filter(s => {
      const matchSent = interestSentiment === "all" || s.sentiment === interestSentiment;
      const matchSearch = !interestSearch ||
        s.name.toLowerCase().includes(interestSearch.toLowerCase()) ||
        s.description?.toLowerCase().includes(interestSearch.toLowerCase());
      return matchSent && matchSearch;
    });
    return [...list].sort((a, b) =>
      interestSort === "name" ? a.name.localeCompare(b.name) : gradeSort(b) - gradeSort(a)
    );
  }, [interestSigs, interestSearch, interestSentiment, interestSort]);

  // PACs — filtered
  const filteredPacs = useMemo(() => pacSigs.filter(s => {
    const matchSent = pacSentiment === "all" || s.sentiment === pacSentiment;
    const matchSearch = !pacSearch ||
      s.name.toLowerCase().includes(pacSearch.toLowerCase()) ||
      s.description?.toLowerCase().includes(pacSearch.toLowerCase());
    return matchSent && matchSearch;
  }), [pacSigs, pacSearch, pacSentiment]);

  // ACEs — filtered
  const filteredAces = useMemo(() => aceSigs.filter(s =>
    !aceSearch ||
    s.name.toLowerCase().includes(aceSearch.toLowerCase()) ||
    s.description?.toLowerCase().includes(aceSearch.toLowerCase())
  ), [aceSigs, aceSearch]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-amber-500" />
            <h1 className="text-3xl font-bold text-foreground">Lobbies & Industry Sectors</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Track industry lobbying sectors, special interest groups, PACs, and Anti-Corruption Endorsements —
            all graded by ACP community influence scores.
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
            <Building2 className="h-4 w-4" />{lobbySectors.length} lobby sectors
          </span>
          <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 font-medium">
            <AlertTriangle className="h-4 w-4" />{interestSigs.length} interest groups
          </span>
          <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-medium">
            <DollarSign className="h-4 w-4" />{pacSigs.length} PACs tracked
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="h-4 w-4" />{aceSigs.length} ACE endorsements
          </span>
        </div>

        {/* Tabs */}
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="lobbies" className="space-y-0">
            <TabsList className="h-auto gap-1 bg-muted/50 p-1 flex-wrap">
              <TabsTrigger value="lobbies" className="gap-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                <Building2 className="h-4 w-4" />
                Lobbies
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4">{lobbySectors.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="interest" className="gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Interest Groups
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4">{interestSigs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pacs" className="gap-1.5">
                <DollarSign className="h-4 w-4" />
                PACs
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4">{pacSigs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="aces" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                <ShieldCheck className="h-4 w-4" />
                ACEs
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4">{aceSigs.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* ── LOBBIES TAB ── */}
            <TabsContent value="lobbies" className="space-y-4 pt-2">
              <FilterBar
                search={lobbySearch} onSearch={setLobbySearch}
                sentiment={lobbySentiment} onSentiment={setLobbySentiment}
                sort={lobbySort} onSort={setLobbySort} sortOptions={LOBBY_SORT_OPTIONS}
                partyLean={lobbyPartyLean} onPartyLean={setLobbyPartyLean}
                placeholder="Search lobby sectors…"
              />
              {filteredLobbies.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">{filteredLobbies.length} sector{filteredLobbies.length !== 1 ? "s" : ""} shown</p>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredLobbies.map(sig => <LobbyIndustrySectorCard key={sig.id} sig={sig} />)}
                  </div>
                </>
              ) : (
                <EmptyState icon={Building2} message="No sectors match your filters" sub="Try adjusting the search, sentiment, or party lean" />
              )}
            </TabsContent>

            {/* ── INTEREST GROUPS TAB ── */}
            <TabsContent value="interest" className="space-y-4 pt-2">
              <FilterBar
                search={interestSearch} onSearch={setInterestSearch}
                sentiment={interestSentiment} onSentiment={setInterestSentiment}
                sort={interestSort} onSort={setInterestSort} sortOptions={SIG_SORT_OPTIONS}
                placeholder="Search interest groups…"
              />
              {filteredInterest.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">{filteredInterest.length} group{filteredInterest.length !== 1 ? "s" : ""} shown</p>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredInterest.map(sig => <SigCard key={sig.id} sig={sig} />)}
                  </div>
                </>
              ) : (
                <EmptyState icon={AlertTriangle} message="No interest groups match your filters" sub="Try adjusting the search or sentiment" />
              )}
            </TabsContent>

            {/* ── PACs TAB ── */}
            <TabsContent value="pacs" className="space-y-4 pt-2">
              <FilterBar
                search={pacSearch} onSearch={setPacSearch}
                sentiment={pacSentiment} onSentiment={setPacSentiment}
                placeholder="Search PACs and committees…"
              />
              {filteredPacs.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">{filteredPacs.length} PAC{filteredPacs.length !== 1 ? "s" : ""} shown</p>
                  <div className="divide-y divide-border rounded-lg border bg-card">
                    {filteredPacs.map(sig => <PacRow key={sig.id} sig={sig} />)}
                  </div>
                </>
              ) : (
                <EmptyState icon={DollarSign} message="No PACs match your filters" sub="Try adjusting the search or sentiment" />
              )}
            </TabsContent>

            {/* ── ACEs TAB ── */}
            <TabsContent value="aces" className="space-y-4 pt-2">
              <FilterBar
                search={aceSearch} onSearch={setAceSearch}
                placeholder="Search ACE endorsements…"
              />
              {filteredAces.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">{filteredAces.length} endorsement{filteredAces.length !== 1 ? "s" : ""} shown</p>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredAces.map(sig => <SigCard key={sig.id} sig={sig} />)}
                  </div>
                </>
              ) : (
                <EmptyState icon={ShieldCheck} message="No ACE endorsements yet" sub="ACE badges are awarded to anti-corruption vetted groups" />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
