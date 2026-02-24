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
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
  allowExitOnIdle: false,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('remove', () => {
  console.log('Database connection removed from pool');
});

async function warmPool() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection verified');
  } catch (err) {
    console.error('Failed to warm database pool:', err);
  }
}

warmPool();
setInterval(warmPool, 60000);

export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isConnectionError = 
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === '57P01' ||
        error.code === '57P03' ||
        error.code === '08006' ||
        error.code === '08003' ||
        error.code === '08001' ||
        error.message?.includes('Connection terminated') ||
        error.message?.includes('connection lost') ||
        error.message?.includes('Client has encountered a connection error');
      
      if (isConnectionError && attempt < retries) {
        console.warn(`Database query failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${(attempt + 1) * 500}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 500));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Unreachable');
}

export const db = drizzle(pool, { schema });
