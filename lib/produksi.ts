// Backend produksi ter-unifikasi (brakeshoe / discpad / handle).
// Port dari brakeshoe.gs + discpad.gs + handle.gs, di-deduplikasi lewat flag lini.

import { and, asc, eq, gte, lte, ne } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/db";
import {
  auditLog,
  karyawan,
  productionTarget,
  produksiBrakeshoe,
  produksiDiscpad,
  produksiHandle,
} from "@/db/schema";
import { clean, normalizeLini, now, toFloat, toInt, uniqSort } from "./shared";
import { isValidISODate } from "./date";
import { parseProduction } from "./validation";
import { getProductionLine, getProductionProduct } from "./production-master";
import type { ProductionLineConfig, ProductionOptions } from "./production-master-types";

export type Line = "brakeshoe" | "discpad" | "handle";
type ProductionPayload = ReturnType<typeof parseProduction>;
type ProductionItemPayload = ProductionPayload["items"][number];
type ProductionQuery = { lini?: string | null; from?: string | null; to?: string | null; limit?: number | string | null };
type ReportCell = string | number | null;

type LineConfig = ProductionLineConfig;
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
  return getProductionLine(line, d, true);
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

function buildProductOptions(line: string, options: ProductionOptions) {
  if (line === "brakeshoe") return { types: options.types, grades: options.grades, kulits: options.kulits };
  if (line === "discpad") return { codes: options.codes, tebals: options.tebals, coatings: options.coatings, abOptions: options.abOptions };
  return { typeHandles: options.typeHandles, warnas: options.warnas, posisiHandles: options.posisiHandles };
}

export async function getMaster(line: string, liniName?: string, includeInactive = false) {
  const product = await getProductionProduct(line, includeInactive);
  if (!product) throw new Error("Jenis produk tidak aktif atau tidak dikenal: " + line);
  const configuredLines = product.lines.filter((row) => includeInactive || row.isActive === 1);
  let liniOptions = configuredLines.map((row) => row.nama);
  let linis = configuredLines.map(({ nama, isCasting, isTeam, hasNg, hasMerk, hasCat, hasMesin, hasNgB, hasAb, hasProductionTotal, requiresPositiveTotal, hasProcess, hasShot, hasSet, hasPcsKg, targetMetrics }) =>
    ({ nama, isCasting, isTeam, hasNg, hasMerk, hasCat, hasMesin, hasNgB, hasAb, hasProductionTotal, requiresPositiveTotal, hasProcess, hasShot, hasSet, hasPcsKg, targetMetrics }));
  const operatorOptions = liniName ? await getOperators(line, liniName) : [];
  const productOptions = buildProductOptions(line, product.options);
  const refreshDelayMs = line === "discpad" ? 3000 : 15000;
  const productName = product.nama;

  liniOptions.sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base", numeric: true }));

  if (line === "discpad") {
    return {
      productName,
      liniOptions,
      linis,
      operatorOptions,
      teamMemberOptions: operatorOptions,
      productOptions,
      paintingProcessOptions: product.options.processes,
      abOptions: productOptions.abOptions,
      refreshDelayMs,
    };
  }
  if (line === "handle") {
    return {
      productName,
      liniOptions,
      linis,
      operatorOptions,
      handleOptions: productOptions,
      productOptions,
      refreshDelayMs,
    };
  }
  return { productName, liniOptions, linis, productOptions, operatorOptions, refreshDelayMs };
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

export async function getAssistanceOperators(line: string, liniName: string) {
  const d = await getLiniRow(line, liniName);
  if (!d) return [];
  return db.select({ id: karyawan.id, nama: karyawan.nama, lini: karyawan.lini })
    .from(karyawan)
    .where(and(ne(karyawan.lini, d.nama), eq(karyawan.isActive, 1)))
    .orderBy(asc(karyawan.lini), asc(karyawan.nama));
}

// ---------------- submit ----------------

function resolveOperators(d: LineConfig, payload: ProductionPayload, hasAssistance = false): string[] {
  if (d.isTeam) {
    const names = (Array.isArray(payload.anggotaTim) ? payload.anggotaTim : [])
      .map(clean)
      .filter(Boolean);
    if (!names.length) throw new Error("Minimal pilih 1 anggota tim.");
    return names;
  }
  const op = clean(payload.operator);
  if (!op && !hasAssistance) throw new Error("Pilih operator lini ini atau minimal satu operator perbantuan.");
  if (!op) return [];
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
        mesin: d.hasMesin ? clean(payload.mesin) || null : null,
        qtyShot: d.hasShot ? toInt(payload.jumlahShot) : null,
        qtySet: d.hasSet ? toInt(payload.jumlahSet) : null,
        qtyPcs: d.hasPcsKg ? toInt(payload.jumlahPcs) : null,
        qtyKg: d.hasPcsKg ? toFloat(payload.jumlahKg) : null,
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
      gradeAb: d.hasAb ? clean(it.ab) || null : null,
      cat: d.hasCat ? clean(it.cat) || null : null,
      tebal: clean(it.tebal) || null,
      qty: toInt(it.qty) || 0,
      ng: d.hasNg ? toInt(it.ng) : d.hasNgB ? toInt(it.ngA) : null,
      ngB: d.hasNgB ? toInt(it.ngB) : null,
      qtySet: d.hasSet ? toFloat(payload.jumlahSet) : null,
      qtyShot: d.hasShot ? toInt(payload.jumlahShot) : null,
    };
  }

  // handle
  if (d.isCasting) {
    return {
      typeHandle: clean(it.typeHandle) || "-",
      grade: "-",
      posisiHandle: clean(it.posisiHandle) || null,
      warna: clean(it.warna) || null,
      mesin: d.hasMesin ? clean(payload.mesin) || null : null,
      qtyShot: d.hasShot ? toInt(payload.jumlahShot) : null,
      qtySet: d.hasSet ? toInt(payload.jumlahSet) : null,
      qtyPcs: d.hasPcsKg ? toInt(payload.jumlahPcs) : null,
      qtyKg: d.hasPcsKg ? toFloat(payload.jumlahKg) : null,
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
  if (!(await getProductionProduct(line))) throw new Error("Produk tidak aktif atau tidak dikenal.");
  const d = await getLiniRow(line, payload.lini);
  if (!d || d.isActive !== 1) throw new Error("Pilih lini aktif yang valid.");

  const tanggal = clean(payload.tanggal);
  if (!isValidISODate(tanggal)) throw new Error("Tanggal tidak valid.");
  const shift = clean(payload.shift) || "-";
  const jam = clean(payload.jamKerja || payload.jam) || "-";
  const keterangan = clean(payload.keterangan) || null;

  const items = payload.items;
  if (!items.length) throw new Error("Detail produksi minimal 1 item.");
  if (items.length > 100) throw new Error("Maksimal 100 item per laporan.");

  const operatorNames = resolveOperators(d, payload, (payload.assistedOperators ?? []).length > 0);
  const assistedOperatorIds = [...new Set((payload.assistedOperators ?? []).map((employee) => employee.id))];
  if (operatorNames.some((name) => (payload.assistedOperators ?? []).some((employee) => employee.nama === name))) {
    throw new Error("Operator yang sama tidak boleh dipilih sebagai operator lini dan perbantuan.");
  }
  const qtyTotal =
    d.hasProductionTotal
      ? toInt(payload.jumlahProduksi ?? payload.hasilProduksi)
      : null;
  if (d.hasProductionTotal && (qtyTotal == null || qtyTotal < 0)) {
    throw new Error("Jumlah produksi (PCS) wajib diisi.");
  }
  if (d.requiresPositiveTotal && qtyTotal === 0) throw new Error("Jumlah produksi lini ini wajib lebih dari nol.");
  const proses = d.hasProcess ? clean(payload.proses) : null;
  if (d.hasProcess && !((await getProductionProduct(line))?.options.processes ?? []).includes(proses || "")) {
    throw new Error("Pilih proses yang terdaftar pada master produk.");
  }
  const requestHash = createHash("sha256").update(JSON.stringify({
    line, lini: d.nama, tanggal, shift, jam, operatorNames, assistedOperatorIds, items, qtyTotal, proses,
    mesin: clean(payload.mesin), shot: payload.jumlahShot, set: payload.jumlahSet,
  })).digest("hex");

  const table = productionTable(line);
  await db.transaction(async (tx) => {
    const duplicate = (await tx.select({ id: table.id }).from(table)
      .where(and(eq(table.requestHash, requestHash), gte(table.createdAt, new Date(Date.now() - 60_000).toISOString())))
      )[0];
    if (duplicate) throw new Error("Laporan yang sama baru saja disimpan. Periksa daftar produksi sebelum mengirim ulang.");
    await Promise.all(operatorNames.map((name) => validateKaryawan(name, d.nama)));
    const assistanceRows = assistedOperatorIds.length ? await tx.select({ id: karyawan.id, nama: karyawan.nama, lini: karyawan.lini })
      .from(karyawan).where(and(eq(karyawan.isActive, 1), ne(karyawan.lini, d.nama))) : [];
    const selectedAssistance = assistedOperatorIds.map((id) => assistanceRows.find((employee) => employee.id === id));
    if (selectedAssistance.some((employee) => !employee)) throw new Error("Karyawan perbantuan tidak aktif atau lini utamanya sudah berubah.");
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
        assistedOperators: selectedAssistance.map((employee) => ({ id: employee!.id, nama: employee!.nama, liniAsal: employee!.lini })),
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
      ? (!d.hasProductionTotal ? null : !d.hasSet && p.items[0]?.qtySet == null ? null : p.qtyTotal)
      : null,
    qtySet: isFirst
      ? (typeof p.items[0]?.qtySet === "number"
        ? p.items[0].qtySet
        : !d.hasSet ? null : p.qtyTotal != null ? Number((p.qtyTotal / (d.pcsPerSet || 1)).toFixed(0)) : null)
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
          const pct = shotQty > 0 && d.shotCapacity > 0 ? Number((shotQty / d.shotCapacity).toFixed(4)) : "";
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
    const hasCat = !!d.hasCat;
    const hasNg = !!d.hasNg;
    const hasAb = d.hasAb === 1;

    const headers = ["TANGGAL", "LINI", "OPERATOR", "KODE"];
    if (d.hasProcess) headers.push("PROSES");
    if (hasAb) headers.push("A/B");
    if (hasCat) headers.push("CAT");
    headers.push("TEBAL", "QTY (PCS)");
    if (d.hasNgB) headers.push("NG A", "NG B");
    else if (hasNg) headers.push("NG");
    headers.push("SHIFT", "JAM");
    headers.push("JUMLAH PRODUKSI (PCS)", d.hasShot && !d.hasSet ? "JUMLAH PRODUKSI (SHOT)" : "JUMLAH PRODUKSI (SET)");
    headers.push("KETERANGAN");

    return {
      headers,
      buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
        const g = grp(p, isFirst, ops);
        const row: ReportCell[] = [g.tanggal, g.lini, g.operator, it.kode];
        if (d.hasProcess) row.push(isFirst ? p.proses : "");
        if (hasAb) row.push(it.gradeAb);
        if (hasCat) row.push(it.cat);
        row.push(it.tebal, it.qty);
        if (d.hasNgB) row.push(it.ng, it.ngB);
        else if (hasNg) row.push(it.ng);
        row.push(g.shift, g.jam);
        row.push(g.qtyPcs);
        row.push(d.hasShot && !d.hasSet ? g.qtyShot : g.qtySet);
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
  if (!d) return { headers: [], rows: [], recordIds: [], assistedRows: [], total: 0, limited: false };

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
  const lineTargets = await db.select().from(productionTarget).where(and(
    eq(productionTarget.produk, line),
    eq(productionTarget.lini, d.nama),
  ));
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
  const assistedRows: boolean[] = [];
  for (const { header, item } of selected) {
    const ops = header.operators;
    const regularOpsStr = d.isTeam && ops.length > 1
      ? `${ops.join(", ")} (${ops.length} Orang)`
      : ops.join(", ");
    const assistanceStr = (header.assistedOperators ?? []).map((employee) => `${employee.nama} (Perbantuan dari ${employee.liniAsal})`).join(", ");
    const opsStr = [regularOpsStr, assistanceStr].filter(Boolean).join(", ");
    const isFirst = !seen.has(header.id);
    const row = buildRow(header, item, isFirst, opsStr);
    if (isFirst) {
      const targets = lineTargets
        .filter((target) => target.shift === header.shift || target.shift === "Shift 1 & 2")
        .sort((a, b) => ["PCS", "SET", "SHOT"].indexOf(a.satuan) - ["PCS", "SET", "SHOT"].indexOf(b.satuan));
      const targetText = targets.length
        ? targets.map((target) => `${target.satuan} ${target.nilai.toLocaleString("id-ID")} (${target.basis === "per_orang" ? "per orang" : "tim"})`).join("; ")
        : "Master blm diisi";
      const hours = toFloat(header.jamKerja);
      const hourlyTargetText = targets.length
        ? hours != null && hours > 0
          ? targets.map((target) => `${target.satuan} ${(target.nilai / hours).toLocaleString("id-ID", { maximumFractionDigits: 2 })}/jam`).join("; ")
          : "Jam kerja blm diisi"
        : "Master blm diisi";
      row.push(targetText, hourlyTargetText);
    } else {
      row.push("", "");
    }
    rows.push(row);
    recordIds.push(header.id);
    assistedRows.push((header.assistedOperators ?? []).length > 0);
    seen.add(header.id);
  }
  return {
    headers: [...reportHeaders, "TARGET MASTER", "TARGET PER JAM"],
    rows, recordIds, assistedRows, total, limited,
  };
}

export async function getProductionRecord(id: number, line: Line) {
  const table = productionTable(line);
  const [header] = await db.select().from(table).where(eq(table.id, id));
  if (!header) throw new Error("Laporan produksi tidak ditemukan.");
  return { header, lini: header.lini, line, items: header.items, operators: header.operators, assistedOperators: header.assistedOperators ?? [] };
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
  if (d.hasProductionTotal && toInt(payload.jumlahProduksi ?? payload.hasilProduksi) == null) {
    throw new Error("Jumlah produksi (PCS) wajib diisi.");
  }
  if (d.requiresPositiveTotal && toInt(payload.jumlahProduksi ?? payload.hasilProduksi) === 0) throw new Error("Jumlah produksi lini ini wajib lebih dari nol.");
  const proses = d.hasProcess ? clean(payload.proses) : null;
  if (d.hasProcess && !((await getProductionProduct(line))?.options.processes ?? []).includes(proses || "")) {
    throw new Error("Pilih proses yang terdaftar pada master produk.");
  }
  const table = productionTable(line);
  const operators = resolveOperators(d, payload, (payload.assistedOperators ?? []).length > 0);
  const assistedOperatorIds = [...new Set((payload.assistedOperators ?? []).map((employee) => employee.id))];
  if (operators.some((name) => (payload.assistedOperators ?? []).some((employee) => employee.nama === name))) {
    throw new Error("Operator yang sama tidak boleh dipilih sebagai operator lini dan perbantuan.");
  }
  const normalizedItems = items.map((item) => buildItem(line, d, item, payload));
  await Promise.all(operators.map((name) => validateKaryawan(name, d.nama)));
  const assistanceRows = assistedOperatorIds.length ? await db.select({ id: karyawan.id, nama: karyawan.nama, lini: karyawan.lini })
    .from(karyawan).where(and(eq(karyawan.isActive, 1), ne(karyawan.lini, d.nama))) : [];
  const selectedAssistance = assistedOperatorIds.map((employeeId) => assistanceRows.find((employee) => employee.id === employeeId));
  if (selectedAssistance.some((employee) => !employee)) throw new Error("Karyawan perbantuan tidak aktif atau lini utamanya sudah berubah.");
  await db.transaction(async tx => {
    await tx.insert(auditLog).values({
      entity: "produksi", entityId: id, aksi: "update", actor: "admin",
      detail: JSON.stringify({ before, payload }), createdAt: now(),
    });
    await tx.update(table).set({
      lini: d.nama, tanggal,
      shift: clean(payload.shift) || "-", jamKerja: clean(payload.jamKerja || payload.jam) || "-",
      keterangan: clean(payload.keterangan) || null, proses,
      qtyTotal: d.hasProductionTotal ? toInt(payload.jumlahProduksi ?? payload.hasilProduksi) : null,
      operators, assistedOperators: selectedAssistance.map((employee) => ({ id: employee!.id, nama: employee!.nama, liniAsal: employee!.lini })), items: normalizedItems, requestHash: null, updatedAt: now(),
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
