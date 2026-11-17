import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, stockOpnameMaster } from "@/db/schema";
import { now } from "./shared";

type StockMasterInput = { op: string | null; kode: string; type: string | null; powder: string; isActive: number };

function parseInput(input: unknown): StockMasterInput {
  if (!input || typeof input !== "object") throw new Error("Data master stok tidak valid.");
  const row = input as Record<string, unknown>;
  const kode = typeof row.kode === "string" ? row.kode.trim() : "";
  const powder = typeof row.powder === "string" ? row.powder.trim() : "";
  const op = typeof row.op === "string" ? row.op.trim() : null;
  const type = typeof row.type === "string" ? row.type.trim() || null : null;
  if (!kode || kode === "-" || kode.length > 80) throw new Error("Kode wajib diisi dan maksimal 80 karakter.");
  if (!powder || powder.length > 100) throw new Error("Powder wajib diisi dan maksimal 100 karakter.");
  if (op && op.length > 100) throw new Error("OP maksimal 100 karakter.");
  if (type && type.length > 150) throw new Error("Type maksimal 150 karakter.");
  if (row.isActive !== 0 && row.isActive !== 1) throw new Error("Status aktif tidak valid.");
  return { op, kode, type, powder, isActive: row.isActive };
}

export async function listStockMaster() {
  return db.select().from(stockOpnameMaster).orderBy(asc(stockOpnameMaster.sortOrder), asc(stockOpnameMaster.kode));
}

export async function saveStockMaster(id: number | null, input: unknown) {
  const value = parseInput(input);
  return db.transaction(async (tx) => {
    const before = id ? (await tx.select().from(stockOpnameMaster).where(eq(stockOpnameMaster.id, id)))[0] : null;
    if (id && !before) throw new Error("Master stok tidak ditemukan.");
    const [duplicate] = await tx.select({ id: stockOpnameMaster.id }).from(stockOpnameMaster).where(and(
      eq(stockOpnameMaster.kode, value.kode), eq(stockOpnameMaster.powder, value.powder),
      id ? ne(stockOpnameMaster.id, id) : undefined,
    ));
    if (duplicate) throw new Error("Kombinasi kode dan powder sudah ada.");
    const maxOrder = await tx.select({ sortOrder: stockOpnameMaster.sortOrder }).from(stockOpnameMaster)
      .orderBy(asc(stockOpnameMaster.sortOrder));
    const sortOrder = before?.sortOrder ?? ((maxOrder.at(-1)?.sortOrder ?? -1) + 1);
    let recordId = id;
    if (id) await tx.update(stockOpnameMaster).set({ ...value, sortOrder }).where(eq(stockOpnameMaster.id, id));
    else {
      const [inserted] = await tx.insert(stockOpnameMaster).values({ ...value, sortOrder }).returning({ id: stockOpnameMaster.id });
      recordId = inserted.id;
    }
    await tx.insert(auditLog).values({ entity: "stock_opname_master", entityId: recordId!, aksi: id ? "update" : "create",
      actor: "admin", detail: JSON.stringify({ before, after: value }), createdAt: now() });
    return { id: recordId };
  });
}

export async function deleteStockMaster(id: number) {
  return db.transaction(async (tx) => {
    const before = (await tx.select().from(stockOpnameMaster).where(eq(stockOpnameMaster.id, id)))[0];
    if (!before) throw new Error("Master stok tidak ditemukan.");
    await tx.update(stockOpnameMaster).set({ isActive: 0 }).where(eq(stockOpnameMaster.id, id));
    await tx.insert(auditLog).values({ entity: "stock_opname_master", entityId: id, aksi: "deactivate",
      actor: "admin", detail: JSON.stringify(before), createdAt: now() });
    return { success: true };
  });
}
