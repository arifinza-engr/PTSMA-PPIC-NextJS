import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, divisi, karyawan, product, productLine } from "@/db/schema";
import { now } from "./shared";

const identifier = z.number().int().positive();
const optionalText = z.string().trim().max(150).nullable().optional();
const employeeSchema = z.object({
  nama: z.string().trim().min(1).max(150), divisiId: identifier,
  jabatan: z.enum(["operator", "leader", "spv", "admin"]), isActive: z.boolean(),
});
const productSchema = z.object({
  productLineId: identifier.nullable(), type: optionalText, grade: optionalText, kulit: optionalText,
  namaBarang: optionalText, warna: optionalText, op: optionalText, kode: optionalText,
  namaType: optionalText, tebal: optionalText, powderCoating: optionalText,
});
const divisionSchema = z.object({
  productLineId: identifier, nama: z.string().trim().min(1).max(150), urutan: z.number().int().min(0),
  isCasting: z.boolean(), isTeam: z.boolean(), hasNg: z.boolean(), hasMerk: z.boolean(),
  hasCat: z.boolean(), hasMesin: z.boolean(), hasNgB: z.boolean(),
});
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function audit(tx: Tx, entity: string, id: number, action: string, before: unknown, after: unknown) {
  await tx.insert(auditLog).values({ entity, entityId: id, aksi: action, actor: "admin",
    detail: JSON.stringify({ before, after }), createdAt: now() });
}

export async function getMasterRecords() {
  const [lines, divisions, employees, products] = await Promise.all([
    db.select().from(productLine), db.select().from(divisi),
    db.select().from(karyawan), db.select().from(product),
  ]);
  return { lines, divisions, employees, products };
}

export async function saveMasterRecord(kind: string, id: number | null, input: unknown) {
  if (kind === "employee") {
    const value = employeeSchema.parse(input);
    if (!(await db.select({ id: divisi.id }).from(divisi).where(eq(divisi.id, value.divisiId)).then(rows => rows[0]))) throw new Error("Divisi tidak ditemukan.");
    return db.transaction(async (tx) => {
      const before = id ? (await tx.select().from(karyawan).where(eq(karyawan.id, id)))[0] : null;
      if (id && !before) throw new Error("Karyawan tidak ditemukan.");
      const values = { ...value, isActive: value.isActive ? 1 : 0 };
      const inserted = id ? null : await tx.insert(karyawan).values(values).returning({ id: karyawan.id });
      const recordId = id ?? inserted![0].id;
      if (id) await tx.update(karyawan).set(values).where(eq(karyawan.id, id));
      await audit(tx, "karyawan", recordId, id ? "update" : "create", before, values);
      return { id: recordId };
    });
  }
  if (kind === "product") {
    const value = productSchema.parse(input);
    if (value.productLineId && !(await db.select({ id: productLine.id }).from(productLine).where(eq(productLine.id, value.productLineId)).then(rows => rows[0]))) {
      throw new Error("Lini produk tidak ditemukan.");
    }
    return db.transaction(async (tx) => {
      const before = id ? (await tx.select().from(product).where(eq(product.id, id)))[0] : null;
      if (id && !before) throw new Error("Produk tidak ditemukan.");
      const inserted = id ? null : await tx.insert(product).values(value).returning({ id: product.id });
      const recordId = id ?? inserted![0].id;
      if (id) await tx.update(product).set(value).where(eq(product.id, id));
      await audit(tx, "product", recordId, id ? "update" : "create", before, value);
      return { id: recordId };
    });
  }
  if (kind === "division") {
    const value = divisionSchema.parse(input);
    if (!(await db.select({ id: productLine.id }).from(productLine).where(eq(productLine.id, value.productLineId)).then(rows => rows[0]))) throw new Error("Lini produk tidak ditemukan.");
    return db.transaction(async (tx) => {
      const before = id ? (await tx.select().from(divisi).where(eq(divisi.id, id)))[0] : null;
      if (id && !before) throw new Error("Divisi tidak ditemukan.");
      const values = { ...value, isCasting: +value.isCasting, isTeam: +value.isTeam,
        hasNg: +value.hasNg, hasMerk: +value.hasMerk, hasCat: +value.hasCat,
        hasMesin: +value.hasMesin, hasNgB: +value.hasNgB };
      const inserted = id ? null : await tx.insert(divisi).values(values).returning({ id: divisi.id });
      const recordId = id ?? inserted![0].id;
      if (id) await tx.update(divisi).set(values).where(eq(divisi.id, id));
      await audit(tx, "divisi", recordId, id ? "update" : "create", before, values);
      return { id: recordId };
    });
  }
  throw new Error("Jenis master tidak dikenal.");
}

export async function deleteMasterProduct(id: number) {
  return db.transaction(async (tx) => {
    const before = (await tx.select().from(product).where(eq(product.id, id)))[0];
    if (!before) throw new Error("Produk tidak ditemukan.");
    await audit(tx, "product", id, "delete", before, null);
    await tx.delete(product).where(eq(product.id, id));
    return { success: true };
  });
}
