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
      permissions text[] NOT NULL DEFAULT '{}'::text[],
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
      agent_key_id varchar REFERENCES agent_api_keys(id) ON DELETE SET NULL,
      agent_name text,
      role text,
      endpoint text NOT NULL,
      method text NOT NULL,
      action text NOT NULL,
      status_code integer NOT NULL,
      success boolean NOT NULL DEFAULT false,
      message text,
      metadata json,
      created_at timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_api_keys_key_hash_idx ON agent_api_keys(key_hash)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_api_keys_status_idx ON agent_api_keys(status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_api_keys_role_idx ON agent_api_keys(role)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_logs_agent_key_idx ON agent_logs(agent_key_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_logs_created_at_idx ON agent_logs(created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_logs_action_idx ON agent_logs(action)`);
}
