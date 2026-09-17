import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Crosshair, ListChecks, Loader2, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { MnBallotCampaigns } from "./mn-ballot-campaigns";
import { partyColors, partyLabels, useMinnesotaMap, type MnPrecinctCollection } from "./use-minnesota-map";
import type {
  MnAddressMatch,
  MnBallotOffice,
  MnBallotResponse,
  MnBoundaryIndex,
  MnDistrictType,
  MnElectionCycle,
  MnHolding,
} from "@shared/civic-map";
import "./minnesota-elections.css";

const layerNames: Record<MnDistrictType, string> = {
  state_house: "Minnesota House",
  state_senate: "Minnesota Senate",
  congressional: "U.S. Congress",
  county_commissioner: "County commissioner",
};

const legend: { category: keyof typeof partyColors; label: string }[] = [
  { category: "republican", label: "Republican-held" },
  { category: "democrat", label: "Democrat / DFL-held" },
  { category: "other", label: "Other party" },
  { category: "unknown", label: "Not confirmed" },
];

function isStatewide(officeId: string | null): boolean {
  return !!officeId && officeId.startsWith("statewide:");
}

async function getJson<T>(url: string): Promise<T> {
  return (await apiRequest(url, "GET")).json();
}

export function MinnesotaCivicMap({ latitude, longitude, address }: {
  latitude: number | null;
  longitude: number | null;
  address: string;
}) {
  const [layerType, setLayerType] = useState<MnDistrictType>("state_house");
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const hasLocation = latitude !== null && longitude !== null;

  const indexQuery = useQuery<MnBoundaryIndex>({
    queryKey: ["/api/elections/mn/index"],
    queryFn: () => getJson("/api/elections/mn/index"),
    staleTime: Infinity,
  });
  const precinctQuery = useQuery<MnPrecinctCollection>({
    queryKey: ["/api/elections/mn/precincts"],
    queryFn: () => getJson("/api/elections/mn/precincts"),
    staleTime: Infinity,
  });
  const matchQuery = useQuery<MnAddressMatch>({
    queryKey: ["/api/elections/mn/match", latitude, longitude],
    queryFn: () => getJson(`/api/elections/mn/match?lat=${latitude}&lng=${longitude}`),
    enabled: hasLocation,
    staleTime: Infinity,
  });
  const holdingsQuery = useQuery<{ holdings: Record<string, MnHolding> }>({
    queryKey: ["/api/elections/mn/holdings"],
    queryFn: () => getJson("/api/elections/mn/holdings"),
    staleTime: 5 * 60_000,
  });
  const cyclesQuery = useQuery<{ cycles: MnElectionCycle[] }>({
    queryKey: ["/api/elections/mn/cycles"],
    queryFn: () => getJson("/api/elections/mn/cycles"),
    staleTime: 5 * 60_000,
  });

  const cycles = cyclesQuery.data?.cycles ?? [];
  const activeYear = year ?? cycles[0]?.year ?? 2026;
  const districts = indexQuery.data?.districts ?? [];
  const holdings = holdingsQuery.data?.holdings ?? {};
  const home = matchQuery.data?.status === "matched" ? matchQuery.data : null;
  const homeDistricts = useMemo(() => home?.districts ?? [], [home]);
  const homeIds = useMemo(() => homeDistricts.map(district => district.id), [homeDistricts]);
  const selectedDistrictId = isStatewide(selectedOfficeId) ? null : selectedOfficeId;
  const awayDistrictId = selectedDistrictId && !homeIds.includes(selectedDistrictId) ? selectedDistrictId : null;

  const ballotQuery = useQuery<MnBallotResponse>({
    queryKey: ["/api/elections/mn/ballot", activeYear, homeIds.join(",")],
    queryFn: () => getJson(`/api/elections/mn/ballot?year=${activeYear}${homeIds.length ? `&districtIds=${encodeURIComponent(homeIds.join(","))}` : ""}`),
    enabled: !hasLocation || matchQuery.isSuccess || matchQuery.isError,
  });
  const awayQuery = useQuery<MnBallotResponse>({
    queryKey: ["/api/elections/mn/ballot", activeYear, awayDistrictId],
    queryFn: () => getJson(`/api/elections/mn/ballot?year=${activeYear}&districtIds=${encodeURIComponent(awayDistrictId!)}`),
    enabled: !!awayDistrictId,
  });

  const ballotData = awayDistrictId ? awayQuery.data : ballotQuery.data;
  const ballotLoading = awayDistrictId ? awayQuery.isPending : ballotQuery.isPending;
  const ballotError = awayDistrictId ? awayQuery.isError : ballotQuery.isError;
  const districtOffices = (ballotQuery.data?.offices ?? []).filter(office => office.district);
  const statewideOffices = (ballotQuery.data?.offices ?? []).filter(office => !office.district);

  const homeDistrictId = homeDistricts.find(district => district.type === layerType)?.id ?? null;
  const { container, mapReady, mapError, hoveredId, returnHome } = useMinnesotaMap({
    latitude,
    longitude,
    precincts: precinctQuery.data,
    districts,
    holdings,
    layerType,
    selectedDistrictId,
    homeDistrictId,
    onSelect: (id: string) => {
      setSelectedOfficeId(id);
      const district = districts.find(item => item.id === id);
      if (district) setLayerType(district.type);
    },
  });

  useEffect(() => {
    setSelectedOfficeId(null);
    setLayerType("state_house");
  }, [latitude, longitude]);

  const hoveredDistrict = districts.find(district => district.id === hoveredId) ?? null;
  const boundaryError = indexQuery.isError || precinctQuery.isError || mapError;
  const loadingMap = indexQuery.isPending || precinctQuery.isPending || !mapReady;
  const selectedLabel = selectedOfficeId
    ? (ballotData?.offices.find(office => office.id === selectedOfficeId)?.district?.label
      ?? ballotData?.offices.find(office => office.id === selectedOfficeId)?.label
      ?? districts.find(district => district.id === selectedOfficeId)?.label
      ?? "Selected district")
    : homeDistricts.length ? "Your Ballot" : "Minnesota offices";

  function selectOffice(office: MnBallotOffice) {
    setSelectedOfficeId(office.id);
    if (office.district) setLayerType(office.district.type);
  }

  function officeButton(office: MnBallotOffice) {
    const holding = office.district ? holdings[office.district.id] : undefined;
    return (
      <button
        key={office.id}
        type="button"
        className="mn-office-option"
        aria-pressed={selectedOfficeId === office.id}
        onClick={() => selectOffice(office)}
        data-testid={`mn-office-${office.id}`}
      >
        <span
          aria-hidden="true"
          className="h-3 w-3 shrink-0 rounded-full border border-black/20"
          style={{ background: office.district ? partyColors[holding?.category ?? "unknown"] : "transparent" }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{office.district?.label ?? office.label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {office.district ? layerNames[office.district.type] : "Statewide office"}
            {office.district && holding ? ` · ${partyLabels[holding.category]}` : ""}
          </span>
        </span>
      </button>
    );
  }

  return (
    <>
      <div className="mn-map-panel" data-testid="mn-civic-map">
        <div className="mn-map-grid">
          <div className="mn-map-viewport">
            <div ref={container} className="mn-map-canvas bg-muted"
              aria-label="Minnesota district map. Use the district list in the side panel for keyboard access." />
            {loadingMap && !boundaryError && (
              <div role="status" className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded bg-background px-3 py-2 text-sm shadow">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading official precincts…
              </div>
            )}
            <div className="mn-map-legend pointer-events-none absolute bottom-6 left-3 z-10 max-w-[80%] rounded px-3 py-2 text-xs shadow">
              <span className="font-semibold">{selectedLabel}</span>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {legend.map(item => (
                  <li key={item.category} className="flex items-center gap-1">
                    <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: partyColors[item.category] }} />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="mn-map-sidebar space-y-4" data-testid="mn-map-sidebar">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <MapPin className="h-5 w-5 text-primary" /> Districts &amp; offices
            </h2>

            <label className="block text-sm font-medium" htmlFor="mn-cycle">
              Election cycle
              <select
                id="mn-cycle"
                className="mn-map-control mt-1 h-10"
                value={activeYear}
                onChange={event => { setYear(Number(event.target.value)); setSelectedOfficeId(null); }}
                disabled={!cyclesQuery.data}
                data-testid="mn-cycle-select"
              >
                {(cycles.length ? cycles : [{ year: activeYear, label: `${activeYear} Minnesota Elections` }]).map(cycle => (
                  <option key={cycle.year} value={cycle.year}>{cycle.label}</option>
                ))}
              </select>
            </label>

            <div className="rounded-md bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Your lookup address</p>
              <p className="mt-1 break-words text-sm font-medium">{address || "Explore Minnesota"}</p>
              <Button className="mt-2 h-8" variant="outline" size="sm" onClick={returnHome} disabled={!hasLocation}>
                <Crosshair className="mr-1 h-3 w-3" /> My address
              </Button>
              {matchQuery.isFetching && <p className="mt-2 text-xs" role="status">Finding your precinct…</p>}
              {home?.precinct && <p className="mt-2 text-xs text-muted-foreground">{home.precinct.name} · {home.precinct.county}</p>}
              {(matchQuery.isError || (matchQuery.data && !home)) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Precinct assignment is {matchQuery.data?.status === "ambiguous" ? "ambiguous near a boundary" : "not confirmed"}. Explore the map and verify with the official finder below.
                </p>
              )}
              {!hasLocation && <p className="mt-2 text-xs text-muted-foreground">No precise location available. Pick a district on the map to explore it.</p>}
            </div>

            {boundaryError ? (
              <div role="alert" className="space-y-2 text-sm">
                <p className="flex gap-2"><AlertCircle className="h-4 w-4 shrink-0 text-destructive" /> Could not load the official boundaries.</p>
                <Button variant="outline" size="sm" onClick={() => { indexQuery.refetch(); precinctQuery.refetch(); }}>Retry boundaries</Button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="mn-office-option"
                  aria-pressed={selectedOfficeId === null}
                  onClick={() => setSelectedOfficeId(null)}
                  data-testid="mn-office-your-ballot"
                >
                  <ListChecks aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{homeDistricts.length ? "Your Ballot" : "All Minnesota offices"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {homeDistricts.length
                        ? "Every district and office you vote in"
                        : "Address not matched — statewide offices only"}
                    </span>
                  </span>
                </button>

                <label className="block text-sm font-medium" htmlFor="mn-district-layer">
                  Map layer
                  <select
                    id="mn-district-layer"
                    className="mn-map-control mt-1 h-10"
                    value={layerType}
                    onChange={event => setLayerType(event.target.value as MnDistrictType)}
                    data-testid="mn-layer-select"
                  >
                    {Object.entries(layerNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                  </select>
                </label>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Your districts</h3>
                  {ballotQuery.isPending ? (
                    <p className="text-xs text-muted-foreground" role="status">Loading your districts…</p>
                  ) : districtOffices.length ? (
                    districtOffices.map(officeButton)
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No districts matched your address yet. Click an area on the map to explore its campaigns.
                    </p>
                  )}
                </div>

                {statewideOffices.length > 0 && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Statewide offices</h3>
                    {statewideOffices.map(officeButton)}
                  </div>
                )}

                {awayDistrictId && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Selected on the map</h3>
                    {officeButton({
                      id: awayDistrictId,
                      label: districts.find(district => district.id === awayDistrictId)?.label ?? "Selected district",
                      district: districts.find(district => district.id === awayDistrictId) ?? null,
                      electionStatus: "unconfirmed",
                      campaigns: [],
                      incumbents: [],
                    })}
                  </div>
                )}
              </>
            )}

            {hoveredDistrict && (
              <div className="rounded border p-2 text-xs" aria-live="off">
                <p className="font-medium">{hoveredDistrict.label}</p>
                <p className="text-muted-foreground">{partyLabels[holdings[hoveredDistrict.id]?.category ?? "unknown"]}</p>
                <p className="mt-1 text-muted-foreground">Click to see only this district's campaigns.</p>
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
              <p className="mt-2">Boundaries and party colors identify districts and current officeholders, not a certified ballot.</p>
              <a className="mt-1 inline-block text-primary hover:underline" href="https://pollfinder.sos.mn.gov/" target="_blank" rel="noreferrer">Verify with Minnesota Polling Place Finder</a>
            </div>
          </aside>
        </div>
      </div>

      <MnBallotCampaigns
        data={ballotData}
        selectedOfficeId={selectedOfficeId}
        personalized={homeDistricts.length > 0}
        isLoading={ballotLoading}
        error={ballotError}
        onRetry={() => { ballotQuery.refetch(); if (awayDistrictId) awayQuery.refetch(); }}
        onShowBallot={() => setSelectedOfficeId(null)}
      />
    </>
  );
}
