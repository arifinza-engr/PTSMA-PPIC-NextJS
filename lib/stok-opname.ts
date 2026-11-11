// Backend stok opname — port dari SO.gs (dinormalisasi: matrix -> tabel panjang)

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, stokOpname } from "@/db/schema";
import { clean, now, toInt, uniqSort } from "./shared";
import { todayWIBISO } from "./date";
import STOCK_CATALOG from "./stock-options.json";

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

/**
 * Get hardcoded options for stok opname form:
 * - items: op+kode pairs from the application catalog
 * - codes: unique kode list
 * - powders: unique powder coating list
 * - months: month options
 */
export async function getStokOpnameMaster() {
  const rows = STOCK_CATALOG;

  const items: { op: string | null; kode: string | null }[] = [];
  const codes: string[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    if (r.kode && r.kode !== "-") {
      const key = r.kode.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ op: r.op, kode: r.kode });
        codes.push(r.kode);
      }
    }
  }

  return {
    items,
    codes,
    powders: uniqSort(rows.map((r) => r.powder)),
    months: MONTHS,
    years: Array.from({ length: 7 }, (_, i) => Number(todayWIBISO().slice(0, 4)) - 3 + i),
    refreshDelayMs: 3000,
  };
}

/**
 * Submit stok opname entry.
 * Upsert based on unique key: (bulan, tahun, op, kode, powder)
 */
export async function submitStokOpname(payload: {
  bulan?: unknown;
  tahun?: unknown;
  kode?: unknown;
  powder?: unknown;
  nilaiA?: unknown;
  nilaiB?: unknown;
}): Promise<string> {
  payload = payload || {};

  const bulan = toInt(payload.bulan);
  const tahun = toInt(payload.tahun);
  const kode = clean(payload.kode);
  const powder = clean(payload.powder);
  const nilaiA = toInt(payload.nilaiA) ?? 0;
  const nilaiB = toInt(payload.nilaiB) ?? 0;

  if (!bulan || bulan < 1 || bulan > 12) throw new Error("Bulan harus 1 sampai 12.");
  if (!tahun || tahun < 2000 || tahun > 2100) throw new Error("Tahun harus 2000 sampai 2100.");
  if (!kode) throw new Error("Kode wajib dipilih.");
  if (!powder) throw new Error("Powder coating wajib dipilih.");
  if (nilaiA < 0 || nilaiB < 0) throw new Error("Nilai stok tidak boleh negatif.");
  if (payload.nilaiA != null && payload.nilaiA !== "" && toInt(payload.nilaiA) === null) throw new Error("Nilai A tidak valid.");
  if (payload.nilaiB != null && payload.nilaiB !== "" && toInt(payload.nilaiB) === null) throw new Error("Nilai B tidak valid.");

  // Resolve op & type from the hardcoded application catalog
  const p = STOCK_CATALOG.find((row) => row.kode === kode && row.powder === powder);
  if (!p) throw new Error("Kombinasi kode dan powder tidak ada di katalog.");

  const op = p.op ?? "";
  const type = p.type ?? null;

  await db.transaction(async tx => {
    const [existing] = await tx.select().from(stokOpname).where(and(
      eq(stokOpname.bulan, bulan), eq(stokOpname.tahun, tahun), eq(stokOpname.op, op),
      eq(stokOpname.kode, kode), eq(stokOpname.powder, powder),
    ));
    if (existing) await tx.insert(auditLog).values({ entity: "stok_opname", entityId: existing.id,
      aksi: "update", actor: "operator", detail: JSON.stringify({ before: existing, after: { gradeA: nilaiA, gradeB: nilaiB } }),
      createdAt: now() });
    await tx.insert(stokOpname)
      .values({ bulan, tahun, op, kode, type, powder, gradeA: nilaiA, gradeB: nilaiB, createdAt: now() })
      .onConflictDoUpdate({ target: [stokOpname.bulan, stokOpname.tahun, stokOpname.op, stokOpname.kode, stokOpname.powder],
        set: { gradeA: nilaiA, gradeB: nilaiB, createdAt: now() } });
  });

  return `✅ Stok opname tersimpan | Kode: ${kode} | Powder: ${powder}`;
}

export async function updateStokOpname(id: number, payload: {
  bulan?: unknown; tahun?: unknown; kode?: unknown; powder?: unknown; nilaiA?: unknown; nilaiB?: unknown;
}): Promise<string> {
  const [existing] = await db.select().from(stokOpname).where(eq(stokOpname.id, id));
  if (!existing) throw new Error("Entri stok tidak ditemukan.");
  if (Number(payload.bulan) !== existing.bulan || Number(payload.tahun) !== existing.tahun ||
      clean(payload.kode) !== existing.kode || clean(payload.powder) !== existing.powder) {
    throw new Error("Identitas entri stok tidak boleh diubah.");
  }
  return submitStokOpname(payload);
}

export async function stokEntryExists(bulan: number, tahun: number, kode: string, powder: string): Promise<boolean> {
  return Boolean((await db.select({ id: stokOpname.id }).from(stokOpname).where(and(
    eq(stokOpname.bulan, bulan), eq(stokOpname.tahun, tahun),
    eq(stokOpname.kode, kode), eq(stokOpname.powder, powder),
  )))[0]);
}

/**
 * Preview stok opname data for a given month/year.
 * Returns matrix format with headers and rows for display.
 */
export async function getStokOpnamePreview(params: {
  bulan?: unknown;
  tahun?: unknown;
}) {
  params = params || {};

  const bulan = toInt(params.bulan);
  const tahun = toInt(params.tahun);

  if (!bulan || !tahun || bulan < 1 || bulan > 12 || tahun < 2000 || tahun > 2100) {
    return { headers: [], rows: [], sheetName: "", exists: false };
  }

  const rows = await db
    .select()
    .from(stokOpname)
    .where(and(eq(stokOpname.bulan, bulan), eq(stokOpname.tahun, tahun)))
    .orderBy(asc(stokOpname.kode))
    ;
  if (!rows.length) return { headers: [], rows: [], sheetName: `${bulan}-${tahun}`, exists: false };

  const catalog = [...STOCK_CATALOG].sort((a, b) => (a.kode ?? "").localeCompare(b.kode ?? ""));
  const powders = uniqSort(catalog.map((r) => r.powder));
  const keyed = new Map<string, { op: string; kode: string }>();
  const values = new Map<string, { a: number; b: number }>();

  for (const item of catalog) {
    if (!item.kode || item.kode === "-" || keyed.has(item.kode)) continue;
    keyed.set(item.kode, { op: item.op ?? "", kode: item.kode });
  }

  for (const r of rows) {
    values.set(`${r.kode}\u0000${r.powder}`, { a: r.gradeA, b: r.gradeB });
  }

  // Build the same monthly matrix as PPIC V1: NO | KODE (OP) | TYPE (kode) | powder grades.
  const headers = ["NO", "KODE", "TYPE"];
  for (const pw of powders) {
    headers.push(`${pw} A`, `${pw} B`);
  }
  headers.push("TOTAL A", "TOTAL B");

  const out: (string | number | null)[][] = [];
  let i = 0;

  for (const [kode, meta] of keyed) {
    i++;
    const row: (string | number | null)[] = [i, meta.op, meta.kode];
    let ta = 0;
    let tb = 0;

    for (const pw of powders) {
      const value = values.get(`${kode}\u0000${pw}`);
      const a = value?.a;
      const b = value?.b;
      ta += a ?? 0;
      tb += b ?? 0;
      row.push(a ?? "", b ?? "");
    }

    row.push(ta, tb);
    out.push(row);
  }

  return {
    headers,
    rows: out,
    sheetName: `${bulan}-${tahun}`,
    exists: rows.length > 0,
  };
}

// Aliases untuk kompatibilitas dengan naming di GAS
export { getStokOpnamePreview as getStokOpnameData };

export async function listStokOpname(bulan: number, tahun: number) {
  if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12 || !Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
    throw new Error("Periode tidak valid.");
  }
  return await db.select().from(stokOpname)
    .where(and(eq(stokOpname.bulan, bulan), eq(stokOpname.tahun, tahun)))
    .orderBy(asc(stokOpname.kode), asc(stokOpname.powder));
}

export async function deleteStokOpname(id: number) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID stok tidak valid.");
  await db.transaction(async tx => {
    const [before] = await tx.select().from(stokOpname).where(eq(stokOpname.id, id));
    if (!before) throw new Error("Data stok tidak ditemukan.");
    await tx.insert(auditLog).values({ entity: "stok_opname", entityId: id, aksi: "delete",
      actor: "admin", detail: JSON.stringify(before), createdAt: now() });
    await tx.delete(stokOpname).where(eq(stokOpname.id, id));
  });
  return { success: true };
}
