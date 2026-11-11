import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, karyawan } from "@/db/schema";
import { now } from "./shared";
import { FORM_MASTER } from "./form-options";

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
  return { employees: await db.select().from(karyawan) };
}

export async function saveMasterRecord(kind: string, id: number | null, input: unknown) {
  if (kind === "employee") {
    const value = employeeSchema.parse(input);
    if (!FORM_MASTER.lines.some((row) => row.nama === value.lini)) throw new Error("Lini tidak dikenal.");
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
