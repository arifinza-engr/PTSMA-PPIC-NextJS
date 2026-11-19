"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/modal";
import type { ProductionDetailField, ProductionLineConfig, ProductionOptionCategory, ProductionProductMaster, ProductCode } from "@/lib/production-master-types";
import { availableDetailFields, defaultDetailFields, detailFieldLabels } from "@/lib/production-detail-fields";

const categories: { key: ProductionOptionCategory; label: string }[] = [
  { key: "types", label: "Type" }, { key: "grades", label: "Grade" }, { key: "kulits", label: "Kulit" },
  { key: "codes", label: "Kode" }, { key: "coatings", label: "Merk / coating" }, { key: "tebals", label: "Tebal" },
  { key: "abOptions", label: "A/B" }, { key: "typeHandles", label: "Type Handle" },
  { key: "posisiHandles", label: "Posisi Handle" }, { key: "warnas", label: "Warna" }, { key: "processes", label: "Proses" },
];
const emptyLine = (produk: ProductCode, sortOrder: number): ProductionLineConfig => ({
  nama: "", jenis: produk, isCasting: 0, isTeam: 0, hasNg: 0, hasMerk: 0,
  hasCat: 0, hasMesin: 0, hasNgB: 0, hasAb: 0, hasProductionTotal: 0, requiresPositiveTotal: 0, hasProcess: 0,
  hasShot: 0, hasSet: 0, hasPcsKg: 0, targetMetrics: ["PCS", "SET"], castingCategories: [], detailFields: defaultDetailFields(produk, false), pcsPerSet: 2, isActive: 1, sortOrder,
});
type Editor = "product" | "line" | "options" | null;
type LineFlagKey = "isTeam" | "isCasting" | "hasNg" | "hasMerk" | "hasCat" | "hasMesin" | "hasNgB" | "hasAb" | "hasProductionTotal" | "requiresPositiveTotal" | "hasProcess" | "hasShot" | "hasSet" | "hasPcsKg";

export default function ProductionMasterManagement() {
  const { data: session } = useSession();
  const canManage = session?.user.role === "superadmin";
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
  const productOptionCategories = selectedCode === "brakeshoe"
    ? categories.filter(({ key }) => ["types", "grades", "kulits"].includes(key))
    : selectedCode === "discpad"
      ? categories.filter(({ key }) => ["codes", "coatings", "tebals", "abOptions", "processes"].includes(key))
      : selectedCode === "handle"
        ? categories.filter(({ key }) => ["typeHandles", "posisiHandles", "warnas"].includes(key))
        : [];
  const lineFlagOptions: [LineFlagKey, string][] = [["isTeam", "Input anggota tim"], ["hasNg", "Kolom NG"]];
  if (selectedCode !== "discpad") lineFlagOptions.push(["isCasting", "Lini casting"]);
  if (selectedCode === "brakeshoe") lineFlagOptions.push(["hasMerk", "Kolom merk"]);
  if (selectedCode === "discpad") lineFlagOptions.push(
    ["hasNgB", "Kolom NG A/B"], ["hasAb", "Kolom A/B"], ["hasCat", "Kolom cat"],
    ["hasProductionTotal", "Total produksi lini"],
    ...(lineDraft?.hasProductionTotal ? [["requiresPositiveTotal", "Total produksi wajib lebih dari nol"] as [LineFlagKey, string]] : []),
    ["hasProcess", "Pilihan proses"], ["hasShot", "Jumlah shot"], ["hasSet", "Jumlah set"],
  );
  if (lineDraft?.isCasting === 1 && selectedCode !== "discpad") lineFlagOptions.push(
    ["hasMesin", "Kolom mesin"], ["hasShot", "Jumlah shot"], ["hasSet", "Jumlah set"], ["hasPcsKg", "Jumlah PCS"],
  );

  function updateLineFlag(key: LineFlagKey, checked: boolean) {
    setLineDraft((current) => {
      if (!current) return current;
      const next: ProductionLineConfig = { ...current, [key]: checked ? 1 : 0 };
      if (key === "isCasting" && selectedCode !== "discpad") {
        next.detailFields = defaultDetailFields(selectedCode || "brakeshoe", checked);
        if (checked) {
          next.castingCategories = ["Besar", "Kecil", "Handle"];
          next.hasShot = 1; next.hasSet = 1; next.hasPcsKg = 1;
          if (!next.targetMetrics.includes("SHOT")) next.targetMetrics = [...next.targetMetrics, "SHOT"];
        } else {
          next.hasMesin = 0; next.hasShot = 0; next.hasSet = 0; next.hasPcsKg = 0;
          next.castingCategories = [];
          next.targetMetrics = next.targetMetrics.filter((metric) => metric !== "SHOT");
        }
      }
      if (key === "hasShot") {
        next.targetMetrics = checked
          ? [...new Set([...next.targetMetrics, "SHOT" as const])]
          : next.targetMetrics.filter((metric) => metric !== "SHOT");
      }
      if (key === "hasNg" && checked) next.hasNgB = 0;
      if (key === "hasNgB" && checked) next.hasNg = 0;
      if (key === "hasProductionTotal" && !checked) next.requiresPositiveTotal = 0;
      return next;
    });
  }

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
    setLineDraft(index === null ? emptyLine(selected.kode, selected.lines.length) : {
      ...selected.lines[index],
      detailFields: selected.lines[index].detailFields ?? defaultDetailFields(selected.kode, selected.lines[index].isCasting === 1),
    });
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

  async function deleteLine(line: ProductionLineConfig) {
    if (!selected) return;
    const confirmed = window.confirm(`Hapus permanen lini ${line.nama} dari master ${selected.nama}? Target master lini ini juga akan dihapus. Data laporan produksi dan data karyawan lama tetap tersimpan, tetapi rincian laporan mungkin tidak lagi dapat ditampilkan memakai konfigurasi lini ini.`);
    if (!confirmed) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/master/produksi", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode: selected.kode, lini: line.nama }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus master lini.");
      await load(); setMessage(`Lini ${line.nama} dan target terkait berhasil dihapus dari master.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menghapus master lini."); }
    finally { setBusy(false); }
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
      <div className="data-panel mb-5"><div className="data-panel-header"><div><p className="eyebrow">Lini produksi</p><h2>{sortedLines.length} lini</h2></div>{canManage && <button type="button" onClick={() => editLine(null)}>Tambah lini</button>}</div>
        <div className="table-frame max-h-[560px] overflow-auto"><table><thead><tr><th>Nama lini</th><th>Mode</th><th>Aktif</th><th>Aksi</th></tr></thead><tbody>
          {sortedLines.map((line, index) => <tr key={`${line.nama}-${index}`}><td>{line.nama}</td><td>{line.isTeam ? "Tim" : "Per orang"}{line.isCasting ? " · Casting" : ""}</td><td>{line.isActive ? "Aktif" : "Nonaktif"}</td><td>
            {canManage && <><button type="button" className="table-action" onClick={() => editLine(selected.lines.findIndex((item) => item.nama === line.nama))}>Ubah</button>
            <button type="button" className="table-action" disabled={busy} onClick={() => void toggleLine(index)}>{line.isActive ? "Nonaktifkan" : "Aktifkan"}</button>
            <button type="button" className="table-action danger" disabled={busy} onClick={() => void deleteLine(line)}>Hapus permanen</button></>}
          </td></tr>)}
        </tbody></table></div>
      </div>

      <div className="data-panel"><div className="data-panel-header"><div><p className="eyebrow">Pilihan detail formulir</p><h2>Master opsi {selected.nama}</h2></div></div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {productOptionCategories.map(({ key, label }) => <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
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
        <fieldset className="grid gap-2"><legend className="text-sm font-medium">Kolom rincian produk untuk {selected?.nama}</legend><p className="text-xs text-muted-foreground">Pilih atribut yang tampil pada form laporan untuk lini ini. Metrik jumlah produksi dan kolom yang diatur lewat checkbox di bawah tetap mengikuti konfigurasinya sendiri.</p><div className="grid gap-2 sm:grid-cols-2">{selected && availableDetailFields(selected.kode, lineDraft.isCasting === 1).map((field: ProductionDetailField) => <label key={field} className="flex items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" checked={lineDraft.detailFields.includes(field)} onChange={(event) => setLineDraft({ ...lineDraft, detailFields: event.target.checked ? [...lineDraft.detailFields, field] : lineDraft.detailFields.filter((value) => value !== field) })} />{detailFieldLabels[field]}</label>)}</div></fieldset>
        <div className="grid gap-2 sm:grid-cols-2">{lineFlagOptions.map(([key, label]) => {
          const castingRequired = lineDraft.isCasting === 1 && selectedCode !== "discpad" && ["hasShot", "hasSet", "hasPcsKg"].includes(key);
          return <label key={key} className="flex items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" checked={lineDraft[key] === 1} disabled={castingRequired} onChange={(event) => updateLineFlag(key, event.target.checked)} />{label}{castingRequired && <span className="ml-auto text-xs text-muted-foreground">Wajib untuk casting</span>}</label>;
        })}</div>
        {selectedCode === "discpad" && <p className="text-xs text-muted-foreground">Pilih salah satu: Kolom NG atau Kolom NG A/B.</p>}
        <fieldset className="grid gap-2"><legend className="text-sm font-medium">Metrik target lini</legend><div className="grid gap-2 sm:grid-cols-3">{(["PCS", "SET", "SHOT"] as const).map((metric) => {
          const requiredShot = metric === "SHOT" && lineDraft.hasShot === 1;
          return <label key={metric} className="flex items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" checked={lineDraft.targetMetrics.includes(metric)} disabled={requiredShot} onChange={(event) => setLineDraft({ ...lineDraft, targetMetrics: event.target.checked ? [...lineDraft.targetMetrics, metric] : lineDraft.targetMetrics.filter((value) => value !== metric) })} />{metric}{requiredShot && <span className="ml-auto text-xs text-muted-foreground">Dipakai oleh kolom Shot</span>}</label>;
        })}</div></fieldset>
        {lineDraft.isCasting === 1 && <label className="grid gap-2 text-sm font-medium">Kategori target Casting <span className="font-normal text-muted-foreground">Satu kategori per baris, misalnya Besar dan Kecil. Kategori ini dipilih pada laporan produksi.</span><textarea rows={3} value={(lineDraft.castingCategories ?? []).join("\n")} onChange={(event) => setLineDraft({ ...lineDraft, castingCategories: [...new Set(event.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean))] })} className="rounded-md border bg-background px-3 py-2" /></label>}
        <label className="grid gap-2 text-sm font-medium">PCS per SET<input type="number" min="0" step="any" value={lineDraft.pcsPerSet} onChange={(event) => setLineDraft({ ...lineDraft, pcsPerSet: Number(event.target.value) })} className="rounded-md border bg-background px-3 py-2" /><span className="font-normal text-muted-foreground">Gunakan 0 jika lini tidak memakai konversi PCS ke SET.</span></label>
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
