import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DatabaseZap, Download, ShieldCheck } from "lucide-react";

type Source = {
  id: string; name: string; endpointUrl: string; format: "csv" | "json";
  geography?: string; raceScope?: string; accessNotes: string; isActive: boolean; lastImportedAt?: string;
};
type Run = {
  id: string; sourceId: string; status: string; totalRows: number; currentRow: number;
  importedRows: number; duplicateRows: number; errorRows: number; errorMessage?: string; createdAt: string;
};
type ExternalPoll = {
  id: string; pollster: string; race: string; geography: string; results: Record<string, number>;
  status: "pending" | "accepted" | "rejected"; publishedDate?: string; sourceUrl: string;
};
type Overview = { sources: Source[]; runs: Run[]; polls: ExternalPoll[] };

const statusVariant = (status: string) =>
  status === "completed" || status === "accepted" ? "default"
    : status === "failed" || status === "rejected" ? "destructive" : "secondary";

export default function AdminPollingImportPage() {
  const { toast } = useToast();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", endpointUrl: "", format: "json" as "csv" | "json",
    geography: "", raceScope: "", accessNotes: "",
  });
  const { data, isLoading } = useQuery<Overview>({ queryKey: ["/api/admin/polling"], refetchInterval: activeRunId ? 2000 : false });
  const { data: activeRun } = useQuery<Run & { errors: Array<{ id: string; rowNumber?: number; message: string }> }>({
    queryKey: ["/api/admin/polling/runs", activeRunId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/polling/runs/${activeRunId}`, { credentials: "include" });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    enabled: !!activeRunId,
    refetchInterval: (query) => ["queued", "running"].includes((query.state.data as any)?.status) ? 1000 : false,
  });

  useEffect(() => {
    if (activeRun && !["queued", "running"].includes(activeRun.status)) {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polling"] });
    }
  }, [activeRun?.status]);

  const addSource = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/admin/polling/sources", "POST", {
        ...form,
        geography: form.geography || null,
        raceScope: form.raceScope || null,
        isActive: true,
      });
      return response.json();
    },
    onSuccess: () => {
      setForm({ name: "", endpointUrl: "", format: "json", geography: "", raceScope: "", accessNotes: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polling"] });
      toast({ title: "Polling source registered" });
    },
    onError: (error: Error) => toast({ title: "Could not register source", description: error.message, variant: "destructive" }),
  });

  const importSource = useMutation({
    mutationFn: async (sourceId: string) => {
      const response = await apiRequest(`/api/admin/polling/sources/${sourceId}/import`, "POST");
      return response.json() as Promise<Run>;
    },
    onSuccess: (run) => {
      setActiveRunId(run.id);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polling"] });
      toast({ title: "Import started" });
    },
    onError: (error: Error) => toast({ title: "Import could not start", description: error.message, variant: "destructive" }),
  });

  const reviewPoll = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ExternalPoll["status"] }) =>
      apiRequest(`/api/admin/polling/polls/${id}/review`, "PATCH", { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/polling"] }),
    onError: (error: Error) => toast({ title: "Review update failed", description: error.message, variant: "destructive" }),
  });

  const progress = activeRun?.totalRows ? Math.round((activeRun.currentRow / activeRun.totalRows) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      <main className="container mx-auto space-y-6 px-4 py-8">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold"><DatabaseZap className="h-7 w-7" /> Polling Data Import</h1>
          <p className="mt-1 text-muted-foreground">Register permitted public CSV or JSON feeds, import records, and review them before use.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Register a controlled source</CardTitle>
            <CardDescription>Only add a public HTTPS URL you control or have permission to access. Private networks and redirects to private hosts are blocked.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="source-name">Source name</Label><Input id="source-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="State polling feed" /></div>
            <div className="space-y-2"><Label>Format</Label><Select value={form.format} onValueChange={(format: "csv" | "json") => setForm({ ...form, format })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="json">JSON</SelectItem><SelectItem value="csv">CSV</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="source-url">Public HTTPS URL</Label><Input id="source-url" type="url" value={form.endpointUrl} onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })} placeholder="https://example.org/permitted-polls.json" /></div>
            <div className="space-y-2"><Label htmlFor="geography">Geography (optional)</Label><Input id="geography" value={form.geography} onChange={(e) => setForm({ ...form, geography: e.target.value })} placeholder="National or MN" /></div>
            <div className="space-y-2"><Label htmlFor="race-scope">Race scope (optional)</Label><Input id="race-scope" value={form.raceScope} onChange={(e) => setForm({ ...form, raceScope: e.target.value })} placeholder="President, Senate, Governor" /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="access-notes">Permission / provenance notes</Label><Textarea id="access-notes" value={form.accessNotes} onChange={(e) => setForm({ ...form, accessNotes: e.target.value })} placeholder="Who owns the feed and why ACP is permitted to import it" /></div>
            <div className="md:col-span-2"><Button onClick={() => addSource.mutate()} disabled={addSource.isPending || !form.name || !form.endpointUrl || !form.accessNotes}><ShieldCheck className="mr-2 h-4 w-4" />Register source</Button></div>
          </CardContent>
        </Card>

        {activeRun && (
          <Card>
            <CardHeader><CardTitle className="flex items-center justify-between">Import progress <Badge variant={statusVariant(activeRun.status) as any}>{activeRun.status}</Badge></CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progress} />
              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
                <span>{activeRun.currentRow}/{activeRun.totalRows} rows</span><span>{activeRun.importedRows} imported</span>
                <span>{activeRun.duplicateRows} duplicates</span><span>{activeRun.errorRows} errors</span><span>{progress}%</span>
              </div>
              {activeRun.errorMessage && <p className="text-sm text-destructive">{activeRun.errorMessage}</p>}
              {!!activeRun.errors?.length && <div className="max-h-36 overflow-auto rounded border p-3 text-sm">{activeRun.errors.map((error) => <p key={error.id}>Row {error.rowNumber ?? "—"}: {error.message}</p>)}</div>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Registered sources</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p>Loading…</p> : !data?.sources.length ? <p className="text-muted-foreground">No sources registered.</p> : (
              <Table><TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Scope</TableHead><TableHead>Last import</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>{data.sources.map((source) => <TableRow key={source.id}><TableCell><div className="font-medium">{source.name}</div><div className="max-w-md truncate text-xs text-muted-foreground">{source.endpointUrl}</div></TableCell><TableCell>{[source.geography, source.raceScope].filter(Boolean).join(" · ") || "All"}</TableCell><TableCell>{source.lastImportedAt ? new Date(source.lastImportedAt).toLocaleString() : "Never"}</TableCell><TableCell className="text-right"><Button size="sm" onClick={() => importSource.mutate(source.id)} disabled={importSource.isPending || !source.isActive}><Download className="mr-2 h-4 w-4" />Import</Button></TableCell></TableRow>)}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Imported polls</CardTitle><CardDescription>New records remain pending until an administrator accepts or rejects them.</CardDescription></CardHeader>
          <CardContent>
            {!data?.polls.length ? <p className="text-muted-foreground">No polling records imported.</p> : (
              <Table><TableHeader><TableRow><TableHead>Poll</TableHead><TableHead>Results</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Review</TableHead></TableRow></TableHeader>
                <TableBody>{data.polls.map((poll) => <TableRow key={poll.id}><TableCell><a className="font-medium hover:underline" href={poll.sourceUrl} target="_blank" rel="noreferrer">{poll.pollster}</a><div className="text-sm">{poll.race} · {poll.geography}</div></TableCell><TableCell>{Object.entries(poll.results).map(([name, result]) => `${name}: ${result}%`).join(" · ")}</TableCell><TableCell><Badge variant={statusVariant(poll.status) as any}>{poll.status}</Badge></TableCell><TableCell className="space-x-2 text-right"><Button size="sm" variant="outline" onClick={() => reviewPoll.mutate({ id: poll.id, status: "accepted" })}>Accept</Button><Button size="sm" variant="outline" onClick={() => reviewPoll.mutate({ id: poll.id, status: "rejected" })}>Reject</Button></TableCell></TableRow>)}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}