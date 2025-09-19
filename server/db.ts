import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 60000, // 60 seconds
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false },
  // Add retry and reconnection options
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // Don't exit the process, let the pool handle reconnection
});

pool.on('connect', (client) => {
  console.log('Database connection established');
});

pool.on('remove', (client) => {
  console.log('Database connection removed from pool');
});

export const db = drizzle(pool, { schema });