import { Router, type Response } from "express";
import {
  getMnBoundaryIndex,
  getMnPrecincts,
  matchMnPoint,
  MnBoundaryDataError,
} from "./lib/mn-boundaries";

const router = Router();

function boundaryError(res: Response, error: unknown): void {
  if (error instanceof MnBoundaryDataError) {
    res.status(503).json({ error: "Minnesota boundary data unavailable", detail: error.message });
    return;
  }
  console.error("Minnesota boundary request failed", error);
  res.status(500).json({ error: "Minnesota boundary request failed" });
}

router.get("/index", async (_req, res) => {
  try {
    res.json(await getMnBoundaryIndex());
  } catch (error) {
    boundaryError(res, error);
  }
});

router.get("/precincts", async (_req, res) => {
  try {
    res.json(await getMnPrecincts());
  } catch (error) {
    boundaryError(res, error);
  }
});

router.get("/match", async (req, res) => {
  const latValue = Array.isArray(req.query.lat) ? undefined : req.query.lat;
  const lngValue = Array.isArray(req.query.lng) ? undefined : req.query.lng;
  const lat = typeof latValue === "string" && latValue.trim() !== "" ? Number(latValue) : Number.NaN;
  const lng = typeof lngValue === "string" && lngValue.trim() !== "" ? Number(lngValue) : Number.NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)
      || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({
      error: "Valid lat and lng query parameters are required",
    });
    return;
  }

  try {
    res.json(await matchMnPoint(lat, lng));
  } catch (error) {
    boundaryError(res, error);
  }
});

export default router;