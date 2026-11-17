import { z } from "zod";
import { isValidISODate } from "./date";

const text = (max = 150) => z.string().trim().max(max);
const date = z.string().refine(isValidISODate, "Tanggal harus berformat YYYY-MM-DD dan valid.");
const nonnegative = z.coerce.number().finite().int().min(0).max(1_000_000_000);
const decimal = z.coerce.number().finite().min(0).max(1_000_000_000);

const item = z.object({
  type: text().optional(), grade: text().optional(), kulit: text().optional(), merk: text().optional(),
  kode: text().optional(), ab: text().optional(), cat: text().optional(), tebal: text().optional(),
  typeHandle: text().optional(), posisiHandle: text().optional(), warna: text().optional(),
  qty: nonnegative.optional(), ng: nonnegative.optional(), ngA: nonnegative.optional(), ngB: nonnegative.optional(),
});

export const lineSchema = z.enum(["brakeshoe", "discpad", "handle"]);

export const productionSchema = z.object({
  lini: text().min(1), tanggal: date, shift: text(50).optional(),
  jam: text(50).optional(), jamKerja: text(50).optional(), keterangan: text(2000).optional(),
  operator: text().optional(), anggotaTim: z.array(text().min(1)).max(100).optional(),
  assistedOperators: z.array(z.object({ id: z.number().int().positive(), nama: text().min(1) })).max(100).optional(),
  mesin: text().optional(), proses: text(100).optional(),
  jumlahProduksi: nonnegative.optional(), hasilProduksi: nonnegative.optional(),
  jumlahShot: z.union([z.null(), nonnegative]).optional(), jumlahSet: z.union([z.null(), decimal]).optional(),
  jumlahPcs: nonnegative.optional(), jumlahKg: decimal.optional(),
  items: z.array(item).min(1).max(100),
});

export const stockSchema = z.object({
  bulan: z.coerce.number().int().min(1).max(12),
  tahun: z.coerce.number().int().min(2000).max(2100),
  kode: text().min(1), powder: text().min(1),
  nilaiA: nonnegative.default(0), nilaiB: nonnegative.default(0),
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam harus berformat HH:MM.");
export const overtimeSchema = z.object({
  tanggal: date, lini: text().min(1), nama: text().min(1),
  jamMulai: time, jamSelesai: time, alasan: text(2000).min(1),
  atasan: text().min(1), persetujuanAtasan: z.enum(["Sudah Disetujui", "Belum Disetujui"]),
  pernyataan: text(2000).optional(),
  buktiUrl: text(500).nullable().optional(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Data tidak valid.");
  return result.data;
}

export const parseProduction = (input: unknown) => parse(productionSchema, input);
export const parseStock = (input: unknown) => parse(stockSchema, input);
export const parseOvertime = (input: unknown) => parse(overtimeSchema, input);
