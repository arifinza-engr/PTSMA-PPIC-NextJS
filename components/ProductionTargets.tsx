"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FORM_MASTER } from "@/lib/form-options";
import { metricsForLine } from "@/lib/target-options";

type Product = "brakeshoe" | "discpad" | "handle";
type Target = { id: number; produk: Product; lini: string; shift: "Shift 1 & 2" | "Shift 3"; basis: "per_orang" | "tim"; satuan: "PCS" | "SET" | "SHOT"; nilai: number };
type Form = Omit<Target, "id">;
const productLabels: Record<Product, string> = { brakeshoe: "Brakeshoe", discpad: "Discpad", handle: "Handle" };
const defaultLine = FORM_MASTER.lines.find((line) => line.jenis === "brakeshoe")?.nama ?? "";
const EMPTY: Form = {
  produk: "brakeshoe", lini: defaultLine, shift: "Shift 1 & 2", basis: "per_orang",
  satuan: metricsForLine("brakeshoe", defaultLine)[0] ?? "PCS", nilai: 0,
};

async function responseData(response: Response) {
  try { return await response.json(); }
  catch { throw new Error("Server tidak mengirim respons yang valid. Periksa status migrasi database."); }
}

export default function ProductionTargets() {
  const [rows, setRows] = useState<Target[]>([]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const lineOptions = useMemo(() => [...new Set(FORM_MASTER.lines.filter((line) => line.jenis === form.produk).map((line) => line.nama))], [form.produk]);
  const metricOptions = metricsForLine(form.produk, form.lini);

  const load = useCallback(async () => {
    const response = await fetch("/api/target-produksi");
    const data = await responseData(response);
    if (!response.ok) throw new Error(data.error || "Gagal memuat target.");
    setRows(data);
  }, []);

  useEffect(() => { load().catch((cause) => setError(cause instanceof Error ? cause.message : "Gagal memuat target.")); }, [load]);

  function setProduct(produk: Product) {
    const lini = FORM_MASTER.lines.find((line) => line.jenis === produk)?.nama ?? "";
    const satuan = metricsForLine(produk, lini)[0] ?? "PCS";
    setForm((current) => ({ ...current, produk, lini, satuan }));
  }

  function setLine(lini: string) {
    const satuan = metricsForLine(form.produk, lini)[0] ?? "PCS";
    setForm((current) => ({ ...current, lini, satuan }));
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

  async function remove(id: number) {
    if (!window.confirm(`Hapus target #${id}?`)) return;
    const response = await fetch("/api/target-produksi", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const data = await responseData(response);
    if (!response.ok) setError(data.error || "Gagal menghapus target."); else await load();
  }

  return <section className="master-page">
    <div className="page-heading"><div><p className="eyebrow">Administrasi / Referensi</p><h1>Target Produksi</h1>
      <p>Atur target tetap per lini, shift, dan basis per orang atau tim.</p></div></div>
    <form onSubmit={save} className="mb-6">
      <div className="form-section-heading"><span>{editingId ? "↗" : "+"}</span><div>
        <h2>{editingId ? `Ubah target #${editingId}` : "Tambah target"}</h2>
        <p>Satu nilai target berlaku untuk Shift 1 dan Shift 2 secara terpisah. Shift 3 memiliki nilai tersendiri. Target Shot berlaku untuk lini casting dan Discpad PRESS CETAK.</p></div></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      {error && <p role="alert" className="notice-error mt-3">{error}</p>}
      {message && <p role="status" className="notice-success mt-3">{message}</p>}
      <div className="mt-4 flex gap-2"><button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan Target"}</button>
        {editingId && <button type="button" className="action-secondary" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Batal</button>}
      </div>
    </form>
    <div className="data-panel"><div className="data-panel-header"><div><p className="eyebrow">Master target</p><h2>{rows.length} target</h2></div></div>
      <div className="table-frame max-h-[600px] overflow-auto"><table><thead><tr><th>Produk</th><th>Lini</th><th>Shift</th><th>Basis</th><th>Satuan</th><th>Target</th><th>Aksi</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}><td>{productLabels[row.produk]}</td><td>{row.lini}</td><td>{row.shift}</td><td>{row.basis === "per_orang" ? "Per orang" : "Tim"}</td><td>{row.satuan}</td><td>{row.nilai}</td>
          <td><button type="button" className="table-action" onClick={() => { setEditingId(row.id); setForm({ produk: row.produk, lini: row.lini, shift: row.shift, basis: row.basis, satuan: row.satuan, nilai: row.nilai }); }}>Ubah</button>
            <button type="button" className="table-action danger" onClick={() => void remove(row.id)}>Hapus</button></td></tr>)}</tbody></table></div>
      {!rows.length && <p className="empty-inline">Belum ada target produksi.</p>}
    </div>
  </section>;
}
