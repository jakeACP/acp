import { describe, expect, it } from "vitest";
import { candidateSeatKey, expectedFederalSeatKey, uniqueCandidateSeatMatch } from "../lib/candidate-seat-identity";

describe("candidate seat identity", () => {
  it("separates federal House, state House, and state Senate with the same district number", () => {
    expect(candidateSeatKey({ office: "U.S. House", level: "Federal", state: "Minnesota", district: "District 1" }))
      .toBe("MN|federal|house|1");
    expect(candidateSeatKey({ office: "State House", level: "State", state: "MN", district: "1" }))
      .toBe("MN|state|house|1");
    expect(candidateSeatKey({ office: "State Senate", level: "State", state: "MN", district: "SD 1" }))
      .toBe("MN|state|senate|1");
  });

  it("normalizes blank and null statewide districts without using the office title as a district", () => {
    expect(candidateSeatKey({ office: "Governor", level: "State", state: "Minnesota", district: "" }))
      .toBe("MN|state|governor|STATEWIDE");
    expect(candidateSeatKey({ office: "Governor", officeType: "Executive", level: "state", state: "MN", district: null, storedTitle: "Governor" }))
      .toBe("MN|state|governor|STATEWIDE");
  });

  it("keeps repeated district numbers isolated by state", () => {
    expect(candidateSeatKey({ office: "U.S. House", level: "Federal", state: "Colorado", district: "1" }))
      .toBe("CO|federal|house|1");
    expect(candidateSeatKey({ office: "U.S. House", level: "Federal", state: "Minnesota", district: "1" }))
      .toBe("MN|federal|house|1");
  });

  it("uses FEC office codes to identify a wrong federal chamber link", () => {
    expect(expectedFederalSeatKey("H4MN01000")).toBe("MN|federal|house|1");
    expect(expectedFederalSeatKey("S4MN00000")).toBe("MN|federal|senate|STATEWIDE");
  });

  it("derives the correct state and district without trusting the existing link", () => {
    expect(expectedFederalSeatKey("H4CO02000")).toBe("CO|federal|house|2");
    expect(expectedFederalSeatKey("H4MN07000")).toBe("MN|federal|house|7");
  });

  it("treats Senate races as statewide and rejects incomplete IDs", () => {
    expect(expectedFederalSeatKey("S4TX00000")).toBe("TX|federal|senate|STATEWIDE");
    expect(expectedFederalSeatKey("H4MN")).toBeNull();
    expect(expectedFederalSeatKey(null)).toBeNull();
  });

  it("reports duplicate canonical position records as ambiguous", () => {
    const result = uniqueCandidateSeatMatch(
      [{ id: "one", key: "MN|federal|house|1" }, { id: "two", key: "MN|federal|house|1" }],
      "MN|federal|house|1",
      item => item.key,
    );
    expect(result).toEqual({ match: null, ambiguous: true });
  });
});