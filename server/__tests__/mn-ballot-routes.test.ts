import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { MnDistrict } from "@shared/civic-map";
import { createMnBallotRouter } from "../mn-ballot-routes";

const districts: Record<string, MnDistrict> = {
  "state_house:30A": {
    id: "state_house:30A", type: "state_house", code: "30A",
    label: "Minnesota House District 30A", county: null,
  },
  "state_senate:30": {
    id: "state_senate:30", type: "state_senate", code: "30",
    label: "Minnesota Senate District 30", county: null,
  },
};

const source = {
  getRaceRows: async () => [],
  getProfileRows: async () => [],
  getHolderRows: async () => [],
  getStoredElectionYears: async () => [],
};

function app() {
  const server = express();
  server.use("/api/elections/mn", createMnBallotRouter({
    getDistrict: async (id) => districts[id],
    source,
  }));
  return server;
}

describe("GET /api/elections/mn/ballot", () => {
  it("supports a combined ballot and statewide-only empty districtIds", async () => {
    const combined = await request(app()).get("/api/elections/mn/ballot")
      .query({ year: "2026", districtIds: "state_house:30A,state_senate:30" });
    expect(combined.status).toBe(200);
    expect(combined.body.offices.slice(0, 2).map((x: { id: string }) => x.id))
      .toEqual(["state_house:30A", "state_senate:30"]);
    expect(combined.body.offices).toHaveLength(7);

    const statewide = await request(app()).get("/api/elections/mn/ballot")
      .query({ year: "2026", districtIds: "" });
    expect(statewide.status).toBe(200);
    expect(statewide.body.offices).toHaveLength(5);
  });

  it.each([
    [{ districtIds: "state_house:30A" }, 400],
    [{ year: "26" }, 400],
    [{ year: "2200" }, 400],
    [{ year: "2026", districtIds: "state_house:99Z" }, 400],
    [{ year: "2026", districtIds: "state_house:30A,state_house:30A" }, 400],
    [{ year: "2026", districtIds: "1,2,3,4,5,6,7,8,9" }, 400],
  ])("rejects invalid query %#", async (query, status) => {
    expect((await request(app()).get("/api/elections/mn/ballot").query(query)).status).toBe(status);
  });
});