"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { ProductionProductMaster, ProductCode } from "@/lib/production-master-types";

type Product = ProductCode;
type Target = { id: number; produk: Product; lini: string; shift: "Shift 1 & 2" | "Shift 3"; basis: "per_orang" | "tim"; satuan: "PCS" | "SET" | "SHOT"; nilai: number };
type Form = Omit<Target, "id">;
const EMPTY: Form = {
  produk: "brakeshoe", lini: "", shift: "Shift 1 & 2", basis: "per_orang", satuan: "PCS", nilai: 0,
};

async function responseData(response: Response) {
  try { return await response.json(); }
  catch { throw new Error("Server tidak mengirim respons yang valid. Periksa status migrasi database."); }
}

export default function ProductionTargets() {
  const [rows, setRows] = useState<Target[]>([]);
  const [products, setProducts] = useState<ProductionProductMaster[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((product) => product.kode === form.produk);
  const selectedLine = selectedProduct?.lines.find((line) => line.nama === form.lini);
  const lineOptions = selectedProduct?.lines.filter((line) => line.isActive === 1).map((line) => line.nama) ?? [];
  const metricOptions = selectedLine?.targetMetrics ?? [];
  const productLabels = Object.fromEntries(products.map((product) => [product.kode, product.nama])) as Record<Product, string>;

  const load = useCallback(async () => {
    const [targetsResponse, productsResponse] = await Promise.all([
      fetch("/api/target-produksi"), fetch("/api/master/produksi"),
    ]);
    const [targets, productsData] = await Promise.all([responseData(targetsResponse), responseData(productsResponse)]);
    if (!targetsResponse.ok) throw new Error(targets.error || "Gagal memuat target.");
    if (!productsResponse.ok) throw new Error(productsData.error || "Gagal memuat master produk.");
    setRows(targets); setProducts(productsData);
    setForm((current) => {
      if (current.lini) return current;
      const product = productsData.find((item: ProductionProductMaster) => item.kode === current.produk) ?? productsData[0];
      const line = product?.lines.find((item: ProductionProductMaster["lines"][number]) => item.isActive === 1);
      return product && line ? { ...current, produk: product.kode, lini: line.nama, satuan: line.targetMetrics[0] } : current;
    });
  }, []);

  useEffect(() => { load().catch((cause) => setError(cause instanceof Error ? cause.message : "Gagal memuat target.")); }, [load]);

  function setProduct(produk: Product) {
    const product = products.find((item) => item.kode === produk);
    const line = product?.lines.find((item) => item.isActive === 1);
    const lini = line?.nama ?? "";
    const satuan = line?.targetMetrics[0] ?? "PCS";
    setForm((current) => ({ ...current, produk, lini, satuan }));
  }

  function setLine(lini: string) {
    const line = products.find((item) => item.kode === form.produk)?.lines.find((item) => item.nama === lini);
    const satuan = line?.targetMetrics[0] ?? "PCS";
    setForm((current) => ({ ...current, lini, satuan }));
  }

  function closeEditor() {
    setEditingId(null); setForm(EMPTY); setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/target-produksi", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, value: form }),
      });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan target.");
      setMessage(`Target berhasil disimpan (#${data.id}).`); setForm(EMPTY); setEditingId(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menyimpan target."); }
    finally { setSaving(false); }
  }

  async function remove(row: Target) {
    if (!window.confirm(`Hapus target ${productLabels[row.produk]} - ${row.lini} (${row.shift}, ${row.satuan})?`)) return;
    setError(""); setMessage("");
    try {
      const response = await fetch("/api/target-produksi", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id }) });
      const data = await responseData(response);
      if (!response.ok) throw new Error(data.error || "Gagal menghapus target.");
      setMessage("Target berhasil dihapus."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menghapus target."); }
  }

  const targetForm = <form onSubmit={save} className="space-y-4">
    <p className="text-sm text-muted-foreground">Metrik target mengikuti konfigurasi master lini. Satu nilai berlaku untuk Shift 1 dan Shift 2; Shift 3 memiliki nilai tersendiri.</p>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block"><span>Produk</span><select required value={form.produk} onChange={(event) => setProduct(event.target.value as Product)}>
        {Object.entries(productLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className="block"><span>Lini</span><select required value={form.lini} onChange={(event) => setLine(event.target.value)}>
        {lineOptions.map((nama) => <option key={nama}>{nama}</option>)}
      </select></label>
      <label className="block"><span>Shift</span><select value={form.shift} onChange={(event) => setForm({ ...form, shift: event.target.value as Form["shift"] })}>
        {["Shift 1 & 2", "Shift 3"].map((shift) => <option key={shift} value={shift}>{shift === "Shift 1 & 2" ? "Shift 1" : shift}</option>)}
      </select></label>
      <label className="block"><span>Target untuk</span><select value={form.basis} onChange={(event) => setForm({ ...form, basis: event.target.value as Form["basis"] })}>
        <option value="per_orang">Per orang</option><option value="tim">Tim</option>
      </select></label>
      <label className="block"><span>Satuan target</span><select value={form.satuan} onChange={(event) => setForm({ ...form, satuan: event.target.value as Form["satuan"] })}>
        {metricOptions.map((metric) => <option key={metric}>{metric}</option>)}
      </select></label>
      <label className="block"><span>Target</span><input type="number" min="0" step="any" required value={form.nilai} onChange={(event) => setForm({ ...form, nilai: Number(event.target.value) })} /></label>
    </div>
    {error && <p role="alert" className="notice-error">{error}</p>}
    <div className="flex justify-end gap-2">
      {editingId !== null && <button type="button" className="action-secondary" onClick={closeEditor}>Batal</button>}
      <button type="submit" disabled={saving}>{saving ? "Menyimpan…" : editingId !== null ? "Simpan Perubahan" : "Simpan Target"}</button>
    </div>
  </form>;

  return <section className="master-page">
    <div className="page-heading"><div><p className="eyebrow">Administrasi / Referensi</p><h1>Target Produksi</h1>
      <p>Atur target tetap per lini, shift, dan basis per orang atau tim.</p></div></div>
    {error && editingId === null && <p role="alert" className="notice-error mb-3">{error}</p>}
    {message && <p role="status" className="notice-success mb-4">{message}</p>}
    {editingId === null && <div className="mb-6 rounded-xl border border-border bg-card p-5">
      <div className="form-section-heading"><span>+</span><div><h2>Tambah target</h2><p>Isi produk, lini, shift, basis, satuan, dan nilai target.</p></div></div>
      {targetForm}
    </div>}
    <Modal open={editingId !== null} title={`Ubah target #${editingId ?? ""}`} description="Perbarui nilai target produksi." onClose={closeEditor}>
      {targetForm}
    </Modal>
    <div className="data-panel"><div className="data-panel-header"><div><p className="eyebrow">Master target</p><h2>{rows.length} target</h2></div></div>
      <div className="table-frame max-h-[600px] overflow-auto"><table><thead><tr><th>Produk</th><th>Lini</th><th>Shift</th><th>Basis</th><th>Satuan</th><th>Target</th><th>Aksi</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}><td>{productLabels[row.produk]}</td><td>{row.lini}</td><td>{row.shift}</td><td>{row.basis === "per_orang" ? "Per orang" : "Tim"}</td><td>{row.satuan}</td><td>{row.nilai}</td>
          <td><button type="button" className="table-action" onClick={() => { setError(""); setEditingId(row.id); setForm({ produk: row.produk, lini: row.lini, shift: row.shift, basis: row.basis, satuan: row.satuan, nilai: row.nilai }); }}>Ubah</button>
            <button type="button" className="table-action danger" onClick={() => void remove(row)}>Hapus</button></td></tr>)}</tbody></table></div>
      {!rows.length && <p className="empty-inline">Belum ada target produksi.</p>}
    </div>
  </section>;
}
