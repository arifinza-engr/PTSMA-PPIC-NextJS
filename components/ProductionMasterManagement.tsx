"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { ProductionLineConfig, ProductionOptionCategory, ProductionProductMaster, ProductCode } from "@/lib/production-master-types";

const categories: { key: ProductionOptionCategory; label: string }[] = [
  { key: "types", label: "Type" }, { key: "grades", label: "Grade" }, { key: "kulits", label: "Kulit" },
  { key: "codes", label: "Kode" }, { key: "coatings", label: "Merk / coating" }, { key: "tebals", label: "Tebal" },
  { key: "abOptions", label: "A/B" }, { key: "typeHandles", label: "Type Handle" },
  { key: "posisiHandles", label: "Posisi Handle" }, { key: "warnas", label: "Warna" }, { key: "processes", label: "Proses" },
];
const emptyLine = (produk: ProductCode, sortOrder: number): ProductionLineConfig => ({
  nama: "", jenis: produk, isCasting: 0, isTeam: 0, hasNg: 0, hasMerk: 0,
  hasCat: 0, hasMesin: 0, hasNgB: 0, hasAb: 0, hasProductionTotal: 0, requiresPositiveTotal: 0, hasProcess: 0,
  hasShot: 0, hasSet: 0, hasPcsKg: 0, targetMetrics: ["PCS", "SET"], pcsPerSet: 2, shotCapacity: 0, isActive: 1, sortOrder,
});
type Editor = "product" | "line" | "options" | null;

export default function ProductionMasterManagement() {
  const [products, setProducts] = useState<ProductionProductMaster[]>([]);
  const [selectedCode, setSelectedCode] = useState<ProductCode | "">("");
  const [editor, setEditor] = useState<Editor>(null);
  const [lineIndex, setLineIndex] = useState<number | null>(null);
  const [lineDraft, setLineDraft] = useState<ProductionLineConfig | null>(null);
  const [productName, setProductName] = useState("");
  const [optionCategory, setOptionCategory] = useState<ProductionOptionCategory>("types");
  const [optionText, setOptionText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = products.find((product) => product.kode === selectedCode) ?? null;
  const sortedLines = useMemo(() => [...(selected?.lines ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [selected]);

  async function load() {
    const response = await fetch("/api/master/produksi");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Gagal memuat master produksi.");
    setProducts(data);
    setSelectedCode((current) => current || data[0]?.kode || "");
  }

  useEffect(() => { load().catch((cause) => setError(cause instanceof Error ? cause.message : "Gagal memuat master produksi.")); }, []);

  async function saveProduct(next: ProductionProductMaster) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/master/produksi", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode: next.kode, value: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan master produksi.");
      await load(); setMessage("Master produksi berhasil disimpan."); setEditor(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menyimpan master produksi."); }
    finally { setBusy(false); }
  }

  function editProduct() {
    if (!selected) return;
    setProductName(selected.nama); setError(""); setEditor("product");
  }

  function editLine(index: number | null) {
    if (!selected) return;
    setLineIndex(index);
    setLineDraft(index === null ? emptyLine(selected.kode, selected.lines.length) : { ...selected.lines[index] });
    setError(""); setEditor("line");
  }

  function editOptions(category: ProductionOptionCategory) {
    if (!selected) return;
    setOptionCategory(category); setOptionText((selected.options[category] ?? []).join("\n"));
    setError(""); setEditor("options");
  }

  async function saveEditor(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (editor === "product") {
      await saveProduct({ ...selected, nama: productName });
    } else if (editor === "line" && lineDraft) {
      const lines = [...selected.lines];
      if (lineIndex === null) lines.push({ ...lineDraft, sortOrder: lines.length });
      else lines[lineIndex] = { ...lineDraft, sortOrder: lineIndex };
      await saveProduct({ ...selected, lines });
    } else if (editor === "options") {
      const values = [...new Set(optionText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean))];
      await saveProduct({ ...selected, options: { ...selected.options, [optionCategory]: values } });
    }
  }

  async function toggleLine(index: number) {
    if (!selected) return;
    const line = sortedLines[index];
    const originalIndex = selected.lines.findIndex((item) => item.nama === line.nama);
    if (line.isActive && !window.confirm(`Nonaktifkan lini ${line.nama}? Data laporan lama tetap disimpan.`)) return;
    const lines = [...selected.lines];
    lines[originalIndex] = { ...lines[originalIndex], isActive: line.isActive ? 0 : 1 };
    await saveProduct({ ...selected, lines });
  }

  return <section className="master-page">
    <div className="page-heading"><div><p className="eyebrow">Administrasi / Referensi</p><h1>Master Produk & Lini</h1><p>Kelola nama produk, lini, konfigurasi formulir, dan pilihan detail produksi.</p></div></div>
    {error && !editor && <p role="alert" className="notice-error mb-3">{error}</p>}
    {message && <p role="status" className="notice-success mb-3">{message}</p>}
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <label className="grid gap-1 text-sm font-medium">Master produk<select value={selectedCode} onChange={(event) => setSelectedCode(event.target.value as ProductCode)} className="min-w-56 rounded-md border bg-background px-3 py-2">
        {products.map((product) => <option key={product.kode} value={product.kode}>{product.nama} ({product.kode})</option>)}
      </select></label>
      {selected && <><span className="pb-2 text-sm text-muted-foreground">{selected.lines.filter((line) => line.isActive === 1).length} lini aktif</span><button type="button" className="ml-auto rounded-md border px-3 py-2 text-sm" onClick={editProduct}>Ubah Nama Produk</button></>}
    </div>

    {selected && <>
      <div className="data-panel mb-5"><div className="data-panel-header"><div><p className="eyebrow">Lini produksi</p><h2>{sortedLines.length} lini</h2></div><button type="button" onClick={() => editLine(null)}>Tambah lini</button></div>
        <div className="table-frame max-h-[560px] overflow-auto"><table><thead><tr><th>Nama lini</th><th>Mode</th><th>Aktif</th><th>Aksi</th></tr></thead><tbody>
          {sortedLines.map((line, index) => <tr key={`${line.nama}-${index}`}><td>{line.nama}</td><td>{line.isTeam ? "Tim" : "Per orang"}{line.isCasting ? " · Casting" : ""}</td><td>{line.isActive ? "Ya" : "Tidak"}</td><td>
            <button type="button" className="table-action" onClick={() => editLine(selected.lines.findIndex((item) => item.nama === line.nama))}>Ubah</button>
            <button type="button" className="table-action" onClick={() => void toggleLine(index)}>{line.isActive ? "Nonaktifkan" : "Aktifkan"}</button>
          </td></tr>)}
        </tbody></table></div>
      </div>

      <div className="data-panel"><div className="data-panel-header"><div><p className="eyebrow">Pilihan detail formulir</p><h2>Master opsi {selected.nama}</h2></div></div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(({ key, label }) => <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
            <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{selected.options[key]?.length ?? 0} opsi</p></div>
            <button type="button" className="table-action" onClick={() => editOptions(key)}>Ubah</button>
          </div>)}
        </div>
      </div>
    </>}

    <Modal open={editor !== null} title={editor === "product" ? "Ubah produk" : editor === "line" ? lineIndex === null ? "Tambah lini" : "Ubah lini" : `Ubah master ${categories.find((category) => category.key === optionCategory)?.label ?? "opsi"}`} description="Perubahan master dipakai langsung oleh form produksi dan target." onClose={() => { setEditor(null); setError(""); }}>
      {editor === "product" && <form onSubmit={saveEditor} className="space-y-4">
        <label className="grid gap-2 text-sm font-medium">Nama produk<input value={productName} onChange={(event) => setProductName(event.target.value)} required maxLength={100} className="rounded-md border bg-background px-3 py-2" /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="action-secondary" onClick={() => setEditor(null)}>Batal</button><button disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button></div>
      </form>}
      {editor === "line" && lineDraft && <form onSubmit={saveEditor} className="space-y-4">
        <label className="grid gap-2 text-sm font-medium">Nama lini<input value={lineDraft.nama} onChange={(event) => setLineDraft({ ...lineDraft, nama: event.target.value })} required maxLength={150} className="rounded-md border bg-background px-3 py-2" /></label>
        <div className="grid gap-2 sm:grid-cols-2">{([
          ["isTeam", "Input anggota tim"], ["isCasting", "Lini casting"], ["hasNg", "Kolom NG"], ["hasNgB", "Kolom NG A/B"],
          ["hasMerk", "Kolom merk"], ["hasCat", "Kolom cat"], ["hasMesin", "Kolom mesin"],
          ["hasAb", "Kolom A/B"], ["hasProductionTotal", "Total produksi lini"], ["requiresPositiveTotal", "Total produksi wajib lebih dari nol"], ["hasProcess", "Pilihan proses"],
          ["hasShot", "Jumlah shot"], ["hasSet", "Jumlah set"], ["hasPcsKg", "Jumlah PCS dan KG"],
        ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" checked={lineDraft[key] === 1} onChange={(event) => setLineDraft({ ...lineDraft, [key]: event.target.checked ? 1 : 0 })} />{label}</label>)}</div>
        <fieldset className="grid gap-2"><legend className="text-sm font-medium">Metrik target lini</legend><div className="grid gap-2 sm:grid-cols-3">{(["PCS", "SET", "SHOT"] as const).map((metric) => <label key={metric} className="flex items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" checked={lineDraft.targetMetrics.includes(metric)} onChange={(event) => setLineDraft({ ...lineDraft, targetMetrics: event.target.checked ? [...lineDraft.targetMetrics, metric] : lineDraft.targetMetrics.filter((value) => value !== metric) })} />{metric}</label>)}</div></fieldset>
        <label className="grid gap-2 text-sm font-medium">PCS per SET<input type="number" min="0" step="any" value={lineDraft.pcsPerSet} onChange={(event) => setLineDraft({ ...lineDraft, pcsPerSet: Number(event.target.value) })} className="rounded-md border bg-background px-3 py-2" /><span className="font-normal text-muted-foreground">Gunakan 0 jika lini tidak memakai konversi PCS ke SET.</span></label>
        <label className="grid gap-2 text-sm font-medium">Kapasitas Shot<input type="number" min="0" step="any" value={lineDraft.shotCapacity} onChange={(event) => setLineDraft({ ...lineDraft, shotCapacity: Number(event.target.value) })} className="rounded-md border bg-background px-3 py-2" /><span className="font-normal text-muted-foreground">Dipakai untuk menghitung persentase shot pada laporan casting.</span></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="action-secondary" onClick={() => setEditor(null)}>Batal</button><button disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button></div>
      </form>}
      {editor === "options" && <form onSubmit={saveEditor} className="space-y-4">
        <label className="grid gap-2 text-sm font-medium">Satu opsi per baris<textarea rows={14} value={optionText} onChange={(event) => setOptionText(event.target.value)} className="rounded-md border bg-background px-3 py-2 font-mono text-sm" /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="action-secondary" onClick={() => setEditor(null)}>Batal</button><button disabled={busy}>{busy ? "Menyimpan…" : "Simpan Opsi"}</button></div>
      </form>}
    </Modal>
  </section>;
}
