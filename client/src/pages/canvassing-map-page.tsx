import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { MapPin, Copy, Trash2, X, Link2, User, Mail, Phone, Users } from "lucide-react";
import { Redirect, Link } from "wouter";
import type { CanvassingPin } from "@shared/schema";
import { Navigation } from "@/components/navigation";
import "leaflet/dist/leaflet.css";

const PIN_COLORS = [
  { id: "red" as const, label: "Republican", hex: "#ef4444", border: "#b91c1c" },
  { id: "white" as const, label: "Independent", hex: "#f1f5f9", border: "#94a3b8" },
  { id: "blue" as const, label: "Democrat", hex: "#2563eb", border: "#1d4ed8" },
];

function markerSvg(hex: string, border: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
    <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 27 15 27S30 26.25 30 15C30 6.716 23.284 0 15 0z" fill="${hex}" stroke="${border}" stroke-width="2"/>
    <circle cx="15" cy="15" r="6" fill="${border}" opacity="0.9"/>
  </svg>`;
}

async function getCsrfToken(): Promise<string> {
  const r = await fetch("/api/csrf-token", { credentials: "include" });
  const d = await r.json();
  return d.csrfToken ?? "";
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
  const pendingCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Create-pin form state
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [color, setColor] = useState<"red" | "white" | "blue">("blue");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Detail view state
  const [selectedPin, setSelectedPin] = useState<CanvassingPin | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const canAccess = user?.role === "admin" || user?.role === "candidate" || user?.role === "state_admin";

  const { data: pins = [] } = useQuery<CanvassingPin[]>({
    queryKey: ["/api/canvassing/pins"],
    enabled: canAccess,
  });

  const openCreate = useCallback((lat: number, lng: number) => {
    pendingCoordsRef.current = { lat, lng };
    setPendingCoords({ lat, lng });
    setColor("blue"); setName(""); setEmail(""); setPhone(""); setNote("");
    setCreateOpen(true);
  }, []);

  const closeCreate = () => {
    setCreateOpen(false);
    setPendingCoords(null);
    pendingCoordsRef.current = null;
  };

  const handleDrop = async () => {
    const coords = pendingCoordsRef.current;
    if (!coords || saving) return;
    setSaving(true);
    try {
      const csrf = await getCsrfToken();
      const resp = await fetch("/api/canvassing/pins", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          color,
          contactName: name || undefined,
          contactEmail: email || undefined,
          contactPhone: phone || undefined,
          note: note || undefined,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message ?? `HTTP ${resp.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/canvassing/pins"] });
      closeCreate();
      toast({ title: "Pin dropped!", description: "Contact saved." });
    } catch (e: any) {
      toast({ title: "Error saving pin", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pin: CanvassingPin) => {
    try {
      const csrf = await getCsrfToken();
      const resp = await fetch(`/api/canvassing/pins/${pin.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRF-Token": csrf },
      });
      if (!resp.ok) throw new Error("Delete failed");
      queryClient.invalidateQueries({ queryKey: ["/api/canvassing/pins"] });
      setDetailOpen(false);
      setSelectedPin(null);
      toast({ title: "Pin removed" });
    } catch {
      toast({ title: "Error", description: "Could not remove pin.", variant: "destructive" });
    }
  };

  const createMarker = useCallback((L: any, pin: CanvassingPin) => {
    const colorDef = PIN_COLORS.find(c => c.id === pin.color) ?? PIN_COLORS[2];
    const icon = L.divIcon({
      className: "",
      html: markerSvg(colorDef.hex, colorDef.border),
      iconSize: [30, 42],
      iconAnchor: [15, 42],
    });
    const marker = L.marker([pin.lat, pin.lng], { icon });
    marker.on("click", () => { setSelectedPin(pin); setDetailOpen(true); });
    return marker;
  }, []);

  // Init map
  useEffect(() => {
    if (!canAccess || !mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, { zoomControl: true, tap: false })
        .setView([39.5, -98.35], 4);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 19,
      }).addTo(map);

      navigator.geolocation?.getCurrentPosition(
        (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
        () => {}
      );

      const container = mapContainerRef.current!;

      const cancelLP = () => {
        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
      };

      const onTouchStart = (e: TouchEvent) => {
        touchMovedRef.current = false;
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const latlng = map.containerPointToLatLng([touch.clientX - rect.left, touch.clientY - rect.top]);
        longPressLatLngRef.current = { lat: latlng.lat, lng: latlng.lng };
        longPressTimerRef.current = setTimeout(() => {
          if (!touchMovedRef.current && longPressLatLngRef.current) {
            openCreate(longPressLatLngRef.current.lat, longPressLatLngRef.current.lng);
          }
        }, 600);
      };

      container.addEventListener("touchstart", onTouchStart, { passive: true });
      container.addEventListener("touchmove", () => { touchMovedRef.current = true; cancelLP(); }, { passive: true });
      container.addEventListener("touchend", cancelLP);

      map.on("contextmenu", (e: any) => openCreate(e.latlng.lat, e.latlng.lng));

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [canAccess, openCreate]);

  // Sync pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((L) => {
      markersRef.current.forEach((marker, id) => {
        if (!pins.find(p => p.id === id)) { map.removeLayer(marker); markersRef.current.delete(id); }
      });
      pins.forEach(pin => {
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

  return (
    <>
    <Navigation />
    <div className="flex flex-col" style={{ height: "calc(100dvh - 64px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Canvassing Map</span>
          <Badge variant="outline" className="text-xs">{pins.length} contact{pins.length !== 1 ? "s" : ""}</Badge>
        </div>
        <Link href="/canvassing/contacts">
          <button type="button" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted font-medium">
            <Users className="h-4 w-4" /> Contacts
          </button>
        </Link>
      </div>

      {/* Map */}
      <div className="relative flex-1 w-full">
        <div ref={mapContainerRef} className="absolute inset-0" style={{ touchAction: "manipulation" }} />

        {/* ── CREATE PIN OVERLAY ── plain div, no Radix, no Portal ── */}
        {createOpen && (
          <div
            className="absolute inset-0 flex items-end justify-center"
            style={{ zIndex: 9999, background: "rgba(0,0,0,0.55)" }}
            onPointerDown={(e) => { if (e.target === e.currentTarget) closeCreate(); }}
          >
            <div
              className="w-full max-w-lg bg-background rounded-t-2xl shadow-2xl"
              style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column" }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0 border-b">
                <div className="flex items-center gap-2 font-semibold">
                  <MapPin className="h-4 w-4 text-primary" />
                  New Contact Pin
                </div>
                <button type="button" onPointerDown={closeCreate} className="p-1 rounded-full hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Color picker */}
                <div>
                  <p className="text-sm font-semibold mb-2">Voter Lean</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PIN_COLORS.map((c) => (
                      <div
                        key={c.id}
                        onPointerDown={() => setColor(c.id)}
                        className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 cursor-pointer select-none transition-all ${
                          color === c.id ? "border-primary bg-primary/5" : "border-border bg-card"
                        }`}
                      >
                        <span className="w-8 h-8 rounded-full border-2 shadow-sm" style={{ background: c.hex, borderColor: c.border }} />
                        <span className={`text-xs font-medium ${color === c.id ? "text-primary" : "text-muted-foreground"}`}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact fields */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Contact Info <span className="font-normal text-muted-foreground text-xs">(optional)</span></p>
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="Full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                      type="email"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="Email address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                      type="tel"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="Phone number"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p className="text-sm font-semibold mb-1">Notes <span className="font-normal text-muted-foreground text-xs">(optional)</span></p>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background outline-none resize-none placeholder:text-muted-foreground"
                    placeholder="e.g. 'Interested in volunteering'"
                    rows={2}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>

                {pendingCoords && (
                  <p className="text-xs text-center text-muted-foreground">
                    📍 {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
                  </p>
                )}
              </div>

              {/* Action buttons — OUTSIDE scroll zone */}
              <div className="grid grid-cols-2 gap-3 px-5 py-4 border-t shrink-0">
                <button
                  type="button"
                  onPointerDown={closeCreate}
                  className="h-11 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted active:bg-muted/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onPointerDown={handleDrop}
                  className="h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 active:bg-primary/80"
                >
                  {saving ? "Saving…" : "Drop Pin"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DETAIL OVERLAY ── */}
        {detailOpen && selectedPin && (
          <div
            className="absolute inset-0 flex items-end justify-center"
            style={{ zIndex: 9999, background: "rgba(0,0,0,0.55)" }}
            onPointerDown={(e) => { if (e.target === e.currentTarget) { setDetailOpen(false); setSelectedPin(null); } }}
          >
            <div
              className="w-full max-w-lg bg-background rounded-t-2xl shadow-2xl"
              style={{ maxHeight: "80dvh", display: "flex", flexDirection: "column" }}
              onPointerDown={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0 border-b">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="w-4 h-4 rounded-full border-2 shrink-0"
                    style={{ background: PIN_COLORS.find(c => c.id === selectedPin.color)?.hex, borderColor: PIN_COLORS.find(c => c.id === selectedPin.color)?.border }} />
                  Contact Details
                </div>
                <button type="button" onPointerDown={() => { setDetailOpen(false); setSelectedPin(null); }} className="p-1 rounded-full hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Lean:</span>
                  <Badge variant="outline">{PIN_COLORS.find(c => c.id === selectedPin.color)?.label}</Badge>
                </div>

                {(selectedPin.contactName || selectedPin.contactEmail || selectedPin.contactPhone) && (
                  <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
                    {selectedPin.contactName && (
                      <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground" />{selectedPin.contactName}</div>
                    )}
                    {selectedPin.contactEmail && (
                      <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${selectedPin.contactEmail}`} className="text-primary underline">{selectedPin.contactEmail}</a>
                      </div>
                    )}
                    {selectedPin.contactPhone && (
                      <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${selectedPin.contactPhone}`} className="text-primary underline">{selectedPin.contactPhone}</a>
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

                {inviteUrl && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> Invite Link
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-2 flex-1 truncate font-mono">{inviteUrl}</p>
                      <button
                        type="button"
                        onPointerDown={() => navigator.clipboard.writeText(inviteUrl).then(() => toast({ title: "Copied!" }))}
                        className="shrink-0 flex items-center gap-1 text-xs border rounded-md px-2 py-1.5 bg-background hover:bg-muted"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">📍 {selectedPin.lat.toFixed(5)}, {selectedPin.lng.toFixed(5)}</p>
              </div>

              {(user?.role === "admin" || selectedPin.createdBy === user?.id) && (
                <div className="px-5 py-4 border-t shrink-0">
                  <button
                    type="button"
                    onPointerDown={() => handleDelete(selectedPin)}
                    className="w-full h-11 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" /> Remove Pin
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t bg-card text-xs shrink-0">
        {PIN_COLORS.map((c) => (
          <div key={c.id} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border" style={{ background: c.hex, borderColor: c.border }} />
            <span className="text-muted-foreground">{c.label}</span>
          </div>
        ))}
        <span className="ml-auto text-muted-foreground hidden sm:inline">Hold map to drop pin</span>
      </div>
    </div>
    </>
  );
}
