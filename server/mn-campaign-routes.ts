import { Router } from "express";
import type { MnCampaignResponse, MnDistrict } from "@shared/civic-map";
import { getMnDistrict } from "./lib/mn-boundaries";
import { getMnCampaigns } from "./lib/mn-campaigns";

interface MnCampaignRouterDependencies {
  getDistrict(id: string): Promise<MnDistrict | undefined>;
  findCampaigns: typeof getMnCampaigns;
  currentYear(): number;
}

const YEAR_PATTERN = /^\d{4}$/;

export function createMnCampaignRouter(
  dependencies: Partial<MnCampaignRouterDependencies> = {},
): Router {
  const router = Router();
  const getDistrict = dependencies.getDistrict || getMnDistrict;
  const findCampaigns = dependencies.findCampaigns || getMnCampaigns;
  const currentYear = dependencies.currentYear || (() => new Date().getFullYear());

  router.get("/campaigns", async (req, res) => {
    try {
      const districtId =
        typeof req.query.districtId === "string" ? req.query.districtId.trim() : "";
      if (!districtId) {
        return res.status(400).json({ error: "districtId is required" });
      }

      const rawYear = req.query.year;
      if (
        rawYear !== undefined &&
        (typeof rawYear !== "string" || !YEAR_PATTERN.test(rawYear))
      ) {
        return res.status(400).json({ error: "year must be a four-digit year" });
      }
      const year = rawYear === undefined ? currentYear() : Number(rawYear);
      if (year < 1900 || year > 2100) {
        return res.status(400).json({ error: "year must be between 1900 and 2100" });
      }

      const district = await getDistrict(districtId);
      if (!district) {
        return res.status(400).json({ error: "Unknown Minnesota district" });
      }

      const response: MnCampaignResponse = {
        district,
        campaigns: await findCampaigns(district, year),
        electionYear: year,
      };
      return res.json(response);
    } catch {
      return res.status(500).json({ error: "Unable to load district campaigns" });
    }
  });

  return router;
}

export default createMnCampaignRouter();