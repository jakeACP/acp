import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import router from "../mn-boundary-routes";
import {
  getMnBoundaryIndex,
  getMnDistrict,
  getMnPrecincts,
  matchMnPoint,
} from "../lib/mn-boundaries";

describe("official Minnesota boundary snapshot", () => {
  it("keeps House 30A, House 30B, and Senate 30 as separate canonical districts", async () => {
    const [houseA, houseB, senate] = await Promise.all([
      getMnDistrict("state_house:30A"),
      getMnDistrict("state_house:30B"),
      getMnDistrict("state_senate:30"),
    ]);

    expect(houseA).toMatchObject({ type: "state_house", code: "30A" });
    expect(houseB).toMatchObject({ type: "state_house", code: "30B" });
    expect(senate).toMatchObject({ type: "state_senate", code: "30" });
    expect(new Set([houseA?.id, houseB?.id, senate?.id]).size).toBe(3);
  });

  it("matches the Minnesota State Capitol's real address coordinate", async () => {
    // 75 Rev Dr Martin Luther King Jr Blvd, Saint Paul, MN 55155
    const result = await matchMnPoint(44.9551, -93.1022);

    expect(result.status).toBe("matched");
    expect(result.precinct).toMatchObject({
      name: "St. Paul W-2 P-1",
      county: "Ramsey",
      districts: {
        state_house: "state_house:65B",
        state_senate: "state_senate:65",
        congressional: "congressional:4",
        county_commissioner: "county_commissioner:62:5",
      },
    });
  });

  it("preserves every official precinct geometry and publishes provenance", async () => {
    const [index, precincts] = await Promise.all([
      getMnBoundaryIndex(),
      getMnPrecincts(),
    ]);

    expect(precincts.features).toHaveLength(4_106);
    expect(index.metadata).toMatchObject({
      publisher: "Office of the Minnesota Secretary of State Elections Division",
      sourceUrl: "https://sos.mn.gov/media/2791/mn-precincts.json",
      sourceDate: "May 1,2026",
      retrievedAt: "2026-09-17",
      snapshotId: "mn-sos-precincts-2026-05",
      precinctCount: 4_106,
      sha256: "b5a60166dba4a45032f6c835403b0776469d2ca2582b0a98b090864bbdaa189c",
    });
    // The publisher contains two separate geometry features carrying the same
    // Rochester Township P-1 PrecinctID; neither is discarded or rewritten.
    expect(precincts.features.filter(
      (feature) => feature.properties.id === "271090500",
    )).toHaveLength(2);
  });

  it("returns unmatched for valid coordinates outside Minnesota", async () => {
    await expect(matchMnPoint(0, 0)).resolves.toEqual({
      status: "unmatched",
      precinct: null,
      districts: [],
    });
  });

  it("does not claim a precinct for a point on an official boundary", async () => {
    // An official Aitkin precinct vertex, represented only to 0.0001 degrees.
    const result = await matchMnPoint(46.5405, -93.6753);
    expect(result.status).toBe("ambiguous");
    expect(result.precinct).toBeNull();
  });
});

describe("Minnesota read-only boundary router", () => {
  const app = express().use("/api/elections/mn", router);

  it("serves index and normalized GeoJSON endpoint formats", async () => {
    const [indexResponse, precinctResponse] = await Promise.all([
      request(app).get("/api/elections/mn/index"),
      request(app).get("/api/elections/mn/precincts"),
    ]);

    expect(indexResponse.status).toBe(200);
    expect(indexResponse.body).toMatchObject({
      metadata: { precinctCount: 4_106 },
      districts: expect.any(Array),
    });
    expect(precinctResponse.status).toBe(200);
    expect(precinctResponse.body.type).toBe("FeatureCollection");
    expect(precinctResponse.body.features[0]).toMatchObject({
      type: "Feature",
      properties: {
        id: expect.any(String),
        name: expect.any(String),
        county: expect.any(String),
        districts: expect.any(Object),
      },
      geometry: expect.any(Object),
    });
  });

  it("rejects invalid coordinates and returns an honest outside match", async () => {
    const [missing, invalid, outside] = await Promise.all([
      request(app).get("/api/elections/mn/match"),
      request(app).get("/api/elections/mn/match?lat=91&lng=-93"),
      request(app).get("/api/elections/mn/match?lat=0&lng=0"),
    ]);

    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(outside.status).toBe(200);
    expect(outside.body).toEqual({ status: "unmatched", precinct: null, districts: [] });
  });

  it("does not expose mutating routes", async () => {
    expect((await request(app).post("/api/elections/mn/index")).status).toBe(404);
    expect((await request(app).delete("/api/elections/mn/precincts")).status).toBe(404);
  });
});