// Helper tanggal untuk seluruh aplikasi.
//
// Semua tanggal "hari ini" dihitung dari komponen waktu LOKAL, bukan UTC.
// Aplikasi dipakai di WIB (UTC+7): memakai `toISOString()` membuat tanggal
// bergeser satu hari untuk shift yang dimulai antara 00:00–07:00.

const BULAN_PENDEK = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Tanggal hari ini dalam zona waktu lokal, format `YYYY-MM-DD`. */
export function todayLocalISO(now: Date = new Date()): string {
  const tahun = now.getFullYear();
  const bulan = String(now.getMonth() + 1).padStart(2, "0");
  const hari = String(now.getDate()).padStart(2, "0");
  return `${tahun}-${bulan}-${hari}`;
}

/** Tanggal kalender operasional PT Sinar Mas Autopart di zona Asia/Jakarta. */
export function todayWIBISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (name: string) => parts.find(part => part.type === name)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** True bila string adalah tanggal `YYYY-MM-DD` yang benar-benar ada di kalender. */
export function isValidISODate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const tanggal = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return (
    tanggal.getFullYear() === Number(m[1]) &&
    tanggal.getMonth() === Number(m[2]) - 1 &&
    tanggal.getDate() === Number(m[3])
  );
}

/** Format tanggal Indonesia, contoh: `07 Okt 2026`. */
export function formatTanggalID(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  return `${m[3]} ${BULAN_PENDEK[Number(m[2]) - 1]} ${m[1]}`;
}
