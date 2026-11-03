import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const testDatabaseUrl = process.env.E2E_DATABASE_URL;
if (!testDatabaseUrl) throw new Error("E2E_DATABASE_URL wajib menunjuk database PostgreSQL khusus E2E.");

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: devices["Desktop Chrome"],
    },
  ],
  webServer: {
    command: "npm run dev -- -p 3101",
    url: "http://127.0.0.1:3101/",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      LEMBUR_STORAGE_DIR: "./storage/e2e-lembur",
    },
  },
});
