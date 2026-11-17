import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, karyawan } from "@/db/schema";
import { now } from "./shared";
import { getProductionMaster } from "./production-master";

const employeeSchema = z.object({
  nama: z.string().trim().min(1).max(150),
  lini: z.string().trim().min(1).max(150),
  jabatan: z.enum(["operator", "leader", "spv", "admin"]), isActive: z.boolean(),
});
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function audit(tx: Tx, entity: string, id: number, action: string, before: unknown, after: unknown) {
  await tx.insert(auditLog).values({ entity, entityId: id, aksi: action, actor: "admin",
    detail: JSON.stringify({ before, after }), createdAt: now() });
}

export async function getMasterRecords() {
  const [employees, products] = await Promise.all([db.select().from(karyawan), getProductionMaster()]);
  return { employees, liniOptions: [...new Set(products.flatMap((product) => product.lines.filter((line) => line.isActive === 1).map((line) => line.nama)))].sort() };
}

export async function saveMasterRecord(kind: string, id: number | null, input: unknown) {
  if (kind === "employee") {
    const value = employeeSchema.parse(input);
    const products = await getProductionMaster();
    if (!products.some((product) => product.lines.some((row) => row.nama === value.lini && row.isActive === 1))) throw new Error("Lini tidak dikenal atau tidak aktif.");
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
  throw new Error("Master yang dapat dikelola hanya data karyawan.");
}

export async function deleteMasterRecord(kind: string, id: number) {
  if (kind !== "employee") throw new Error("Master yang dapat dikelola hanya data karyawan.");
  return db.transaction(async (tx) => {
    const before = (await tx.select().from(karyawan).where(eq(karyawan.id, id)))[0];
    if (!before) throw new Error("Karyawan tidak ditemukan.");
    await tx.delete(karyawan).where(eq(karyawan.id, id));
    await audit(tx, "karyawan", id, "delete", before, null);
    return { success: true };
  });
}
