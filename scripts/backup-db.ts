import { loadEnvConfig } from "@next/env";
import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

loadEnvConfig(process.cwd());

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL PostgreSQL wajib diisi.");
  const directory = path.resolve(process.env.PG_BACKUP_DIR ?? "../db/backups");
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(directory, `ppic-${stamp}.dump`);
  const result = spawnSync("pg_dump", ["--dbname", databaseUrl, "--format=custom", "--file", destination], { stdio: "inherit" });
  if (result.error) throw new Error(`pg_dump tidak dapat dijalankan: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`pg_dump gagal dengan kode ${result.status}.`);
  console.log(`Backup PostgreSQL tersimpan: ${destination}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
