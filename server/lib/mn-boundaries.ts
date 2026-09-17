import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  bbox,
  booleanPointInPolygon,
  flattenEach,
  lineEach,
  point,
  pointToLineDistance,
} from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  Point,
  Polygon,
  MultiPolygon,
} from "geojson";
import type {
  MnAddressMatch,
  MnBoundaryIndex,
  MnDistrict,
  MnDistrictType,
  MnPrecinctProperties,
} from "../../shared/civic-map";

const SNAPSHOT_FILE = "mn-precincts-2026-05.json";
const METADATA_FILE = "mn-precincts-2026-05.metadata.json";

// The source only publishes coordinates to 0.0001 degrees. A point closer than
// this conservative distance to a precinct edge cannot be certified to one
// side without pretending the snapshot is more precise than it is.
const BOUNDARY_UNCERTAINTY_METERS = 12;

interface OfficialPrecinctProperties {
  Precinct: string;
  PrecinctID: string;
  County: string;
  CountyID: string;
  CongDist: string;
  MNSenDist: string;
  MNLegDist: string;
  CtyComDist: string;
}

interface SnapshotMetadata {
  snapshotId: string;
  publisher: string;
  sourceUrl: string;
  sourceDate: string;
  retrievedAt: string;
  sha256: string;
  bytes: number;
  precinctCount: number;
  coordinateResolutionDegrees: number;
}

interface PolygonPiece {
  precinctIndex: number;
  polygon: Feature<Polygon | MultiPolygon>;
  bounds: [number, number, number, number];
}

interface LoadedBoundaries {
  index: MnBoundaryIndex;
  precincts: FeatureCollection<Geometry, MnPrecinctProperties>;
  polygonPieces: PolygonPiece[];
  districtsById: Map<string, MnDistrict>;
}

export class MnBoundaryDataError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MnBoundaryDataError";
  }
}

let boundariesPromise: Promise<LoadedBoundaries> | undefined;

function dataPath(file: string): string {
  // The production server is bundled into dist, while data remains a project
  // asset. process.cwd() is therefore intentionally used for both tsx and dist.
  return path.join(process.cwd(), "server", "data", file);
}

function normalizedNumber(value: string): string {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new MnBoundaryDataError(`Invalid numeric district value in Minnesota snapshot: ${value}`);
  }
  return String(parsed);
}

function canonicalProperties(source: OfficialPrecinctProperties): MnPrecinctProperties {
  const countyId = normalizedNumber(source.CountyID);
  const commissionerDistrict = normalizedNumber(source.CtyComDist);
  return {
    id: source.PrecinctID,
    name: source.Precinct,
    county: source.County,
    districts: {
      state_house: `state_house:${source.MNLegDist.toUpperCase()}`,
      state_senate: `state_senate:${normalizedNumber(source.MNSenDist)}`,
      congressional: `congressional:${normalizedNumber(source.CongDist)}`,
      county_commissioner: `county_commissioner:${countyId}:${commissionerDistrict}`,
    },
  };
}

function addDistrict(
  districts: Map<string, MnDistrict>,
  type: MnDistrictType,
  code: string,
  county: string | null = null,
  countyId?: string,
): void {
  const id = type === "county_commissioner"
    ? `${type}:${countyId}:${code}`
    : `${type}:${code}`;
  if (districts.has(id)) return;

  const label = type === "state_house"
    ? `Minnesota House District ${code}`
    : type === "state_senate"
      ? `Minnesota Senate District ${code}`
      : type === "congressional"
        ? `U.S. Congressional District ${code}`
        : `${county} County Commissioner District ${code}`;
  districts.set(id, { id, type, code, label, county });
}

function districtsForPrecinct(
  properties: MnPrecinctProperties,
  districtsById: Map<string, MnDistrict>,
): MnDistrict[] {
  return Object.values(properties.districts)
    .map((id) => id ? districtsById.get(id) : undefined)
    .filter((district): district is MnDistrict => district !== undefined);
}

async function loadBoundaries(): Promise<LoadedBoundaries> {
  let snapshotText: string;
  let metadataText: string;
  try {
    [snapshotText, metadataText] = await Promise.all([
      readFile(dataPath(SNAPSHOT_FILE), "utf8"),
      readFile(dataPath(METADATA_FILE), "utf8"),
    ]);
  } catch (error) {
    throw new MnBoundaryDataError(
      `Minnesota boundary snapshot is unavailable in server/data (${SNAPSHOT_FILE})`,
      { cause: error },
    );
  }

  let metadata: SnapshotMetadata;
  let official: FeatureCollection<Geometry, OfficialPrecinctProperties> & {
    publisher?: string;
    date?: string;
  };
  try {
    metadata = JSON.parse(metadataText) as SnapshotMetadata;
    official = JSON.parse(snapshotText) as typeof official;
  } catch (error) {
    throw new MnBoundaryDataError("Minnesota boundary snapshot contains invalid JSON", { cause: error });
  }

  const checksum = createHash("sha256").update(snapshotText).digest("hex");
  if (checksum !== metadata.sha256) {
    throw new MnBoundaryDataError(
      `Minnesota boundary snapshot checksum mismatch (expected ${metadata.sha256}, got ${checksum})`,
    );
  }
  if (!Array.isArray(official.features) || official.features.length !== metadata.precinctCount) {
    throw new MnBoundaryDataError("Minnesota boundary snapshot precinct count does not match provenance metadata");
  }

  const districtsById = new Map<string, MnDistrict>();
  const features: Array<Feature<Geometry, MnPrecinctProperties>> = official.features.map((feature) => {
    const source = feature.properties;
    if (!source || !feature.geometry) {
      throw new MnBoundaryDataError("Minnesota boundary snapshot contains a precinct without properties or geometry");
    }
    const properties = canonicalProperties(source);
    addDistrict(districtsById, "state_house", source.MNLegDist.toUpperCase());
    addDistrict(districtsById, "state_senate", normalizedNumber(source.MNSenDist));
    addDistrict(districtsById, "congressional", normalizedNumber(source.CongDist));
    addDistrict(
      districtsById,
      "county_commissioner",
      normalizedNumber(source.CtyComDist),
      source.County,
      normalizedNumber(source.CountyID),
    );
    return {
      type: "Feature",
      id: feature.id,
      bbox: feature.bbox,
      geometry: feature.geometry,
      properties,
    };
  });

  const polygonPieces: PolygonPiece[] = [];
  features.forEach((feature, precinctIndex) => {
    flattenEach(feature as Feature<Geometry, GeoJsonProperties>, (piece) => {
      if (piece.geometry?.type !== "Polygon" && piece.geometry?.type !== "MultiPolygon") return;
      const polygon = piece as Feature<Polygon | MultiPolygon>;
      polygonPieces.push({
        precinctIndex,
        polygon,
        bounds: bbox(polygon) as [number, number, number, number],
      });
    });
  });

  const districtOrder: Record<MnDistrictType, number> = {
    state_house: 0,
    state_senate: 1,
    congressional: 2,
    county_commissioner: 3,
  };
  const collator = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });
  const districts = Array.from(districtsById.values()).sort((a, b) =>
    districtOrder[a.type] - districtOrder[b.type]
    || collator.compare(a.county ?? "", b.county ?? "")
    || collator.compare(a.code, b.code),
  );

  // checksum, bytes, and coordinate resolution are deliberately included in
  // the JSON metadata in addition to the shared minimum contract.
  const publicMetadata = {
    publisher: metadata.publisher,
    sourceUrl: metadata.sourceUrl,
    sourceDate: metadata.sourceDate,
    retrievedAt: metadata.retrievedAt,
    snapshotId: metadata.snapshotId,
    precinctCount: metadata.precinctCount,
    sha256: metadata.sha256,
    bytes: metadata.bytes,
    coordinateResolutionDegrees: metadata.coordinateResolutionDegrees,
  };

  return {
    index: { metadata: publicMetadata, districts },
    precincts: { type: "FeatureCollection", features },
    polygonPieces,
    districtsById,
  };
}

async function loaded(): Promise<LoadedBoundaries> {
  boundariesPromise ??= loadBoundaries();
  return boundariesPromise;
}

export async function getMnBoundaryIndex(): Promise<MnBoundaryIndex> {
  return (await loaded()).index;
}

export async function getMnDistrict(id: string): Promise<MnDistrict | undefined> {
  return (await loaded()).districtsById.get(id);
}

export async function getMnPrecincts(): Promise<FeatureCollection<Geometry, MnPrecinctProperties>> {
  return (await loaded()).precincts;
}

function isNearBoundary(
  location: Feature<Point>,
  polygon: Feature<Polygon | MultiPolygon>,
): boolean {
  let minimum = Number.POSITIVE_INFINITY;
  lineEach(polygon, (line) => {
    minimum = Math.min(minimum, pointToLineDistance(location, line, { units: "meters" }));
  });
  return minimum <= BOUNDARY_UNCERTAINTY_METERS;
}

export async function matchMnPoint(lat: number, lng: number): Promise<MnAddressMatch> {
  const data = await loaded();
  const location = point([lng, lat]);
  const containing = new Set<number>();
  let nearBoundary = false;

  for (const piece of data.polygonPieces) {
    const [west, south, east, north] = piece.bounds;
    if (lng < west || lng > east || lat < south || lat > north) continue;
    if (!booleanPointInPolygon(location, piece.polygon, { ignoreBoundary: false })) continue;
    containing.add(piece.precinctIndex);
    if (isNearBoundary(location, piece.polygon)) nearBoundary = true;
  }

  if (containing.size === 0) {
    return { status: "unmatched", precinct: null, districts: [] };
  }

  const matches = Array.from(containing).map((index) => data.precincts.features[index].properties);
  if (matches.length !== 1 || nearBoundary) {
    const districtIds = matches.length === 1
      ? []
      : Object.values(matches[0].districts).filter((id) =>
          matches.every((match) => Object.values(match.districts).includes(id)),
        );
    return {
      status: "ambiguous",
      precinct: null,
      districts: districtIds
        .map((id) => id ? data.districtsById.get(id) : undefined)
        .filter((district): district is MnDistrict => district !== undefined),
    };
  }

  return {
    status: "matched",
    precinct: matches[0],
    districts: districtsForPrecinct(matches[0], data.districtsById),
  };
}