// Backend lembur — port dari overtime.gs

import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, divisi, karyawan, lembur, productLine } from "@/db/schema";
import { calcLemburDuration, clean, isRemovedDivisi, now, uniqSort } from "./shared";
import { isValidISODate } from "./date";
import { parseOvertime } from "./validation";

export async function getLemburOptions() {
  const divisiRows = await db
    .select({ nama: divisi.nama })
    .from(divisi)
    .innerJoin(productLine, eq(divisi.productLineId, productLine.id))
    .where(eq(productLine.nama, "brakeshoe"))
    ;
  const divisiOptions = divisiRows
    .map((r) => r.nama)
    .filter((n) => !isRemovedDivisi(n))
    .sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base", numeric: true }));

  const atasanRows = await db
    .select({ nama: karyawan.nama })
    .from(karyawan)
    .where(and(eq(karyawan.isActive, 1), or(eq(karyawan.jabatan, "leader"), eq(karyawan.jabatan, "spv"))))
    ;
  const atasanOptions = atasanRows.map((r) => r.nama);

  return { divisiOptions, atasanOptions: uniqSort(atasanOptions) };
}

export async function getLemburNamaByDivisi(divisiName: string): Promise<string[]> {
  const d = clean(divisiName).toUpperCase();
  if (!d) return [];
  const rows = await db
    .select({ nama: karyawan.nama, dv: divisi.nama })
    .from(karyawan)
    .innerJoin(divisi, eq(karyawan.divisiId, divisi.id))
    .where(eq(karyawan.isActive, 1));
  return uniqSort(
    rows.filter((r) => clean(r.dv).toUpperCase() === d).map((r) => r.nama),
  );
}

export async function submitLembur(input: unknown): Promise<string> {
  const payload = parseOvertime(input);
  const tanggal = clean(payload.tanggal);
  const divisiName = clean(payload.divisi);
  const nama = clean(payload.nama);
  const jamMulai = clean(payload.jamMulai);
  const jamSelesai = clean(payload.jamSelesai);
  const alasan = clean(payload.alasan);
  const atasan = clean(payload.atasan);
  const persetujuanAtasan = payload.persetujuanAtasan;
  const pernyataan = clean(payload.pernyataan);
  const buktiUrl = clean(payload.buktiUrl);

  if (!isValidISODate(tanggal)) throw new Error("Tanggal lembur tidak valid.");
  if (!divisiName) throw new Error("Divisi wajib.");
  if (!nama) throw new Error("Nama wajib.");
  if (!jamMulai) throw new Error("Jam mulai wajib.");
  if (!jamSelesai) throw new Error("Jam selesai wajib.");
  if (!alasan) throw new Error("Alasan lembur wajib.");
  if (!atasan) throw new Error("Atasan wajib.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(jamMulai) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(jamSelesai)) {
    throw new Error("Jam lembur harus berformat HH:MM.");
  }
  if (buktiUrl && !/^\/api\/lembur\/bukti\/[0-9a-f-]+\.(?:jpg|png|gif|webp|pdf)$/.test(buktiUrl)) {
    throw new Error("Alamat bukti lembur tidak valid.");
  }
  const [employee] = await db.select({ karyawanId: karyawan.id, divisiId: divisi.id })
    .from(karyawan).innerJoin(divisi, eq(karyawan.divisiId, divisi.id))
    .where(and(eq(karyawan.nama, nama), eq(divisi.nama, divisiName), eq(karyawan.isActive, 1)));
  if (!employee) throw new Error("Nama karyawan tidak sesuai dengan divisi aktif.");
  const [supervisor] = await db.select({ id: karyawan.id }).from(karyawan)
    .where(and(eq(karyawan.nama, atasan), eq(karyawan.isActive, 1),
      or(eq(karyawan.jabatan, "leader"), eq(karyawan.jabatan, "spv"))));
  if (!supervisor) throw new Error("Atasan tidak ada dalam daftar aktif.");

  const totalJam = calcLemburDuration(jamMulai, jamSelesai);

  await db.insert(lembur)
    .values({
      tanggal,
      divisi: divisiName,
      divisiId: employee.divisiId,
      nama,
      karyawanId: employee.karyawanId,
      jamMulai,
      jamSelesai,
      totalJam,
      alasan,
      atasan,
      persetujuanAtasan,
      status: "Menunggu",
      buktiUrl: buktiUrl || null,
      pernyataan: pernyataan || "-",
      createdAt: now(),
    })
    ;

  return `✅ Data LEMBUR berhasil disimpan untuk ${nama} pada tanggal ${tanggal}`;
}

export async function getLemburList() {
  return await db.select().from(lembur).orderBy(desc(lembur.tanggal), desc(lembur.id)).limit(500);
}

export async function updateLemburStatus(id: number, status: "Disetujui" | "Ditolak") {
  await db.transaction(async tx => {
    const [before] = await tx.select().from(lembur).where(eq(lembur.id, id));
    if (!before) throw new Error("Data lembur tidak ditemukan.");
    await tx.insert(auditLog).values({ entity: "lembur", entityId: id, aksi: "status", actor: "admin",
      detail: JSON.stringify({ before: before.status, after: status }), createdAt: now() });
    await tx.update(lembur).set({ status }).where(eq(lembur.id, id));
  });
  return { success: true };
}

export async function deleteLembur(id: number) {
  await db.transaction(async tx => {
    const [before] = await tx.select().from(lembur).where(eq(lembur.id, id));
    if (!before) throw new Error("Data lembur tidak ditemukan.");
    await tx.insert(auditLog).values({ entity: "lembur", entityId: id, aksi: "delete", actor: "admin",
      detail: JSON.stringify(before), createdAt: now() });
    await tx.delete(lembur).where(eq(lembur.id, id));
  });
  return { success: true };
}

/**
 * Submit lembur dengan upload bukti file
 * Flow:
 * 1. Upload file bukti ke filesystem (via API call dari client)
 * 2. Simpan data + buktiUrl ke database
 *
 * @param payload - Data lembur
 * @param buktiFile - Optional: File object dari browser (sudah diupload)
 * @param buktiUrl - Optional: URL file yang sudah diupload
 * @returns Result message
 */
export async function submitLemburWithBukti(
  payload: ReturnType<typeof parseOvertime>,
  buktiFile?: File,
  buktiUrl?: string | null
): Promise<string> {
  // Jika ada buktiFile, buktiUrl harus sudah diset dari hasil upload
  if (buktiFile && !buktiUrl) {
    throw new Error("buktiUrl wajib diisi jika buktiFile provided.");
  }

  // Merge buktiUrl ke payload
  const enrichedPayload = {
    ...payload,
    buktiUrl: buktiUrl || payload.buktiUrl || null,
  };

  return submitLembur(enrichedPayload);
}
