import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { MnCampaign, MnDistrict, MnDistrictType } from "@shared/civic-map";
import {
  electionRaces,
  politicalPositions,
  politicianProfiles,
  raceCandidates,
} from "@shared/schema";
import { db } from "../db";

export interface CampaignRaceRow {
  id: string;
  fullName: string;
  party: string | null;
  officeTitle: string;
  district: string | null;
  county: string | null;
  electionYear: number;
  filingStatus: string;
  sourceUrl: string | null;
  sourceName: string | null;
  politicianProfileId: string | null;
  profilePhotoUrl: string | null;
  raceYear: number | null;
  raceOfficeTitle: string | null;
  raceDistrict: string | null;
  raceCounty: string | null;
}

export interface CampaignProfileRow {
  id: string;
  fullName: string;
  party: string | null;
  photoUrl: string | null;
  profileType: string | null;
  claimRequestStatus: string | null;
  ballotpediaUrl: string | null;
  targetPositionId: string | null;
  targetTitle: string | null;
  targetLevel: string | null;
  targetJurisdiction: string | null;
  targetDistrict: string | null;
  positionId: string | null;
  heldTitle: string | null;
  heldLevel: string | null;
  heldJurisdiction: string | null;
  heldDistrict: string | null;
}

export interface MnCampaignDataSource {
  getRaceRows(year: number): Promise<CampaignRaceRow[]>;
  getProfileRows(): Promise<CampaignProfileRow[]>;
}

const targetPosition = alias(politicalPositions, "campaign_target_position");
const heldPosition = alias(politicalPositions, "campaign_held_position");

export const defaultMnCampaignDataSource: MnCampaignDataSource = {
  async getRaceRows(year) {
    return db
      .select({
        id: raceCandidates.id,
        fullName: raceCandidates.fullName,
        party: raceCandidates.party,
        officeTitle: raceCandidates.officeTitle,
        district: raceCandidates.district,
        county: raceCandidates.county,
        electionYear: raceCandidates.electionYear,
        filingStatus: raceCandidates.filingStatus,
        sourceUrl: raceCandidates.sourceUrl,
        sourceName: raceCandidates.sourceName,
        politicianProfileId: raceCandidates.politicianProfileId,
        profilePhotoUrl: politicianProfiles.photoUrl,
        raceYear: electionRaces.year,
        raceOfficeTitle: electionRaces.officeTitle,
        raceDistrict: electionRaces.district,
        raceCounty: electionRaces.county,
      })
      .from(raceCandidates)
      .leftJoin(electionRaces, eq(raceCandidates.electionRaceId, electionRaces.id))
      .leftJoin(
        politicianProfiles,
        eq(raceCandidates.politicianProfileId, politicianProfiles.id),
      )
      .where(
        and(
          eq(raceCandidates.state, "MN"),
          eq(raceCandidates.electionYear, year),
        ),
      );
  },

  async getProfileRows() {
    return db
      .select({
        id: politicianProfiles.id,
        fullName: politicianProfiles.fullName,
        party: politicianProfiles.party,
        photoUrl: politicianProfiles.photoUrl,
        profileType: politicianProfiles.profileType,
        claimRequestStatus: politicianProfiles.claimRequestStatus,
        ballotpediaUrl: politicianProfiles.ballotpediaUrl,
        targetPositionId: politicianProfiles.targetPositionId,
        targetTitle: targetPosition.title,
        targetLevel: targetPosition.level,
        targetJurisdiction: targetPosition.jurisdiction,
        targetDistrict: targetPosition.district,
        positionId: politicianProfiles.positionId,
        heldTitle: heldPosition.title,
        heldLevel: heldPosition.level,
        heldJurisdiction: heldPosition.jurisdiction,
        heldDistrict: heldPosition.district,
      })
      .from(politicianProfiles)
      .leftJoin(
        targetPosition,
        eq(politicianProfiles.targetPositionId, targetPosition.id),
      )
      .leftJoin(
        heldPosition,
        eq(politicianProfiles.positionId, heldPosition.id),
      );
  },
};

function compact(value: string): string {
  return value.toUpperCase().replace(/[\s_.-]+/g, "");
}

function stripOrdinal(value: string): string {
  return value.replace(/(\d+)(ST|ND|RD|TH)\b/gi, "$1");
}

/**
 * Normalizes only formats belonging to the requested chamber. A bare number is
 * accepted only after the office metadata has established the chamber.
 */
export function normalizeDistrictCode(
  value: string | null | undefined,
  type: MnDistrictType,
): string | null {
  if (!value) return null;
  let normalized = compact(stripOrdinal(value));

  const prefixes: Record<MnDistrictType, RegExp> = {
    state_house: /^(?:MINNESOTA|MN)?(?:STATE)?(?:HOUSEOFREPRESENTATIVES|HOUSE|REPRESENTATIVE)?(?:DISTRICT)?/,
    state_senate: /^(?:MINNESOTA|MN)?(?:STATE)?(?:SENATE|SENATOR|SD)(?:DISTRICT)?/,
    congressional: /^(?:UNITEDSTATES|US|MN)?(?:CONGRESSIONAL|CONGRESS|HOUSEOFREPRESENTATIVES|HOUSE|CD)(?:DISTRICT)?/,
    county_commissioner: /^(?:COUNTY)?(?:BOARD|COMMISSION|COMMISSIONER)?(?:DISTRICT)?/,
  };
  normalized = normalized.replace(prefixes[type], "");
  // Common compact seat codes can otherwise be ambiguous with the fully
  // spelled office-prefix expression (for example MN-6).
  if (type === "state_house") normalized = normalized.replace(/^HD/, "");
  if (type === "state_senate") normalized = normalized.replace(/^SD/, "");
  if (type === "congressional") normalized = normalized.replace(/^(?:MN|CD)/, "");

  if (type === "state_house") {
    const match = normalized.match(/^0*(\d{1,2})([AB])$/);
    return match ? `${Number(match[1])}${match[2]}` : null;
  }

  const match = normalized.match(/^0*(\d{1,3})$/);
  return match ? String(Number(match[1])) : null;
}

function officeType(
  title: string | null | undefined,
  level?: string | null,
): MnDistrictType | null {
  const text = (title || "").toLowerCase();
  const normalizedLevel = (level || "").toLowerCase();

  if (
    /congress|u\.?\s*s\.?\s+(?:house|representative)/.test(text) ||
    (normalizedLevel === "federal" && /representative|house/.test(text))
  ) {
    return "congressional";
  }
  if (
    /county.{0,30}(?:commission|commissioner)|(?:commission|commissioner).{0,30}county/.test(
      text,
    )
  ) {
    return "county_commissioner";
  }
  if (/senate|senator/.test(text) && normalizedLevel !== "federal") {
    return "state_senate";
  }
  if (
    /state.{0,20}(?:house|representative)|(?:house|representative).{0,20}state|mn house|minnesota house|house of representatives|\bhouse\s+district/i.test(
      text,
    )
  ) {
    return "state_house";
  }
  return null;
}

function normalizeCounty(value: string | null | undefined): string | null {
  if (!value) return null;
  const result = value
    .toLowerCase()
    .replace(/\bcounty\b/g, "")
    .replace(/[^a-z0-9]/g, "");
  return result || null;
}

export function matchesMnDistrict(
  district: MnDistrict,
  title: string | null | undefined,
  rawCode: string | null | undefined,
  county?: string | null,
  level?: string | null,
  jurisdiction?: string | null,
): boolean {
  if (officeType(title, level) !== district.type) return false;
  if (normalizeDistrictCode(rawCode, district.type) !== normalizeDistrictCode(district.code, district.type)) {
    return false;
  }

  if (district.type === "county_commissioner") {
    const expectedCounty = normalizeCounty(district.county);
    const actualCounty = normalizeCounty(county) || normalizeCounty(jurisdiction);
    return expectedCounty !== null && actualCounty === expectedCounty;
  }

  if (district.type === "state_house" || district.type === "state_senate") {
    if (level && level.toLowerCase() !== "state") return false;
  }
  if (district.type === "congressional" && level && level.toLowerCase() !== "federal") {
    return false;
  }

  // Seat numbers repeat in every state, so a row that carries jurisdiction
  // context must prove it is Minnesota's seat. Rows without that context come
  // from Minnesota-scoped queries and are already limited to this state.
  if (district.type !== "county_commissioner" && jurisdiction !== undefined) {
    if (!/\bminnesota\b|\bmn\b/i.test(jurisdiction || "")) return false;
  }
  return true;
}

export function sanitizeSourceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizedName(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
}

function richness(campaign: MnCampaign): number {
  return [
    campaign.profileId,
    campaign.party,
    campaign.photoUrl,
    campaign.sourceUrl,
    campaign.sourceName,
    campaign.filingStatus,
  ].filter(Boolean).length;
}

function addRicher(
  campaigns: Map<string, MnCampaign>,
  key: string,
  campaign: MnCampaign,
): void {
  const existing = campaigns.get(key);
  if (!existing || richness(campaign) > richness(existing)) campaigns.set(key, campaign);
}

export async function getMnCampaigns(
  district: MnDistrict,
  year: number,
  source: MnCampaignDataSource = defaultMnCampaignDataSource,
): Promise<MnCampaign[]> {
  const [raceRows, profileRows] = await Promise.all([
    source.getRaceRows(year),
    source.getProfileRows(),
  ]);
  const campaigns = new Map<string, MnCampaign>();
  const linkedProfiles = new Set<string>();

  for (const row of raceRows) {
    if (row.politicianProfileId && row.electionYear === year) {
      // Remember inactive filings too, so their linked generic profile cannot
      // silently put a withdrawn/disqualified person back on this cycle.
      linkedProfiles.add(row.politicianProfileId);
    }
    if (
      row.electionYear !== year ||
      (row.raceYear !== null && row.raceYear !== year) ||
      ["withdrawn", "disqualified"].includes(row.filingStatus.toLowerCase())
    ) {
      continue;
    }
    const title = row.raceOfficeTitle || row.officeTitle;
    const code = row.raceDistrict || row.district;
    const county = row.raceCounty || row.county;
    if (!matchesMnDistrict(district, title, code, county)) continue;

    const campaign: MnCampaign = {
      id: row.id,
      fullName: row.fullName,
      party: row.party,
      photoUrl: row.profilePhotoUrl,
      profileId: row.politicianProfileId,
      officeTitle: title,
      electionYear: row.electionYear,
      filingStatus: row.filingStatus,
      sourceUrl: sanitizeSourceUrl(row.sourceUrl),
      sourceName: row.sourceName,
    };
    const key = row.politicianProfileId
      ? `profile:${row.politicianProfileId}`
      : `name:${normalizedName(row.fullName)}`;
    addRicher(campaigns, key, campaign);
  }

  for (const row of profileRows) {
    if (linkedProfiles.has(row.id)) continue;

    // targetPositionId is authoritative when present. A current/held seat must
    // never override a different campaign target.
    const useTarget = Boolean(row.targetPositionId);
    if (!useTarget && row.profileType !== "candidate") continue;
    const title = useTarget ? row.targetTitle : row.heldTitle;
    const level = useTarget ? row.targetLevel : row.heldLevel;
    const jurisdiction = useTarget ? row.targetJurisdiction : row.heldJurisdiction;
    const code = useTarget ? row.targetDistrict : row.heldDistrict;
    if (!matchesMnDistrict(district, title, code, null, level, jurisdiction)) continue;

    const sourceUrl = sanitizeSourceUrl(row.ballotpediaUrl);
    const campaign: MnCampaign = {
      id: row.id,
      fullName: row.fullName,
      party: row.party,
      photoUrl: row.photoUrl,
      profileId: row.id,
      officeTitle: title || district.label,
      electionYear: null,
      filingStatus: null,
      sourceUrl,
      sourceName: sourceUrl ? "Ballotpedia" : null,
    };
    addRicher(campaigns, `profile:${row.id}`, campaign);
  }

  return Array.from(campaigns.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "en", { sensitivity: "base" }),
  );
}