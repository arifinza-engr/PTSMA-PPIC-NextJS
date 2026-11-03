import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { loadEnvConfig } from "@next/env";
import * as schema from "./schema";

loadEnvConfig(process.cwd());
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL PostgreSQL wajib diisi.");

const globalForDb = globalThis as unknown as {
  __pgPool?: Pool;
};

export const pool = globalForDb.__pgPool ?? new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgPool = pool;
}

export const db = drizzle(pool, { schema });
export * as schema from "./schema";
