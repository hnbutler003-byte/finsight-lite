import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL (or DATABASE_URL) must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: dbUrl,
  max: 20,                      // cap concurrent connections to protect DB server
  idleTimeoutMillis: 30_000,    // release idle connections after 30 s
  connectionTimeoutMillis: 2_000, // fail fast if no connection available within 2 s
});
export const db = drizzle(pool, { schema });

/**
 * Startup connectivity probe.
 * Runs a lightweight SELECT 1 against the pool and throws if the database
 * is unreachable or doesn't respond within `timeoutMs`. Call this once at
 * boot so failures surface immediately rather than on the first real request.
 */
export async function probeDatabase(timeoutMs = 5_000): Promise<void> {
  const client = await pool.connect();
  try {
    await Promise.race([
      client.query("SELECT 1"),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`DB probe timed out after ${timeoutMs} ms`)),
          timeoutMs,
        )
      ),
    ]);
  } finally {
    client.release();
  }
}
