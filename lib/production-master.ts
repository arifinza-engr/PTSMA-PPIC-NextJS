import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, productionProductMaster, productionTarget } from "@/db/schema";
import { PRODUCT_CODES, type ProductionLineConfig, type ProductionOptions, type ProductionProductMaster, type ProductCode, type ProductionOptionCategory } from "./production-master-types";
import { now } from "./shared";
import { availableDetailFields, defaultDetailFields } from "./production-detail-fields";

export const optionCategories: ProductionOptionCategory[] = [
  "types", "grades", "kulits", "codes", "coatings", "tebals", "abOptions", "typeHandles", "posisiHandles", "warnas", "processes",
];

export async function listProductionProducts(activeOnly = true): Promise<ProductionProductMaster[]> {
  const query = db.select().from(productionProductMaster);
  const rows = await (activeOnly
    ? query.where(eq(productionProductMaster.isActive, 1))
    : query).orderBy(asc(productionProductMaster.sortOrder), asc(productionProductMaster.nama));
  return rows as ProductionProductMaster[];
}

export async function getProductionProduct(kode: string, includeInactive = false): Promise<ProductionProductMaster | null> {
  if (!(PRODUCT_CODES as readonly string[]).includes(kode)) return null;
  const [row] = await db.select().from(productionProductMaster).where(eq(productionProductMaster.kode, kode));
  if (!row || (!includeInactive && row.isActive !== 1)) return null;
  return row as ProductionProductMaster;
}

export async function getProductionLine(product: string, name: string, includeInactive = false): Promise<ProductionLineConfig | null> {
  const master = await getProductionProduct(product, includeInactive);
  const line = master?.lines.find((candidate) => candidate.nama === name);
  if (!line || (!includeInactive && line.isActive !== 1)) return null;
  return line;
}

export async function getProductionMaster() {
  return listProductionProducts(false);
}

export function normalizeProductMaster(input: unknown, code: ProductCode): ProductionProductMaster {
  if (!input || typeof input !== "object") throw new Error("Data master produk tidak valid.");
  const value = input as Record<string, unknown>;
  const nama = typeof value.nama === "string" ? value.nama.trim() : "";
  if (!nama || nama.length > 100) throw new Error("Nama produk wajib diisi (maksimal 100 karakter).");
  if (value.isActive !== 0 && value.isActive !== 1) throw new Error("Status produk tidak valid.");
  const rawLines = Array.isArray(value.lines) ? value.lines : [];
  const names = new Set<string>();
  const lines: ProductionLineConfig[] = rawLines.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error("Data lini tidak valid.");
    const row = raw as Record<string, unknown>;
    const lineName = typeof row.nama === "string" ? row.nama.trim().toUpperCase().replace(/\s+/g, " ") : "";
    if (!lineName || lineName.length > 150) throw new Error("Nama lini wajib diisi (maksimal 150 karakter).");
    if (names.has(lineName)) throw new Error(`Lini ${lineName} duplikat pada produk ini.`);
    names.add(lineName);
    const flags = ["isCasting", "isTeam", "hasNg", "hasMerk", "hasCat", "hasMesin", "hasNgB", "hasAb", "hasProductionTotal", "requiresPositiveTotal", "hasProcess", "hasShot", "hasSet", "hasPcsKg"] as const;
    const parsedFlags = Object.fromEntries(flags.map((flag) => {
      const flagValue = row[flag];
      if (flagValue !== 0 && flagValue !== 1) throw new Error(`Konfigurasi ${flag} lini ${lineName} tidak valid.`);
      return [flag, flagValue];
    })) as Pick<ProductionLineConfig, (typeof flags)[number]>;
    const discpadOnly: (keyof typeof parsedFlags)[] = ["hasAb", "hasCat", "hasNgB", "hasProductionTotal", "requiresPositiveTotal", "hasProcess"];
    if (code !== "discpad" && discpadOnly.some((flag) => parsedFlags[flag] === 1)) {
      throw new Error(`Aturan detail lini ${lineName} tidak sesuai dengan jenis produk.`);
    }
    if (parsedFlags.hasMerk && code !== "brakeshoe") throw new Error(`Kolom merk belum didukung untuk ${lineName}.`);
    if (parsedFlags.hasPcsKg && !parsedFlags.isCasting) throw new Error(`Kolom PCS hanya tersedia untuk lini casting (${lineName}).`);
    if (parsedFlags.isCasting && code !== "discpad" && (!parsedFlags.hasShot || !parsedFlags.hasSet || !parsedFlags.hasPcsKg)) {
      throw new Error(`Lini casting ${lineName} harus mengaktifkan Shot, Set, dan PCS.`);
    }
    if (parsedFlags.hasMesin && !parsedFlags.isCasting) throw new Error(`Kolom mesin hanya tersedia untuk lini casting (${lineName}).`);
    if (parsedFlags.requiresPositiveTotal && !parsedFlags.hasProductionTotal) throw new Error(`Total wajib lebih dari nol harus mengaktifkan total produksi (${lineName}).`);
    if ((parsedFlags.hasShot || parsedFlags.hasSet) && !parsedFlags.isCasting && code !== "discpad") {
      throw new Error(`Kolom Shot/Set belum didukung untuk ${lineName}.`);
    }
    if (row.isActive !== 0 && row.isActive !== 1) throw new Error(`Status lini ${lineName} tidak valid.`);
    const targetMetrics = Array.isArray(row.targetMetrics) && row.targetMetrics.every((metric) => ["PCS", "SET", "SHOT"].includes(String(metric)))
      ? [...new Set(row.targetMetrics as ProductionLineConfig["targetMetrics"])] : [];
    const castingCategories = Array.isArray(row.castingCategories) && row.castingCategories.every((category) => typeof category === "string")
      ? [...new Set(row.castingCategories.map((category) => category.trim()).filter(Boolean))] : [];
    const allowedDetailFields = availableDetailFields(code, parsedFlags.isCasting === 1);
    const detailFields = row.detailFields === undefined
      ? defaultDetailFields(code, parsedFlags.isCasting === 1)
      : Array.isArray(row.detailFields) && row.detailFields.every((field) => typeof field === "string" && allowedDetailFields.includes(field as ProductionLineConfig["detailFields"][number]))
        ? [...new Set(row.detailFields as ProductionLineConfig["detailFields"])] : [];
    if (!detailFields.length) throw new Error(`Pilih minimal satu kolom rincian untuk lini ${lineName}.`);
    if (!targetMetrics.length) throw new Error(`Metrik target lini ${lineName} tidak valid.`);
    const pcsPerSet = Number(row.pcsPerSet);
    if (!Number.isFinite(pcsPerSet) || pcsPerSet < 0 || pcsPerSet > 1_000_000) throw new Error(`Konversi PCS per SET lini ${lineName} tidak valid.`);
    if (code === "discpad" && parsedFlags.isCasting) throw new Error(`Lini ${lineName}: mode Casting hanya tersedia untuk Brakeshoe dan Handle.`);
    if (parsedFlags.hasNg && parsedFlags.hasNgB) throw new Error(`Pilih Kolom NG atau Kolom NG A/B pada lini ${lineName}, bukan keduanya.`);
    if (!parsedFlags.isCasting && castingCategories.length) throw new Error(`Kategori casting hanya boleh dipakai pada lini casting (${lineName}).`);
    return { ...parsedFlags, targetMetrics, castingCategories, detailFields, pcsPerSet, nama: lineName, jenis: code, isActive: row.isActive, sortOrder: index };
  });

  const rawOptions = value.options && typeof value.options === "object" ? value.options as Record<string, unknown> : {};
  const options = {} as ProductionOptions;
  for (const category of optionCategories) {
    const raw = rawOptions[category];
    if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) throw new Error(`Daftar master ${category} tidak valid.`);
    const entries = raw.map((item) => (item as string).trim()).filter(Boolean);
    if (entries.some((item) => item.length > 150)) throw new Error(`Nilai master ${category} maksimal 150 karakter.`);
    options[category] = [...new Set(entries)];
  }
  for (const line of lines) {
    if (line.hasProcess && options.processes.length === 0) throw new Error(`Tambahkan opsi proses sebelum mengaktifkan proses pada lini ${line.nama}.`);
    if (line.hasShot && !line.targetMetrics.includes("SHOT")) throw new Error(`Metrik target lini ${line.nama} harus mencakup SHOT.`);
    if (line.targetMetrics.includes("SHOT") && !line.hasShot) throw new Error(`Aktifkan kolom Shot sebelum memakai metrik target SHOT pada lini ${line.nama}.`);
  }
  const sortOrder = Number(value.sortOrder ?? 0);
  if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) throw new Error("Urutan produk tidak valid.");
  return { kode: code, nama, isActive: value.isActive, sortOrder, lines, options };
}

export async function saveProductionProductMaster(code: string, input: unknown) {
  if (!(PRODUCT_CODES as readonly string[]).includes(code)) throw new Error("Kode produk tidak dikenal.");
  const productCode = code as ProductCode;
  const value = normalizeProductMaster(input, productCode);
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(productionProductMaster).where(eq(productionProductMaster.kode, productCode));
    if (!before) throw new Error("Master produk tidak ditemukan.");
    await tx.update(productionProductMaster).set({
      nama: value.nama, isActive: value.isActive, sortOrder: value.sortOrder,
      lines: value.lines, options: value.options,
    }).where(eq(productionProductMaster.kode, productCode));
    await tx.insert(auditLog).values({
      entity: "production_product_master", entityId: PRODUCT_CODES.indexOf(productCode) + 1,
      aksi: "update", actor: "admin", detail: JSON.stringify({ before, after: value }), createdAt: now(),
    });
    return { kode: productCode };
  });
}

export async function deleteProductionLine(code: string, lineName: string) {
  if (!(PRODUCT_CODES as readonly string[]).includes(code)) throw new Error("Kode produk tidak dikenal.");
  const productCode = code as ProductCode;
  const normalizedName = lineName.trim().toUpperCase().replace(/\s+/g, " ");
  if (!normalizedName) throw new Error("Nama lini wajib diisi.");

  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(productionProductMaster).where(eq(productionProductMaster.kode, productCode));
    if (!before) throw new Error("Master produk tidak ditemukan.");
    const line = before.lines.find((candidate) => candidate.nama === normalizedName);
    if (!line) throw new Error("Master lini tidak ditemukan.");
    if (line.isActive === 0) throw new Error("Master lini ini sudah dihapus dari pilihan input.");

    const lines = before.lines.filter((candidate) => candidate.nama !== normalizedName);
    await tx.update(productionProductMaster).set({ lines }).where(eq(productionProductMaster.kode, productCode));
    const relatedTargets = await tx.select().from(productionTarget).where(and(
      eq(productionTarget.produk, productCode), eq(productionTarget.lini, normalizedName),
    ));
    for (const target of relatedTargets) {
      await tx.insert(auditLog).values({
        entity: "production_target", entityId: target.id, aksi: "delete", actor: "admin",
        detail: JSON.stringify({ action: "line_hard_delete", row: target }), createdAt: now(),
      });
    }
    if (relatedTargets.length) await tx.delete(productionTarget).where(and(
      eq(productionTarget.produk, productCode), eq(productionTarget.lini, normalizedName),
    ));
    await tx.insert(auditLog).values({
      entity: "production_product_master", entityId: PRODUCT_CODES.indexOf(productCode) + 1,
      aksi: "delete", actor: "admin",
      detail: JSON.stringify({ action: "hard_delete_line", produk: productCode, before: line, removedTargetCount: relatedTargets.length }),
      createdAt: now(),
    });
    return { success: true, lini: normalizedName, removedTargets: relatedTargets.length };
  });
}
