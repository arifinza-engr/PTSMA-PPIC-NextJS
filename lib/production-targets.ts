import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, productionTarget, produksiBrakeshoe, produksiDiscpad, produksiHandle } from "@/db/schema";
import { getProductionLine, listProductionProducts } from "./production-master";
import { now, toFloat } from "./shared";
import { isValidISODate } from "./date";

export const targetProducts = ["brakeshoe", "discpad", "handle"] as const;
export const targetShifts = ["Shift 1 & 2", "Shift 3"] as const;
export const targetBases = ["per_orang", "tim"] as const;
export const targetMetrics = ["PCS", "SET", "SHOT"] as const;

const schema = z.object({
  produk: z.enum(targetProducts),
  lini: z.string().trim().min(1).max(150),
  shift: z.union([z.enum(targetShifts), z.enum(["Shift 1", "Shift 2"])] )
    .transform((shift) => shift === "Shift 1" || shift === "Shift 2" ? "Shift 1 & 2" : shift),
  basis: z.enum(targetBases),
  satuan: z.enum(targetMetrics),
  nilai: z.coerce.number().finite().min(0).max(1_000_000_000),
});

async function parseTarget(input: unknown) {
  const value = schema.parse(input);
  const line = await getProductionLine(value.produk, value.lini);
  if (!line) {
    throw new Error("Lini tidak dikenal untuk produk tersebut.");
  }
  const metrics = line.targetMetrics;
  if (!metrics.includes(value.satuan)) {
    throw new Error("Satuan target tidak sesuai dengan lini.");
  }
  return value;
}

export async function listProductionTargets() {
  const rows = await db.select().from(productionTarget).orderBy(
    asc(productionTarget.produk), asc(productionTarget.lini), asc(productionTarget.shift), asc(productionTarget.satuan),
  );
  const result: (typeof rows[number] & { shift: string })[] = [];
  const combinedIndexes = new Map<string, number>();
  for (const row of rows) {
    if (row.shift !== "Shift 1" && row.shift !== "Shift 2" && row.shift !== "Shift 1 & 2") {
      result.push(row);
      continue;
    }
    const key = JSON.stringify([row.produk, row.lini, row.satuan]);
    const existingIndex = combinedIndexes.get(key);
    if (existingIndex === undefined) {
      combinedIndexes.set(key, result.length);
      result.push({ ...row, shift: "Shift 1 & 2" });
    } else if (row.shift === "Shift 1") {
      result[existingIndex] = { ...row, shift: "Shift 1 & 2" };
    }
  }
  return result;
}

export async function saveProductionTarget(id: number | null, input: unknown) {
  const value = await parseTarget(input);
  return db.transaction(async (tx) => {
    const before = id ? (await tx.select().from(productionTarget).where(eq(productionTarget.id, id)))[0] : null;
    if (id && !before) throw new Error("Target tidak ditemukan.");
    const oldRows = before
      ? before.shift === "Shift 1" || before.shift === "Shift 2" || before.shift === "Shift 1 & 2"
        ? await tx.select().from(productionTarget).where(and(
          eq(productionTarget.produk, before.produk), eq(productionTarget.lini, before.lini),
          eq(productionTarget.satuan, before.satuan), inArray(productionTarget.shift, ["Shift 1", "Shift 2", "Shift 1 & 2"]),
        ))
        : [before]
      : [];
    const isCombinedShift = value.shift === "Shift 1 & 2";
    const desiredShifts: ("Shift 1" | "Shift 2" | "Shift 3")[] = isCombinedShift
      ? ["Shift 1", "Shift 2"]
      : ["Shift 3"];
    const desiredRows = await tx.select().from(productionTarget).where(and(
      eq(productionTarget.produk, value.produk), eq(productionTarget.lini, value.lini),
      eq(productionTarget.satuan, value.satuan), inArray(productionTarget.shift, [...desiredShifts]),
    ));
    const oldIds = new Set(oldRows.map((row) => row.id));
    if (desiredRows.some((row) => !oldIds.has(row.id))) {
      throw new Error("Target untuk lini, shift, dan satuan ini sudah ada.");
    }

    const desiredShiftSet = new Set<string>(desiredShifts);
    const retainedOldRows = oldRows.filter((row) =>
      row.produk === value.produk && row.lini === value.lini && row.satuan === value.satuan && desiredShiftSet.has(row.shift),
    );
    const removedOldRows = oldRows.filter((row) => !retainedOldRows.some((retained) => retained.id === row.id));
    for (const row of removedOldRows) {
      await tx.insert(auditLog).values({ entity: "production_target", entityId: row.id, aksi: "delete", actor: "admin",
        detail: JSON.stringify(row), createdAt: now() });
      await tx.delete(productionTarget).where(eq(productionTarget.id, row.id));
    }

    const savedIds: number[] = [];
    for (const shift of desiredShifts) {
      const existing = desiredRows.find((row) => row.shift === shift);
      const rowValue = { ...value, shift };
      if (existing) {
        const [updated] = await tx.update(productionTarget).set(rowValue).where(eq(productionTarget.id, existing.id))
          .returning({ id: productionTarget.id });
        savedIds.push(updated.id);
      } else {
        const [inserted] = await tx.insert(productionTarget).values(rowValue).returning({ id: productionTarget.id });
        savedIds.push(inserted.id);
      }
    }
    const savedId = isCombinedShift
      ? (desiredRows.find((row) => row.shift === "Shift 1")?.id ?? savedIds[0])
      : savedIds[0];
    await tx.insert(auditLog).values({ entity: "production_target", entityId: savedId, aksi: id ? "update" : "create",
      actor: "admin", detail: JSON.stringify({ before: oldRows, after: { ...value, shifts: desiredShifts } }), createdAt: now() });
    return { id: savedId };
  });
}

export async function deleteProductionTarget(id: number) {
  return db.transaction(async (tx) => {
    const before = (await tx.select().from(productionTarget).where(eq(productionTarget.id, id)))[0];
    if (!before) throw new Error("Target tidak ditemukan.");
    const rows = before.shift === "Shift 1" || before.shift === "Shift 2" || before.shift === "Shift 1 & 2"
      ? await tx.select().from(productionTarget).where(and(
        eq(productionTarget.produk, before.produk), eq(productionTarget.lini, before.lini),
        eq(productionTarget.satuan, before.satuan), inArray(productionTarget.shift, ["Shift 1", "Shift 2", "Shift 1 & 2"]),
      ))
      : [before];
    for (const row of rows) {
      await tx.insert(auditLog).values({ entity: "production_target", entityId: row.id, aksi: "delete", actor: "admin",
        detail: JSON.stringify(row), createdAt: now() });
      await tx.delete(productionTarget).where(eq(productionTarget.id, row.id));
    }
    return { success: true };
  });
}

export async function getTargetPerformance(input: { mode: "day"; date: string } | { mode: "month"; month: string }) {
  let from: string;
  let to: string;
  let periodLabel: string;
  if (input.mode === "day") {
    if (!isValidISODate(input.date)) throw new Error("Tanggal laporan tidak valid.");
    from = input.date;
    to = input.date;
    periodLabel = input.date;
  } else {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(input.month);
    if (!match) throw new Error("Bulan laporan tidak valid.");
    const [, year, month] = match;
    from = `${year}-${month}-01`;
    to = `${year}-${month}-${String(new Date(Number(year), Number(month), 0).getDate()).padStart(2, "0")}`;
    periodLabel = input.month;
  }
  const [targets, products, brakeshoe, discpad, handle] = await Promise.all([
    listProductionTargets(),
    listProductionProducts(false),
    db.select().from(produksiBrakeshoe).where(and(gte(produksiBrakeshoe.tanggal, from), lte(produksiBrakeshoe.tanggal, to))),
    db.select().from(produksiDiscpad).where(and(gte(produksiDiscpad.tanggal, from), lte(produksiDiscpad.tanggal, to))),
    db.select().from(produksiHandle).where(and(gte(produksiHandle.tanggal, from), lte(produksiHandle.tanggal, to))),
  ]);
  const records = [
    ...brakeshoe.map((record) => ({ produk: "brakeshoe", record })),
    ...discpad.map((record) => ({ produk: "discpad", record })),
    ...handle.map((record) => ({ produk: "handle", record })),
  ];
  const performanceTargets = targets.flatMap((target) => target.shift === "Shift 1 & 2"
    ? [{ ...target, shift: "Shift 1" }, { ...target, shift: "Shift 2" }]
    : [target]);
  const performance = performanceTargets.map((target) => {
    const groups = new Map<string, { label: string; operators: Set<string>; aktual: number; dates: Set<string>; records: number }>();
    for (const { produk, record } of records) {
      if (produk !== target.produk || record.lini !== target.lini || record.shift !== target.shift) continue;
      const definition = products.find((product) => product.kode === produk)?.lines.find((line) => line.nama === record.lini);
      const isShot = Boolean(definition?.hasShot);
      const pcs = definition?.hasProductionTotal
        ? toFloat(record.qtyTotal) ?? 0
        : record.items.reduce((sum, item) => sum + (toFloat(item.qty) ?? 0), 0);
      const actual = target.satuan === "SHOT"
        ? (isShot ? toFloat(record.items[0]?.qtyShot) ?? 0 : 0)
        : target.satuan === "PCS" ? pcs : pcs / (definition?.pcsPerSet || 1);
      const operators = [...new Set(record.operators.map((name) => name.trim()).filter(Boolean))];
      if (!operators.length) continue;
      const portions = target.basis === "per_orang"
        ? operators.map((name) => ({ key: `person:${name}`, label: name, names: [name], qty: actual / operators.length }))
        : [{ key: `team:${[...operators].sort().join("\u0000")}`, label: operators.length > 1 ? `${operators.join(", ")} (Tim)` : `${operators[0]} (Tim)`, names: operators, qty: actual }];
      for (const portion of portions) {
        const group = groups.get(portion.key) ?? { label: portion.label, operators: new Set<string>(), aktual: 0, dates: new Set<string>(), records: 0 };
        portion.names.forEach((name) => group.operators.add(name));
        group.aktual += portion.qty;
        group.dates.add(record.tanggal);
        group.records += 1;
        groups.set(portion.key, group);
      }
    }
    const groupRows = [...groups.entries()].map(([key, group]) => {
      const targetTotal = target.nilai * group.dates.size;
      return { key, label: group.label, target: targetTotal, aktual: group.aktual,
        percentage: targetTotal > 0 ? group.aktual / targetTotal * 100 : null,
        operatorCount: group.operators.size, recordCount: group.records, activeDays: group.dates.size };
    });
    const targetTotal = groupRows.reduce((sum, group) => sum + group.target, 0);
    const actualTotal = groupRows.reduce((sum, group) => sum + group.aktual, 0);
    return {
      id: target.id, produk: target.produk, lini: target.lini, shift: target.shift,
      basis: target.basis, satuan: target.satuan, targetPerUnit: target.nilai,
      target: targetTotal, actual: actualTotal,
      percentage: targetTotal > 0 ? actualTotal / targetTotal * 100 : null,
      groups: groupRows,
    };
  });
  const lineShiftGroups = new Map<string, typeof performance>();
  for (const line of performance) {
    const key = `${line.produk}\u0000${line.lini}\u0000${line.shift}`;
    lineShiftGroups.set(key, [...(lineShiftGroups.get(key) ?? []), line]);
  }
  const lineShiftRows = [...lineShiftGroups.values()];
  const activeLineShifts = lineShiftRows.filter((rows) => rows.some((line) => line.groups.length > 0));
  const operatorGroups = new Set<string>();
  for (const line of performance) {
    for (const group of line.groups) operatorGroups.add(`${line.produk}\u0000${line.lini}\u0000${line.shift}\u0000${line.basis}\u0000${group.key}`);
  }
  return {
    periodLabel,
    summary: {
      targetLines: lineShiftRows.length,
      activeLines: activeLineShifts.length,
      achievedLines: activeLineShifts.filter((rows) => rows.every((line) => line.percentage != null && line.percentage >= 100)).length,
      operatorGroups: operatorGroups.size,
    },
    lines: performance,
  };
}
