import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // cap concurrent connections to protect DB server
  idleTimeoutMillis: 30_000,    // release idle connections after 30 s
  connectionTimeoutMillis: 2_000, // fail fast if no connection available within 2 s
});
export const db = drizzle(pool, { schema });
