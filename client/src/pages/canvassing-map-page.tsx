import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { MapPin, Copy, Trash2, X, Link2, User, Mail, Phone } from "lucide-react";
import { Redirect } from "wouter";
import type { CanvassingPin } from "@shared/schema";
import "leaflet/dist/leaflet.css";

const PIN_COLORS = [
  { id: "red" as const, label: "Republican", hex: "#ef4444", border: "#b91c1c", text: "text-red-600" },
  { id: "white" as const, label: "Independent", hex: "#f1f5f9", border: "#94a3b8", text: "text-slate-600" },
  { id: "blue" as const, label: "Democrat", hex: "#2563eb", border: "#1d4ed8", text: "text-blue-600" },
];

function markerSvg(hex: string, border: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
    <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 27 15 27S30 26.25 30 15C30 6.716 23.284 0 15 0z" fill="${hex}" stroke="${border}" stroke-width="2"/>
    <circle cx="15" cy="15" r="6" fill="${border}" opacity="0.9"/>
  </svg>`;
}

export default function CanvassingMapPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressLatLngRef = useRef<{ lat: number; lng: number } | null>(null);
  const touchMovedRef = useRef(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState<"red" | "white" | "blue">("blue");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");
  const [selectedPin, setSelectedPin] = useState<CanvassingPin | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const canAccess = user?.role === "admin" || user?.role === "candidate" || user?.role === "state_admin";

  const { data: pins = [] } = useQuery<CanvassingPin[]>({
    queryKey: ["/api/canvassing/pins"],
    enabled: canAccess,
  });

  const resetForm = () => {
    setContactName(""); setContactEmail(""); setContactPhone(""); setNote(""); setSelectedColor("blue");
  };

  const createPin = useMutation({
    mutationFn: (body: object) => apiRequest("POST", "/api/canvassing/pins", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/canvassing/pins"] });
      setSheetOpen(false);
      setPendingLatLng(null);
      resetForm();
      toast({ title: "Pin dropped!", description: "Contact saved with invite link." });
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

  const openCreateSheet = useCallback((lat: number, lng: number) => {
    setPendingLatLng({ lat, lng });
    resetForm();
    setSheetOpen(true);
  }, []);

  const createMarker = useCallback((L: any, pin: CanvassingPin) => {
    const colorDef = PIN_COLORS.find(c => c.id === pin.color) ?? PIN_COLORS[2];
    const icon = L.divIcon({
      className: "",
      html: markerSvg(colorDef.hex, colorDef.border),
      iconSize: [30, 42],
      iconAnchor: [15, 42],
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

      const map = L.map(mapContainerRef.current, { zoomControl: true, tap: false }).setView([39.5, -98.35], 4);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      navigator.geolocation?.getCurrentPosition(
        (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
        () => {}
      );

      // ── Long-press via native touch events on the container ──────────────────
      const container = mapContainerRef.current!;

      const cancelLongPress = () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      };

      const onTouchStart = (e: TouchEvent) => {
        touchMovedRef.current = false;
        const touch = e.touches[0];
        // Convert touch coords to map latlng
        const rect = container.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const latlng = map.containerPointToLatLng([x, y]);
        longPressLatLngRef.current = { lat: latlng.lat, lng: latlng.lng };

        longPressTimerRef.current = setTimeout(() => {
          if (!touchMovedRef.current && longPressLatLngRef.current) {
            // Prevent map from panning after this
            e.preventDefault();
            openCreateSheet(longPressLatLngRef.current.lat, longPressLatLngRef.current.lng);
          }
        }, 600);
      };

      const onTouchMove = () => {
        touchMovedRef.current = true;
        cancelLongPress();
      };

      const onTouchEnd = () => cancelLongPress();

      container.addEventListener("touchstart", onTouchStart, { passive: true });
      container.addEventListener("touchmove", onTouchMove, { passive: true });
      container.addEventListener("touchend", onTouchEnd);

      // ── Right-click / context menu for desktop ───────────────────────────────
      map.on("contextmenu", (e: any) => {
        openCreateSheet(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;

      return () => {
        container.removeEventListener("touchstart", onTouchStart);
        container.removeEventListener("touchmove", onTouchMove);
        container.removeEventListener("touchend", onTouchEnd);
      };
    });

    return () => {
      cancelled = true;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [canAccess, openCreateSheet]);

  // Sync pins onto map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((L) => {
      markersRef.current.forEach((marker, id) => {
        if (!pins.find((p) => p.id === id)) {
          map.removeLayer(marker);
          markersRef.current.delete(id);
        }
      });
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
        <p className="text-muted-foreground max-w-xs">The canvassing map is available to registered candidates and admins.</p>
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
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Canvassing Map</span>
          <Badge variant="outline" className="text-xs">{pins.length} contact{pins.length !== 1 ? "s" : ""}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="hidden sm:inline">Right-click or </span>Hold to drop a pin
        </span>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1 w-full" style={{ touchAction: "manipulation" }} />

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t bg-card text-xs shrink-0">
        {PIN_COLORS.map((c) => (
          <div key={c.id} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border" style={{ background: c.hex, borderColor: c.border }} />
            <span className="text-muted-foreground">{c.label}</span>
          </div>
        ))}
      </div>

      {/* ── Create Pin Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) { setSheetOpen(false); setPendingLatLng(null); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto pb-10">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              New Contact Pin
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            {/* Color / Lean picker */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Voter Lean</Label>
              <div className="grid grid-cols-3 gap-2">
                {PIN_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all ${
                      selectedColor === c.id
                        ? "border-primary bg-primary/5 shadow-sm scale-[1.03]"
                        : "border-border bg-card"
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full border-2 shadow"
                      style={{ background: c.hex, borderColor: c.border }}
                    />
                    <span className={`text-xs font-medium ${selectedColor === c.id ? "text-primary" : "text-muted-foreground"}`}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold block">Contact Info <span className="font-normal text-muted-foreground">(optional)</span></Label>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Full name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea
                placeholder="e.g. 'Interested in volunteering', 'Left a flyer'"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {pendingLatLng && (
              <p className="text-xs text-muted-foreground text-center">
                📍 {pendingLatLng.lat.toFixed(5)}, {pendingLatLng.lng.toFixed(5)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="outline" onClick={() => { setSheetOpen(false); setPendingLatLng(null); }}>
                Cancel
              </Button>
              <Button
                disabled={createPin.isPending || !pendingLatLng}
                onClick={() => {
                  if (!pendingLatLng) return;
                  createPin.mutate({
                    ...pendingLatLng,
                    color: selectedColor,
                    contactName: contactName || undefined,
                    contactEmail: contactEmail || undefined,
                    contactPhone: contactPhone || undefined,
                    note: note || undefined,
                  });
                }}
              >
                {createPin.isPending ? "Saving…" : "Drop Pin"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Pin Detail Sheet ── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto pb-10">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              {selectedPin && (
                <span
                  className="w-4 h-4 rounded-full border-2 shrink-0"
                  style={{
                    background: PIN_COLORS.find(c => c.id === selectedPin.color)?.hex,
                    borderColor: PIN_COLORS.find(c => c.id === selectedPin.color)?.border,
                  }}
                />
              )}
              Contact Details
            </SheetTitle>
          </SheetHeader>

          {selectedPin && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Voter Lean:</span>
                <Badge variant="outline">{PIN_COLORS.find(c => c.id === selectedPin.color)?.label}</Badge>
              </div>

              {/* Contact fields */}
              {(selectedPin.contactName || selectedPin.contactEmail || selectedPin.contactPhone) && (
                <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
                  {selectedPin.contactName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{selectedPin.contactName}</span>
                    </div>
                  )}
                  {selectedPin.contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${selectedPin.contactEmail}`} className="text-primary underline">
                        {selectedPin.contactEmail}
                      </a>
                    </div>
                  )}
                  {selectedPin.contactPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${selectedPin.contactPhone}`} className="text-primary underline">
                        {selectedPin.contactPhone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {selectedPin.note && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted rounded-lg px-3 py-2">{selectedPin.note}</p>
                </div>
              )}

              {/* Invite link */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> ACP Invite Link
                </p>
                {inviteUrl ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-2 flex-1 truncate font-mono">
                      {inviteUrl}
                    </p>
                    <Button size="sm" variant="outline" onClick={copyInvite} className="shrink-0 gap-1.5">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No invite link available.</p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                📍 {selectedPin.lat.toFixed(5)}, {selectedPin.lng.toFixed(5)}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  <X className="h-4 w-4 mr-1.5" /> Close
                </Button>
                {(user?.role === "admin" || selectedPin.createdBy === user?.id) && (
                  <Button
                    variant="destructive"
                    disabled={deletePin.isPending}
                    onClick={() => deletePin.mutate(selectedPin.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    {deletePin.isPending ? "Removing…" : "Remove"}
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
