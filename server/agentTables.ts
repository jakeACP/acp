import { sql } from "drizzle-orm";
import { db } from "./db";

export async function ensureAgentGatewayTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_api_keys (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      key_hash text NOT NULL UNIQUE,
      key_prefix text NOT NULL,
      role text NOT NULL,
      permissions json NOT NULL DEFAULT '{}'::json,
      rate_limit integer NOT NULL DEFAULT 100,
      sandbox_mode boolean NOT NULL DEFAULT false,
      status text NOT NULL DEFAULT 'active',
      created_by varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp DEFAULT now(),
      last_used_at timestamp,
      revoked_at timestamp
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_logs (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      api_key_id varchar REFERENCES agent_api_keys(id) ON DELETE SET NULL,
      agent_name text,
      role text,
      endpoint text NOT NULL,
      method text NOT NULL,
      action text NOT NULL,
      payload json,
      response json,
      response_status integer NOT NULL DEFAULT 200,
      ip text,
      sandbox boolean NOT NULL DEFAULT false,
      status text NOT NULL DEFAULT 'success',
      success boolean NOT NULL DEFAULT false,
      message text,
      metadata json,
      created_at timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`ALTER TABLE agent_api_keys ADD COLUMN IF NOT EXISTS rate_limit integer NOT NULL DEFAULT 100`);
  await db.execute(sql`ALTER TABLE agent_api_keys ALTER COLUMN rate_limit SET DEFAULT 100`);
  await db.execute(sql`ALTER TABLE agent_api_keys ADD COLUMN IF NOT EXISTS sandbox_mode boolean NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE agent_api_keys ALTER COLUMN permissions DROP DEFAULT`);
  await db.execute(sql`ALTER TABLE agent_api_keys ALTER COLUMN permissions TYPE json USING CASE WHEN json_typeof(to_json(permissions)) = 'array' THEN '{}'::json ELSE to_json(permissions) END`);
  await db.execute(sql`ALTER TABLE agent_api_keys ALTER COLUMN permissions SET DEFAULT '{}'::json`);
  await db.execute(sql`ALTER TABLE agent_api_keys ALTER COLUMN permissions SET NOT NULL`);

  await db.execute(sql`ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS api_key_id varchar REFERENCES agent_api_keys(id) ON DELETE SET NULL`);
  await db.execute(sql`ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS payload json`);
  await db.execute(sql`ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS response json`);
  await db.execute(sql`ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS response_status integer NOT NULL DEFAULT 200`);
  await db.execute(sql`ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS ip text`);
  await db.execute(sql`ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS sandbox boolean NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'success'`);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_api_keys_key_hash_idx ON agent_api_keys(key_hash)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_api_keys_status_idx ON agent_api_keys(status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_api_keys_role_idx ON agent_api_keys(role)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_logs_api_key_idx ON agent_logs(api_key_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_logs_created_at_idx ON agent_logs(created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_logs_action_idx ON agent_logs(action)`);
}
