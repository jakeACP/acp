import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { MnDistrict } from "@shared/civic-map";
import { createMnCampaignRouter } from "../mn-campaign-routes";

const district: MnDistrict = {
  id: "state_house:30A",
  type: "state_house",
  code: "30A",
  label: "Minnesota House District 30A",
  county: null,
};

function appWith(overrides: Parameters<typeof createMnCampaignRouter>[0] = {}) {
  const app = express();
  app.use(
    "/api/elections/mn",
    createMnCampaignRouter({
      getDistrict: async (id) => id === district.id ? district : undefined,
      findCampaigns: vi.fn().mockResolvedValue([]),
      currentYear: () => 2026,
      ...overrides,
    }),
  );
  return app;
}

describe("GET /api/elections/mn/campaigns", () => {
  it("returns the exact district campaign response and parsed year", async () => {
    const findCampaigns = vi.fn().mockResolvedValue([
      { id: "candidate-1", fullName: "Candidate One" },
    ]);
    const response = await request(appWith({ findCampaigns }))
      .get("/api/elections/mn/campaigns")
      .query({ districtId: "state_house:30A", year: "2026" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      district,
      electionYear: 2026,
      campaigns: [{ id: "candidate-1" }],
    });
    expect(findCampaigns).toHaveBeenCalledWith(district, 2026);
  });

  it("defaults to the current year", async () => {
    const response = await request(appWith())
      .get("/api/elections/mn/campaigns")
      .query({ districtId: district.id });
    expect(response.status).toBe(200);
    expect(response.body.electionYear).toBe(2026);
  });

  it.each([
    [{}, /districtId/i],
    [{ districtId: "state_house:99Z" }, /unknown/i],
    [{ districtId: district.id, year: "twenty-six" }, /year/i],
    [{ districtId: district.id, year: "2200" }, /year/i],
  ])("returns 400 for invalid query %#", async (query, error) => {
    const response = await request(appWith())
      .get("/api/elections/mn/campaigns")
      .query(query);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(error);
  });

  it("catches lookup errors as a 500", async () => {
    const response = await request(
      appWith({ getDistrict: vi.fn().mockRejectedValue(new Error("failure")) }),
    )
      .get("/api/elections/mn/campaigns")
      .query({ districtId: district.id });
    expect(response.status).toBe(500);
    expect(response.body.error).toMatch(/unable/i);
  });
});