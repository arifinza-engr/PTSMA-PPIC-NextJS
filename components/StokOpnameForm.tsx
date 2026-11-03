"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Select, { type StylesConfig } from "react-select";
import { todayWIBISO } from "@/lib/date";
import { stockSchema } from "@/lib/validation";

interface SelectOption {
  value: string | number;
  label: string;
}

type StockRecord = { id: number; kode: string; powder: string; op: string; type: string | null; gradeA: number; gradeB: number };
type StockPreview = { headers: (string | number | null)[]; rows: (string | number | null)[][]; sheetName: string; exists: boolean };

const toOptions = (arr: (string | number)[]): SelectOption[] =>
  arr.map((v) => ({ value: String(v), label: String(v) }));

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base) => ({
    ...base,
    flexWrap: "nowrap",
    borderRadius: "9px",
    minHeight: "43px",
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    boxShadow: "none",
  }),
  valueContainer: (base) => ({ ...base, flexWrap: "nowrap", overflow: "hidden" }),
  input: (base) => ({ ...base, color: "#0f172a" }),
  singleValue: (base) => ({ ...base, color: "#0f172a", whiteSpace: "nowrap" }),
  placeholder: (base) => ({ ...base, color: "#94a3b8" }),
  dropdownIndicator: (base) => ({ ...base, color: "#9eb4c1" }),
  clearIndicator: (base) => ({ ...base, color: "#9eb4c1" }),
  indicatorSeparator: () => ({ display: "none" }),
  menu: (base) => ({
    ...base,
    borderRadius: "9px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    zIndex: 50,
  }),
  menuList: (base) => ({ ...base, padding: "4px" }),
  option: (base, state) => ({
    ...base,
    whiteSpace: "nowrap",
    borderRadius: "6px",
    fontSize: "0.8125rem",
    color: state.isSelected ? "#ffffff" : "#334155",
    backgroundColor: state.isSelected ? "#0f766e" : state.isFocused ? "#f1f5f9" : "transparent",
  }),
};

type StockMaster = { months: { value: number; label: string }[]; years: number[]; codes: string[]; powders: string[]; items: { op: string | null; kode: string | null }[] };

export default function StokOpnameForm() {
  const [master, setMaster] = useState<StockMaster | null>(null);
  const [month, setMonth] = useState<number | null>(() => Number(todayWIBISO().slice(5, 7)));
  const [year, setYear] = useState<string | null>(() => todayWIBISO().slice(0, 4));
  const [kode, setKode] = useState<string | null>(null);
  const [powder, setPowder] = useState<string | null>(null);
  const [nilaiA, setNilaiA] = useState("");
  const [nilaiB, setNilaiB] = useState("");
  const [msg, setMsg] = useState<{ t: "success" | "error"; v: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [preview, setPreview] = useState<StockPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewRequest = useRef(0);

  const monthOptions: SelectOption[] = (master?.months || []).map((m) => ({
    value: m.value as number,
    label: m.label,
  }));
  const yearOptions: SelectOption[] = toOptions(master?.years || []);
  const kodeOptions: SelectOption[] = toOptions(master?.codes || []);
  const powderOptions: SelectOption[] = toOptions(master?.powders || []);
  const selectedItem = master?.items.find((item) => item.kode === kode);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/stok-opname/master");
      setMaster(await r.json());
    })();
  }, []);


  async function loadRecords() {
    if (!month || !year) return;
    try {
      const response = await fetch(`/api/stok-opname/records?month=${month}&year=${year}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat stok.");
      setRecords(data);
    } catch (cause) {
      setMsg({ t: "error", v: cause instanceof Error ? cause.message : "Gagal memuat stok." });
    }
  }

  const loadPreview = useCallback(async () => {
    if (!month || !year) return;
    const requestId = ++previewRequest.current;
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/stok-opname?month=${month}&year=${year}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat preview stok.");
      if (requestId === previewRequest.current) setPreview(data);
    } catch (cause) {
      if (requestId === previewRequest.current) setMsg({ t: "error", v: cause instanceof Error ? cause.message : "Gagal memuat preview stok." });
    } finally {
      if (requestId === previewRequest.current) setPreviewLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    if (month && year) void loadPreview();
  }, [loadPreview, month, year]);

  async function deleteRecord(id: number) {
    if (!window.confirm(`Hapus entri stok #${id}?`)) return;
    const response = await fetch(`/api/stok-opname/records/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) setMsg({ t: "error", v: data.error || "Gagal menghapus stok." });
    else {
      await Promise.all([loadRecords(), loadPreview()]);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const validation = stockSchema.safeParse({ bulan: Number(month), tahun: Number(year), kode, powder, nilaiA, nilaiB });
    if (!validation.success) {
      return setMsg({ t: "error", v: validation.error.issues[0]?.message ?? "Data stok tidak valid." });
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/stok-opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal menyimpan");
      setMsg({ t: "success", v: j });
      setNilaiA("");
      setNilaiB("");
      await Promise.all([loadRecords(), loadPreview()]);
    } catch (e) {
      setMsg({ t: "error", v: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  if (!master) return <p className="text-zinc-500">Memuat master data…</p>;

  return (
    <div className="stock-page">
      <div className="page-heading"><div><p className="eyebrow">Inventori / Pencatatan</p><h1>Stok Opname</h1><p>Pilih periode dan identitas produk, lalu catat jumlah grade A dan B.</p></div></div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="form-section-heading"><span>01</span><div><h2>Periode dan produk</h2><p>Pilih bulan, tahun, kode, dan powder coating.</p></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Bulan</span>
            <Select<SelectOption>
              styles={selectStyles}
              options={monthOptions}
              value={monthOptions.find((o) => o.value === month) || null}
              onChange={(v) => setMonth((v?.value as number) ?? null)}
              placeholder="-- Pilih Bulan --"
              isClearable
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Tahun</span>
            <Select<SelectOption>
              styles={selectStyles}
              options={yearOptions}
              value={yearOptions.find((o) => o.value === year) || null}
              onChange={(v) => setYear((v?.value as string) ?? null)}
              placeholder="-- Pilih Tahun --"
              isClearable
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Type</span>
            <Select<SelectOption>
              styles={selectStyles}
              options={kodeOptions}
              value={kodeOptions.find((o) => o.value === kode) || null}
              onChange={(v) => setKode((v?.value as string) ?? null)}
              placeholder="-- Pilih Kode --"
              isClearable
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Kode</span>
            <input value={selectedItem?.op ?? ""} readOnly className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800 dark:border-zinc-700" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Merk</span>
            <Select<SelectOption>
              styles={selectStyles}
              options={powderOptions}
              value={powderOptions.find((o) => o.value === powder) || null}
              onChange={(v) => setPowder((v?.value as string) ?? null)}
              placeholder="-- Pilih Powder --"
              isClearable
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">A</span>
            <input type="number" value={nilaiA} onChange={(e) => setNilaiA(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">B</span>
            <input type="number" value={nilaiB} onChange={(e) => setNilaiB(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
          </label>
        </div>

        {msg && (
          <p className={`rounded-md px-3 py-2 text-sm ${msg.t === "success" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
            {msg.v}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Menyimpan…" : "Simpan"}
        </button>
      </form>
      <section className="data-panel mt-7">
        <div className="data-panel-header"><div><p className="eyebrow">02 / Peninjauan</p><h2>Preview Sheet Bulanan</h2><p>{previewLoading ? "Memuat preview…" : preview?.exists ? `Sheet ${preview.sheetName}` : `Sheet ${preview?.sheetName || "periode ini"} belum ada. Sheet dibuat otomatis saat entri pertama disimpan.`}</p></div><button type="button" onClick={loadPreview} disabled={!month || !year || previewLoading} className="action-secondary">Refresh preview</button></div>
        {preview?.headers.length ? <div className="table-frame overflow-x-auto"><table><thead><tr>{preview.headers.map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}</tr></thead><tbody>
          {preview.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell ?? ""}</td>)}</tr>)}
        </tbody></table></div> : <p className="empty-inline">Belum ada data preview untuk periode ini.</p>}
      </section>
      <section className="data-panel mt-7">
        <div className="data-panel-header"><div><p className="eyebrow">03 / Data tersimpan</p><h2>Entri periode</h2><p>Lihat dan kelola entri stok untuk bulan dan tahun pilihan.</p></div><button type="button" onClick={loadRecords} disabled={!month || !year} className="action-secondary">Tampilkan data</button></div>
        <div className="table-frame overflow-x-auto"><table><thead><tr>
          <th>OP</th><th>Kode</th><th>Type</th><th>Powder</th><th>Grade A</th><th>Grade B</th><th>Aksi</th>
        </tr></thead><tbody>{records.map(record => <tr key={record.id}>
          <td>{record.op}</td><td>{record.kode}</td><td>{record.type}</td><td>{record.powder}</td>
          <td>{record.gradeA}</td><td>{record.gradeB}</td>
          <td><button type="button" onClick={() => {
            setKode(record.kode); setPowder(record.powder);
            setNilaiA(String(record.gradeA)); setNilaiB(String(record.gradeB));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}>Ubah</button><button type="button" onClick={() => deleteRecord(record.id)}>Hapus</button></td>
        </tr>)}</tbody></table></div>
        {!records.length && <p className="empty-inline">Pilih periode dan tekan “Tampilkan data” untuk melihat entri stok.</p>}
      </section>
    </div>
  );
}
