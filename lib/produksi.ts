// Backend produksi ter-unifikasi (brakeshoe / discpad / handle).
// Port dari brakeshoe.gs + discpad.gs + handle.gs, di-deduplikasi lewat flag divisi.

import { and, asc, count, eq, gte, inArray, lte } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/db";
import {
  auditLog,
  divisi,
  karyawan,
  product,
  productLine,
  produksi,
  produksiItem,
  produksiOperator,
} from "@/db/schema";
import { clean, isRemovedDivisi, normalizeDivisi, now, toFloat, toInt, uniqSort } from "./shared";
import { isValidISODate } from "./date";
import { parseProduction } from "./validation";

export type Line = "brakeshoe" | "discpad" | "handle";
type ProductionPayload = ReturnType<typeof parseProduction>;
type ProductionItemPayload = ProductionPayload["items"][number];
type ProductionQuery = { divisi?: string | null; from?: string | null; to?: string | null; limit?: number | string | null };
type ReportCell = string | number | null;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function getLineId(line: string): Promise<number> {
  const r = (await db
    .select({ id: productLine.id })
    .from(productLine)
    .where(eq(productLine.nama, line))
    )[0];
  if (!r) throw new Error("Lini produk tidak dikenal: " + line);
  return r.id;
}

async function getDivisiRow(line: string, nama: string) {
  const d = normalizeDivisi(line, nama);
  if (!d) return undefined;
  const lineId = await getLineId(line);
  return (await db
    .select()
    .from(divisi)
    .where(and(eq(divisi.productLineId, lineId), eq(divisi.nama, d))))[0];
}

async function getOrCreateKaryawan(tx: Tx, name: string, divisiId: number): Promise<number> {
  const n = clean(name);
  const existing = (await tx
    .select({ id: karyawan.id })
    .from(karyawan)
    .where(and(eq(karyawan.nama, n), eq(karyawan.divisiId, divisiId), eq(karyawan.isActive, 1)))
    )[0];
  if (existing) return existing.id;
  throw new Error(`Operator ${n} tidak ada dalam daftar karyawan aktif divisi.`);
}

// ---------------- master ----------------

async function buildProductOptions(line: string) {
  if (line === "brakeshoe") {
    const rows = await db
      .select({ type: product.type, grade: product.grade, kulit: product.kulit })
      .from(product)
      ;
    const history = await db.select({ type: produksiItem.type, grade: produksiItem.grade, kulit: produksiItem.kulit })
      .from(produksiItem)
      .innerJoin(produksi, eq(produksiItem.produksiId, produksi.id))
      .innerJoin(productLine, eq(produksi.productLineId, productLine.id))
      .where(eq(productLine.nama, "brakeshoe"))
      .groupBy(produksiItem.type, produksiItem.grade, produksiItem.kulit);
    const options = [...rows, ...history];
    return {
      types: uniqSort(options.map((r) => r.type)),
      grades: uniqSort(options.map((r) => r.grade)),
      kulits: uniqSort(options.map((r) => r.kulit)),
    };
  }
  if (line === "discpad") {
    const rows = await db
      .select({
        kode: product.kode,
        nama: product.namaType,
        tebal: product.tebal,
        cat: product.powderCoating,
      })
      .from(product)
      ;
    return {
      items: rows
        .filter((r) => r.kode && r.kode !== "-")
        .map((r) => ({ kode: r.kode, nama: r.nama, tebal: r.tebal, cat: r.cat })),
      codes: uniqSort(rows.map((r) => r.kode)),
      tebals: uniqSort(rows.map((r) => r.tebal)),
      coatings: uniqSort(rows.map((r) => r.cat)),
    };
  }
  // handle
  const rows = await db
    .select({ namaBarang: product.namaBarang, warna: product.warna })
    .from(product)
    ;
  return {
    namaBarangs: uniqSort(rows.map((r) => r.namaBarang)),
    warnas: uniqSort(rows.map((r) => r.warna)),
    items: rows
      .filter((r) => r.namaBarang && r.namaBarang !== "-")
      .map((r) => ({ namaBarang: r.namaBarang, warna: r.warna })),
  };
}

export async function getMaster(line: string, divisiName?: string) {
  const lineId = await getLineId(line);
  let divisiOptions = (await db
    .select({ nama: divisi.nama })
    .from(divisi)
    .where(eq(divisi.productLineId, lineId))
    .orderBy(asc(divisi.urutan))
    )
    .map((r) => r.nama);
  let divisis = await db
    .select({
      nama: divisi.nama,
      isCasting: divisi.isCasting,
      isTeam: divisi.isTeam,
      hasNg: divisi.hasNg,
      hasMerk: divisi.hasMerk,
      hasCat: divisi.hasCat,
      hasMesin: divisi.hasMesin,
      hasNgB: divisi.hasNgB,
    })
    .from(divisi)
    .where(eq(divisi.productLineId, lineId))
    .orderBy(asc(divisi.urutan))
    ;
  const operatorOptions = divisiName ? await getOperators(line, divisiName) : [];
  const productOptions = await buildProductOptions(line);
  const refreshDelayMs = line === "discpad" ? 3000 : 15000;

  if (line === "brakeshoe") {
    divisiOptions = divisiOptions.filter((n) => !isRemovedDivisi(n));
    divisis = divisis.filter((d) => !isRemovedDivisi(d.nama));
  }

  divisiOptions.sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base", numeric: true }));

  if (line === "discpad") {
    return {
      divisiOptions,
      divisis,
      operatorOptions,
      teamMemberOptions: operatorOptions,
      productOptions,
      paintingProcessOptions: ["Painting 1", "Painting 2"],
      abOptions: ["A", "B"],
      refreshDelayMs,
    };
  }
  if (line === "handle") {
    return {
      divisiOptions,
      divisis,
      operatorOptions,
      handleOptions: productOptions,
      productOptions,
      refreshDelayMs,
    };
  }
  return { divisiOptions, divisis, productOptions, operatorOptions, refreshDelayMs };
}

export async function getOperators(line: string, divisiName: string): Promise<string[]> {
  const d = await getDivisiRow(line, divisiName);
  if (!d) return [];
  return uniqSort(
    (await db
      .select({ nama: karyawan.nama })
      .from(karyawan)
      .where(and(eq(karyawan.divisiId, d.id), eq(karyawan.isActive, 1)))
      )
      .map((r) => r.nama),
  );
}

// ---------------- submit ----------------

function resolveOperators(d: typeof divisi.$inferSelect, payload: ProductionPayload): string[] {
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

async function buildItem(
  tx: Tx,
  line: Line,
  d: typeof divisi.$inferSelect,
  it: ProductionItemPayload,
  payload: ProductionPayload,
  produksiId: number,
  urutan: number,
){
  it = it || {};
  const matches = await (line === "brakeshoe"
    ? tx.select({ id: product.id }).from(product).where(and(
        eq(product.type, clean(it.type)), eq(product.grade, clean(it.grade)),
        eq(product.kulit, clean(it.kulit)),
      )).limit(2)
    : line === "discpad"
      ? tx.select({ id: product.id }).from(product).where(eq(product.kode, clean(it.kode))).limit(2)
      : tx.select({ id: product.id }).from(product).where(and(
          eq(product.namaBarang, clean(it.namaBarang)), eq(product.warna, clean(it.warna)),
        )).limit(2));
  const base = { produksiId, urutan, createdAt: now(), productId: matches.length === 1 ? matches[0].id : null };

  if (line === "brakeshoe") {
    if (d.isCasting) {
      return {
        ...base,
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
      ...base,
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
      ...base,
      kode: clean(it.kode) || null,
      gradeAb: d.nama === "PACKING" ? null : clean(it.ab) || null,
      cat: d.hasCat ? clean(it.cat) || null : null,
      tebal: clean(it.tebal) || null,
      qty: toInt(it.qty) || 0,
      ng: d.hasNg ? toInt(it.ng) : d.hasNgB ? toInt(it.ngA) : null,
      ngB: d.hasNgB ? toInt(it.ngB) : null,
    };
  }

  // handle
  if (d.isCasting) {
    return {
      ...base,
      type: clean(it.namaBarang) || "-",
      grade: "-",
      warna: clean(it.warna) || null,
      mesin: clean(payload.mesin) || null,
      qtyShot: toInt(payload.jumlahShot),
      qtySet: toInt(payload.jumlahSet),
      qtyPcs: 0,
      qtyKg: 0,
    };
  }
  return {
    ...base,
    namaBarang: clean(it.namaBarang) || "-",
    warna: clean(it.warna) || "-",
    qty: toInt(it.qty) || 0,
    ng: toInt(it.ng),
  };
}

export async function submitProduksi(line: Line, input: unknown): Promise<string> {
  const payload = parseProduction(input);
  const lineId = await getLineId(line);
  const d = await getDivisiRow(line, payload.divisi);
  if (!d) throw new Error("Divisi wajib dipilih.");

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
  if (line === "discpad" && d.nama === "PACKING" && (!qtyTotal || qtyTotal < 1)) {
    throw new Error("Jumlah produksi (SET) wajib lebih dari nol untuk PACKING.");
  }
  const proses = line === "discpad" && d.nama === "PAINTING" ? clean(payload.proses) : null;
  if (line === "discpad" && d.nama === "PAINTING" && !["Painting 1", "Painting 2"].includes(proses || "")) {
    throw new Error("Proses painting harus Painting 1 atau Painting 2.");
  }
  const requestHash = createHash("sha256").update(JSON.stringify({
    line, divisi: d.id, tanggal, shift, jam, operatorNames, items, qtyTotal, proses,
    mesin: clean(payload.mesin), shot: payload.jumlahShot, set: payload.jumlahSet,
  })).digest("hex");

  await db.transaction(async (tx) => {
    const duplicate = (await tx.select({ id: produksi.id }).from(produksi)
      .where(and(eq(produksi.requestHash, requestHash), gte(produksi.createdAt, new Date(Date.now() - 60_000).toISOString())))
      )[0];
    if (duplicate) throw new Error("Laporan yang sama baru saja disimpan. Periksa daftar produksi sebelum mengirim ulang.");
    const [ins] = await tx
      .insert(produksi)
      .values({
        productLineId: lineId,
        divisiId: d.id,
        tanggal,
        shift,
        jamKerja: jam,
        keterangan,
        proses,
        requestHash,
        qtyTotal,
        createdAt: now(),
      })
      .returning({ id: produksi.id })
      ;

    for (const [i, name] of operatorNames.entries()) {
      const kid = await getOrCreateKaryawan(tx, name, d.id);
      await tx.insert(produksiOperator)
        .values({ produksiId: ins.id, karyawanId: kid, urutan: i })
        .onConflictDoNothing();
    }

    for (const [i, it] of items.entries()) {
      await tx.insert(produksiItem).values(await buildItem(tx, line, d, it, payload, ins.id, i));
    }

    return ins.id;
  });

  return `✅ Data produksi tersimpan (${d.nama}) - ${items.length} item.`;
}

// ---------------- view ----------------

type Prod = typeof produksi.$inferSelect;
type Item = typeof produksiItem.$inferSelect;

function layoutFor(line: Line, d: typeof divisi.$inferSelect) {
  const grp = (p: Prod, isFirst: boolean, ops: string) => ({
    tanggal: isFirst ? p.tanggal : "",
    divisi: isFirst ? d.nama : "",
    operator: isFirst ? ops : "",
    shift: isFirst ? p.shift : "",
    jam: isFirst ? p.jamKerja : "",
    ket: isFirst ? p.keterangan ?? "" : "",
    qtyTotal: isFirst ? p.qtyTotal : null,
  });

  if (line === "brakeshoe") {
    if (d.isCasting) {
      const headers = [
        "TANGGAL", "DIVISI", "OPERATOR", "TYPE", "GRADE", "SHIFT", "MESIN",
        "JAM KERJA", "JUMLAH PRODUKSI SHOT", "JUMLAH PRODUKSI SET",
        "JUMLAH PRODUKSI PCS", "JUMLAH PRODUKSI KG", "PERSENTASE", "KETERANGAN",
      ];
      return {
        headers,
        buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
          const g = grp(p, isFirst, ops);
          const pct = it.qtyShot && it.qtyShot > 0 ? Number((it.qtyShot / 2048).toFixed(4)) : "";
          return [g.tanggal, g.divisi, g.operator, it.type, it.grade, g.shift, it.mesin, g.jam, it.qtyShot, it.qtySet, it.qtyPcs, it.qtyKg, pct, g.ket];
        },
      };
    }
    const headers = ["TANGGAL", "DIVISI", d.isTeam ? "OPERATOR / ANGGOTA TIM" : "OPERATOR", "TYPE", "GRADE", "KULIT"];
    if (d.hasMerk) headers.push("MERK");
    headers.push("SHIFT", "JAM KERJA", "TOTAL JUMLAH PRODUKSI");
    if (d.hasNg) headers.push("TOTAL NG");
    headers.push("KETERANGAN");
    return {
      headers,
      buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
        const g = grp(p, isFirst, ops);
        const row: ReportCell[] = [g.tanggal, g.divisi, g.operator, it.type, it.grade, it.kulit];
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

    const headers = ["TANGGAL", "DIVISI", "OPERATOR", "KODE"];
    if (d.nama === "PAINTING") headers.push("PROSES");
    if (hasAb) headers.push("A/B");
    if (hasCat) headers.push("CAT");
    headers.push("TEBAL", "QTY (PCS)");
    if (isPacking) headers.push("NG A", "NG B");
    else if (hasNg) headers.push("NG");
    headers.push("SHIFT", "JAM");
    if (!isPacking) headers.push("JUMLAH PRODUKSI (PCS)");
    headers.push(isPacking ? "HASIL PRODUKSI (SET)" : "HASIL PRODUKSI (SET)");
    headers.push("KETERANGAN");

    return {
      headers,
      buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
        const g = grp(p, isFirst, ops);
        const row: ReportCell[] = [g.tanggal, g.divisi, g.operator, it.kode];
        if (d.nama === "PAINTING") row.push(isFirst ? p.proses : "");
        if (hasAb) row.push(it.gradeAb);
        if (hasCat) row.push(it.cat);
        row.push(it.tebal, it.qty);
        if (isPacking) row.push(it.ng, it.ngB);
        else if (hasNg) row.push(it.ng);
        row.push(g.shift, g.jam);
        if (!isPacking) row.push(g.qtyTotal);
        // HASIL PRODUKSI = total/2 (non-packing) atau nilai header (packing)
        row.push(isPacking ? g.qtyTotal : (g.qtyTotal != null ? Number((g.qtyTotal / 2).toFixed(0)) : null));
        row.push(g.ket);
        return row;
      },
    };
  }

  // handle
  const isCasting = !!d.isCasting;
  const headers = ["DIVISI", "OPERATOR", "TANGGAL", "SHIFT", "JAM KERJA"];
  if (isCasting) headers.push("MESIN", "NAMA BARANG", "WARNA", "JUMLAH PRODUKSI SHOT", "JUMLAH PRODUKSI SET");
  else headers.push("NAMA BARANG", "WARNA", "TOTAL JUMLAH PRODUKSI", "TOTAL NG");
  headers.push("KETERANGAN");

  return {
    headers,
    buildRow: (p: Prod, it: Item, isFirst: boolean, ops: string) => {
      const g = grp(p, isFirst, ops);
        const row: ReportCell[] = [g.divisi, g.operator, g.tanggal, g.shift, g.jam];
      if (isCasting) row.push(it.mesin, it.type, it.warna, it.qtyShot, it.qtySet);
      else row.push(it.namaBarang, it.warna, it.qty, it.ng);
      row.push(g.ket);
      return row;
    },
  };
}

export async function getProductionData(line: Line, params: ProductionQuery = {}) {
  const d = await getDivisiRow(line, params.divisi ?? "");
  if (!d) return { headers: [], rows: [], recordIds: [], total: 0, limited: false };

  const { headers, buildRow } = layoutFor(line, d);

  const conditions = [eq(produksi.divisiId, d.id)];
  const from = clean(params.from);
  const to = clean(params.to);
  if ((from && !isValidISODate(from)) || (to && !isValidISODate(to)) || (from && to && from > to)) {
    throw new Error("Periode tanggal tidak valid.");
  }
  if (from) conditions.push(gte(produksi.tanggal, from));
  if (to) conditions.push(lte(produksi.tanggal, to));

  const rawLimit = params.limit === null ? null : Number(params.limit || 2000);
  if (rawLimit !== null && (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 10000)) {
    throw new Error("Batas baris harus 1 sampai 10000.");
  }
  const [countResult] = await db.select({ value: count() }).from(produksiItem)
    .innerJoin(produksi, eq(produksiItem.produksiId, produksi.id))
    .where(and(...conditions));
  const total = countResult?.value ?? 0;
  const query = db.select({ header: produksi, item: produksiItem })
    .from(produksiItem).innerJoin(produksi, eq(produksiItem.produksiId, produksi.id))
    .where(and(...conditions))
    .orderBy(asc(produksi.tanggal), asc(produksi.id), asc(produksiItem.urutan));
  const selected = await (rawLimit === null ? query : query.limit(rawLimit));
  const limited = rawLimit !== null && total > rawLimit;
  const rows: ReportCell[][] = [];
  const ids = [...new Set(selected.map(({ header }) => header.id))];
  const names = ids.length ? await db.select({ produksiId: produksiOperator.produksiId, nama: karyawan.nama })
    .from(produksiOperator).innerJoin(karyawan, eq(produksiOperator.karyawanId, karyawan.id))
    .where(inArray(produksiOperator.produksiId, ids))
    .orderBy(asc(produksiOperator.urutan)) : [];
  const operators = new Map<number, string[]>();
  for (const entry of names) operators.set(entry.produksiId, [...(operators.get(entry.produksiId) ?? []), entry.nama]);
  const seen = new Set<number>();
  const recordIds: number[] = [];
  for (const { header, item } of selected) {
    const ops = operators.get(header.id) ?? [];
    const opsStr = d.isTeam && ops.length ? ops.join("\n") + `\n\nJumlah: ${ops.length} orang` : ops.join("\n");
    rows.push(buildRow(header, item, !seen.has(header.id), opsStr));
    recordIds.push(header.id);
    seen.add(header.id);
  }
  return { headers, rows, recordIds, total, limited };
}

export async function getProductionRecord(id: number) {
  const [row] = await db.select({ header: produksi, divisi: divisi.nama, line: productLine.nama })
    .from(produksi)
    .innerJoin(divisi, eq(produksi.divisiId, divisi.id))
    .innerJoin(productLine, eq(produksi.productLineId, productLine.id))
    .where(eq(produksi.id, id));
  if (!row) throw new Error("Laporan produksi tidak ditemukan.");
  const items = await db.select().from(produksiItem).where(eq(produksiItem.produksiId, id))
    .orderBy(asc(produksiItem.urutan));
  const operatorRows = await db.select({ nama: karyawan.nama }).from(produksiOperator)
    .innerJoin(karyawan, eq(produksiOperator.karyawanId, karyawan.id))
    .where(eq(produksiOperator.produksiId, id))
    .orderBy(asc(produksiOperator.urutan));
  const operators = operatorRows.map(value => value.nama);
  return { ...row, items, operators };
}

export async function updateProductionRecord(id: number, line: Line, input: unknown) {
  const payload = parseProduction(input);
  const before = await getProductionRecord(id);
  if (before.line !== line) throw new Error("Lini produk tidak cocok dengan laporan.");
  const d = await getDivisiRow(line, payload.divisi);
  if (!d) throw new Error("Divisi tidak valid.");
  const tanggal = clean(payload.tanggal);
  if (!isValidISODate(tanggal)) throw new Error("Tanggal tidak valid.");
  const items = payload.items;
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error("Jumlah item tidak valid.");
  const names = resolveOperators(d, payload);
  const lineId = await getLineId(line);
  if (line === "discpad" && d.nama === "PACKING" && !(toInt(payload.jumlahProduksi ?? payload.hasilProduksi) ?? 0)) {
    throw new Error("Jumlah produksi (SET) wajib lebih dari nol untuk PACKING.");
  }
  const proses = line === "discpad" && d.nama === "PAINTING" ? clean(payload.proses) : null;
  if (line === "discpad" && d.nama === "PAINTING" && !["Painting 1", "Painting 2"].includes(proses || "")) {
    throw new Error("Proses painting tidak valid.");
  }
  await db.transaction(async tx => {
    await tx.insert(auditLog).values({
      entity: "produksi", entityId: id, aksi: "update", actor: "admin",
      detail: JSON.stringify({ before, payload }), createdAt: now(),
    });
    await tx.delete(produksiOperator).where(eq(produksiOperator.produksiId, id));
    await tx.delete(produksiItem).where(eq(produksiItem.produksiId, id));
    await tx.update(produksi).set({
      productLineId: lineId, divisiId: d.id, tanggal,
      shift: clean(payload.shift) || "-", jamKerja: clean(payload.jamKerja || payload.jam) || "-",
      keterangan: clean(payload.keterangan) || null, proses,
      qtyTotal: line === "discpad" ? toInt(payload.jumlahProduksi ?? payload.hasilProduksi) : null,
      requestHash: null, updatedAt: now(),
    }).where(eq(produksi.id, id));
    for (const [index, name] of names.entries()) {
      const karyawanId = await getOrCreateKaryawan(tx, name, d.id);
      await tx.insert(produksiOperator).values({ produksiId: id, karyawanId, urutan: index }).onConflictDoNothing();
    }
    for (const [index, item] of items.entries()) {
      await tx.insert(produksiItem).values(await buildItem(tx, line, d, item, payload, id, index));
    }
  });
  return { success: true, id };
}

export async function deleteProductionRecord(id: number) {
  const before = await getProductionRecord(id);
  await db.transaction(async tx => {
    await tx.insert(auditLog).values({
      entity: "produksi", entityId: id, aksi: "delete", actor: "admin",
      detail: JSON.stringify(before), createdAt: now(),
    });
    await tx.delete(produksi).where(eq(produksi.id, id));
  });
  return { success: true };
}
