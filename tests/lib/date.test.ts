import { describe, it, expect } from "vitest";
import { todayLocalISO, todayWIBISO, isValidISODate, formatTanggalID } from "@/lib/date";

describe("todayLocalISO", () => {
  it("menggunakan komponen tanggal lokal, bukan UTC", () => {
    // 22 Oktober 2026 pukul 00:30 waktu lokal = 21 Oktober 2026 17:30 UTC
    const d = new Date(2026, 9, 22, 0, 30);
    expect(todayLocalISO(d)).toBe("2026-10-22");
  });

  it("menghasilkan panjang 10 dan format YYYY-MM-DD", () => {
    expect(todayLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("todayWIBISO", () => {
  it("tetap memakai tanggal WIB saat UTC masih hari sebelumnya", () => {
    expect(todayWIBISO(new Date("2026-10-26T17:30:00Z"))).toBe("2026-10-27");
  });
});

describe("isValidISODate", () => {
  it("menerima tanggal nyata", () => {
    expect(isValidISODate("2026-02-28")).toBe(true);
  });

  it("menolak bulan 13", () => {
    expect(isValidISODate("2026-13-01")).toBe(false);
  });

  it("menolak 31 Februari", () => {
    expect(isValidISODate("2026-02-31")).toBe(false);
  });

  it("menolak format lain", () => {
    expect(isValidISODate("22/10/2026")).toBe(false);
  });
});

describe("formatTanggalID", () => {
  it("memformat 07 Oktober 2026", () => {
    expect(formatTanggalID("2026-10-07")).toBe("07 Okt 2026");
  });

  it("mengembalikan input apa adanya bila format tidak dikenal", () => {
    expect(formatTanggalID("bukan tanggal")).toBe("bukan tanggal");
  });
});
