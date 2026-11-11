"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FORM_MASTER } from "@/lib/form-options";

type Employee = { id: number; nama: string; lini: string | null; jabatan: string; isActive: number };
type EmployeeForm = { nama: string; lini: string; jabatan: string; isActive: boolean };
const EMPTY: EmployeeForm = { nama: "", lini: "", jabatan: "operator", isActive: true };

export default function MasterTables() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeForm>(EMPTY);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/master");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Gagal memuat karyawan.");
    setEmployees(data.employees ?? []);
  }, []);

  useEffect(() => {
    load().catch((cause) => setError(cause instanceof Error ? cause.message : "Gagal memuat karyawan."));
  }, [load]);

  const rows = useMemo(() => employees.filter((row) =>
    `${row.nama} ${row.lini ?? ""} ${row.jabatan}`.toLowerCase().includes(search.toLowerCase())), [employees, search]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/master", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "employee", id: editingId, value: form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan karyawan.");
      setMessage(`Data karyawan berhasil disimpan (#${data.id}).`);
      setEditingId(null); setForm(EMPTY); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menyimpan karyawan."); }
    finally { setSaving(false); }
  }

  const liniOptions = [...new Set(FORM_MASTER.lines.map((row) => row.nama))].sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base" }));

  return <section className="master-page">
    <div className="page-heading"><div><p className="eyebrow">Administrasi / Referensi</p><h1>Master Karyawan</h1>
      <p>Kelola data karyawan, lini kerja, dan jabatan.</p></div></div>
    <form onSubmit={save} className="mb-6">
      <div className="form-section-heading"><span>{editingId ? "↗" : "+"}</span><div>
        <h2>{editingId ? `Ubah karyawan #${editingId}` : "Tambah karyawan"}</h2>
        <p>Isi nama, lini, jabatan, dan status karyawan.</p></div></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block"><span>Nama</span><input required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></label>
        <label className="block"><span>Lini</span><select required value={form.lini} onChange={(e) => setForm({ ...form, lini: e.target.value })}>
          <option value="">Pilih lini</option>{liniOptions.map((nama) => <option key={nama}>{nama}</option>)}
        </select></label>
        <label className="block"><span>Jabatan</span><select value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })}>
          {["operator", "leader", "spv", "admin"].map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label className="block"><span>Aktif</span><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /></label>
      </div>
      {error && <p role="alert" className="notice-error mt-3">{error}</p>}
      {message && <p role="status" className="notice-success mt-3">{message}</p>}
      <div className="mt-4 flex gap-2"><button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
        {editingId && <button type="button" className="action-secondary" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Batal</button>}
      </div>
    </form>
    <div className="data-panel"><div className="data-panel-header"><div><p className="eyebrow">Daftar karyawan</p><h2>{rows.length} data</h2></div>
      <label className="search-field">Cari<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari karyawan" /></label></div>
      <div className="table-frame max-h-[600px] overflow-auto"><table><thead><tr><th>ID</th><th>Nama</th><th>Lini</th><th>Jabatan</th><th>Aktif</th><th>Aksi</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}><td>{row.id}</td><td>{row.nama}</td><td>{row.lini ?? "—"}</td><td>{row.jabatan}</td><td>{row.isActive ? "Ya" : "Tidak"}</td>
          <td><button type="button" className="table-action" onClick={() => { setEditingId(row.id); setForm({ nama: row.nama, lini: row.lini ?? "", jabatan: row.jabatan, isActive: Boolean(row.isActive) }); }}>Ubah</button></td>
        </tr>)}</tbody></table></div>
      {employees.length === 0 && !error && <p className="empty-inline">Belum ada data karyawan.</p>}
    </div>
  </section>;
}
