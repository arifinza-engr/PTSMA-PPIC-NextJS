"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Kind = "employee" | "product" | "division";
type Row = Record<string, string | number | null> & { id: number };
type Master = {
  lines: { id: number; nama: string }[];
  divisions: Row[];
  employees: Row[];
  products: Row[];
};
type Field = { key: string; label: string; type?: "number" | "check" | "line" | "division" | "job" };

const FIELDS: Record<Kind, Field[]> = {
  employee: [
    { key: "nama", label: "Nama" }, { key: "divisiId", label: "Divisi", type: "division" },
    { key: "jabatan", label: "Jabatan", type: "job" }, { key: "isActive", label: "Aktif", type: "check" },
  ],
  product: [
    { key: "productLineId", label: "Lini", type: "line" }, { key: "type", label: "Type" },
    { key: "grade", label: "Grade" }, { key: "kulit", label: "Kulit" },
    { key: "namaBarang", label: "Nama Barang" }, { key: "warna", label: "Warna" },
    { key: "op", label: "OP" }, { key: "kode", label: "Kode" },
    { key: "namaType", label: "Nama Type" }, { key: "tebal", label: "Tebal" },
    { key: "powderCoating", label: "Powder Coating" },
  ],
  division: [
    { key: "productLineId", label: "Lini", type: "line" }, { key: "nama", label: "Nama" },
    { key: "urutan", label: "Urutan", type: "number" },
    ...["isCasting", "isTeam", "hasNg", "hasMerk", "hasCat", "hasMesin", "hasNgB"]
      .map(key => ({ key, label: key, type: "check" as const })),
  ],
};

const DEFAULTS: Record<Kind, Record<string, string | number | boolean | null>> = {
  employee: { nama: "", divisiId: 0, jabatan: "operator", isActive: true },
  product: { productLineId: null, type: "", grade: "", kulit: "", namaBarang: "", warna: "",
    op: "", kode: "", namaType: "", tebal: "", powderCoating: "" },
  division: { productLineId: 0, nama: "", urutan: 0, isCasting: false, isTeam: false,
    hasNg: false, hasMerk: false, hasCat: false, hasMesin: false, hasNgB: false },
};

export default function MasterTables() {
  const [master, setMaster] = useState<Master | null>(null);
  const [kind, setKind] = useState<Kind>("employee");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string | number | boolean | null>>({ ...DEFAULTS.employee });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/master");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Gagal memuat master.");
    setMaster(data);
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/master")
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memuat master.");
        if (active) setMaster(data);
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Gagal memuat master."); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    if (!master) return [];
    const all = kind === "employee" ? master.employees : kind === "product" ? master.products : master.divisions;
    return all.filter(row => Object.values(row).some(value => String(value ?? "").toLowerCase().includes(search.toLowerCase())));
  }, [master, kind, search]);

  function selectKind(value: Kind) {
    setKind(value); setEditingId(null); setForm({ ...DEFAULTS[value] }); setSearch(""); setError(""); setMessage("");
  }

  function edit(row: Row) {
    const values = { ...DEFAULTS[kind] };
    for (const field of FIELDS[kind]) {
      const value = row[field.key];
      values[field.key] = field.type === "check" ? Boolean(value) : value ?? (field.type === "line" ? null : "");
    }
    setEditingId(row.id); setForm(values); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/master", {
        method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id: editingId, value: form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan master.");
      setMessage(`Data berhasil disimpan (#${data.id}).`);
      setEditingId(null); setForm({ ...DEFAULTS[kind] }); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menyimpan master."); }
    finally { setSaving(false); }
  }

  async function removeProduct(id: number) {
    if (!window.confirm(`Hapus produk #${id}?`)) return;
    const response = await fetch("/api/master", { method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "product", id }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Gagal menghapus produk.");
    else await load();
  }

  return <section className="master-page">
    <div className="page-heading"><div><p className="eyebrow">Administrasi / Referensi</p><h1>Master Data</h1><p>Kelola data karyawan, produk, dan divisi yang digunakan di formulir operasional.</p></div></div>
    <div className="master-tabs mb-5 flex gap-2" role="group" aria-label="Jenis master data">{(["employee", "product", "division"] as Kind[]).map(value =>
      <button key={value} type="button" onClick={() => selectKind(value)} aria-pressed={kind === value}
        className={`master-tab ${kind === value ? "is-active" : ""}`}>
        {value === "employee" ? "Karyawan" : value === "product" ? "Produk" : "Divisi"}
      </button>)}</div>
    <form onSubmit={save} className="mb-6">
      <div className="form-section-heading"><span>{editingId ? "↗" : "+"}</span><div><h2>{editingId ? `Ubah #${editingId}` : "Tambah data"}</h2><p>{editingId ? "Periksa perubahan sebelum menyimpan." : "Isi kolom yang diperlukan untuk menambah master baru."}</p></div></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{FIELDS[kind].map(field =>
        <label key={field.key} className="block"><span>{field.label}</span>
          {field.type === "check" ? <input type="checkbox" checked={Boolean(form[field.key])}
            onChange={event => setForm(current => ({ ...current, [field.key]: event.target.checked }))} />
            : field.type === "line" ? <select value={String(form[field.key] ?? "")}
              onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value ? Number(event.target.value) : null }))}>
              <option value="">—</option>{master?.lines.map(line => <option key={line.id} value={line.id}>{line.nama}</option>)}
            </select>
            : field.type === "division" ? <select value={String(form[field.key] ?? "")}
              onChange={event => setForm(current => ({ ...current, [field.key]: Number(event.target.value) }))} required>
              <option value="">Pilih divisi</option>{master?.divisions.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </select>
            : field.type === "job" ? <select value={String(form[field.key] ?? "operator")}
              onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))}>
              {["operator", "leader", "spv", "admin"].map(value => <option key={value}>{value}</option>)}
            </select>
            : <input type={field.type === "number" ? "number" : "text"} value={String(form[field.key] ?? "")}
              onChange={event => setForm(current => ({ ...current, [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value }))} />}
        </label>)}</div>
      {error && <p role="alert" className="notice-error mt-3">{error}</p>}
      {message && <p role="status" className="notice-success mt-3">{message}</p>}
      <div className="mt-4 flex gap-2"><button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
        {editingId && <button type="button" className="action-secondary" onClick={() => { setEditingId(null); setForm({ ...DEFAULTS[kind] }); }}>Batal</button>}
      </div>
    </form>
    <div className="data-panel"><div className="data-panel-header"><div><p className="eyebrow">Daftar / {kind === "employee" ? "Karyawan" : kind === "product" ? "Produk" : "Divisi"}</p><h2>{rows.length} data</h2><p>Cari entri lalu pilih ubah untuk memperbarui.</p></div><label className="search-field">Cari<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari dalam daftar" /></label></div>
    <div className="table-frame max-h-[600px] overflow-auto"><table>
      <thead><tr><th>ID</th>{FIELDS[kind].map(field => <th key={field.key}>{field.label}</th>)}<th>Aksi</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}><td>{row.id}</td>
        {FIELDS[kind].map(field => <td key={field.key}>{field.type === "check" ? (row[field.key] ? "Ya" : "Tidak") : String(row[field.key] ?? "—")}</td>)}
        <td className="whitespace-nowrap"><button type="button" className="table-action" onClick={() => edit(row)}>Ubah</button>
          {kind === "product" && <button type="button" className="table-action danger" onClick={() => removeProduct(row.id)}>Hapus</button>}
        </td></tr>)}</tbody>
    </table></div>
    {master && !rows.length && <p className="empty-inline">Tidak ada data yang cocok dengan pencarian.</p>}
    {!master && !error && <p className="empty-inline">Memuat master data…</p>}
    </div>
  </section>;
}
