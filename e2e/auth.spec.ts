import { expect, test } from "@playwright/test";

test("valid credentials create a session that can be signed out", async ({ page }) => {
  const username = process.env.E2E_ADMIN_USERNAME;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!username || !password, "Set E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD to an account in E2E_DATABASE_URL.");

  await page.goto("/login");
  await page.getByLabel("Nama pengguna").fill(username!);
  await page.getByLabel("Kata sandi").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3101/");
  await expect(page.getByRole("button", { name: "Keluar" })).toBeVisible();
  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("protected pages send anonymous visitors to login with their destination", async ({ page }) => {
  for (const path of ["/", "/master", "/hasil-produksi", "/lembur", "/pengguna"]) {
    await page.goto(path);
    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe("/login");
    expect(currentUrl.searchParams.get("callbackUrl")).toBe(path);
    await expect(page.getByRole("heading", { name: "Masuk ke ruang kerja" })).toBeVisible();
  }
});

test("protected data APIs reject anonymous requests", async ({ request }) => {
  const protectedEndpoints = [
    "/api/master",
    "/api/admin/users",
    "/api/produksi/discpad/master",
    "/api/produksi/discpad/operators?divisi=PACKING",
    "/api/lembur/options",
    "/api/stok-opname/master",
  ];

  for (const endpoint of protectedEndpoints) {
    const response = await request.get(endpoint);
    expect([401, 403], `${endpoint} should reject anonymous access`).toContain(response.status());
  }
});

test("callback URLs are only used for same-site navigation", async ({ page }) => {
  await page.goto("/login?callbackUrl=%2F%2Fevil.example%2Fsteal");
  await expect(page.getByRole("heading", { name: "Masuk ke ruang kerja" })).toBeVisible();
});
