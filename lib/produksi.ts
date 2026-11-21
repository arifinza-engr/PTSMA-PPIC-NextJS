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
import { targetPerHour } from "./production-target-utils";
import type { ProductionLineConfig, ProductionOptions } from "./production-master-types";
import { defaultDetailFields } from "./production-detail-fields";

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

async function validateMachineAssignment(
  table: ProductionTable,
  lini: string,
  tanggal: string,
  shift: string,
  mesin: string,
  operators: string[],
  excludeId?: number,
) {
  const currentOperators = new Set(operators.map(clean).filter(Boolean));
  const sameShiftRecords = await db.select({
    id: table.id,
    operators: table.operators,
    assistedOperators: table.assistedOperators,
    items: table.items,
  }).from(table).where(and(eq(table.lini, lini), eq(table.tanggal, tanggal), eq(table.shift, shift)));

  for (const record of sameShiftRecords) {
    if (record.id === excludeId || !record.items.some((item) => clean(item.mesin) === mesin)) continue;
    const existingOperators = new Set([
      ...record.operators,
      ...(record.assistedOperators ?? []).map((employee) => employee.nama),
    ].map(clean).filter(Boolean));
    const sameOperators = existingOperators.size === currentOperators.size
      && [...existingOperators].every((operator) => currentOperators.has(operator));
    if (!sameOperators) {
      throw new Error(`Mesin ${mesin} sudah dipakai operator lain pada ${shift}. Pilih nomor mesin yang berbeda.`);
    }
  }
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
  const liniOptions = configuredLines.map((row) => row.nama);
  const linis = configuredLines.map(({ nama, isCasting, isTeam, hasNg, hasMerk, hasCat, hasMesin, hasNgB, hasAb, hasProductionTotal, requiresPositiveTotal, hasProcess, hasShot, hasSet, hasPcsKg, pcsPerSet, targetMetrics, castingCategories, detailFields }) =>
    ({ nama, isCasting, isTeam, hasNg, hasMerk, hasCat, hasMesin, hasNgB, hasAb, hasProductionTotal, requiresPositiveTotal, hasProcess, hasShot, hasSet, hasPcsKg, pcsPerSet, targetMetrics, castingCategories, detailFields: detailFields ?? defaultDetailFields(line as Line, isCasting === 1) }));
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
    const fields = d.detailFields ?? [];
    if (d.isCasting) {
      return {
        type: fields.includes("type") ? clean(it.type) || "-" : null,
        grade: fields.includes("grade") ? clean(it.grade) || "-" : null,
        merk: d.hasMerk ? clean(it.merk) || "-" : null,
        castingCategory: clean(it.castingCategory) || null,
        ng: d.hasNg ? toInt(it.ng) : null,
        mesin: d.hasMesin ? clean(payload.mesin) || null : null,
        qtyShot: d.hasShot ? toInt(payload.jumlahShot) : null,
        qtySet: d.hasSet ? toFloat(payload.jumlahSet) : null,
        qtyPcs: d.hasPcsKg ? toInt(payload.jumlahPcs) : null,
        qtyKg: null,
      };
    }
    return {
      type: fields.includes("type") ? clean(it.type) || "-" : null,
      grade: fields.includes("grade") ? clean(it.grade) || "-" : null,
      kulit: fields.includes("kulit") ? clean(it.kulit) || "-" : null,
      merk: d.hasMerk ? clean(it.merk) || "-" : null,
      qty: toInt(it.qty) || 0,
      ng: d.hasNg ? toInt(it.ng) : null,
    };
  }

  if (line === "discpad") {
    return {
      kode: d.detailFields?.includes("kode") ? clean(it.kode) || null : null,
      gradeAb: d.hasAb ? clean(it.ab) || null : null,
      cat: d.hasCat ? clean(it.cat) || null : null,
      tebal: d.detailFields?.includes("tebal") ? clean(it.tebal) || null : null,
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
      typeHandle: d.detailFields?.includes("typeHandle") ? clean(it.typeHandle) || "-" : null,
      castingCategory: clean(it.castingCategory) || null,
      grade: "-",
      ng: d.hasNg ? toInt(it.ng) : null,
      posisiHandle: d.detailFields?.includes("posisiHandle") ? clean(it.posisiHandle) || null : null,
      warna: d.detailFields?.includes("warna") ? clean(it.warna) || null : null,
      mesin: d.hasMesin ? clean(payload.mesin) || null : null,
      qtyShot: d.hasShot ? toInt(payload.jumlahShot) : null,
      qtySet: d.hasSet ? toFloat(payload.jumlahSet) : null,
      qtyPcs: d.hasPcsKg ? toInt(payload.jumlahPcs) : null,
      qtyKg: null,
    };
  }
  return {
    typeHandle: d.detailFields?.includes("typeHandle") ? clean(it.typeHandle) || "-" : null,
    posisiHandle: d.detailFields?.includes("posisiHandle") ? clean(it.posisiHandle) || null : null,
    warna: d.detailFields?.includes("warna") ? clean(it.warna) || "-" : null,
    qty: toInt(it.qty) || 0,
    ng: d.hasNg ? toInt(it.ng) : null,
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
  if (!Number.isFinite(Number(jam)) || Number(jam) <= 0 || Number(jam) > 24) {
    throw new Error("Jam kerja harus berupa angka lebih dari 0 dan maksimal 24 jam.");
  }
  const keterangan = clean(payload.keterangan) || null;

  const items = payload.items;
  if (!items.length) throw new Error("Detail produksi minimal 1 item.");
  if (items.length > 100) throw new Error("Maksimal 100 item per laporan.");
  if ((d.castingCategories ?? []).length && items.some((item) => !d.castingCategories.includes(clean(item.castingCategory)))) throw new Error("Pilih kategori Casting yang terdaftar pada master lini.");

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
  const machine = clean(payload.mesin);
  if (d.hasMesin && !/^(?:[1-9]|1[0-2])$/.test(machine)) {
    throw new Error("Nomor mesin harus berupa angka 1 sampai 12.");
  }
  if (d.hasMesin) {
    await validateMachineAssignment(table, d.nama, tanggal, shift, machine,
      [...operatorNames, ...(payload.assistedOperators ?? []).map((employee) => employee.nama)]);
  }
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
    const fields = d.detailFields ?? [];
    if (d.isCasting) {
      const headers = [
        "TANGGAL", "LINI", "OPERATOR",
        "SHIFT", "JAM",
        ...(fields.includes("type") ? ["TYPE"] : []), ...(fields.includes("grade") ? ["GRADE"] : []),
        ...(d.hasMerk ? ["MERK"] : []),
        ...((d.castingCategories ?? []).length ? ["KATEGORI CASTING"] : []),
        ...(d.hasMesin ? ["MESIN"] : []),
        ...(d.hasShot ? ["SHOT"] : []),
        ...(d.hasSet ? ["SET"] : []),
        ...(d.hasPcsKg ? ["PCS"] : []),
        ...(d.hasNg ? ["NG"] : []), "KETERANGAN",
      ];
      return {
        headers,
        buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
          const g = grp(p, isFirst, ops);
          const row: ReportCell[] = [g.tanggal, g.lini, g.operator];
          row.push(g.shift, g.jam);
          if (fields.includes("type")) row.push(it.type);
          if (fields.includes("grade")) row.push(it.grade);
          if (d.hasMerk) row.push(it.merk);
          if ((d.castingCategories ?? []).length) row.push(it.castingCategory);
          if (d.hasMesin) row.push(it.mesin);
          if (d.hasShot) row.push(it.qtyShot);
          if (d.hasSet) row.push(it.qtySet);
          if (d.hasPcsKg) row.push(it.qtyPcs);
          if (d.hasNg) row.push(it.ng);
          row.push(g.ket);
          return row;
        },
      };
    }
    const headers = ["TANGGAL", "LINI", d.isTeam ? "OPERATOR / ANGGOTA TIM" : "OPERATOR"];
    headers.push("SHIFT", "JAM");
    if (fields.includes("type")) headers.push("TYPE");
    if (fields.includes("grade")) headers.push("GRADE");
    if (fields.includes("kulit")) headers.push("KULIT");
    if (d.hasMerk) headers.push("MERK");
    headers.push(d.hasShot && !d.hasSet ? "SHOT" : d.hasSet && !d.hasShot ? "SET" : "TOTAL JUMLAH PRODUKSI");
    if (d.hasNg) headers.push("NG");
    headers.push("KETERANGAN");
    return {
      headers,
      buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
        const g = grp(p, isFirst, ops);
        const row: ReportCell[] = [g.tanggal, g.lini, g.operator];
        row.push(g.shift, g.jam);
        if (fields.includes("type")) row.push(it.type);
        if (fields.includes("grade")) row.push(it.grade);
        if (fields.includes("kulit")) row.push(it.kulit);
        if (d.hasMerk) row.push(it.merk);
        row.push(it.qty);
        if (d.hasNg) row.push(it.ng);
        row.push(g.ket);
        return row;
      },
    };
  }

  if (line === "discpad") {
    const fields = d.detailFields ?? [];
    const hasCat = !!d.hasCat;
    const hasNg = !!d.hasNg;
    const hasAb = d.hasAb === 1;

    const headers = ["TANGGAL", "LINI", "OPERATOR"];
    if (fields.includes("kode")) headers.push("KODE");
    if (d.hasProcess) headers.push("PROSES");
    if (hasAb) headers.push("A/B");
    if (hasCat) headers.push("CAT");
    if (fields.includes("tebal")) headers.push("TEBAL");
    headers.push("QTY (PCS)");
    if (d.hasNgB) headers.push("NG A", "NG B");
    else if (hasNg) headers.push("NG");
    headers.splice(3, 0, "SHIFT", "JAM");
    headers.push("PCS", d.hasShot && !d.hasSet ? "SHOT" : "SET");
    headers.push("KETERANGAN");

    return {
      headers,
      buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
        const g = grp(p, isFirst, ops);
        const row: ReportCell[] = [g.tanggal, g.lini, g.operator, g.shift, g.jam];
        if (fields.includes("kode")) row.push(it.kode);
        if (d.hasProcess) row.push(isFirst ? p.proses : "");
        if (hasAb) row.push(it.gradeAb);
        if (hasCat) row.push(it.cat);
        if (fields.includes("tebal")) row.push(it.tebal);
        row.push(it.qty);
        if (d.hasNgB) row.push(it.ng, it.ngB);
        else if (hasNg) row.push(it.ng);
        row.push(g.qtyPcs);
        row.push(d.hasShot && !d.hasSet ? g.qtyShot : g.qtySet);
        row.push(g.ket);
        return row;
      },
    };
  }

  // handle
  const isCasting = !!d.isCasting;
  const fields = d.detailFields ?? [];
  const headers = ["TANGGAL", "LINI", "OPERATOR", "SHIFT", "JAM"];
  if (isCasting) headers.push(...((d.castingCategories ?? []).length ? ["KATEGORI CASTING"] : []), ...(d.hasMesin ? ["MESIN"] : []), ...(fields.includes("typeHandle") ? ["TYPE HANDLE"] : []), ...(fields.includes("posisiHandle") ? ["LH/RH"] : []), ...(fields.includes("warna") ? ["WARNA"] : []), ...(d.hasShot ? ["SHOT"] : []), ...(d.hasSet ? ["SET"] : []), ...(d.hasPcsKg ? ["PCS"] : []), ...(d.hasNg ? ["NG"] : []));
  else {
    if (fields.includes("typeHandle")) headers.push("TYPE HANDLE");
    if (fields.includes("posisiHandle")) headers.push("LH/RH");
    if (fields.includes("warna")) headers.push("WARNA");
    headers.push("TOTAL JUMLAH PRODUKSI");
    if (d.hasNg) headers.push("NG");
  }
  headers.push("KETERANGAN");

  return {
    headers,
    buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
      const g = grp(p, isFirst, ops);
        const row: ReportCell[] = [g.tanggal, g.lini, g.operator, g.shift, g.jam];
      if (isCasting) {
        row.push(...((d.castingCategories ?? []).length ? [it.castingCategory] : []));
        if (d.hasMesin) row.push(it.mesin);
        if (fields.includes("typeHandle")) row.push(it.typeHandle);
        if (fields.includes("posisiHandle")) row.push(it.posisiHandle);
        if (fields.includes("warna")) row.push(it.warna);
        if (d.hasShot) row.push(it.qtyShot);
        if (d.hasSet) row.push(it.qtySet);
        if (d.hasPcsKg) row.push(it.qtyPcs);
        if (d.hasNg) row.push(it.ng);
      } else {
        if (fields.includes("typeHandle")) row.push(it.typeHandle);
        if (fields.includes("posisiHandle")) row.push(it.posisiHandle);
        if (fields.includes("warna")) row.push(it.warna);
        row.push(it.qty);
        if (d.hasNg) row.push(it.ng);
      }
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
        .filter((target) => (target.shift === header.shift || target.shift === "Shift 1 & 2")
          && (target.kategori ?? "") === clean(item.castingCategory))
        .sort((a, b) => ["PCS", "SET", "SHOT"].indexOf(a.satuan) - ["PCS", "SET", "SHOT"].indexOf(b.satuan));
      const targetText = targets.length
        ? targets.map((target) => `${target.satuan} ${target.nilai.toLocaleString("id-ID")}`).join("; ")
        : "Master blm diisi";
      const hourlyTargetText = targets.length
        ? targets.map((target) => `${target.satuan} ${targetPerHour(target.nilai).toLocaleString("id-ID", { maximumFractionDigits: 2 })}/jam`).join("; ")
        : "Master blm diisi";
      row.push(targetText, hourlyTargetText);
    } else {
      row.push("", "");
    }
    if (d.isCasting && d.hasShot) {
      const target = lineTargets.find((candidate) => candidate.satuan === "SHOT"
        && (candidate.shift === header.shift || candidate.shift === "Shift 1 & 2")
        && (candidate.kategori ?? "") === clean(item.castingCategory));
      const actual = toFloat(item.qtyShot) ?? 0;
      const hours = toFloat(header.jamKerja) ?? 0;
      const operatorCount = Math.max(header.operators.length, 1);
      const targetPerHourForRecord = target
        ? targetPerHour(target.nilai) * (d.isTeam ? 1 : operatorCount)
        : 0;
      const targetForRecord = targetPerHourForRecord * hours;
      const shiftAchievement = targetForRecord > 0 ? actual / targetForRecord * 100 : "";
      const hourlyTarget = targetPerHourForRecord;
      const hourlyActual = hours > 0 ? actual / hours : 0;
      const hourlyAchievement = hourlyTarget > 0 ? hourlyActual / hourlyTarget * 100 : "";
      row.push(shiftAchievement, hourlyAchievement);
    }
    rows.push(row);
    recordIds.push(header.id);
    assistedRows.push((header.assistedOperators ?? []).length > 0);
    seen.add(header.id);
  }
  return {
    headers: [...reportHeaders, "TARGET", "TARGET PER JAM", ...(d.isCasting && d.hasShot ? ["PENCAPAIAN TARGET SHIFT", "PENCAPAIAN TARGET PER JAM"] : [])],
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
  if ((d.castingCategories ?? []).length && items.some((item) => !d.castingCategories.includes(clean(item.castingCategory)))) throw new Error("Pilih kategori Casting yang terdaftar pada master lini.");
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
  const shift = clean(payload.shift) || "-";
  const jam = clean(payload.jamKerja || payload.jam);
  if (!Number.isFinite(Number(jam)) || Number(jam) <= 0 || Number(jam) > 24) {
    throw new Error("Jam kerja harus berupa angka lebih dari 0 dan maksimal 24 jam.");
  }
  const machine = clean(payload.mesin);
  if (d.hasMesin && !/^(?:[1-9]|1[0-2])$/.test(machine)) {
    throw new Error("Nomor mesin harus berupa angka 1 sampai 12.");
  }
  if (d.hasMesin) {
    await validateMachineAssignment(table, d.nama, tanggal, shift, machine,
      [...operators, ...selectedAssistance.map((employee) => employee!.nama)], id);
  }
  await db.transaction(async tx => {
    await tx.insert(auditLog).values({
      entity: "produksi", entityId: id, aksi: "update", actor: "admin",
      detail: JSON.stringify({ before, payload }), createdAt: now(),
    });
    await tx.update(table).set({
      lini: d.nama, tanggal,
      shift, jamKerja: jam,
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
