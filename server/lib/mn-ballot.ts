import { and, eq } from "drizzle-orm";
import type {
  MnBallotOffice,
  MnBallotResponse,
  MnCampaign,
  MnDistrict,
  MnElectionCycle,
  MnHolding,
  MnIncumbent,
  MnPartyCategory,
} from "@shared/civic-map";
import {
  electionRaces,
  politicalPositions,
  politicianProfiles,
  raceCandidates,
} from "@shared/schema";
import { db } from "../db";
import { getMnBoundaryIndex } from "./mn-boundaries";
import {
  defaultMnCampaignDataSource,
  getMnCampaigns,
  matchesMnDistrict,
  sanitizeSourceUrl,
  type CampaignProfileRow,
  type CampaignRaceRow,
  type MnCampaignDataSource,
} from "./mn-campaigns";

export const MN_SAMPLE_BALLOT_URL =
  "https://www.sos.mn.gov/elections-voting/whats-on-my-ballot";

const CACHE_MS = 30_000;
const STATEWIDE = [
  { id: "statewide:us_senate", label: "U.S. Senator", test: /\bu\.?\s*s\.?\s+senat(?:e|or)\b/i },
  { id: "statewide:governor", label: "Governor & Lieutenant Governor", test: /\bgovernor\b/i },
  { id: "statewide:secretary_of_state", label: "Secretary of State", test: /\bsecretary of state\b/i },
  { id: "statewide:state_auditor", label: "State Auditor", test: /\bstate auditor\b/i },
  { id: "statewide:attorney_general", label: "Attorney General", test: /\battorney general\b/i },
] as const;

export interface MnHolderRow {
  id: string;
  fullName: string;
  party: string | null;
  photoUrl: string | null;
  isCurrent: boolean | null;
  positionActive: boolean | null;
  title: string;
  level: string;
  jurisdiction: string;
  district: string | null;
}

export interface MnBallotDataSource extends MnCampaignDataSource {
  getHolderRows(): Promise<MnHolderRow[]>;
  getStoredElectionYears(): Promise<number[]>;
}

export const defaultMnBallotDataSource: MnBallotDataSource = {
  ...defaultMnCampaignDataSource,
  async getHolderRows() {
    return db
      .select({
        id: politicianProfiles.id,
        fullName: politicianProfiles.fullName,
        party: politicianProfiles.party,
        photoUrl: politicianProfiles.photoUrl,
        isCurrent: politicianProfiles.isCurrent,
        positionActive: politicalPositions.isActive,
        title: politicalPositions.title,
        level: politicalPositions.level,
        jurisdiction: politicalPositions.jurisdiction,
        district: politicalPositions.district,
      })
      .from(politicianProfiles)
      .innerJoin(politicalPositions, eq(politicianProfiles.positionId, politicalPositions.id))
      .where(and(eq(politicianProfiles.isCurrent, true), eq(politicalPositions.isActive, true)));
  },
  async getStoredElectionYears() {
    const [races, candidates] = await Promise.all([
      db.selectDistinct({ year: electionRaces.year }).from(electionRaces)
        .where(eq(electionRaces.state, "MN")),
      db.selectDistinct({ year: raceCandidates.electionYear }).from(raceCandidates)
        .where(eq(raceCandidates.state, "MN")),
    ]);
    return Array.from(new Set([...races, ...candidates].map((row) => row.year)));
  },
};

type Cache = {
  expires: number;
  profiles?: CampaignProfileRow[];
  holders?: MnHolderRow[];
  races: Map<number, CampaignRaceRow[]>;
};
const defaultCache: Cache = { expires: 0, races: new Map() };

async function loadedRows(year: number, source: MnBallotDataSource) {
  if (source !== defaultMnBallotDataSource) {
    const [races, profiles, holders] = await Promise.all([
      source.getRaceRows(year), source.getProfileRows(), source.getHolderRows(),
    ]);
    return { races, profiles, holders };
  }
  const now = Date.now();
  if (defaultCache.expires <= now) {
    defaultCache.expires = now + CACHE_MS;
    defaultCache.profiles = undefined;
    defaultCache.holders = undefined;
    defaultCache.races.clear();
  }
  const [races, profiles, holders] = await Promise.all([
    defaultCache.races.get(year)
      ? Promise.resolve(defaultCache.races.get(year)!)
      : source.getRaceRows(year).then((rows) => (defaultCache.races.set(year, rows), rows)),
    defaultCache.profiles
      ? Promise.resolve(defaultCache.profiles)
      : source.getProfileRows().then((rows) => (defaultCache.profiles = rows)),
    defaultCache.holders
      ? Promise.resolve(defaultCache.holders)
      : source.getHolderRows().then((rows) => (defaultCache.holders = rows)),
  ]);
  return { races, profiles, holders };
}

export function normalizeMnParty(party: string | null | undefined): MnPartyCategory {
  const value = (party || "").trim().toLowerCase().replace(/[.\s_-]+/g, "");
  if (["republican", "gop", "r"].includes(value)) return "republican";
  if ([
    "democratic", "democrat", "dfl", "democraticfarmerlabor", "d",
  ].includes(value)) return "democrat";
  return value ? "other" : "unknown";
}

function compact(value: string | null | undefined): string {
  return (value || "").toLowerCase().replace(/\bcounty\b/g, "").replace(/[^a-z0-9]/g, "");
}

function incumbent(row: MnHolderRow): MnIncumbent {
  return { id: row.id, fullName: row.fullName, party: row.party, photoUrl: row.photoUrl };
}

function districtHolderMatches(row: MnHolderRow, district: MnDistrict): boolean {
  if (row.isCurrent !== true || row.positionActive === false) return false;
  return matchesMnDistrict(
    district,
    row.title,
    row.district,
    null,
    row.level,
    row.jurisdiction,
  );
}

function holding(rows: MnHolderRow[]): MnHolding {
  const categories = new Set(rows.map((row) => normalizeMnParty(row.party)));
  const category: MnPartyCategory = categories.size === 1
    ? Array.from(categories)[0]
    : "unknown";
  return { category, incumbents: rows.map(incumbent) };
}

export function buildMnHoldings(
  districts: MnDistrict[],
  rows: MnHolderRow[],
): Record<string, MnHolding> {
  return Object.fromEntries(districts.map((district) => {
    const matches = rows.filter((row) =>
      row.isCurrent === true && row.positionActive !== false && districtHolderMatches(row, district));
    return [district.id, holding(matches)];
  }));
}

export async function getMnHoldings(
  source: MnBallotDataSource = defaultMnBallotDataSource,
): Promise<Record<string, MnHolding>> {
  const [index, rows] = await Promise.all([getMnBoundaryIndex(), source.getHolderRows()]);
  return buildMnHoldings(index.districts, rows);
}

function statewideIndex(title: string | null | undefined): number {
  return STATEWIDE.findIndex((office) => office.test.test(title || ""));
}

function statewideHolderMatches(row: MnHolderRow, index: number): boolean {
  if (row.isCurrent !== true || row.positionActive === false) return false;
  if (statewideIndex(row.title) !== index) return false;
  if (index === 0) return row.level.toLowerCase() === "federal" && /\bmn\b|minnesota/i.test(row.jurisdiction);
  return row.level.toLowerCase() === "state" && /\bmn\b|minnesota/i.test(row.jurisdiction);
}

function statewideCampaigns(
  index: number,
  year: number,
  races: CampaignRaceRow[],
  profiles: CampaignProfileRow[],
): MnCampaign[] {
  const campaigns = new Map<string, MnCampaign>();
  const linked = new Set<string>();
  for (const row of races) {
    const title = row.raceOfficeTitle || row.officeTitle;
    if (row.politicianProfileId && row.electionYear === year && statewideIndex(title) === index) {
      linked.add(row.politicianProfileId);
    }
    if (row.electionYear !== year || (row.raceYear !== null && row.raceYear !== year) ||
      ["withdrawn", "disqualified"].includes(row.filingStatus.toLowerCase()) ||
      statewideIndex(title) !== index) continue;
    const item: MnCampaign = {
      id: row.id, fullName: row.fullName, party: row.party, photoUrl: row.profilePhotoUrl,
      profileId: row.politicianProfileId, officeTitle: title, electionYear: year,
      filingStatus: row.filingStatus, sourceUrl: sanitizeSourceUrl(row.sourceUrl),
      sourceName: row.sourceName,
    };
    campaigns.set(row.politicianProfileId ? `p:${row.politicianProfileId}` : `n:${compact(row.fullName)}`, item);
  }
  for (const row of profiles) {
    if (linked.has(row.id)) continue;
    const useTarget = Boolean(row.targetPositionId);
    if (!useTarget && row.profileType !== "candidate") continue;
    const title = useTarget ? row.targetTitle : row.heldTitle;
    const level = useTarget ? row.targetLevel : row.heldLevel;
    const jurisdiction = useTarget ? row.targetJurisdiction : row.heldJurisdiction;
    if (statewideIndex(title) !== index ||
      (index === 0 ? level?.toLowerCase() !== "federal" : level?.toLowerCase() !== "state") ||
      !/\bmn\b|minnesota/i.test(jurisdiction || "")) continue;
    const sourceUrl = sanitizeSourceUrl(row.ballotpediaUrl);
    campaigns.set(`p:${row.id}`, {
      id: row.id, fullName: row.fullName, party: row.party, photoUrl: row.photoUrl,
      profileId: row.id, officeTitle: title || STATEWIDE[index].label, electionYear: null,
      filingStatus: null, sourceUrl, sourceName: sourceUrl ? "Ballotpedia" : null,
    });
  }
  return Array.from(campaigns.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function getMnBallot(
  districts: MnDistrict[],
  year: number,
  source: MnBallotDataSource = defaultMnBallotDataSource,
): Promise<MnBallotResponse> {
  const { races, profiles, holders } = await loadedRows(year, source);
  const memorySource: MnCampaignDataSource = {
    getRaceRows: async () => races,
    getProfileRows: async () => profiles,
  };
  const districtOffices = await Promise.all(districts.map(async (district): Promise<MnBallotOffice> => {
    const campaigns = await getMnCampaigns(district, year, memorySource);
    const incumbents = holders.filter((row) => districtHolderMatches(row, district)).map(incumbent);
    const scheduled = year === 2026 && district.type !== "county_commissioner" || campaigns.some((c) => c.electionYear === year);
    return {
      id: district.id, label: district.label, district,
      electionStatus: scheduled ? "scheduled" : "unconfirmed", campaigns, incumbents,
    };
  }));
  const statewideOffices = STATEWIDE.map((office, index): MnBallotOffice => {
    const campaigns = statewideCampaigns(index, year, races, profiles);
    return {
      id: office.id, label: office.label, district: null,
      electionStatus: year === 2026 || campaigns.some((c) => c.electionYear === year)
        ? "scheduled" : "unconfirmed",
      campaigns,
      incumbents: holders.filter((row) => statewideHolderMatches(row, index)).map(incumbent),
    };
  });
  return {
    year,
    cycleLabel: year === 2026 ? "2026 Midterm Elections" : `${year} Minnesota Elections`,
    offices: [...districtOffices, ...statewideOffices],
    coverageNote: `Coverage includes known federal and state offices. Judicial, local, school, county, and ballot-question coverage may be incomplete; confirm your official sample ballot: ${MN_SAMPLE_BALLOT_URL}`,
  };
}

export async function getMnElectionCycles(
  source: MnBallotDataSource = defaultMnBallotDataSource,
): Promise<MnElectionCycle[]> {
  const years = new Set((await source.getStoredElectionYears()).filter((year) => year >= 2022));
  years.add(2026);
  return Array.from(years).sort((a, b) => b - a).map((year) => ({
    year,
    label: year === 2026 ? "2026 Midterm Elections" : `${year} Minnesota Elections`,
  }));
}