import { relations } from "drizzle-orm/relations";
import { karyawan, lembur } from "./schema";

export const karyawanRelations = relations(karyawan, ({ many }) => ({ lemburs: many(lembur) }));

export const lemburRelations = relations(lembur, ({ one }) => ({
  karyawan: one(karyawan, {
    fields: [lembur.karyawanId],
    references: [karyawan.id],
  }),
}));
