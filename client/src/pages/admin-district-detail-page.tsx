import { useState, useRef, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Edit, CheckCircle2, Archive, MapPin, Users, UserCheck, History, AlertTriangle, RotateCcw, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  needs_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  confirmed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  archived: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

function ReadOnlyLeafletMap({ geojson }: { geojson: any }) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: any;
    const init = async () => {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import("leaflet")).default;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      map = L.map(containerRef.current, { zoomControl: true }).setView([39.5, -98.35], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      if (geojson) {
        try {
          const layer = L.geoJSON(geojson, { style: { color: "#3b82f6", weight: 2, fillOpacity: 0.15 } }).addTo(map);
          const bounds = layer.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
        } catch {}
      }
      mapRef.current = map;
    };
    init();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: "360px", width: "100%", borderRadius: "0.5rem", border: "1px solid #e2e8f0", zIndex: 0 }}
    />
  );
}

export default function AdminDistrictDetailPage() {
  const params = useParams<{ districtId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [searchUsersOpen, setSearchUsersOpen] = useState(false);

  const { data: district, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/districts", params.districtId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/districts/${params.districtId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load district");
      return res.json();
    },
  });

  const { data: versions = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/districts", params.districtId, "versions"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/districts/${params.districtId}/versions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: tab === "history",
  });

  const { data: usersInDistrict = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/districts", params.districtId, "users"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/districts/${params.districtId}/users`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: tab === "users",
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/admin/districts/${params.districtId}/confirm`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/districts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/districts", params.districtId] });
      toast({ title: "District confirmed" });
    },
    onError: (e: any) => toast({ title: "Failed to confirm", description: e.message, variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/admin/districts/${params.districtId}/archive`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/districts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/districts", params.districtId] });
      setConfirmArchiveOpen(false);
      toast({ title: "District archived" });
    },
    onError: (e: any) => toast({ title: "Failed to archive", description: e.message, variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      await apiRequest(`/api/admin/districts/${params.districtId}/versions/${versionId}/restore`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/districts", params.districtId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/districts", params.districtId, "versions"] });
      toast({ title: "Version restored" });
    },
    onError: (e: any) => toast({ title: "Restore failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminNavigation />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!district) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminNavigation />
        <div className="container max-w-4xl mx-auto py-16 text-center">
          <p className="text-slate-500">District not found.</p>
          <Link href="/admin/districts"><Button variant="outline" className="mt-4">Back to Districts</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="container max-w-6xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/districts")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{district.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[district.status]}`}>
                {district.status?.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {district.districtType?.replace(/_/g, " ")} · {district.state}
              {district.county && ` · ${district.county}`}
              {district.confidenceScore != null && ` · Confidence: ${Math.round(district.confidenceScore * 100)}%`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/admin/districts/${params.districtId}/edit`}>
              <Button variant="outline" size="sm" className="gap-1"><Edit className="h-4 w-4" /> Edit</Button>
            </Link>
            {(district.status === "needs_review" || district.status === "draft") && (
              <Button size="sm" onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending} className="gap-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4" /> Confirm District
              </Button>
            )}
            {district.status !== "archived" && (
              <Button variant="outline" size="sm" className="gap-1 text-red-600 border-red-300 hover:bg-red-50" onClick={() => setConfirmArchiveOpen(true)}>
                <Archive className="h-4 w-4" /> Archive
              </Button>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        {district.status !== "confirmed" && (
          <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
              District boundaries should be verified against official sources before confirmation. AI-drafted maps are estimates until reviewed.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users ({district.userCount ?? 0})</TabsTrigger>
            <TabsTrigger value="candidates">Candidates ({district.candidates?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="history">Version History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Boundary Map</CardTitle></CardHeader>
                <CardContent>
                  {district.geojsonBoundary ? (
                    <ReadOnlyLeafletMap geojson={district.geojsonBoundary} />
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-slate-100 dark:bg-slate-800 rounded text-slate-400 text-sm">
                      No boundary defined. <Link href={`/admin/districts/${params.districtId}/edit`}><span className="ml-1 text-blue-500 cursor-pointer hover:underline">Edit to add one.</span></Link>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">District Details</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Name" value={district.name} />
                  <Row label="Type" value={district.districtType?.replace(/_/g, " ")} />
                  <Row label="State" value={district.state} />
                  {district.county && <Row label="County" value={district.county} />}
                  {district.city && <Row label="City" value={district.city} />}
                  {district.description && <Row label="Description" value={district.description} />}
                  {district.sourceName && <Row label="Source" value={district.sourceName} />}
                  {district.sourceUrl && (
                    <div className="flex gap-2">
                      <span className="text-slate-500 w-28 shrink-0">Source URL</span>
                      <a href={district.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">{district.sourceUrl}</a>
                    </div>
                  )}
                  {district.confidenceScore != null && (
                    <Row label="Confidence" value={`${Math.round(district.confidenceScore * 100)}%`} />
                  )}
                  {district.confirmedAt && (
                    <Row label="Confirmed at" value={format(new Date(district.confirmedAt), "PPP")} />
                  )}
                  <Row label="Created" value={district.createdAt ? format(new Date(district.createdAt), "PPP") : "—"} />
                  <Row label="Updated" value={district.updatedAt ? format(new Date(district.updatedAt), "PPP") : "—"} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" /> Matched Users
                  </CardTitle>
                  <span className="text-sm text-slate-500">{district.userCount ?? 0} users</span>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                ) : usersInDistrict.length === 0 ? (
                  <p className="text-slate-500 text-sm py-6 text-center">No users matched to this district yet. Users are matched when they save/update their address.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersInDistrict.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono text-xs">{u.username}</TableCell>
                          <TableCell>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-500">{u.email}</TableCell>
                          <TableCell className="text-xs text-slate-500">{u.location || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="candidates">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> Linked Candidates
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!district.candidates?.length ? (
                  <p className="text-slate-500 text-sm py-6 text-center">No candidates linked to this district yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Party</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {district.candidates.map((c: any) => (
                        <TableRow key={c.candidateId}>
                          <TableCell className="font-medium">{c.name || "—"}</TableCell>
                          <TableCell>{c.party || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" /> Version History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {versions.length === 0 ? (
                  <p className="text-slate-500 text-sm py-6 text-center">No version history yet. Versions are saved automatically when boundary changes are made.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Version</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Saved</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versions.map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-sm">v{v.versionNumber}</TableCell>
                          <TableCell className="text-sm text-slate-600">{v.changeNote || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-500">{v.createdAt ? format(new Date(v.createdAt), "PPP p") : "—"}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => restoreMutation.mutate(v.id)} disabled={restoreMutation.isPending}>
                              <RotateCcw className="h-3 w-3" /> Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Archive confirmation dialog */}
        <Dialog open={confirmArchiveOpen} onOpenChange={setConfirmArchiveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive District?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This district will be marked as archived and removed from active use. You can restore it by editing the status.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmArchiveOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
                {archiveMutation.isPending ? "Archiving..." : "Archive"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 w-28 shrink-0">{label}</span>
      <span className="text-slate-900 dark:text-slate-100">{value || "—"}</span>
    </div>
  );
}
