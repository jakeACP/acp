import { describe, expect, it } from "vitest";
import type { MnDistrict } from "@shared/civic-map";
import {
  getMnCampaigns,
  normalizeDistrictCode,
  sanitizeSourceUrl,
  type CampaignProfileRow,
  type CampaignRaceRow,
  type MnCampaignDataSource,
} from "../lib/mn-campaigns";

const house30A: MnDistrict = {
  id: "state_house:30A",
  type: "state_house",
  code: "30A",
  label: "Minnesota House District 30A",
  county: null,
};

function race(overrides: Partial<CampaignRaceRow> = {}): CampaignRaceRow {
  return {
    id: "race-1",
    fullName: "Alex Example",
    party: "Example",
    officeTitle: "House District 30A",
    district: "30A",
    county: null,
    electionYear: 2026,
    filingStatus: "filed",
    sourceUrl: "https://example.org/filing",
    sourceName: "Minnesota Secretary of State",
    politicianProfileId: null,
    profilePhotoUrl: null,
    raceYear: 2026,
    raceOfficeTitle: null,
    raceDistrict: null,
    raceCounty: null,
    ...overrides,
  };
}

function profile(overrides: Partial<CampaignProfileRow> = {}): CampaignProfileRow {
  return {
    id: "profile-1",
    fullName: "Pat Candidate",
    party: null,
    photoUrl: null,
    profileType: "candidate",
    claimRequestStatus: null,
    ballotpediaUrl: null,
    targetPositionId: null,
    targetTitle: null,
    targetLevel: null,
    targetJurisdiction: null,
    targetDistrict: null,
    positionId: "held-1",
    heldTitle: "Minnesota State Representative",
    heldLevel: "state",
    heldJurisdiction: "Minnesota",
    heldDistrict: "30A",
    ...overrides,
  };
}

function source(
  races: CampaignRaceRow[],
  profiles: CampaignProfileRow[] = [],
): MnCampaignDataSource {
  return {
    getRaceRows: async () => races,
    getProfileRows: async () => profiles,
  };
}

describe("Minnesota campaign district normalization", () => {
  it.each(["30A", "30-A", "House District 30A", "030A", "House District 030-A"])(
    "normalizes state house format %s",
    (value) => expect(normalizeDistrictCode(value, "state_house")).toBe("30A"),
  );

  it.each(["SD30", "Senate District 30", "030", "Minnesota Senate District 030"])(
    "normalizes state senate format %s",
    (value) => expect(normalizeDistrictCode(value, "state_senate")).toBe("30"),
  );

  it("does not collapse House 30A into Senate 30", () => {
    expect(normalizeDistrictCode("30A", "state_senate")).toBeNull();
    expect(normalizeDistrictCode("30", "state_house")).toBeNull();
  });
});

describe("getMnCampaigns exact matching", () => {
  it("selects 30A but not 30B, Senate 30, or Congressional 30", async () => {
    const rows = [
      race(),
      race({ id: "30b", district: "30B" }),
      race({ id: "senate", officeTitle: "Minnesota State Senate", district: "30" }),
      race({ id: "congress", officeTitle: "U.S. Congressional District", district: "30" }),
    ];
    const result = await getMnCampaigns(house30A, 2026, source(rows));
    expect(result.map((item) => item.id)).toEqual(["race-1"]);
  });

  it("requires both county and district for county commissioner campaigns", async () => {
    const district: MnDistrict = {
      id: "county_commissioner:Hennepin:3",
      type: "county_commissioner",
      code: "3",
      label: "Hennepin County Commissioner District 3",
      county: "Hennepin",
    };
    const rows = [
      race({ id: "right", officeTitle: "County Commissioner", county: "Hennepin County", district: "03" }),
      race({ id: "wrong-county", officeTitle: "County Commissioner", county: "Ramsey", district: "3" }),
      race({ id: "wrong-district", officeTitle: "County Commissioner", county: "Hennepin", district: "4" }),
    ];
    expect((await getMnCampaigns(district, 2026, source(rows))).map((item) => item.id))
      .toEqual(["right"]);
  });

  it("excludes inactive and historical race rows", async () => {
    const rows = [
      race({ id: "withdrawn", filingStatus: "withdrawn" }),
      race({ id: "disqualified", filingStatus: "disqualified" }),
      race({ id: "historical", raceYear: 2024 }),
      race({ id: "active", filingStatus: "on_ballot" }),
    ];
    expect((await getMnCampaigns(house30A, 2026, source(rows))).map((item) => item.id))
      .toEqual(["active"]);
  });

  it("uses target position preferentially and held position only for candidates", async () => {
    const rows = [
      profile({
        id: "different-target",
        targetPositionId: "target-1",
        targetTitle: "Minnesota State Representative",
        targetLevel: "state",
        targetJurisdiction: "Minnesota",
        targetDistrict: "30B",
      }),
      profile({ id: "incumbent", profileType: "representative" }),
      profile({ id: "candidate-held" }),
      profile({
        id: "approved-target",
        profileType: "representative",
        claimRequestStatus: "approved",
        targetPositionId: "target-2",
        targetTitle: "Minnesota State House",
        targetLevel: "state",
        targetJurisdiction: "Minnesota",
        targetDistrict: "030-A",
      }),
    ];
    const result = await getMnCampaigns(house30A, 2026, source([], rows));
    expect(result.map((item) => item.id).sort()).toEqual([
      "approved-target",
      "candidate-held",
    ]);
  });

  it("deduplicates linked profiles in favor of richer race provenance", async () => {
    const linkedRace = race({
      politicianProfileId: "profile-1",
      profilePhotoUrl: "https://example.org/photo.jpg",
    });
    const result = await getMnCampaigns(
      house30A,
      2026,
      source([linkedRace], [profile()]),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "race-1",
      profileId: "profile-1",
      filingStatus: "filed",
      sourceName: "Minnesota Secretary of State",
    });
  });

  it("sanitizes provenance URLs without fabricating missing mappings", async () => {
    expect(sanitizeSourceUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeSourceUrl("not a URL")).toBeNull();
    expect(sanitizeSourceUrl("https://example.org/source")).toBe(
      "https://example.org/source",
    );
    const result = await getMnCampaigns(
      house30A,
      2026,
      source([race({ sourceUrl: "file:///secret", sourceName: null })]),
    );
    expect(result[0].sourceUrl).toBeNull();
    expect(result[0].sourceName).toBeNull();
  });
});