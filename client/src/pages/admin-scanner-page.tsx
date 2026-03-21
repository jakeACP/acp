import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Radar, CheckCircle2, XCircle, ExternalLink, Loader2,
  ChevronDown, ChevronUp, Search, AlertTriangle, Clock, FileText, TrendingUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ScanFinding = {
  id: number;
  headline: string;
  category: string | null;
  summary: string | null;
  sourceUrl: string | null;
  entitiesInvolved: string | null;
  relevanceScore: number | null;
  suggestedAction: string | null;
  status: string | null;
  scannedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  adminNotes: string | null;
};

type Stats = {
  total: number;
  pending: number;
  highPriority: number;
  approvedToday: number;
};

type FindingsResponse = {
  findings: ScanFinding[];
  total: number;
  page: number;
};

const CATEGORIES = [
  "Super PACs & Dark Money",
  "Candidates & Politicians",
  "SIGs & Lobbyists",
  "Legal Cases & Investigations",
  "Propaganda & Disinformation",
];

const PAGE_SIZE = 25;

function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color =
    s >= 8 ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300"
    : s >= 5 ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300"
    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300";
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${color}`}>
      {s}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "pending";
  if (s === "approved") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-0">Approved</Badge>;
  if (s === "dismissed") return <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border-0">Dismissed</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200 border-0">Pending</Badge>;
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  const short: Record<string, string> = {
    "Super PACs & Dark Money": "Super PACs",
    "Candidates & Politicians": "Candidates",
    "SIGs & Lobbyists": "SIGs",
    "Legal Cases & Investigations": "Legal",
    "Propaganda & Disinformation": "Propaganda",
  };
  return <Badge variant="outline" className="text-xs font-normal">{short[category] ?? category}</Badge>;
}

function EntityList({ raw }: { raw: string | null }) {
  if (!raw) return <span className="text-muted-foreground text-xs">—</span>;
  let entities: string[] = [];
  try { entities = JSON.parse(raw); } catch { entities = [raw]; }
  const shown = entities.slice(0, 3);
  const extra = entities.length - shown.length;
  return (
    <span className="text-xs text-slate-600 dark:text-slate-300">
      {shown.join(", ")}
      {extra > 0 && <span className="text-muted-foreground"> +{extra} more</span>}
    </span>
  );
}

export default function AdminScannerPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [localNotes, setLocalNotes] = useState<Record<number, string>>({});
  const notesRef = useRef<Record<number, string>>({});

  const statsQuery = useQuery<Stats>({
    queryKey: ["/api/admin/scan-findings/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/scan-findings/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const minScore =
    priorityFilter === "high" ? 7
    : priorityFilter === "medium" ? 4
    : 0;

  const maxScore =
    priorityFilter === "medium" ? 6
    : priorityFilter === "low" ? 3
    : 0;

  const queryKey = ["/api/admin/scan-findings", statusFilter, categoryFilter, priorityFilter, search, page];

  const findingsQuery = useQuery<FindingsResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (minScore > 0) params.set("minScore", String(minScore));
      if (search.trim()) params.set("search", search.trim());
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/admin/scan-findings?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch findings");
      return res.json();
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, any> }) => {
      const res = await apiRequest(`/api/admin/scan-findings/${id}`, "PATCH", updates);
      return res.json();
    },
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<FindingsResponse>(queryKey);
      if (prev) {
        qc.setQueryData<FindingsResponse>(queryKey, {
          ...prev,
          findings: prev.findings.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast({ title: "Error updating finding", variant: "destructive" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/scan-findings/stats"] });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/admin/scan-findings") });
    },
  });

  const handleApprove = (f: ScanFinding) => {
    patchMutation.mutate({ id: f.id, updates: { status: "approved" } });
    toast({ title: "Finding approved" });
  };

  const handleDismiss = (f: ScanFinding) => {
    patchMutation.mutate({ id: f.id, updates: { status: "dismissed" } });
    toast({ title: "Finding dismissed" });
  };

  const handleNotesBlur = (f: ScanFinding) => {
    const note = notesRef.current[f.id] ?? f.adminNotes ?? "";
    if (note !== f.adminNotes) {
      patchMutation.mutate({ id: f.id, updates: { adminNotes: note } });
    }
  };

  const findings = findingsQuery.data?.findings ?? [];
  const total = findingsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const stats = statsQuery.data;

  const filteredFindings = maxScore > 0
    ? findings.filter(f => (f.relevanceScore ?? 0) <= maxScore)
    : findings;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex items-center gap-3">
          <Radar className="w-6 h-6 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">News Scanner</h1>
            <p className="text-sm text-muted-foreground">AI-generated corruption news findings for review</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Scans</p>
                  <p className="text-2xl font-bold">{stats?.total ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats?.pending ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.highPriority ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Approved Today</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.approvedToday ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex gap-1">
                {["all", "pending", "approved", "dismissed"].map((s) => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? "default" : "outline"}
                    size="sm"
                    className="capitalize"
                    onClick={() => { setStatusFilter(s); setPage(1); }}
                  >
                    {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority (7+)</SelectItem>
                  <SelectItem value="medium">Medium (4–6)</SelectItem>
                  <SelectItem value="low">Low (1–3)</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Search headline, summary…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0 pt-4 px-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {findingsQuery.isLoading ? "Loading…" : `${total.toLocaleString()} finding${total !== 1 ? "s" : ""}`}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <span className="text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-3">
            {findingsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFindings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Radar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No findings match the current filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFindings.map((f) => {
                  const isExpanded = expandedId === f.id;
                  const isHighPriority = (f.relevanceScore ?? 0) >= 7;
                  return (
                    <div key={f.id} className={isHighPriority ? "border-l-2 border-red-400" : ""}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : f.id)}
                      >
                        <ScoreBadge score={f.relevanceScore} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm font-medium truncate max-w-xs cursor-default">
                                  {f.headline.length > 60 ? f.headline.slice(0, 60) + "…" : f.headline}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm text-xs">{f.headline}</TooltipContent>
                            </Tooltip>
                            <CategoryBadge category={f.category} />
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <EntityList raw={f.entitiesInvolved} />
                          </div>
                        </div>

                        <div className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
                          {f.suggestedAction ?? "—"}
                        </div>

                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {f.scannedAt ? formatDistanceToNow(new Date(f.scannedAt), { addSuffix: true }) : "—"}
                        </div>

                        <StatusBadge status={f.status} />

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {f.status === "pending" && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    disabled={patchMutation.isPending}
                                    onClick={() => handleApprove(f)}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Approve</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    disabled={patchMutation.isPending}
                                    onClick={() => handleDismiss(f)}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Dismiss</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {f.sourceUrl && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={f.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center h-7 w-7 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>View Source</TooltipContent>
                            </Tooltip>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800">
                          <div className="pt-4 space-y-4">
                            <div>
                              <p className="text-sm font-semibold mb-1">{f.headline}</p>
                              {f.summary && <p className="text-sm text-slate-600 dark:text-slate-300">{f.summary}</p>}
                            </div>

                            {f.entitiesInvolved && (() => {
                              let ents: string[] = [];
                              try { ents = JSON.parse(f.entitiesInvolved); } catch { ents = [f.entitiesInvolved]; }
                              return (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Entities Involved</p>
                                  <div className="flex flex-wrap gap-1">
                                    {ents.map((e, i) => <Badge key={i} variant="outline" className="text-xs">{e}</Badge>)}
                                  </div>
                                </div>
                              );
                            })()}

                            {f.sourceUrl && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Source</p>
                                <a
                                  href={f.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {f.sourceUrl}
                                </a>
                              </div>
                            )}

                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Admin Notes</p>
                              <Textarea
                                className="text-sm resize-none"
                                rows={3}
                                placeholder="Add internal notes…"
                                defaultValue={f.adminNotes ?? ""}
                                onChange={(e) => {
                                  notesRef.current[f.id] = e.target.value;
                                  setLocalNotes((prev) => ({ ...prev, [f.id]: e.target.value }));
                                }}
                                onBlur={() => handleNotesBlur(f)}
                              />
                            </div>

                            {f.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  disabled={patchMutation.isPending}
                                  onClick={() => handleApprove(f)}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={patchMutation.isPending}
                                  onClick={() => handleDismiss(f)}
                                >
                                  <XCircle className="w-4 h-4 mr-1" /> Dismiss
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 py-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="text-sm text-muted-foreground flex items-center px-2">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
