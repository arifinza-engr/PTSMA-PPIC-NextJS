import { describe, expect, it } from "vitest";
import { and, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { product } from "@/db/schema";
import { getMaster, getOperators, getProductionData, submitProduksi } from "@/lib/produksi";
import { getStokOpnameMaster, getStokOpnamePreview, submitStokOpname } from "@/lib/stok-opname";
import { parseProduction, parseStock } from "@/lib/validation";

describe("alur data operasional", () => {
  it("menyimpan laporan produksi sekali dan membatasi query laporan", async () => {
    const master = await getMaster("brakeshoe");
    const division = await (async () => {
      for (const value of master.divisis) {
        if (!value.isCasting && !value.isTeam && (await getOperators("brakeshoe", value.nama)).length > 0) return value;
      }
      return undefined;
    })();
    expect(division).toBeDefined();
    const operator = (await getOperators("brakeshoe", division!.nama))[0];
    const payload = parseProduction({
      divisi: division!.nama, tanggal: "2099-01-02", shift: "Shift 1", jam: "8", operator,
      items: [{ type: "UJI", grade: "A", kulit: "HITAM", qty: 3, ng: 0 }],
    });
    expect(await submitProduksi("brakeshoe", payload)).toContain("tersimpan");
    await expect(submitProduksi("brakeshoe", payload)).rejects.toThrow(/baru saja disimpan/);
    const limited = await getProductionData("brakeshoe", { divisi: division!.nama, limit: 1 });
    const all = await getProductionData("brakeshoe", { divisi: division!.nama, limit: null });
    expect(limited.rows).toHaveLength(1);
    expect(all.rows.length).toBe(all.total);
    expect(all.total).toBeGreaterThan(1);
    expect(all.recordIds.length).toBe(all.rows.length);
    await expect(getProductionData("brakeshoe", { divisi: division!.nama, from: "2099-02-30" })).rejects.toThrow(/Periode/);
  });

  it("memvalidasi periode dan menampilkan matriks stok dengan kolom yang cocok", async () => {
    expect(() => parseStock({ bulan: 13, tahun: 2099, kode: "X", powder: "Y" })).toThrow();
    expect((await getStokOpnameMaster()).years).toContain(new Date().getFullYear());
    const [item] = await db.select({ kode: product.kode, powder: product.powderCoating })
      .from(product).where(and(isNotNull(product.kode), isNotNull(product.powderCoating)));
    expect(item?.kode).toBeTruthy();
    expect(item?.powder).toBeTruthy();
    await submitStokOpname(parseStock({ bulan: 12, tahun: 2099, kode: item!.kode, powder: item!.powder, nilaiA: 5, nilaiB: 2 }));
    const preview = await getStokOpnamePreview({ bulan: 12, tahun: 2099 });
    expect(preview.exists).toBe(true);
    expect(preview.headers.slice(0, 4)).toEqual(["NO", "OP", "KODE", "TYPE"]);
    expect(preview.rows[0].length).toBe(preview.headers.length);
    expect(preview.rows[0].slice(-2)).toEqual([5, 2]);
  });

  it("menolak angka pecahan untuk jumlah unit", () => {
    expect(() => parseProduction({ divisi: "PER", tanggal: "2026-10-27", operator: "A",
      items: [{ type: "UJI", qty: 1.5 }] })).toThrow();
  });
});
