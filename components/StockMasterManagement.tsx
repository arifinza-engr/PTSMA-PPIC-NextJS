"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";

type StockMaster = { id: number; op: string | null; kode: string; type: string | null; powder: string; isActive: number; sortOrder: number };
type Form = { op: string; kode: string; type: string; powder: string; isActive: boolean };
const EMPTY: Form = { op: "", kode: "", type: "", powder: "", isActive: true };

export default function StockMasterManagement() {
  const [rows, setRows] = useState<StockMaster[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<StockMaster | null>(null);
  const [editForm, setEditForm] = useState<Form>(EMPTY);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/master/stok-opname");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Gagal memuat master stok opname.");
    setRows(data);
  }

  useEffect(() => { load().catch((cause) => setError(cause instanceof Error ? cause.message : "Gagal memuat master stok opname.")); }, []);

  const visibleRows = rows.filter((row) => `${row.op ?? ""} ${row.kode} ${row.type ?? ""} ${row.powder}`.toLowerCase().includes(search.toLowerCase()));

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    try {
      const response = await fetch("/api/master/stok-opname", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: values.get("op"), kode: values.get("kode"), type: values.get("type"), powder: values.get("powder"), isActive: 1 }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menambah master stok.");
      formElement.reset(); setMessage("Kombinasi stok berhasil ditambahkan."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menambah master stok."); }
    finally { setBusy(false); }
  }

  function openEditor(row: StockMaster) {
    setEditing(row); setEditForm({ op: row.op ?? "", kode: row.kode, type: row.type ?? "", powder: row.powder, isActive: Boolean(row.isActive) }); setError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/master/stok-opname", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, value: { ...editForm, isActive: editForm.isActive ? 1 : 0 } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memperbarui master stok.");
      setEditing(null); setMessage("Master stok berhasil diperbarui."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal memperbarui master stok."); }
    finally { setBusy(false); }
  }

  async function remove(row: StockMaster) {
    if (!window.confirm(`Nonaktifkan ${row.kode} - ${row.powder}? Data stok lama tetap tersimpan.`)) return;
    setError(""); setMessage("");
    try {
      const response = await fetch("/api/master/stok-opname", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menonaktifkan master stok.");
      setMessage("Kombinasi master stok dinonaktifkan."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menonaktifkan master stok."); }
  }

  return <section className="master-page">
    <div className="page-heading"><div><p className="eyebrow">Administrasi / Referensi</p><h1>Master Stok Opname</h1><p>Kelola pasangan kode dan powder yang digunakan pada formulir stok opname.</p></div></div>
    {error && !editing && <p role="alert" className="notice-error mb-3">{error}</p>}
    {message && <p role="status" className="notice-success mb-3">{message}</p>}
    <form onSubmit={create} className="mb-6 grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-5">
      <label className="grid gap-1 text-sm font-medium">OP<input name="op" className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm font-medium">Kode<input name="kode" required maxLength={80} className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm font-medium">Type<input name="type" maxLength={150} className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm font-medium">Powder<input name="powder" required maxLength={100} className="rounded-md border bg-background px-3 py-2" /></label>
      <button disabled={busy} className="self-end">{busy ? "Menyimpan…" : "Tambah Kombinasi"}</button>
    </form>
    <div className="data-panel"><div className="data-panel-header"><div><p className="eyebrow">Katalog kode & powder</p><h2>{visibleRows.length} kombinasi</h2></div><label className="search-field">Cari<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode atau powder" /></label></div>
      <div className="table-frame max-h-[600px] overflow-auto"><table><thead><tr><th>OP</th><th>Kode</th><th>Type</th><th>Powder</th><th>Aktif</th><th>Aksi</th></tr></thead><tbody>
        {visibleRows.map((row) => <tr key={row.id}><td>{row.op ?? "—"}</td><td>{row.kode}</td><td>{row.type ?? "—"}</td><td>{row.powder}</td><td>{row.isActive ? "Ya" : "Tidak"}</td><td>
          <button type="button" className="table-action" onClick={() => openEditor(row)}>Ubah</button>{row.isActive === 1 && <button type="button" className="table-action danger" onClick={() => void remove(row)}>Hapus</button>}
        </td></tr>)}
      </tbody></table></div>
    </div>
    <Modal open={editing !== null} title={`Ubah master stok #${editing?.id ?? ""}`} description="Penghapusan dilakukan dengan menonaktifkan kombinasi agar histori tetap utuh." onClose={() => setEditing(null)}>
      <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">OP<input value={editForm.op} onChange={(event) => setEditForm({ ...editForm, op: event.target.value })} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm font-medium">Kode<input value={editForm.kode} onChange={(event) => setEditForm({ ...editForm, kode: event.target.value })} required maxLength={80} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm font-medium">Type<input value={editForm.type} onChange={(event) => setEditForm({ ...editForm, type: event.target.value })} maxLength={150} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm font-medium">Powder<input value={editForm.powder} onChange={(event) => setEditForm({ ...editForm, powder: event.target.value })} required maxLength={100} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2"><input type="checkbox" checked={editForm.isActive} onChange={(event) => setEditForm({ ...editForm, isActive: event.target.checked })} />Aktif</label>
        {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="action-secondary" onClick={() => setEditing(null)}>Batal</button><button disabled={busy}>{busy ? "Menyimpan…" : "Simpan Perubahan"}</button></div>
      </form>
    </Modal>
  </section>;
}
