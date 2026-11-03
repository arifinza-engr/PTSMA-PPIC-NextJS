import { loadEnvConfig } from "@next/env";

/** Tests require a separately provisioned PostgreSQL database. */
export function prepareTestDb(): string {
  loadEnvConfig(process.cwd());
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) throw new Error("TEST_DATABASE_URL wajib menunjuk database PostgreSQL khusus pengujian.");
  process.env.DATABASE_URL = databaseUrl;
  return databaseUrl;
}
