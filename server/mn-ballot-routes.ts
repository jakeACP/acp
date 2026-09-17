import { Router } from "express";
import type { MnDistrict } from "@shared/civic-map";
import { getMnDistrict } from "./lib/mn-boundaries";
import {
  defaultMnBallotDataSource,
  getMnBallot,
  getMnElectionCycles,
  getMnHoldings,
  type MnBallotDataSource,
} from "./lib/mn-ballot";

interface Dependencies {
  getDistrict(id: string): Promise<MnDistrict | undefined>;
  source: MnBallotDataSource;
}

const YEAR = /^\d{4}$/;

export function createMnBallotRouter(overrides: Partial<Dependencies> = {}): Router {
  const router = Router();
  const getDistrict = overrides.getDistrict || getMnDistrict;
  const source = overrides.source || defaultMnBallotDataSource;

  router.get("/ballot", async (req, res) => {
    const rawYear = req.query.year;
    if (typeof rawYear !== "string" || !YEAR.test(rawYear) ||
      Number(rawYear) < 1900 || Number(rawYear) > 2100) {
      return res.status(400).json({ error: "year must be a four-digit year between 1900 and 2100" });
    }
    if (req.query.districtIds !== undefined && typeof req.query.districtIds !== "string") {
      return res.status(400).json({ error: "districtIds must be a comma-separated list" });
    }
    const ids = typeof req.query.districtIds === "string"
      ? req.query.districtIds.split(",").map((id) => id.trim()).filter(Boolean)
      : [];
    if (ids.length > 8) return res.status(400).json({ error: "districtIds may contain at most 8 IDs" });
    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({ error: "districtIds must not contain duplicates" });
    }
    try {
      const found = await Promise.all(ids.map(getDistrict));
      if (found.some((district) => !district)) {
        return res.status(400).json({ error: "Unknown Minnesota district" });
      }
      return res.json(await getMnBallot(found as MnDistrict[], Number(rawYear), source));
    } catch {
      return res.status(500).json({ error: "Unable to load Minnesota ballot" });
    }
  });

  router.get("/holdings", async (_req, res) => {
    try {
      return res.json({ holdings: await getMnHoldings(source) });
    } catch {
      return res.status(500).json({ error: "Unable to load Minnesota holdings" });
    }
  });

  router.get("/cycles", async (_req, res) => {
    try {
      return res.json({ cycles: await getMnElectionCycles(source) });
    } catch {
      return res.status(500).json({ error: "Unable to load Minnesota election cycles" });
    }
  });

  return router;
}

export default createMnBallotRouter();