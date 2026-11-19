"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/modal";

type Employee = { id: number; nama: string; lini: string | null; jabatan: string; isActive: number };
type EmployeeForm = { nama: string; lini: string; jabatan: string; isActive: boolean };
const EMPTY: EmployeeForm = { nama: "", lini: "", jabatan: "operator", isActive: true };

export default function MasterTables() {
  const { data: session } = useSession();
  const canManageEmployees = session?.user.role === "ppic" || session?.user.role === "superadmin";
  const canDeleteEmployees = session?.user.role === "superadmin";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [liniOptions, setLiniOptions] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addingEmployee, setAddingEmployee] = useState(false);
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
    setLiniOptions(data.liniOptions ?? []);
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
      setEditingId(null); setAddingEmployee(false); setForm(EMPTY); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menyimpan karyawan."); }
    finally { setSaving(false); }
  }

  async function remove(row: Employee) {
    if (!window.confirm(`Hapus karyawan ${row.nama}?`)) return;
    setError(""); setMessage("");
    try {
      const response = await fetch("/api/master", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "employee", id: row.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus karyawan.");
      setMessage(`Karyawan ${row.nama} berhasil dihapus.`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menghapus karyawan."); }
  }

  function closeEditor() {
    setEditingId(null); setAddingEmployee(false); setForm(EMPTY); setError("");
  }

  const employeeForm = <form onSubmit={save}>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block"><span>Nama</span><input required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></label>
      <label className="block"><span>Lini</span><select required value={form.lini} onChange={(e) => setForm({ ...form, lini: e.target.value })}>
        <option value="">Pilih lini</option>{liniOptions.map((nama) => <option key={nama}>{nama}</option>)}
      </select></label>
      <label className="block"><span>Jabatan</span><select value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })}>
        {["operator", "leader", "spv", "admin"].map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /><span>Aktif</span></label>
    </div>
    {error && <p role="alert" className="notice-error mt-3">{error}</p>}
    <div className="mt-5 flex justify-end gap-2">
      {(editingId !== null || addingEmployee) && <button type="button" className="action-secondary" onClick={closeEditor}>Batal</button>}
      <button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
    </div>
  </form>;

  return <section className="master-page">
    <div className="page-heading"><div><p className="eyebrow">Administrasi / Referensi</p><h1>Master Karyawan</h1>
      <p>Kelola data karyawan, lini kerja, dan jabatan.</p></div></div>
    {error && editingId === null && !addingEmployee && <p role="alert" className="notice-error mb-3">{error}</p>}
    {message && <p role="status" className="notice-success mb-4">{message}</p>}
    {canManageEmployees && editingId === null && !addingEmployee && <button type="button" className="action-secondary mb-4" onClick={() => { setError(""); setMessage(""); setForm(EMPTY); setAddingEmployee(true); }}>Tambah karyawan</button>}
    <Modal open={canManageEmployees && (addingEmployee || editingId !== null)} title={editingId === null ? "Tambah karyawan" : `Ubah karyawan #${editingId}`} description={editingId === null ? "Isi nama, lini, jabatan, dan status karyawan." : "Perbarui data karyawan."} onClose={closeEditor}>
      {employeeForm}
    </Modal>
    <div className="data-panel"><div className="data-panel-header"><div><p className="eyebrow">Daftar karyawan</p><h2>{rows.length} data</h2></div>
      <label className="search-field">Cari<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari karyawan" /></label></div>
      <div className="table-frame max-h-[600px] overflow-auto"><table><thead><tr><th>ID</th><th>Nama</th><th>Lini</th><th>Jabatan</th><th>Aktif</th><th>Aksi</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}><td>{row.id}</td><td>{row.nama}</td><td>{row.lini ?? "—"}</td><td>{row.jabatan}</td><td>{row.isActive ? "Ya" : "Tidak"}</td>
          <td>{canManageEmployees && <button type="button" className="table-action" onClick={() => { setError(""); setAddingEmployee(false); setEditingId(row.id); setForm({ nama: row.nama, lini: row.lini ?? "", jabatan: row.jabatan, isActive: Boolean(row.isActive) }); }}>Ubah</button>}
            {canDeleteEmployees && <button type="button" className="table-action danger" onClick={() => void remove(row)}>Hapus</button>}</td>
        </tr>)}</tbody></table></div>
      {employees.length === 0 && !error && <p className="empty-inline">Belum ada data karyawan.</p>}
      {employees.length > 0 && rows.length === 0 && <p className="empty-inline">Tidak ada karyawan yang cocok dengan pencarian.</p>}
    </div>
  </section>;
}
