// Backend produksi ter-unifikasi (brakeshoe / discpad / handle).
// Port dari brakeshoe.gs + discpad.gs + handle.gs, di-deduplikasi lewat flag lini.

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/db";
import {
  auditLog,
  karyawan,
  produksiBrakeshoe,
  produksiDiscpad,
  produksiHandle,
} from "@/db/schema";
import { clean, isRemovedLini, normalizeLini, now, toFloat, toInt, uniqSort } from "./shared";
import { isValidISODate } from "./date";
import { parseProduction } from "./validation";
import { FORM_MASTER } from "./form-options";

export type Line = "brakeshoe" | "discpad" | "handle";
type ProductionPayload = ReturnType<typeof parseProduction>;
type ProductionItemPayload = ProductionPayload["items"][number];
type ProductionQuery = { lini?: string | null; from?: string | null; to?: string | null; limit?: number | string | null };
type ReportCell = string | number | null;

type LineConfig = (typeof FORM_MASTER.lines)[number];
type Prod = typeof produksiBrakeshoe.$inferSelect;
type Item = Record<string, string | number | null>;
type ProductionTable = typeof produksiBrakeshoe | typeof produksiDiscpad | typeof produksiHandle;

function productionTable(line: Line): ProductionTable {
  if (line === "brakeshoe") return produksiBrakeshoe;
  if (line === "discpad") return produksiDiscpad;
  return produksiHandle;
}

async function getLiniRow(line: string, nama: string) {
  const d = normalizeLini(line, nama);
  if (!d) return undefined;
  return FORM_MASTER.lines.find((row) => row.jenis === line && row.nama === d);
}

async function validateKaryawan(name: string, liniName: string): Promise<void> {
  const n = clean(name);
  const existing = (await db
    .select({ id: karyawan.id })
    .from(karyawan)
    .where(and(eq(karyawan.nama, n), eq(karyawan.lini, liniName), eq(karyawan.isActive, 1)))
    )[0];
  if (existing) return;
  throw new Error(`Operator ${n} tidak ada dalam daftar karyawan aktif lini.`);
}

// ---------------- master ----------------

async function buildProductOptions(line: string) {
  const options = FORM_MASTER.products[line as keyof typeof FORM_MASTER.products];
  if (!options) throw new Error("Jenis produk tidak dikenal: " + line);
  if (line === "brakeshoe") return { types: options.types, grades: options.grades, kulits: options.kulits };
  if (line === "discpad") return { codes: options.codes, tebals: options.tebals, coatings: options.coatings, abOptions: options.abOptions };
  return { typeHandles: options.typeHandles, warnas: options.warnas, posisiHandles: options.posisiHandles };
}

export async function getMaster(line: string, liniName?: string) {
  const configuredLines = FORM_MASTER.lines.filter((row) => row.jenis === line);
  if (!configuredLines.length) throw new Error("Jenis produk tidak dikenal: " + line);
  let liniOptions = configuredLines.map((row) => row.nama);
  let linis = configuredLines.map(({ nama, isCasting, isTeam, hasNg, hasMerk, hasCat, hasMesin, hasNgB }) =>
    ({ nama, isCasting, isTeam, hasNg, hasMerk, hasCat, hasMesin, hasNgB }));
  const operatorOptions = liniName ? await getOperators(line, liniName) : [];
  const productOptions = await buildProductOptions(line);
  const refreshDelayMs = line === "discpad" ? 3000 : 15000;

  if (line === "brakeshoe") {
    liniOptions = liniOptions.filter((n) => !isRemovedLini(n));
    linis = linis.filter((d) => !isRemovedLini(d.nama));
  }

  liniOptions.sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base", numeric: true }));

  if (line === "discpad") {
    return {
      liniOptions,
      linis,
      operatorOptions,
      teamMemberOptions: operatorOptions,
      productOptions,
      paintingProcessOptions: ["Painting 1", "Painting 2"],
      abOptions: productOptions.abOptions,
      refreshDelayMs,
    };
  }
  if (line === "handle") {
    return {
      liniOptions,
      linis,
      operatorOptions,
      handleOptions: productOptions,
      productOptions,
      refreshDelayMs,
    };
  }
  return { liniOptions, linis, productOptions, operatorOptions, refreshDelayMs };
}

export async function getOperators(line: string, liniName: string): Promise<string[]> {
  const d = await getLiniRow(line, liniName);
  if (!d) return [];
  return uniqSort(
    (await db
      .select({ nama: karyawan.nama })
      .from(karyawan)
      .where(and(eq(karyawan.lini, d.nama), eq(karyawan.isActive, 1)))
      )
      .map((r) => r.nama),
  );
}

// ---------------- submit ----------------

function resolveOperators(d: LineConfig, payload: ProductionPayload): string[] {
  if (d.isTeam) {
    const names = (Array.isArray(payload.anggotaTim) ? payload.anggotaTim : [])
      .map(clean)
      .filter(Boolean);
    if (!names.length) throw new Error("Minimal pilih 1 anggota tim.");
    return names;
  }
  const op = clean(payload.operator);
  if (!op) throw new Error("Operator wajib dipilih.");
  return [op];
}

function buildItem(
  line: Line,
  d: LineConfig,
  it: ProductionItemPayload,
  payload: ProductionPayload,
): Item {
  it = it || {};
  if (line === "brakeshoe") {
    if (d.isCasting) {
      return {
        type: clean(it.type) || "-",
        grade: clean(it.grade) || "-",
        mesin: clean(payload.mesin) || null,
        qtyShot: toInt(payload.jumlahShot),
        qtySet: toInt(payload.jumlahSet),
        qtyPcs: toInt(payload.jumlahPcs),
        qtyKg: toFloat(payload.jumlahKg),
      };
    }
    return {
      type: clean(it.type) || "-",
      grade: clean(it.grade) || "-",
      kulit: clean(it.kulit) || "-",
      merk: d.hasMerk ? clean(it.merk) || "-" : null,
      qty: toInt(it.qty) || 0,
      ng: d.hasNg ? toInt(it.ng) : null,
    };
  }

  if (line === "discpad") {
    return {
      kode: clean(it.kode) || null,
      gradeAb: d.nama === "PACKING" ? null : clean(it.ab) || null,
      cat: d.hasCat ? clean(it.cat) || null : null,
      tebal: clean(it.tebal) || null,
      qty: toInt(it.qty) || 0,
      ng: d.hasNg ? toInt(it.ng) : d.hasNgB ? toInt(it.ngA) : null,
      ngB: d.hasNgB ? toInt(it.ngB) : null,
      qtySet: d.nama === "PRESS CETAK" ? null : toFloat(payload.jumlahSet),
      qtyShot: d.nama === "PRESS CETAK" ? toInt(payload.jumlahShot) : null,
    };
  }

  // handle
  if (d.isCasting) {
    return {
      typeHandle: clean(it.typeHandle) || "-",
      grade: "-",
      posisiHandle: clean(it.posisiHandle) || null,
      warna: clean(it.warna) || null,
      mesin: clean(payload.mesin) || null,
      qtyShot: toInt(payload.jumlahShot),
      qtySet: toInt(payload.jumlahSet),
      qtyPcs: toInt(payload.jumlahPcs),
      qtyKg: toFloat(payload.jumlahKg),
    };
  }
  return {
    typeHandle: clean(it.typeHandle) || "-",
    posisiHandle: clean(it.posisiHandle) || null,
    warna: clean(it.warna) || "-",
    qty: toInt(it.qty) || 0,
    ng: toInt(it.ng),
  };
}

export async function submitProduksi(line: Line, input: unknown): Promise<string> {
  const payload = parseProduction(input);
  const d = await getLiniRow(line, payload.lini);
  if (!d) throw new Error("Lini wajib dipilih.");

  const tanggal = clean(payload.tanggal);
  if (!isValidISODate(tanggal)) throw new Error("Tanggal tidak valid.");
  const shift = clean(payload.shift) || "-";
  const jam = clean(payload.jamKerja || payload.jam) || "-";
  const keterangan = clean(payload.keterangan) || null;

  const items = payload.items;
  if (!items.length) throw new Error("Detail produksi minimal 1 item.");
  if (items.length > 100) throw new Error("Maksimal 100 item per laporan.");

  const operatorNames = resolveOperators(d, payload);
  const qtyTotal =
    line === "discpad"
      ? toInt(payload.jumlahProduksi ?? payload.hasilProduksi)
      : null;
  if (line === "discpad" && (qtyTotal == null || qtyTotal < 0)) {
    throw new Error("Jumlah produksi (PCS) wajib diisi.");
  }
  const proses = line === "discpad" && d.nama === "PAINTING" ? clean(payload.proses) : null;
  if (line === "discpad" && d.nama === "PAINTING" && !["Painting 1", "Painting 2"].includes(proses || "")) {
    throw new Error("Proses painting harus Painting 1 atau Painting 2.");
  }
  const requestHash = createHash("sha256").update(JSON.stringify({
    line, lini: d.nama, tanggal, shift, jam, operatorNames, items, qtyTotal, proses,
    mesin: clean(payload.mesin), shot: payload.jumlahShot, set: payload.jumlahSet,
  })).digest("hex");

  const table = productionTable(line);
  await db.transaction(async (tx) => {
    const duplicate = (await tx.select({ id: table.id }).from(table)
      .where(and(eq(table.requestHash, requestHash), gte(table.createdAt, new Date(Date.now() - 60_000).toISOString())))
      )[0];
    if (duplicate) throw new Error("Laporan yang sama baru saja disimpan. Periksa daftar produksi sebelum mengirim ulang.");
    await Promise.all(operatorNames.map((name) => validateKaryawan(name, d.nama)));
    const [ins] = await tx.insert(table).values({
        lini: d.nama,
        tanggal,
        shift,
        jamKerja: jam,
        keterangan,
        proses,
        requestHash,
        qtyTotal,
        operators: operatorNames,
        items: items.map((item) => buildItem(line, d, item, payload)),
        createdAt: now(),
      }).returning({ id: table.id });
    return ins.id;
  });

  return `✅ Data produksi tersimpan (${d.nama}) - ${items.length} item.`;
}

// ---------------- view ----------------

function layoutFor(line: Line, d: LineConfig) {
  const grp = (p: Prod, isFirst: boolean, ops: string) => ({
    tanggal: isFirst ? p.tanggal : "",
    lini: isFirst ? d.nama : "",
    operator: isFirst ? ops : "",
    shift: isFirst ? p.shift : "",
    jam: isFirst ? p.jamKerja : "",
    ket: isFirst ? p.keterangan ?? "" : "",
    qtyTotal: isFirst ? p.qtyTotal : null,
    qtyPcs: isFirst
      ? (d.nama === "PACKING" && p.items[0]?.qtySet == null ? null : p.qtyTotal)
      : null,
    qtySet: isFirst
      ? (typeof p.items[0]?.qtySet === "number"
        ? p.items[0].qtySet
        : d.nama === "PACKING" ? p.qtyTotal : p.qtyTotal != null ? Number((p.qtyTotal / 2).toFixed(0)) : null)
      : null,
    qtyShot: isFirst ? p.items[0]?.qtyShot ?? null : null,
  });

  if (line === "brakeshoe") {
    if (d.isCasting) {
      const headers = [
        "TANGGAL", "LINI", "OPERATOR", "TYPE", "GRADE", "SHIFT", "MESIN",
        "JAM KERJA", "JUMLAH PRODUKSI SHOT", "JUMLAH PRODUKSI SET",
        "JUMLAH PRODUKSI PCS", "JUMLAH PRODUKSI KG", "PERSENTASE", "KETERANGAN",
      ];
      return {
        headers,
        buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
          const g = grp(p, isFirst, ops);
          const shotQty = Number(it.qtyShot);
          const pct = shotQty > 0 ? Number((shotQty / 2048).toFixed(4)) : "";
          return [g.tanggal, g.lini, g.operator, it.type, it.grade, g.shift, it.mesin, g.jam, it.qtyShot, it.qtySet, it.qtyPcs, it.qtyKg, pct, g.ket];
        },
      };
    }
    const headers = ["TANGGAL", "LINI", d.isTeam ? "OPERATOR / ANGGOTA TIM" : "OPERATOR", "TYPE", "GRADE", "KULIT"];
    if (d.hasMerk) headers.push("MERK");
    headers.push("SHIFT", "JAM KERJA", "TOTAL JUMLAH PRODUKSI");
    if (d.hasNg) headers.push("TOTAL NG");
    headers.push("KETERANGAN");
    return {
      headers,
      buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
        const g = grp(p, isFirst, ops);
        const row: ReportCell[] = [g.tanggal, g.lini, g.operator, it.type, it.grade, it.kulit];
        if (d.hasMerk) row.push(it.merk);
        row.push(g.shift, g.jam, it.qty);
        if (d.hasNg) row.push(it.ng);
        row.push(g.ket);
        return row;
      },
    };
  }

  if (line === "discpad") {
    const isPacking = d.nama === "PACKING";
    const hasCat = !!d.hasCat;
    const hasNg = !!d.hasNg;
    const hasAb = !isPacking;

    const headers = ["TANGGAL", "LINI", "OPERATOR", "KODE"];
    if (d.nama === "PAINTING") headers.push("PROSES");
    if (hasAb) headers.push("A/B");
    if (hasCat) headers.push("CAT");
    headers.push("TEBAL", "QTY (PCS)");
    if (isPacking) headers.push("NG A", "NG B");
    else if (hasNg) headers.push("NG");
    headers.push("SHIFT", "JAM");
    headers.push("JUMLAH PRODUKSI (PCS)", d.nama === "PRESS CETAK" ? "JUMLAH PRODUKSI (SHOT)" : "JUMLAH PRODUKSI (SET)");
    headers.push("KETERANGAN");

    return {
      headers,
      buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
        const g = grp(p, isFirst, ops);
        const row: ReportCell[] = [g.tanggal, g.lini, g.operator, it.kode];
        if (d.nama === "PAINTING") row.push(isFirst ? p.proses : "");
        if (hasAb) row.push(it.gradeAb);
        if (hasCat) row.push(it.cat);
        row.push(it.tebal, it.qty);
        if (isPacking) row.push(it.ng, it.ngB);
        else if (hasNg) row.push(it.ng);
        row.push(g.shift, g.jam);
        row.push(g.qtyPcs);
        row.push(d.nama === "PRESS CETAK" ? g.qtyShot : g.qtySet);
        row.push(g.ket);
        return row;
      },
    };
  }

  // handle
  const isCasting = !!d.isCasting;
  const headers = ["LINI", "OPERATOR", "TANGGAL", "SHIFT", "JAM KERJA"];
  if (isCasting) headers.push("MESIN", "TYPE HANDLE", "POSISI HANDLE", "WARNA", "JUMLAH PRODUKSI SHOT", "JUMLAH PRODUKSI SET", "JUMLAH PRODUKSI PCS", "JUMLAH PRODUKSI KG");
  else headers.push("TYPE HANDLE", "POSISI HANDLE", "WARNA", "TOTAL JUMLAH PRODUKSI", "TOTAL NG");
  headers.push("KETERANGAN");

  return {
    headers,
    buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
      const g = grp(p, isFirst, ops);
        const row: ReportCell[] = [g.lini, g.operator, g.tanggal, g.shift, g.jam];
      if (isCasting) row.push(it.mesin, it.typeHandle, it.posisiHandle, it.warna, it.qtyShot, it.qtySet, it.qtyPcs, it.qtyKg);
      else row.push(it.typeHandle, it.posisiHandle, it.warna, it.qty, it.ng);
      row.push(g.ket);
      return row;
    },
  };
}

export async function getProductionData(line: Line, params: ProductionQuery = {}) {
  const d = await getLiniRow(line, params.lini ?? "");
  if (!d) return { headers: [], rows: [], recordIds: [], total: 0, limited: false };

  const { headers: reportHeaders, buildRow } = layoutFor(line, d);

  const from = clean(params.from);
  const to = clean(params.to);
  if ((from && !isValidISODate(from)) || (to && !isValidISODate(to)) || (from && to && from > to)) {
    throw new Error("Periode tanggal tidak valid.");
  }
  const rawLimit = params.limit === null ? null : Number(params.limit || 2000);
  if (rawLimit !== null && (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 10000)) {
    throw new Error("Batas baris harus 1 sampai 10000.");
  }
  const table = productionTable(line);
  const conditions = [eq(table.lini, d.nama)];
  if (from) conditions.push(gte(table.tanggal, from));
  if (to) conditions.push(lte(table.tanggal, to));
  const records = await db.select().from(table).where(and(...conditions))
    .orderBy(asc(table.tanggal), asc(table.id));
  const total = records.reduce((sum, row) => sum + row.items.length, 0);
  const selected: { header: Prod; item: Item; index: number }[] = [];
  for (const header of records) {
    for (const [index, item] of header.items.entries()) {
      if (rawLimit !== null && selected.length >= rawLimit) break;
      selected.push({ header: header as Prod, item, index });
    }
    if (rawLimit !== null && selected.length >= rawLimit) break;
  }
  const limited = rawLimit !== null && total > rawLimit;
  const rows: ReportCell[][] = [];
  const seen = new Set<number>();
  const recordIds: number[] = [];
  for (const { header, item } of selected) {
    const ops = header.operators;
    const opsStr = d.isTeam && ops.length > 1
      ? `${ops.join(", ")} (${ops.length} Orang)`
      : ops.join(", ");
    rows.push(buildRow(header, item, !seen.has(header.id), opsStr));
    recordIds.push(header.id);
    seen.add(header.id);
  }
  return { headers: reportHeaders, rows, recordIds, total, limited };
}

export async function getProductionRecord(id: number, line: Line) {
  const table = productionTable(line);
  const [header] = await db.select().from(table).where(eq(table.id, id));
  if (!header) throw new Error("Laporan produksi tidak ditemukan.");
  return { header, lini: header.lini, line, items: header.items, operators: header.operators };
}

export async function updateProductionRecord(id: number, line: Line, input: unknown) {
  const payload = parseProduction(input);
  const before = await getProductionRecord(id, line);
  if (before.line !== line) throw new Error("Jenis produk tidak cocok dengan laporan.");
  const d = await getLiniRow(line, payload.lini);
  if (!d) throw new Error("Lini tidak valid.");
  const tanggal = clean(payload.tanggal);
  if (!isValidISODate(tanggal)) throw new Error("Tanggal tidak valid.");
  const items = payload.items;
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error("Jumlah item tidak valid.");
  if (line === "discpad" && toInt(payload.jumlahProduksi ?? payload.hasilProduksi) == null) {
    throw new Error("Jumlah produksi (PCS) wajib diisi.");
  }
  const proses = line === "discpad" && d.nama === "PAINTING" ? clean(payload.proses) : null;
  if (line === "discpad" && d.nama === "PAINTING" && !["Painting 1", "Painting 2"].includes(proses || "")) {
    throw new Error("Proses painting tidak valid.");
  }
  const table = productionTable(line);
  const operators = resolveOperators(d, payload);
  const normalizedItems = items.map((item) => buildItem(line, d, item, payload));
  await Promise.all(operators.map((name) => validateKaryawan(name, d.nama)));
  await db.transaction(async tx => {
    await tx.insert(auditLog).values({
      entity: "produksi", entityId: id, aksi: "update", actor: "admin",
      detail: JSON.stringify({ before, payload }), createdAt: now(),
    });
    await tx.update(table).set({
      lini: d.nama, tanggal,
      shift: clean(payload.shift) || "-", jamKerja: clean(payload.jamKerja || payload.jam) || "-",
      keterangan: clean(payload.keterangan) || null, proses,
      qtyTotal: line === "discpad" ? toInt(payload.jumlahProduksi ?? payload.hasilProduksi) : null,
      operators, items: normalizedItems, requestHash: null, updatedAt: now(),
    }).where(eq(table.id, id));
  });
  return { success: true, id };
}

export async function deleteProductionRecord(id: number, line: Line) {
  const before = await getProductionRecord(id, line);
  const table = productionTable(line);
  await db.transaction(async tx => {
    await tx.insert(auditLog).values({
      entity: "produksi", entityId: id, aksi: "delete", actor: "admin",
      detail: JSON.stringify(before), createdAt: now(),
    });
    await tx.delete(table).where(eq(table.id, id));
  });
  return { success: true };
}
