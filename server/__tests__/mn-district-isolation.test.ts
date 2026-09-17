import { describe, expect, it } from "vitest";
import type { MnDistrict } from "@shared/civic-map";
import { matchesMnDistrict } from "../lib/mn-campaigns";

const congressional6: MnDistrict = {
  id: "congressional:6",
  type: "congressional",
  code: "6",
  label: "U.S. Congressional District 6",
  county: null,
};

const house42B: MnDistrict = {
  id: "state_house:42B",
  type: "state_house",
  code: "42B",
  label: "Minnesota House District 42B",
  county: null,
};

const senate30: MnDistrict = {
  id: "state_senate:30",
  type: "state_senate",
  code: "30",
  label: "Minnesota Senate District 30",
  county: null,
};

describe("matchesMnDistrict state isolation", () => {
  it("rejects another state's congressional seat with the same number", () => {
    expect(matchesMnDistrict(congressional6, "U.S. House – 6", "6", null, "federal", "Colorado"))
      .toBe(false);
  });

  it("accepts Minnesota's congressional seat", () => {
    expect(matchesMnDistrict(congressional6, "U.S. House – 6", "6", null, "federal", "Minnesota"))
      .toBe(true);
  });

  it("rejects a congressional row whose jurisdiction context is missing", () => {
    expect(matchesMnDistrict(congressional6, "U.S. House – 6", "6", null, "federal", null))
      .toBe(false);
  });

  it("rejects another state's letter-suffixed legislative seat", () => {
    expect(matchesMnDistrict(house42B, "State House of Delegates – 42B", "42B", null, "state", "Maryland"))
      .toBe(false);
  });

  it("accepts Minnesota's letter-suffixed legislative seat", () => {
    expect(matchesMnDistrict(house42B, "Minnesota House of Representatives – 42B", "42B", null, "state", "Minnesota"))
      .toBe(true);
  });

  it("accepts an MN-scoped race row that carries no jurisdiction context", () => {
    expect(matchesMnDistrict(congressional6, "U.S. House – 6", "6")).toBe(true);
    expect(matchesMnDistrict(senate30, "MN State Senate – 30", "30")).toBe(true);
  });

  it("still separates chambers and district numbers", () => {
    expect(matchesMnDistrict(senate30, "Minnesota House of Representatives – 30A", "30A", null, "state", "Minnesota"))
      .toBe(false);
    expect(matchesMnDistrict(house42B, "Minnesota House of Representatives – 42A", "42A", null, "state", "Minnesota"))
      .toBe(false);
  });

  it("matches the full Minnesota House title format used by stored positions", () => {
    expect(matchesMnDistrict(house42B, "Minnesota House of Representatives – 42B", "42B"))
      .toBe(true);
  });
});
