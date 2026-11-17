// Helper bersama — port dari common.gs / commondiscpad.gs

export function clean(v: unknown): string {
  if (v == null) return "";
  return String(v).replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

export function toInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function toFloat(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function uniqSort(arr: (string | null | undefined)[]): string[] {
  return Array.from(new Set(arr.map(clean).filter(Boolean))).sort();
}

export function now(): string {
  return new Date().toISOString();
}

// Replika normalizeLini_ (brakeshoe) + normalizeLiniDiscpad_ (discpad)
export function normalizeLini(line: string, name: string): string {
  let u = clean(name).toUpperCase().replace(/\s+/g, " ").trim();
  if (!u) return "";

  if (line === "brakeshoe") {
    if (u === "PASANG PER") u = "PER";
    const compact = u.replace(/\s+/g, "");
    if (["BARITORI/SORTIR", "BARITORI&SORTIR", "BARITORI-SORTIR", "BARITORISORTIR"].includes(compact)) {
      return "BARITORI/SORTIR";
    }
    if (["BARITORI/SORTIRCDS", "BARITORI&SORTIRCDS", "BARITORI-SORTIRCDS", "BARITORISORTIRCDS"].includes(compact)) {
      return "BARITORI/SORTIR CDS";
    }
    return u;
  }

  if (line === "discpad") {
    if (["SANDBLAST", "SHOTBLASTING", "SHOT BLAST"].includes(u)) u = "SHOT BLASTING";
    if (u === "PRESS") u = "PRESS CETAK";
    if (u === "PAINTING 1" || u === "PAINTING 2") u = "PAINTING";
    return u;
  }

  return u;
}
// Hitung selisih jam lembur "HH:mm" -> number (jam desimal), port calcLemburDuration
export function calcLemburDuration(jamMulai: unknown, jamSelesai: unknown): number {
  const a = clean(jamMulai).split(":");
  const b = clean(jamSelesai).split(":");
  if (a.length < 2 || b.length < 2) return 0;
  const start = Number(a[0]) * 60 + Number(a[1]);
  let end = Number(b[0]) * 60 + Number(b[1]);
  if (end < start) end += 24 * 60; // lewat tengah malam
  return Number(((end - start) / 60).toFixed(2));
}

// Parse string "YYYY-MM-DD" ke Date object (null jika invalid)
export function ymdToDate(ymd: unknown): Date | null {
  if (!ymd) return null;

  if (ymd instanceof Date) {
    const dt = new Date(ymd);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  const s = String(ymd).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// Parse cell value (Date object atau string berbagai format) ke Date
export function parseCellToDate(cell: unknown): Date | null {
  if (!cell) return null;

  if (cell instanceof Date) {
    const dt = new Date(cell);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  const s = String(cell).trim();
  if (!s) return null;

  // Format: YYYY-MM-DD
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  // Format: DD/MM/YYYY
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  // Fallback: try Date constructor
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  return null;
}

// Return nama sheet target berdasarkan line, lini, dan proses
// discpad + PAINTING + proses → "PAINTING 1" atau "PAINTING 2"
// lainnya → nama lini uppercase
export function getTargetSheetName(
  line: string,
  lini: string,
  proses?: string
): string {
  const u = normalizeLini(line, lini);

  if (line === "discpad" && u === "PAINTING") {
    if (proses === "Painting 1") return "PAINTING 1";
    if (proses === "Painting 2") return "PAINTING 2";
    throw new Error("Proses painting harus Painting 1 atau Painting 2.");
  }

  return u;
}
