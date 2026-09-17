import { sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";

const MIGRATION_ID = "candidate-profile-directory-eligibility-v4";

export async function runCandidateProfileMigration(): Promise<{
  searchableGain: number;
  districtLinksRepaired: number;
  skippedIncomplete: number;
  skippedAmbiguous: number;
} | null> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS app_data_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now(),
      report jsonb
    )
  `);

  const existing = await db.execute(sql`
    SELECT id FROM app_data_migrations WHERE id = ${MIGRATION_ID} LIMIT 1
  `);
  if (existing.rows.length > 0) return null;

  const report = await storage.reconcileImportedCandidateProfiles();
  await db.execute(sql`
    INSERT INTO app_data_migrations (id, report)
    VALUES (${MIGRATION_ID}, ${JSON.stringify(report)}::jsonb)
    ON CONFLICT (id) DO NOTHING
  `);
  return report;
}