import { expect, test } from "@playwright/test";

test("catat PACKING tanpa login, lalu lihat hasil", async ({ page }) => {
  await page.goto("/hasil-produksi");
  await expect(page).toHaveURL(/\/hasil-produksi$/);

  const masterResponse = await page.request.get("/api/produksi/discpad/master");
  expect(masterResponse.ok()).toBeTruthy();
  const master = await masterResponse.json();
  expect(master.divisiOptions).toContain("PACKING");
  const operatorsResponse = await page.request.get("/api/produksi/discpad/operators?divisi=PACKING");
  const operators: string[] = await operatorsResponse.json();
  expect(operators.length).toBeGreaterThan(0);

  const payload = {
    divisi: "PACKING", tanggal: "2099-12-28", shift: "Shift 1", jam: "8",
    anggotaTim: [operators[0]], jumlahProduksi: 321,
    items: [{ kode: "C210", cat: "HOT53", tebal: "2.0 MM", qty: 642, ngA: 0, ngB: 0 }],
  };
  const saveResponse = await page.request.post("/api/produksi/discpad", { data: payload });
  expect(saveResponse.ok(), await saveResponse.text()).toBeTruthy();
  const duplicate = await page.request.post("/api/produksi/discpad", { data: payload });
  expect(duplicate.status()).toBe(400);

  await page.goto("/hasil-produksi?line=discpad&divisi=PACKING&from=2099-12-28&to=2099-12-28");
  await page.getByRole("button", { name: "Tampilkan" }).click();
  await expect(page.getByRole("table")).toContainText("321");
  const masterAdminResponse = await page.request.get("/api/master");
  expect(masterAdminResponse.ok()).toBeTruthy();
});

test("daftar lembur dan master dapat dibuka tanpa login", async ({ page }) => {
  await page.goto("/master");
  await expect(page.getByRole("heading", { name: "Master Data" })).toBeVisible();
  await expect(page.getByText("Karyawan", { exact: true }).first()).toBeVisible();
  const created = await page.request.post("/api/master", { data: {
    kind: "product", value: { productLineId: null, type: "E2E PRODUCT", grade: "A", kulit: "TEST" },
  } });
  expect(created.ok(), await created.text()).toBeTruthy();
  const { id } = await created.json();
  const changed = await page.request.put("/api/master", { data: {
    kind: "product", id, value: { productLineId: null, type: "E2E PRODUCT", grade: "B", kulit: "TEST" },
  } });
  expect(changed.ok()).toBeTruthy();
  const removed = await page.request.delete("/api/master", { data: { kind: "product", id } });
  expect(removed.ok()).toBeTruthy();
  await page.goto("/lembur/daftar");
  await expect(page.getByRole("heading", { name: "Daftar Lembur" })).toBeVisible();
});

test("laporan produksi dapat diubah dan dihapus tanpa login", async ({ page }) => {
  const operators: string[] = await (await page.request.get("/api/produksi/brakeshoe/operators?divisi=PER")).json();
  expect(operators.length).toBeGreaterThan(0);
  const created = await page.request.post("/api/produksi/brakeshoe", { data: {
    divisi: "PER", tanggal: "2099-12-26", shift: "Shift 1", jam: "8", operator: operators[0],
    items: [{ type: "TEST", grade: "A", kulit: "HITAM", qty: 5, ng: 0 }],
  } });
  expect(created.ok(), await created.text()).toBeTruthy();
  const data = await (await page.request.get("/api/produksi/brakeshoe/data?divisi=PER&from=2099-12-26&to=2099-12-26")).json();
  const id = data.recordIds[0] as number;
  expect(id).toBeGreaterThan(0);
  await page.goto(`/produksi/brakeshoe?edit=${id}`);
  await expect(page.getByRole("heading", { name: "Ubah Produksi Brakeshoe" })).toBeVisible();
  await expect(page.locator('input[type="date"]')).toHaveValue("2099-12-26");
  await page.getByRole("button", { name: "Simpan Perubahan" }).click();
  await expect(page.getByText("Laporan produksi berhasil diperbarui.")).toBeVisible();
  const removed = await page.request.delete(`/api/produksi/record/${id}`);
  expect(removed.ok(), await removed.text()).toBeTruthy();
});

test("bukti lembur dan persetujuan dapat dikelola tanpa login", async ({ page }) => {
  const options = await (await page.request.get("/api/lembur/options")).json();
  expect(options.divisiOptions).toContain("SPRAY");
  expect(options.atasanOptions.length).toBeGreaterThan(0);
  const names: string[] = await (await page.request.get("/api/lembur?divisi=SPRAY")).json();
  expect(names.length).toBeGreaterThan(0);

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==", "base64");
  const uploaded = await page.request.post("/api/lembur/upload", { multipart: {
    nama: names[0], tanggal: "2099-12-27", bukti: { name: "bukti.png", mimeType: "image/png", buffer: png },
  } });
  expect(uploaded.ok(), await uploaded.text()).toBeTruthy();
  const { url } = await uploaded.json();
  expect(url).toMatch(/^\/api\/lembur\/bukti\//);
  expect((await page.request.get(url)).status()).toBe(404);

  const saved = await page.request.post("/api/lembur", { data: {
    tanggal: "2099-12-27", divisi: "SPRAY", nama: names[0], jamMulai: "18:00", jamSelesai: "20:00",
    alasan: "Pengujian integrasi", atasan: options.atasanOptions[0], persetujuanAtasan: "Sudah Disetujui", buktiUrl: url,
  } });
  expect(saved.ok(), await saved.text()).toBeTruthy();
  const list = await (await page.request.get("/api/lembur?list=1")).json();
  const record = list.find((entry: { buktiUrl: string }) => entry.buktiUrl === url);
  expect(record?.status).toBe("Menunggu");
  expect((await page.request.get(url)).status()).toBe(200);
  const approved = await page.request.patch(`/api/lembur/${record.id}`, { data: { status: "Disetujui" } });
  expect(approved.ok()).toBeTruthy();
  const deleted = await page.request.delete(`/api/lembur/${record.id}`);
  expect(deleted.ok()).toBeTruthy();
  expect((await page.request.get(url)).status()).toBe(404);
});
