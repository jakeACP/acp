import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import type { MnDistrict, MnDistrictType, MnHolding, MnPrecinctProperties } from "@shared/civic-map";
import "leaflet/dist/leaflet.css";

export const partyColors = { republican: "#dc2626", democrat: "#2563eb", other: "#6b7280", unknown: "#6b7280" };
export const partyLabels = { republican: "Republican-held", democrat: "Democrat / DFL-held", other: "Other party-held", unknown: "Current holder not confirmed" };
export type MnPrecinctCollection = FeatureCollection<Geometry, MnPrecinctProperties>;

type PolygonLayer = Leaflet.Polygon & { feature: { properties: MnPrecinctProperties } };

export function useMinnesotaMap({
  latitude, longitude, precincts, districts, holdings, layerType, selectedDistrictId, homeDistrictId, onSelect,
}: {
  latitude: number | null;
  longitude: number | null;
  precincts: MnPrecinctCollection | undefined;
  districts: MnDistrict[];
  holdings: Record<string, MnHolding>;
  layerType: MnDistrictType;
  selectedDistrictId: string | null;
  homeDistrictId: string | null;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const polygonsRef = useRef<Leaflet.GeoJSON | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const eventState = useRef({ layerType, onSelect, districts, holdings, precincts });
  eventState.current = { layerType, onSelect, districts, holdings, precincts };

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
    // A neutral address marker must not suggest an incumbent's party. It is a
    // DOM marker on purpose: a canvas marker in another pane would cover the
    // precinct canvas with a second full-size canvas and swallow its events.
    const marker = L.marker([latitude, longitude], {
      icon: L.divIcon({ className: "mn-address-marker", iconSize: [16, 16] }),
      keyboard: false,
      alt: "Your address",
    }).addTo(map).bindTooltip("Your address", { className: "mn-map-tooltip" });
    map.setView([latitude, longitude], 11);
    return () => { marker.remove(); };
  }, [mapReady, latitude, longitude]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map || !precincts) return;
    const polygons = L.geoJSON(precincts, {
      onEachFeature: (feature, shape) => {
        const properties = feature.properties as MnPrecinctProperties;
        shape.bindTooltip(() => {
          const { layerType: type, districts: all, holdings: current } = eventState.current;
          const id = properties.districts[type];
          const district = all.find(d => d.id === id);
          const holding = id ? current[id] : undefined;
          const tooltip = document.createElement("span");
          tooltip.textContent = `${district?.label ?? properties.name} · ${partyLabels[holding?.category ?? "unknown"]}`;
          return tooltip;
        }, { sticky: true, className: "mn-map-tooltip" });
        shape.on("mouseover", () => setHoveredId(properties.districts[eventState.current.layerType] ?? null));
        shape.on("mouseout", () => setHoveredId(null));
        shape.on("click", () => {
          const id = properties.districts[eventState.current.layerType];
          if (id) eventState.current.onSelect(id);
        });
      },
    }).addTo(map);
    polygonsRef.current = polygons;
    // No map-level click fallback: the canvas renderer re-dispatches a hit
    // through the map as well, so a second handler would select twice.
    return () => {
      polygons.remove();
      polygonsRef.current = null;
    };
  }, [mapReady, precincts]);

  useEffect(() => { setHoveredId(null); }, [layerType]);

  // Hover changes styling only, never zoom, so moving the mouse cannot move the map.
  useEffect(() => {
    polygonsRef.current?.eachLayer(shape => {
      const polygon = shape as PolygonLayer;
      const districtId = polygon.feature.properties.districts[layerType];
      const selected = districtId === (selectedDistrictId ?? homeDistrictId);
      const hovered = !!hoveredId && districtId === hoveredId;
      const color = partyColors[holdings[districtId ?? ""]?.category ?? "unknown"];
      polygon.setStyle({
        color: hovered ? "#f59e0b" : selected ? "#0f172a" : color,
        weight: hovered ? 3 : selected ? 1.8 : 0.7,
        fillColor: color,
        fillOpacity: hovered ? 0.5 : selected ? 0.32 : 0.15,
      });
    });
  }, [mapReady, precincts, holdings, layerType, selectedDistrictId, homeDistrictId, hoveredId]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const id = selectedDistrictId ?? homeDistrictId;
    if (!mapReady || !L || !map || !id) return;
    const bounds = L.latLngBounds([]);
    polygonsRef.current?.eachLayer(shape => {
      const polygon = shape as PolygonLayer;
      if (polygon.feature.properties.districts[layerType] === id) bounds.extend(polygon.getBounds());
    });
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13, animate: false });
  }, [mapReady, precincts, selectedDistrictId, homeDistrictId, layerType]);

  function returnHome() {
    if (latitude !== null && longitude !== null) mapRef.current?.setView([latitude, longitude], 11);
  }
  return { container, mapReady, mapError, hoveredId, returnHome };
}