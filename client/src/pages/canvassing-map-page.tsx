import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { MapPin, Copy, Trash2, X, Link2, Info } from "lucide-react";
import { Redirect } from "wouter";
import type { CanvassingPin } from "@shared/schema";
import "leaflet/dist/leaflet.css";

const PIN_COLORS = [
  { id: "red" as const, label: "Republican", hex: "#ef4444", border: "#b91c1c" },
  { id: "white" as const, label: "Independent", hex: "#f8fafc", border: "#64748b" },
  { id: "blue" as const, label: "Democrat", hex: "#2563eb", border: "#1d4ed8" },
];

function markerSvg(hex: string, border: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="${hex}" stroke="${border}" stroke-width="2"/>
    <circle cx="14" cy="14" r="5.5" fill="${border}" opacity="0.85"/>
  </svg>`;
}

export default function CanvassingMapPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState<"red" | "white" | "blue">("blue");
  const [note, setNote] = useState("");
  const [selectedPin, setSelectedPin] = useState<CanvassingPin | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const canAccess = user?.role === "admin" || user?.role === "candidate" || user?.role === "state_admin";

  const { data: pins = [] } = useQuery<CanvassingPin[]>({
    queryKey: ["/api/canvassing/pins"],
    enabled: canAccess,
  });

  const createPin = useMutation({
    mutationFn: (body: { lat: number; lng: number; color: string; note?: string }) =>
      apiRequest("POST", "/api/canvassing/pins", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/canvassing/pins"] });
      setSheetOpen(false);
      setPendingLatLng(null);
      setNote("");
      setSelectedColor("blue");
      toast({ title: "Pin dropped!", description: "Your canvassing pin has been saved." });
    },
    onError: () => toast({ title: "Error", description: "Could not save pin.", variant: "destructive" }),
  });

  const deletePin = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/canvassing/pins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/canvassing/pins"] });
      setDetailOpen(false);
      setSelectedPin(null);
      toast({ title: "Pin removed" });
    },
    onError: () => toast({ title: "Error", description: "Could not remove pin.", variant: "destructive" }),
  });

  const createMarker = useCallback((L: any, pin: CanvassingPin) => {
    const colorDef = PIN_COLORS.find(c => c.id === pin.color) ?? PIN_COLORS[2];
    const icon = L.divIcon({
      className: "",
      html: markerSvg(colorDef.hex, colorDef.border),
      iconSize: [28, 40],
      iconAnchor: [14, 40],
      popupAnchor: [0, -42],
    });
    const marker = L.marker([pin.lat, pin.lng], { icon });
    marker.on("click", () => {
      setSelectedPin(pin);
      setDetailOpen(true);
    });
    return marker;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!canAccess || !mapContainerRef.current || mapRef.current) return;

    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([39.5, -98.35], 4);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Try to center on user's location
      navigator.geolocation?.getCurrentPosition(
        (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 13),
        () => {}
      );

      // Long-press / right-click to drop a pin
      map.on("contextmenu", (e: any) => {
        setPendingLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
        setSelectedColor("blue");
        setNote("");
        setSheetOpen(true);
      });

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [canAccess]);

  // Sync pins onto map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      // Remove stale markers
      markersRef.current.forEach((marker, id) => {
        if (!pins.find((p) => p.id === id)) {
          map.removeLayer(marker);
          markersRef.current.delete(id);
        }
      });
      // Add new markers
      pins.forEach((pin) => {
        if (!markersRef.current.has(pin.id)) {
          const marker = createMarker(L, pin);
          marker.addTo(map);
          markersRef.current.set(pin.id, marker);
        }
      });
    });
  }, [pins, createMarker]);

  if (!user) return <Redirect to="/auth" />;
  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
        <MapPin className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Candidates & Admins Only</h2>
        <p className="text-muted-foreground max-w-xs">
          The canvassing map is available to registered candidates and admins.
        </p>
      </div>
    );
  }

  const inviteUrl = selectedPin?.inviteToken
    ? `${window.location.origin}/auth?invitation=${selectedPin.inviteToken}`
    : null;

  const copyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() =>
      toast({ title: "Copied!", description: "Invite link copied to clipboard." })
    );
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 64px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Canvassing Map</span>
          <Badge variant="outline" className="text-xs">{pins.length} pin{pins.length !== 1 ? "s" : ""}</Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Long-press or right-click map to drop a pin</span>
          <span className="sm:hidden">Long-press to pin</span>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1 w-full" />

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-2 border-t bg-card text-xs shrink-0">
        {PIN_COLORS.map((c) => (
          <div key={c.id} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border" style={{ background: c.hex, borderColor: c.border }} />
            <span className="text-muted-foreground">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Create Pin Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Drop a Pin
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Color picker */}
            <div>
              <p className="text-sm font-medium mb-2">Voter Lean</p>
              <div className="flex gap-3">
                {PIN_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedColor(c.id)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                      selectedColor === c.id ? "border-primary shadow-md scale-105" : "border-border"
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-full border-2 shadow-sm"
                      style={{ background: c.hex, borderColor: c.border }}
                    />
                    <span className="text-xs font-medium">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <p className="text-sm font-medium mb-1.5">Note <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Textarea
                placeholder="e.g. 'Interested in joining', 'Left flyer'"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Coordinates preview */}
            {pendingLatLng && (
              <p className="text-xs text-muted-foreground text-center">
                {pendingLatLng.lat.toFixed(5)}, {pendingLatLng.lng.toFixed(5)}
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={createPin.isPending || !pendingLatLng}
                onClick={() => {
                  if (!pendingLatLng) return;
                  createPin.mutate({ ...pendingLatLng, color: selectedColor, note: note || undefined });
                }}
              >
                {createPin.isPending ? "Saving…" : "Drop Pin"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Pin Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              {selectedPin && (
                <span
                  className="inline-block w-4 h-4 rounded-full border-2"
                  style={{
                    background: PIN_COLORS.find(c => c.id === selectedPin.color)?.hex,
                    borderColor: PIN_COLORS.find(c => c.id === selectedPin.color)?.border,
                  }}
                />
              )}
              Pin Details
            </SheetTitle>
          </SheetHeader>

          {selectedPin && (
            <div className="space-y-4">
              {/* Color badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Voter Lean:</span>
                <Badge variant="outline" className="capitalize">{PIN_COLORS.find(c => c.id === selectedPin.color)?.label}</Badge>
              </div>

              {/* Note */}
              {selectedPin.note && (
                <div>
                  <p className="text-sm font-medium mb-1">Note</p>
                  <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">{selectedPin.note}</p>
                </div>
              )}

              {/* Coordinates */}
              <p className="text-xs text-muted-foreground">
                {selectedPin.lat.toFixed(5)}, {selectedPin.lng.toFixed(5)}
              </p>

              {/* Invite link */}
              <div>
                <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Link2 className="h-4 w-4" />
                  Invite Link
                </p>
                {inviteUrl ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1.5 flex-1 truncate font-mono">
                      {inviteUrl}
                    </p>
                    <Button size="sm" variant="outline" onClick={copyInvite} className="shrink-0">
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No invite link generated.</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setDetailOpen(false)}>
                  <X className="h-4 w-4 mr-1.5" />
                  Close
                </Button>
                {(user?.role === "admin" || selectedPin.createdBy === user?.id) && (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={deletePin.isPending}
                    onClick={() => deletePin.mutate(selectedPin.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    {deletePin.isPending ? "Removing…" : "Remove Pin"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
