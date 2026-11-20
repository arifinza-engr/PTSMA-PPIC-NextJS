import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, productionTarget, produksiBrakeshoe, produksiDiscpad, produksiHandle } from "@/db/schema";
import { getProductionLine, listProductionProducts } from "./production-master";
import { now, toFloat } from "./shared";
import { targetForWorkHours } from "./production-target-utils";
import { isValidISODate } from "./date";

export const targetProducts = ["brakeshoe", "discpad", "handle"] as const;
export const targetShifts = ["Shift 1 & 2", "Shift 3"] as const;
export const targetMetrics = ["PCS", "SET", "SHOT"] as const;

const schema = z.object({
  produk: z.enum(targetProducts),
  lini: z.string().trim().min(1).max(150),
  kategori: z.string().trim().max(100).default(""),
  shift: z.union([z.enum(targetShifts), z.enum(["Shift 1", "Shift 2"])] )
    .transform((shift) => shift === "Shift 1" || shift === "Shift 2" ? "Shift 1 & 2" : shift),
  satuan: z.enum(targetMetrics),
  nilai: z.coerce.number().finite().min(0).max(1_000_000_000),
});

async function parseTarget(input: unknown) {
  const parsed = schema.parse(input);
  const line = await getProductionLine(parsed.produk, parsed.lini);
  if (!line) {
    throw new Error("Lini tidak dikenal untuk produk tersebut.");
  }
  const metrics = line.targetMetrics;
  if (!metrics.includes(parsed.satuan)) {
    throw new Error("Satuan target tidak sesuai dengan lini.");
  }
  const categories = line.castingCategories ?? [];
  if (categories.length && !categories.includes(parsed.kategori)) throw new Error("Pilih kategori Casting yang terdaftar pada master lini.");
  if (!categories.length && parsed.kategori) throw new Error("Kategori hanya berlaku pada lini yang mengaktifkannya di master.");
  return parsed;
}

export async function listProductionTargets() {
  const [rows, products] = await Promise.all([db.select().from(productionTarget).orderBy(
    asc(productionTarget.produk), asc(productionTarget.lini), asc(productionTarget.shift), asc(productionTarget.satuan),
  ), listProductionProducts(false)]);
  const rowsWithBasis = rows.map((row) => {
    const line = products.find((product) => product.kode === row.produk)?.lines.find((candidate) => candidate.nama === row.lini);
    return { ...row, basis: line?.isTeam ? "tim" : "per_orang" };
  });
  const result: (typeof rows[number] & { shift: string })[] = [];
  const combinedIndexes = new Map<string, number>();
  for (const row of rowsWithBasis) {
    if (row.shift !== "Shift 1" && row.shift !== "Shift 2" && row.shift !== "Shift 1 & 2") {
      result.push(row);
      continue;
    }
    const key = JSON.stringify([row.produk, row.lini, row.satuan, row.kategori ?? ""]);
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
          eq(productionTarget.kategori, before.kategori),
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
      eq(productionTarget.kategori, value.kategori),
    ));
    const oldIds = new Set(oldRows.map((row) => row.id));
    if (desiredRows.some((row) => !oldIds.has(row.id))) {
      throw new Error("Target untuk lini, shift, dan satuan ini sudah ada.");
    }

    const desiredShiftSet = new Set<string>(desiredShifts);
    const retainedOldRows = oldRows.filter((row) =>
      row.produk === value.produk && row.lini === value.lini && row.satuan === value.satuan && row.kategori === value.kategori && desiredShiftSet.has(row.shift),
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
      const rowValue = {
        produk: value.produk, lini: value.lini, shift, kategori: value.kategori,
        satuan: value.satuan, nilai: value.nilai,
      };
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
        eq(productionTarget.kategori, before.kategori),
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
    listProductionProducts(),
    db.select().from(produksiBrakeshoe).where(and(gte(produksiBrakeshoe.tanggal, from), lte(produksiBrakeshoe.tanggal, to))),
    db.select().from(produksiDiscpad).where(and(gte(produksiDiscpad.tanggal, from), lte(produksiDiscpad.tanggal, to))),
    db.select().from(produksiHandle).where(and(gte(produksiHandle.tanggal, from), lte(produksiHandle.tanggal, to))),
  ]);
  const records = [
    ...brakeshoe.map((record) => ({ produk: "brakeshoe", record })),
    ...discpad.map((record) => ({ produk: "discpad", record })),
    ...handle.map((record) => ({ produk: "handle", record })),
  ];
  const activeLineKeys = new Set(products.flatMap((product) => product.lines
    .filter((line) => line.isActive === 1)
    .map((line) => `${product.kode}\u0000${line.nama}`)));
  const performanceTargets = targets
    .filter((target) => activeLineKeys.has(`${target.produk}\u0000${target.lini}`))
    .flatMap((target) => target.shift === "Shift 1 & 2"
    ? [{ ...target, shift: "Shift 1" }, { ...target, shift: "Shift 2" }]
    : [target]);
  const categoryPerformance = performanceTargets.map((target) => {
    const targetLine = products.find((product) => product.kode === target.produk)?.lines.find((line) => line.nama === target.lini);
    const basis = targetLine?.isTeam ? "tim" : "per_orang";
    const groups = new Map<string, { label: string; operators: Set<string>; mesin: Set<string>; aktual: number; target: number; dates: Set<string>; records: number }>();
    for (const { produk, record } of records) {
      if (produk !== target.produk || record.lini !== target.lini || record.shift !== target.shift) continue;
      const recordCategory = String(record.items[0]?.castingCategory ?? "");
      if (recordCategory !== (target.kategori ?? "")) continue;
      const definition = targetLine;
      const isShot = Boolean(definition?.hasShot);
      const pcs = definition?.isCasting
        ? record.items.reduce((sum, item) => sum + (toFloat(item.qtyPcs) ?? 0), 0)
        : definition?.hasProductionTotal
        ? toFloat(record.qtyTotal) ?? 0
        : record.items.reduce((sum, item) => sum + (toFloat(item.qty) ?? 0), 0);
      const actual = target.satuan === "SHOT"
        ? (isShot ? toFloat(record.items[0]?.qtyShot) ?? 0 : 0)
        : target.satuan === "PCS" ? pcs
          : definition?.isCasting
            ? record.items.reduce((sum, item) => sum + (toFloat(item.qtySet) ?? 0), 0)
            : pcs / (definition?.pcsPerSet || 1);
      const recordTarget = targetForWorkHours(target.nilai, toFloat(record.jamKerja) ?? 0);
      const operators = [...new Set(record.operators.map((name) => name.trim()).filter(Boolean))];
      if (!operators.length) continue;
    const portions = basis === "per_orang"
        ? operators.map((name) => ({ key: `person:${name}`, label: name, names: [name], qty: actual / operators.length, target: recordTarget }))
        : [{ key: `team:${[...operators].sort().join("\u0000")}`, label: operators.length > 1 ? `${operators.join(", ")} (Tim)` : `${operators[0]} (Tim)`, names: operators, qty: actual, target: recordTarget }];
      for (const portion of portions) {
        const group = groups.get(portion.key) ?? { label: portion.label, operators: new Set<string>(), mesin: new Set<string>(), aktual: 0, target: 0, dates: new Set<string>(), records: 0 };
        portion.names.forEach((name) => group.operators.add(name));
        const machine = definition?.hasMesin ? String(record.items[0]?.mesin ?? "").trim() : "";
        if (machine) group.mesin.add(machine);
        group.aktual += portion.qty;
        group.target += portion.target;
        group.dates.add(record.tanggal);
        group.records += 1;
        groups.set(portion.key, group);
      }
    }
    const groupRows = [...groups.entries()].map(([key, group]) => {
      const targetTotal = group.target;
      return { key, label: group.label, kategori: target.kategori ?? "", mesin: [...group.mesin].sort((a, b) => a.localeCompare(b, "id", { numeric: true })), target: targetTotal, actual: group.aktual,
        percentage: targetTotal > 0 ? group.aktual / targetTotal * 100 : null,
        operatorCount: group.operators.size, recordCount: group.records, activeDays: group.dates.size };
    });
    const targetTotal = groupRows.reduce((sum, group) => sum + group.target, 0);
    const actualTotal = groupRows.reduce((sum, group) => sum + group.actual, 0);
    return {
      id: target.id, produk: target.produk, lini: target.lini, kategori: target.kategori ?? "", shift: target.shift,
      hasMesin: Boolean(targetLine?.hasMesin),
      basis, satuan: target.satuan, targetPerUnit: target.nilai,
      target: targetTotal, actual: actualTotal,
      percentage: targetTotal > 0 ? actualTotal / targetTotal * 100 : null,
      groups: groupRows,
    };
  });
  const categoryMetricGroups = new Map<string, typeof categoryPerformance>();
  for (const metric of categoryPerformance) {
    const key = JSON.stringify([metric.produk, metric.lini, metric.shift, metric.basis, metric.satuan]);
    categoryMetricGroups.set(key, [...(categoryMetricGroups.get(key) ?? []), metric]);
  }
  const performance = [...categoryMetricGroups.values()].map((metrics) => {
    if (metrics.length === 1) return metrics[0];
    const first = metrics[0];
    const target = metrics.reduce((sum, metric) => sum + metric.target, 0);
    const actual = metrics.reduce((sum, metric) => sum + metric.actual, 0);
    return {
      ...first,
      id: Math.min(...metrics.map((metric) => metric.id)),
      kategori: "",
      targetPerUnit: metrics.reduce((sum, metric) => sum + metric.targetPerUnit, 0),
      target,
      actual,
      percentage: target > 0 ? actual / target * 100 : null,
      groups: metrics.flatMap((metric) => metric.groups).sort((a, b) => a.label.localeCompare(b.label, "id", { sensitivity: "base" }) || a.kategori.localeCompare(b.kategori, "id", { sensitivity: "base" })),
    };
  });
  const lineShiftGroups = new Map<string, typeof performance>();
  for (const line of performance) {
    const key = `${line.produk}\u0000${line.lini}\u0000${line.shift}`;
    lineShiftGroups.set(key, [...(lineShiftGroups.get(key) ?? []), line]);
  }
  const lineShiftRows = [...lineShiftGroups.values()];
  const activeLineShifts = lineShiftRows.filter((rows) => rows.some((line) => line.groups.length > 0));
  const reportedMetrics = performance.filter((line) => line.groups.length > 0 && line.percentage != null);
  const averageProductionAchievement = reportedMetrics.length
    ? reportedMetrics.reduce((sum, line) => sum + (line.percentage ?? 0), 0) / reportedMetrics.length
    : null;
  const operatorGroups = new Set<string>();
  for (const line of performance) {
    for (const group of line.groups) operatorGroups.add(`${line.produk}\u0000${line.lini}\u0000${line.shift}\u0000${line.basis}\u0000${group.key}\u0000${group.kategori}`);
  }
  return {
    periodLabel,
    activeProducts: products.map((product) => ({
      kode: product.kode,
      nama: product.nama,
      lines: product.lines.filter((line) => line.isActive === 1).map((line) => ({
        nama: line.nama,
        hasTargets: (line.castingCategories?.length ? line.castingCategories : [""]).every((category) =>
          targets.some((target) => target.produk === product.kode && target.lini === line.nama && (target.kategori ?? "") === category)),
        castingCategories: line.castingCategories ?? [],
      })),
    })),
    summary: {
      targetLines: lineShiftRows.length,
      activeLines: activeLineShifts.length,
      averageProductionAchievement,
      operatorGroups: operatorGroups.size,
    },
    lines: performance,
  };
}
