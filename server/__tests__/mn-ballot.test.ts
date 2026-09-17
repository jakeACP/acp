import { describe, expect, it } from "vitest";
import type { MnDistrict } from "@shared/civic-map";
import {
  buildMnHoldings,
  getMnBallot,
  getMnElectionCycles,
  normalizeMnParty,
  type MnBallotDataSource,
  type MnHolderRow,
} from "../lib/mn-ballot";

const house: MnDistrict = {
  id: "state_house:30A", type: "state_house", code: "30A",
  label: "Minnesota House District 30A", county: null,
};
const senate: MnDistrict = {
  id: "state_senate:30", type: "state_senate", code: "30",
  label: "Minnesota Senate District 30", county: null,
};
const congress: MnDistrict = {
  id: "congressional:6", type: "congressional", code: "6",
  label: "U.S. Congressional District 6", county: null,
};

function holder(overrides: Partial<MnHolderRow> = {}): MnHolderRow {
  return {
    id: "holder", fullName: "Current Holder", party: "DFL", photoUrl: null,
    isCurrent: true, positionActive: true, title: "Minnesota State Representative",
    level: "state", jurisdiction: "Minnesota", district: "District 30A", ...overrides,
  };
}

function source(overrides: Partial<MnBallotDataSource> = {}): MnBallotDataSource {
  return {
    getRaceRows: async () => [],
    getProfileRows: async () => [],
    getHolderRows: async () => [],
    getStoredElectionYears: async () => [],
    ...overrides,
  };
}

describe("Minnesota incumbent holdings", () => {
  it.each(["Democratic", "Democrat", "DFL", "Democratic-Farmer-Labor", "D"])(
    "normalizes %s to democrat",
    (party) => expect(normalizeMnParty(party)).toBe("democrat"),
  );

  it("keeps House 30A, SD30 and congressional seats distinct", () => {
    const holdings = buildMnHoldings([house, senate, congress], [
      holder(),
      holder({ id: "senator", title: "Minnesota State Senator", district: "SD30" }),
      holder({
        id: "member", title: "U.S. Representative", level: "federal",
        jurisdiction: "Minnesota", district: "MN-6", party: "GOP",
      }),
    ]);
    expect(holdings[house.id].incumbents.map((x) => x.id)).toEqual(["holder"]);
    expect(holdings[senate.id].incumbents.map((x) => x.id)).toEqual(["senator"]);
    expect(holdings[congress.id].incumbents.map((x) => x.id)).toEqual(["member"]);
    expect(holdings[house.id].category).toBe("democrat");
    expect(holdings[congress.id].category).toBe("republican");
  });

  it("uses unknown for an empty or conflicting holding", () => {
    const empty = buildMnHoldings([house], []);
    const conflict = buildMnHoldings([house], [holder(), holder({ id: "two", party: "GOP" })]);
    expect(empty[house.id].category).toBe("unknown");
    expect(conflict[house.id].category).toBe("unknown");
  });

  it("requires exact county scope for commissioner holdings", () => {
    const hennepin: MnDistrict = {
      id: "county_commissioner:27:3", type: "county_commissioner", code: "3",
      label: "Hennepin County Commissioner District 3", county: "Hennepin",
    };
    const rows = [
      holder({ id: "right", title: "County Commissioner", level: "county", jurisdiction: "Hennepin County", district: "3" }),
      holder({ id: "wrong", title: "County Commissioner", level: "county", jurisdiction: "Ramsey County", district: "3" }),
    ];
    expect(buildMnHoldings([hennepin], rows)[hennepin.id].incumbents.map((x) => x.id))
      .toEqual(["right"]);
  });
});

describe("Minnesota ballot assembly", () => {
  it("combines passed district groups and five statewide groups without making holders candidates", async () => {
    const ballot = await getMnBallot([house, senate, congress], 2026, source({
      getHolderRows: async () => [holder()],
    }));
    expect(ballot.offices.map((office) => office.id)).toEqual([
      house.id, senate.id, congress.id, "statewide:us_senate", "statewide:governor",
      "statewide:secretary_of_state", "statewide:state_auditor", "statewide:attorney_general",
    ]);
    expect(ballot.offices[0].incumbents).toHaveLength(1);
    expect(ballot.offices[0].campaigns).toEqual([]);
    expect(ballot.offices.every((office) => office.electionStatus === "scheduled")).toBe(true);
  });

  it("returns stored cycles plus the sourced 2026 default", async () => {
    expect(await getMnElectionCycles(source({ getStoredElectionYears: async () => [2024, 2020, 2022] })))
      .toEqual([
        { year: 2026, label: "2026 Midterm Elections" },
        { year: 2024, label: "2024 Minnesota Elections" },
        { year: 2022, label: "2022 Minnesota Elections" },
      ]);
  });
});