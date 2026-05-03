import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, Bot, Download, Upload, Save, ArrowLeft, RotateCcw, RotateCw } from "lucide-react";

const DISTRICT_TYPES = [
  "congressional","state_senate","state_house","county","city","school","judicial","special",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

function LeafletMapEditor({ geojson, onChange }: { geojson: any; onChange: (geo: any) => void }) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawnItemsRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let L: any;
    let map: any;

    const init = async () => {
      if (!containerRef.current || mapRef.current) return;
      // Dynamic imports for leaflet (avoids SSR issues)
      L = (await import("leaflet")).default;
      await import("leaflet-draw");

      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      map = L.map(containerRef.current).setView([39.5, -98.35], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      const drawControl = new (L as any).Control.Draw({
        edit: { featureGroup: drawnItems },
        draw: { polygon: true, rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false },
      });
      map.addControl(drawControl);

      map.on((L as any).Draw.Event.CREATED, (e: any) => {
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);
        const geo = drawnItems.toGeoJSON();
        onChange(geo);
      });

      map.on((L as any).Draw.Event.EDITED, () => {
        const geo = drawnItems.toGeoJSON();
        onChange(geo);
      });

      map.on((L as any).Draw.Event.DELETED, () => {
        const geo = drawnItems.toGeoJSON();
        onChange(geo);
      });

      mapRef.current = { map, L };
      setMapReady(true);
    };

    init();

    return () => {
      if (mapRef.current?.map) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Render geojson when it changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || !drawnItemsRef.current) return;
    const { map, L } = mapRef.current;
    const drawnItems = drawnItemsRef.current;
    drawnItems.clearLayers();
    if (geojson && (geojson.features?.length > 0 || geojson.geometry)) {
      try {
        const layer = L.geoJSON(geojson);
        layer.eachLayer((l: any) => drawnItems.addLayer(l));
        const bounds = drawnItems.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
      } catch {}
    }
  }, [geojson, mapReady]);

  return (
    <div
      ref={containerRef}
      style={{ height: "420px", width: "100%", borderRadius: "0.5rem", border: "1px solid #e2e8f0", zIndex: 0 }}
    />
  );
}

export default function AdminDistrictFormPage() {
  const params = useParams<{ districtId?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = !!params.districtId;

  const [name, setName] = useState("");
  const [districtType, setDistrictType] = useState("");
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [geojson, setGeojson] = useState<any>(null);
  const [geojsonHistory, setGeojsonHistory] = useState<any[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing district data if editing
  const { data: existing } = useQuery<any>({
    queryKey: ["/api/admin/districts", params.districtId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/districts/${params.districtId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load district");
      return res.json();
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name ?? "");
      setDistrictType(existing.districtType ?? "");
      setState(existing.state ?? "");
      setCounty(existing.county ?? "");
      setCity(existing.city ?? "");
      setDescription(existing.description ?? "");
      setSourceUrl(existing.sourceUrl ?? "");
      setSourceName(existing.sourceName ?? "");
      setConfidenceScore(existing.confidenceScore ?? null);
      if (existing.geojsonBoundary) {
        setGeojson(existing.geojsonBoundary);
        setGeojsonHistory([existing.geojsonBoundary]);
        setHistoryIdx(0);
      }
    }
  }, [existing]);

  const pushGeojson = (geo: any) => {
    const newHistory = [...geojsonHistory.slice(0, historyIdx + 1), geo];
    setGeojsonHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
    setGeojson(geo);
  };

  const undo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setGeojson(geojsonHistory[historyIdx - 1]);
    }
  };

  const redo = () => {
    if (historyIdx < geojsonHistory.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setGeojson(geojsonHistory[historyIdx + 1]);
    }
  };

  const draftWithAI = async () => {
    if (!name || !districtType || !state) {
      toast({ title: "Fill in name, type, and state first", variant: "destructive" });
      return;
    }
    setAiDrafting(true);
    try {
      const res = await apiRequest("/api/admin/districts/ai-draft", "POST", { name, districtType, state, county, city });
      const data = await res.json();
      if (data.geojson) {
        pushGeojson(data.geojson);
        setConfidenceScore(data.confidenceScore ?? 0.3);
        toast({ title: "AI boundary drafted", description: "Review and adjust before confirming." });
      } else {
        toast({ title: "AI could not generate a boundary", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "AI draft failed", description: e.message, variant: "destructive" });
    } finally {
      setAiDrafting(false);
    }
  };

  const importGeoJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.geojson";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          pushGeojson(parsed);
          toast({ title: "GeoJSON imported" });
        } catch {
          toast({ title: "Invalid GeoJSON file", variant: "destructive" });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const exportGeoJSON = () => {
    if (!geojson) { toast({ title: "No boundary to export", variant: "destructive" }); return; }
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "district"}-boundary.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async (asDraft = true) => {
    if (!name || !districtType || !state) {
      toast({ title: "Name, type, and state are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { name, districtType, state, county, city, description, sourceUrl, sourceName, geojsonBoundary: geojson, confidenceScore, status: asDraft ? (existing?.status === "confirmed" ? "confirmed" : "draft") : "needs_review" };
      if (isEditing) {
        await apiRequest(`/api/admin/districts/${params.districtId}`, "PATCH", payload);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/districts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/districts", params.districtId] });
        toast({ title: "District updated" });
        navigate(`/admin/districts/${params.districtId}`);
      } else {
        const res = await apiRequest("/api/admin/districts", "POST", payload);
        const created = await res.json();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/districts"] });
        toast({ title: "District created" });
        navigate(`/admin/districts/${created.id}`);
      }
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNavigation />
      <div className="container max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="sm" onClick={() => navigate(isEditing ? `/admin/districts/${params.districtId}` : "/admin/districts")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isEditing ? "Edit District" : "New District"}
          </h1>
        </div>

        {/* Disclaimer */}
        <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
            District boundaries should be verified against official sources before confirmation. AI-drafted maps are estimates until reviewed.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Form Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">District Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Minnesota 5th Congressional District" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type *</Label>
                  <Select value={districtType} onValueChange={setDistrictType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRICT_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>State *</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>County</Label>
                  <Input value={county} onChange={e => setCounty(e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Brief description of this district" />
              </div>
              <div>
                <Label>Official Source URL</Label>
                <Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label>Source Name</Label>
                <Input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="e.g., U.S. Census Bureau" />
              </div>

              {confidenceScore != null && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded text-sm">
                  AI Confidence: <span className={`font-semibold ${confidenceScore >= 0.7 ? "text-green-600" : confidenceScore >= 0.4 ? "text-amber-600" : "text-red-500"}`}>{Math.round(confidenceScore * 100)}%</span>
                  {confidenceScore < 0.7 && !sourceName && (
                    <p className="text-xs text-amber-600 mt-1">⚠ No official source attached. Verify before confirming.</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 flex-wrap pt-2">
                <Button onClick={draftWithAI} disabled={aiDrafting} variant="outline" className="gap-2">
                  <Bot className="h-4 w-4" />
                  {aiDrafting ? "Drafting..." : "Draft Boundary with AI"}
                </Button>
                <Button onClick={importGeoJSON} variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" /> Import GeoJSON
                </Button>
                <Button onClick={exportGeoJSON} variant="outline" className="gap-2" disabled={!geojson}>
                  <Download className="h-4 w-4" /> Export GeoJSON
                </Button>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={() => handleSave(true)} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
                </Button>
                <Button onClick={() => handleSave(false)} disabled={saving} variant="secondary" className="gap-2">
                  Save for Review
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right: Map */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Boundary Map</CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={undo} disabled={historyIdx <= 0} title="Undo">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={redo} disabled={historyIdx >= geojsonHistory.length - 1} title="Redo">
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500">Use the drawing tools to draw or edit the boundary polygon.</p>
            </CardHeader>
            <CardContent>
              <LeafletMapEditor geojson={geojson} onChange={pushGeojson} />
              {geojson && (
                <p className="text-xs text-slate-500 mt-2">
                  Boundary polygon active · {geojson.features?.length ?? 1} feature(s)
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
