import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type * as Leaflet from "leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import { AlertCircle, Crosshair, Loader2, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MnDistrictCampaigns } from "./mn-district-campaigns";
import type { MnAddressMatch, MnBoundaryIndex, MnDistrictType, MnPrecinctProperties } from "@shared/civic-map";
import "leaflet/dist/leaflet.css";

const layerNames: Record<MnDistrictType, string> = {
  state_house: "Minnesota House",
  state_senate: "Minnesota Senate",
  congressional: "U.S. Congress",
  county_commissioner: "County commissioner",
};

type PrecinctCollection = FeatureCollection<Geometry, MnPrecinctProperties>;

export function MinnesotaCivicMap({ latitude, longitude, address }: {
  latitude: number | null;
  longitude: number | null;
  address: string;
}) {
  const [layerType, setLayerType] = useState<MnDistrictType>("state_house");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState<MnPrecinctProperties | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const year = new Date().getFullYear();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const polygonsRef = useRef<Leaflet.GeoJSON | null>(null);
  const layerTypeRef = useRef(layerType);
  layerTypeRef.current = layerType;
  const hasLocation = latitude !== null && longitude !== null;
  const indexQuery = useQuery<MnBoundaryIndex>({
    queryKey: ["/api/elections/mn/index"],
    queryFn: async () => (await apiRequest("/api/elections/mn/index", "GET")).json(),
    staleTime: Infinity,
  });
  const precinctQuery = useQuery<PrecinctCollection>({
    queryKey: ["/api/elections/mn/precincts"],
    queryFn: async () => (await apiRequest("/api/elections/mn/precincts", "GET")).json(),
    staleTime: Infinity,
  });
  const matchQuery = useQuery<MnAddressMatch>({
    queryKey: ["/api/elections/mn/match", latitude, longitude],
    queryFn: async () => (await apiRequest(`/api/elections/mn/match?lat=${latitude}&lng=${longitude}`, "GET")).json(),
    enabled: hasLocation,
    staleTime: Infinity,
  });
  const districts = indexQuery.data?.districts ?? [];
  const selected = districts.find(district => district.id === selectedId) ?? null;
  const home = matchQuery.data?.status === "matched" ? matchQuery.data : null;
  const term = search.toLowerCase().replace(/[\s-]/g, "");
  const options = districts.filter(district => district.type === layerType && (
    district.id === selectedId ||
    [district.label, district.code, district.type === "state_senate" ? `SD${district.code}` : ""]
      .some(value => value.toLowerCase().replace(/[\s-]/g, "").includes(term))
  ));

  useEffect(() => {
    setSelectedId(null);
    setLayerType("state_house");
    setSearch("");
  }, [latitude, longitude]);

  useEffect(() => {
    if (matchQuery.data?.status === "matched") {
      setSelectedId(matchQuery.data.districts.find(d => d.type === "state_house")?.id ?? null);
    }
  }, [matchQuery.data]);

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    import("leaflet").then(({ default: L }) => {
      if (disposed || !container.current) return;
      leafletRef.current = L;
      const map = L.map(container.current, { preferCanvas: true, scrollWheelZoom: false })
        .setView([46.1, -94.4], 6);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
      observer.observe(container.current);
      setMapReady(true);
    }).catch(() => { if (!disposed) setMapError(true); });
    return () => {
      disposed = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map || latitude === null || longitude === null) return;
    const marker = L.circleMarker([latitude, longitude], {
      radius: 7, color: "#ffffff", weight: 3, fillColor: "#e11d48", fillOpacity: 1,
    }).addTo(map).bindTooltip("Your address");
    map.setView([latitude, longitude], 12);
    return () => { marker.remove(); };
  }, [mapReady, latitude, longitude]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map || !precinctQuery.data) return;
    const polygons = L.geoJSON(precinctQuery.data, {
      style: { color: "#475569", weight: 0.7, fillColor: "#60a5fa", fillOpacity: 0.08 },
      onEachFeature: (feature, shape) => {
        const properties = feature.properties as MnPrecinctProperties;
        const tooltip = document.createElement("span");
        tooltip.textContent = `${properties.name} · ${properties.county}`;
        shape.bindTooltip(tooltip, { sticky: true });
        shape.on("mouseover", () => setHovered(properties));
        shape.on("mouseout", () => setHovered(null));
        shape.on("click", () => {
          const id = properties.districts[layerTypeRef.current];
          if (id) { setSelectedId(id); setSearch(""); }
        });
      },
    }).addTo(map);
    polygonsRef.current = polygons;
    return () => { polygons.remove(); polygonsRef.current = null; };
  }, [mapReady, precinctQuery.data]);

  useEffect(() => {
    const polygons = polygonsRef.current;
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !polygons || !L || !map) return;
    const bounds = L.latLngBounds([]);
    polygons.eachLayer(shape => {
      const polygon = shape as Leaflet.Polygon & { feature: { properties: MnPrecinctProperties } };
      const properties = polygon.feature.properties;
      const isSelected = properties.districts[layerType] === selectedId;
      const isHome = home?.precinct?.id === properties.id;
      polygon.setStyle({
        color: isHome ? "#be123c" : isSelected ? "#1d4ed8" : "#475569",
        weight: isHome ? 3 : isSelected ? 1.5 : 0.6,
        fillColor: isHome ? "#fb7185" : "#3b82f6",
        fillOpacity: isSelected ? 0.24 : isHome ? 0.22 : 0.05,
      });
      if (isSelected) bounds.extend(polygon.getBounds());
    });
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [22, 22], maxZoom: 13, animate: false });
  }, [mapReady, precinctQuery.data, selectedId, layerType, home]);

  function changeLayer(type: MnDistrictType) {
    setLayerType(type);
    setSearch("");
    setSelectedId(home?.districts.find(d => d.type === type)?.id ?? null);
  }

  function returnHome() {
    setSelectedId(home?.districts.find(d => d.type === layerType)?.id ?? null);
    setSearch("");
    if (latitude !== null && longitude !== null) mapRef.current?.setView([latitude, longitude], 13);
  }

  const boundaryError = indexQuery.isError || precinctQuery.isError || mapError;
  const loading = indexQuery.isPending || precinctQuery.isPending || !mapReady;

  return (
    <>
      <div className="relative mb-6 w-[95vw] max-w-none overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm"
        style={{ marginLeft: "calc(50% - 47.5vw)", transform: "none" }} data-testid="mn-civic-map">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative min-w-0">
            <div ref={container} className="relative z-0 h-[60svh] min-h-[340px] max-h-[720px] w-full bg-muted lg:h-[calc(100svh-280px)]"
              aria-label="Minnesota precinct map. Use the district selectors for keyboard access." />
            {loading && !boundaryError && (
              <div role="status" className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded bg-background px-3 py-2 text-sm shadow">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading official precincts…
              </div>
            )}
            <div className="pointer-events-none absolute bottom-7 left-3 z-10 max-w-[80%] rounded bg-background/95 px-3 py-2 text-xs shadow">
              <span className="font-semibold">{selected?.label ?? "Choose a district"}</span>
              <p className="text-muted-foreground">Blue: selected district · Red: address precinct</p>
            </div>
          </div>
          <aside className="space-y-4 border-t p-4 lg:max-h-[max(340px,calc(100svh-280px))] lg:overflow-y-auto lg:border-l lg:border-t-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><MapPin className="h-5 w-5 text-primary" /> Minnesota districts</h2>
            <div className="rounded-md bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Your lookup address</p>
              <p className="mt-1 break-words text-sm font-medium">{address || "Explore Minnesota"}</p>
              <Button className="mt-2 h-8" variant="outline" size="sm" onClick={returnHome} disabled={!hasLocation}>
                <Crosshair className="mr-1 h-3 w-3" /> My address
              </Button>
              {matchQuery.isFetching && <p className="mt-2 text-xs" role="status">Finding your precinct…</p>}
              {home?.precinct && <p className="mt-2 text-xs text-muted-foreground">{home.precinct.name} · {home.precinct.county}</p>}
              {(matchQuery.isError || (matchQuery.data && !home)) && (
                <p className="mt-2 text-xs text-muted-foreground">Precinct assignment is {matchQuery.data?.status === "ambiguous" ? "ambiguous near a boundary" : "not confirmed"}. Explore manually and verify with the official finder below.</p>
              )}
              {!hasLocation && <p className="mt-2 text-xs text-muted-foreground">No precise location available. Select a district to explore.</p>}
            </div>
            {boundaryError ? (
              <div role="alert" className="space-y-2 text-sm">
                <p className="flex gap-2"><AlertCircle className="h-4 w-4 shrink-0 text-destructive" /> Could not load the official boundaries.</p>
                <Button variant="outline" size="sm" onClick={() => { indexQuery.refetch(); precinctQuery.refetch(); }}>Retry boundaries</Button>
              </div>
            ) : (
              <>
                <label className="block text-sm font-medium" htmlFor="mn-district-layer">District type
                  <select id="mn-district-layer" className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-foreground"
                    value={layerType} onChange={e => changeLayer(e.target.value as MnDistrictType)}>
                    {Object.entries(layerNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                  </select>
                </label>
                <div>
                  <label htmlFor="mn-district-search" className="text-sm font-medium">Find a district</label>
                  <Input id="mn-district-search" className="mt-1" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={layerType === "state_senate" ? "Search SD30" : layerType === "state_house" ? "Search 30A" : "District or county"} />
                </div>
                <label htmlFor="mn-district-select" className="block text-sm font-medium">Selected district
                  <select id="mn-district-select" className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-foreground"
                    value={selectedId ?? ""} onChange={e => setSelectedId(e.target.value || null)} disabled={!indexQuery.data}>
                    <option value="">Choose a district</option>
                    {options.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </label>
                {options.length === 0 && indexQuery.data && <p className="text-xs text-muted-foreground">No districts match your search.</p>}
              </>
            )}
            {hovered && (
              <div className="rounded border p-2 text-xs" aria-live="off">
                <p className="font-medium">{hovered.name}</p>
                {Object.values(hovered.districts).map(id => <p key={id}>{districts.find(d => d.id === id)?.label}</p>)}
                <p className="mt-1 text-muted-foreground">Click to select its {layerNames[layerType]} district.</p>
              </div>
            )}
            <div className="border-t pt-3 text-xs text-muted-foreground">
              {indexQuery.data && (
                <>
                  <p>{indexQuery.data.metadata.publisher} · {indexQuery.data.metadata.precinctCount.toLocaleString()} precincts</p>
                  <p>Boundary snapshot: {indexQuery.data.metadata.sourceDate}</p>
                  <a className="mt-1 inline-block text-primary hover:underline" href={indexQuery.data.metadata.sourceUrl} target="_blank" rel="noreferrer">Official GeoJSON source</a>
                </>
              )}
              <p className="mt-2">Boundaries identify districts, not a certified ballot or candidate list.</p>
              <a className="mt-1 inline-block text-primary hover:underline" href="https://pollfinder.sos.mn.gov/" target="_blank" rel="noreferrer">Verify with Minnesota Polling Place Finder</a>
              <p className="mt-2">Click a precinct to select. Use +/− to zoom or drag to pan.</p>
            </div>
          </aside>
        </div>
      </div>
      <MnDistrictCampaigns district={selected} year={year} />
    </>
  );
}