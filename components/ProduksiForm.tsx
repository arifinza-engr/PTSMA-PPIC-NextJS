"use client";

import { useEffect, useMemo, useState } from "react";
import { todayWIBISO } from "@/lib/date";
import Select, { type StylesConfig } from "react-select";
import CreatableSelect from "react-select/creatable";
import { BsX } from "react-icons/bs";
import { productionSchema } from "@/lib/validation";

type Line = "brakeshoe" | "discpad" | "handle";
type Item = Record<string, string>;
type DivisionFlags = { nama: string; isCasting: number; isTeam: number; hasMerk: number; hasNg: number; hasCat: number; hasNgB: number };
type MasterData = {
  divisiOptions: string[];
  divisis: DivisionFlags[];
  productOptions: { types?: string[]; grades?: string[]; kulits?: string[]; codes?: string[];
    coatings?: string[]; tebals?: string[]; namaBarangs?: string[]; warnas?: string[] };
};

const toOptions = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

type Choice = { value: string; label: string };
const selectStyles: StylesConfig<Choice, false> = {
  control: (base) => ({
    ...base,
    flexWrap: "nowrap",
    borderRadius: "9px",
    minHeight: "43px",
    boxShadow: "none",
    borderColor: "#cbd5e1",
    color: "#0f172a",
    backgroundColor: "#ffffff",
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
    color: "#0f172a",
    backgroundColor: "#ffffff",
    zIndex: 50,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 10000 }),
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

const LINE_LABEL: Record<Line, string> = {
  brakeshoe: "Brakeshoe",
  discpad: "Discpad",
  handle: "Handle",
};

const EMPTY: Item = {
  type: "", grade: "", kulit: "", merk: "", kode: "", ab: "", cat: "",
  tebal: "", namaBarang: "", warna: "", qty: "", ng: "", ngA: "", ngB: "",
};

type Col = { key: string; label: string; opts?: string[]; num?: boolean; text?: boolean };

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function columnsFor(line: Line, flags: Partial<DivisionFlags>, master: MasterData | null): Col[] {
  const po = master?.productOptions;
  if (line === "brakeshoe") {
    if (flags.isCasting) {
      return [
        { key: "type", label: "Type", opts: po?.types ?? [] },
        { key: "grade", label: "Grade", opts: po?.grades ?? [] },
      ];
    }
    const cols: Col[] = [
      { key: "type", label: "Type", opts: po?.types ?? [] },
      { key: "grade", label: "Grade", opts: po?.grades ?? [] },
      { key: "kulit", label: "Kulit", opts: po?.kulits ?? [] },
    ];
    if (flags.hasMerk) cols.push({ key: "merk", label: "Merk", text: true });
    cols.push({ key: "qty", label: "Produksi", num: true });
    if (flags.hasNg) cols.push({ key: "ng", label: "Total NG", num: true });
    return cols;
  }
  if (line === "discpad") {
    const cols: Col[] = [{ key: "kode", label: "Kode", opts: po?.codes ?? [] }];
    if (flags.nama !== "PACKING") cols.push({ key: "ab", label: "A/B", opts: ["A", "B"] });
    if (flags.hasCat) cols.push({ key: "cat", label: "Cat", opts: po?.coatings ?? [] });
    cols.push({ key: "tebal", label: "Tebal", opts: po?.tebals ?? [] });
    cols.push({ key: "qty", label: "Qty (PCS)", num: true });
    if (flags.hasNgB) {
      cols.push({ key: "ngA", label: "NG A", num: true });
      cols.push({ key: "ngB", label: "NG B", num: true });
    } else if (flags.hasNg) {
      cols.push({ key: "ng", label: "NG", num: true });
    }
    return cols;
  }
  // handle
  const base: Col[] = [
    { key: "namaBarang", label: "Nama Barang", opts: po?.namaBarangs ?? [] },
    { key: "warna", label: "Warna", opts: po?.warnas ?? [] },
  ];
  if (flags.isCasting) return base;
  return [...base, { key: "qty", label: "Produksi", num: true }, { key: "ng", label: "Total NG", num: true }];
}

export default function ProduksiForm({ line, editId }: { line: Line; editId?: number }) {
  const [master, setMaster] = useState<MasterData | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [divisi, setDivisi] = useState("");
  const [operator, setOperator] = useState("");
  const [anggota, setAnggota] = useState<string[]>([]);
  const [tanggal, setTanggal] = useState(() => todayWIBISO());
  const [shift, setShift] = useState("Shift 1");
  const [jam, setJam] = useState("");
  const [mesin, setMesin] = useState("");
  const [shot, setShot] = useState("");
  const [setv, setSetv] = useState("");
  const [pcs, setPcs] = useState("");
  const [kg, setKg] = useState("");
  const [proses, setProses] = useState("Painting 1");
  const [jumlahProduksi, setJumlahProduksi] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [items, setItems] = useState<Item[]>([{ ...EMPTY }]);
  const [opts, setOpts] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ t: "success" | "error"; v: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadErr("");
      setMaster(null);
      try {
        const r = await fetch(`/api/produksi/${line}/master`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Gagal memuat master data");
        setMaster(j);
      } catch (e) {
        setLoadErr((e as Error).message);
      }
    })();
  }, [line]);

  const flags: Partial<DivisionFlags> = useMemo(
    () => (master?.divisis || []).find((d) => d.nama === divisi) || {},
    [master, divisi],
  );
  const isCasting = !!flags.isCasting;
  const isTeam = !!flags.isTeam;
  const cols = useMemo(() => columnsFor(line, flags, master), [line, flags, master]);

  useEffect(() => {
    if (!divisi) return;
    (async () => {
      const r = await fetch(`/api/produksi/${line}/operators?divisi=${encodeURIComponent(divisi)}`);
      setOpts(r.ok ? await r.json() : []);
    })();
  }, [divisi, line]);

  useEffect(() => {
    if (!editId || !master) return;
    (async () => {
      try {
        const response = await fetch(`/api/produksi/record/${editId}`);
        const record = await response.json();
        if (!response.ok) throw new Error(record.error || "Gagal membuka laporan.");
        if (record.line !== line) throw new Error("Lini laporan tidak cocok.");
        setDivisi(record.divisi);
        setTanggal(record.header.tanggal);
        setShift(record.header.shift);
        setJam(record.header.jamKerja === "-" ? "" : record.header.jamKerja);
        setKeterangan(record.header.keterangan || "");
        setProses(record.header.proses || "Painting 1");
        setJumlahProduksi(String(record.header.qtyTotal ?? ""));
        setOperator(record.operators[0] || "");
        setAnggota(record.operators);
        const first = record.items[0] || {};
        setMesin(first.mesin || "");
        setShot(String(first.qtyShot ?? ""));
        setSetv(String(first.qtySet ?? ""));
        setPcs(String(first.qtyPcs ?? ""));
        setKg(String(first.qtyKg ?? ""));
        setItems(record.items.map((item: Record<string, string | number | null>) => ({
          type: String(item.type ?? ""), grade: String(item.grade ?? ""), kulit: String(item.kulit ?? ""),
          merk: String(item.merk ?? ""), kode: String(item.kode ?? ""), ab: String(item.gradeAb ?? ""),
          cat: String(item.cat ?? ""), tebal: String(item.tebal ?? ""),
          namaBarang: String(item.namaBarang ?? (line === "handle" ? item.type ?? "" : "")),
          warna: String(item.warna ?? ""), qty: String(item.qty ?? ""), ng: String(item.ng ?? ""),
          ngA: String(item.ng ?? ""), ngB: String(item.ngB ?? ""),
        })));
      } catch (cause) {
        setLoadErr(cause instanceof Error ? cause.message : "Gagal membuka laporan.");
      }
    })();
  }, [editId, line, master]);

  const toggleAnggota = (nama: string) =>
    setAnggota((a) => (a.includes(nama) ? a.filter((x) => x !== nama) : [...a, nama]));

  const setItem = (idx: number, key: string, value: string) =>
    setItems((its) => its.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));

  const addItem = () => setItems((its) => [...its, { ...EMPTY }]);
  const removeItem = (idx: number) => setItems((its) => its.filter((_, i) => i !== idx));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!divisi) return setMsg({ t: "error", v: "Divisi wajib dipilih." });
    if (!tanggal) return setMsg({ t: "error", v: "Tanggal wajib diisi." });

    let operatorVal = "";
    let anggotaTim: string[] = [];
    if (isTeam) {
      anggotaTim = anggota;
      if (!anggotaTim.length) return setMsg({ t: "error", v: "Minimal pilih 1 anggota tim." });
    } else {
      operatorVal = operator;
      if (!operatorVal) return setMsg({ t: "error", v: "Operator wajib dipilih." });
    }

    let payloadItems: Record<string, string | number>[] = [];
    if (line === "brakeshoe") {
      payloadItems = (isCasting ? [items[0]] : items)
        .map((i) => ({ type: i.type, grade: i.grade, kulit: i.kulit, merk: i.merk, qty: num(i.qty), ng: num(i.ng) }))
        .filter((i) => i.type || i.grade || i.kulit || i.merk || i.qty || i.ng);
    } else if (line === "discpad") {
      payloadItems = items
        .map((i) => ({ kode: i.kode, ab: i.ab, cat: i.cat, tebal: i.tebal, qty: num(i.qty), ng: num(i.ng), ngA: num(i.ngA), ngB: num(i.ngB) }))
        .filter((i) => i.kode || i.tebal || i.qty);
    } else {
      payloadItems = (isCasting ? [items[0]] : items)
        .map((i) => ({ namaBarang: i.namaBarang, warna: i.warna, qty: num(i.qty), ng: num(i.ng) }))
        .filter((i) => i.namaBarang || i.warna || i.qty || i.ng);
    }
    if (!payloadItems.length) return setMsg({ t: "error", v: "Detail produksi minimal 1 item." });
    if (line === "discpad" && divisi === "PACKING" && Number(jumlahProduksi) <= 0) {
      return setMsg({ t: "error", v: "Jumlah Produksi (SET) wajib lebih dari nol untuk PACKING." });
    }

    const payload: Record<string, unknown> = {
      divisi,
      tanggal,
      shift,
      jam,
      keterangan,
      operator: operatorVal,
      anggotaTim,
      items: payloadItems,
    };
    if (line === "brakeshoe" || line === "handle") {
      payload.mesin = mesin;
      payload.jumlahShot = num(shot);
      payload.jumlahSet = num(setv);
      if (line === "brakeshoe") {
        payload.jumlahPcs = num(pcs);
        payload.jumlahKg = num(kg);
      }
    }
    if (line === "discpad") {
      if (divisi === "PAINTING") payload.proses = proses;
      payload.jumlahProduksi = num(jumlahProduksi);
    }

    const validation = productionSchema.safeParse(payload);
    if (!validation.success) {
      return setMsg({ t: "error", v: validation.error.issues[0]?.message ?? "Data produksi tidak valid." });
    }

    setSubmitting(true);
    try {
      const r = await fetch(editId ? `/api/produksi/record/${editId}` : `/api/produksi/${line}`, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal menyimpan");
      setMsg({ t: "success", v: editId ? "Laporan produksi berhasil diperbarui." : j });
      if (!editId) {
        setItems([{ ...EMPTY }]);
        setJam("");
        setMesin(""); setShot(""); setSetv(""); setPcs(""); setKg("");
        setJumlahProduksi(""); setKeterangan("");
        setOperator(""); setAnggota([]);
      }
    } catch (e) {
      setMsg({ t: "error", v: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  if (loadErr) return <p className="text-red-600">{loadErr}</p>;
  if (!master) return <p className="text-zinc-500">Memuat master data…</p>;

  return (
    <div className="production-page">
      <div className="page-heading"><div><p className="eyebrow">Produksi / {LINE_LABEL[line]}</p><h1>{editId ? "Ubah" : "Form"} Produksi {LINE_LABEL[line]}</h1><p>Catat informasi shift, operator, dan detail hasil produksi dalam satu laporan.</p></div></div>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="form-section-heading"><span>01</span><div><h2>Informasi laporan</h2><p>Pilih divisi lebih dulu agar operator dan detail yang sesuai tersedia.</p></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Divisi</span>
            <Select
              options={toOptions(master?.divisiOptions || [])}
              value={divisi ? { value: divisi, label: divisi } : null}
              onChange={(opt) => { setDivisi(opt?.value || ""); setOperator(""); setAnggota([]); setOpts([]); }}
              placeholder="-- Pilih Divisi --"
              isSearchable
              className="mt-1"
              styles={selectStyles}
            />
          </label>

          {!isTeam && (
            <label className="block">
              <span className="text-sm font-medium">Operator</span>
              <Select
                options={toOptions(opts)}
                value={operator ? { value: operator, label: operator } : null}
                onChange={(opt) => setOperator(opt?.value || "")}
                placeholder="-- Pilih Operator --"
                isSearchable
                className="mt-1"
                styles={selectStyles}
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium">Tanggal</span>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Shift</span>
            <select value={shift} onChange={(e) => setShift(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700">
              {["Shift 1", "Shift 2", "Shift 3"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Jam Kerja</span>
            <input value={jam} onChange={(e) => setJam(e.target.value)} placeholder="7 atau 08:00-16:00" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
          </label>

          {line === "discpad" && divisi === "PAINTING" && (
            <label className="block">
              <span className="text-sm font-medium">Proses</span>
              <select value={proses} onChange={(e) => setProses(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700">
                <option>Painting 1</option>
                <option>Painting 2</option>
              </select>
            </label>
          )}

          {line === "discpad" && divisi && (
            <label className="block">
              <span className="text-sm font-medium">Jumlah Produksi ({divisi === "PACKING" ? "SET" : "PCS"})</span>
              <input type="number" min="0" value={jumlahProduksi} onChange={(e) => setJumlahProduksi(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
            </label>
          )}
        </div>

        {isTeam && (
          <fieldset className="border border-zinc-300 rounded-lg p-3 dark:border-zinc-700">
            <legend className="px-2 text-sm font-medium">Anggota Tim</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-auto">
              {opts.map((o) => (
                <label key={o} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={anggota.includes(o)} onChange={() => toggleAnggota(o)} className="rounded" />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* casting section */}
        {isCasting && (
          <div className="form-subsection"><div className="form-section-heading"><span>02</span><div><h2>Parameter casting</h2><p>Isi mesin dan keluaran proses untuk laporan ini.</p></div></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block">
              <span className="text-sm font-medium">Mesin</span>
              <input value={mesin} onChange={(e) => setMesin(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Jumlah Shot</span>
              <input type="number" value={shot} onChange={(e) => setShot(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Jumlah Set</span>
              <input type="number" value={setv} onChange={(e) => setSetv(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
            </label>
            {line === "brakeshoe" && (
              <>
                <label className="block">
                  <span className="text-sm font-medium">Jumlah Pcs</span>
                  <input type="number" value={pcs} onChange={(e) => setPcs(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Jumlah Kg</span>
                  <input type="number" value={kg} onChange={(e) => setKg(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
                </label>
              </>
            )}
          </div></div>
        )}

        {/* detail items */}
        <div className="form-subsection">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="form-section-heading"><span>{isCasting ? "03" : "02"}</span><div><h2>Detail Produksi</h2><p>Isi minimal satu baris item hasil proses.</p></div></div>
            {!isCasting && (
              <button type="button" onClick={addItem} className="action-secondary shrink-0">
                + Tambah Baris
              </button>
            )}
          </div>

          <div className="table-frame overflow-x-auto">
            <table className="w-full text-sm border-collapse" style={{ tableLayout: "fixed", minWidth: `${cols.length * 170 + (isCasting ? 0 : 48)}px` }}>
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  {cols.map((c) => <th key={c.key} className="px-2 py-1.5 font-medium">{c.label}</th>)}
                  {!isCasting && <th className="w-8"></th>}
                </tr>
              </thead>
              <tbody>
                {(isCasting ? items.slice(0, 1) : items).map((it, idx) => (
                  <tr key={idx} className="border-b border-zinc-100 dark:border-zinc-900">
                    {cols.map((c) => (
                      <td key={c.key} className="px-2 py-1.5">
                        {c.opts ? (
                          <CreatableSelect
                            options={toOptions(c.opts)}
                            value={it[c.key] ? { value: it[c.key], label: it[c.key] } : null}
                            onChange={(opt) => setItem(idx, c.key, opt?.value || "")}
                            placeholder="--"
                            isSearchable
                            menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
                            menuPosition="fixed"
                            styles={selectStyles}
                          />
                        ) : (
                          <input
                            type={c.num ? "number" : "text"}
                            value={it[c.key]}
                            onChange={(e) => setItem(idx, c.key, e.target.value)}
                            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:bg-zinc-900 dark:border-zinc-700"
                          />
                        )}
                      </td>
                    ))}
                    {!isCasting && (
                      <td className="px-2 py-1.5 text-center">
                        <button type="button" aria-label={`Hapus baris ${idx + 1}`} title={`Hapus baris ${idx + 1}`} onClick={() => removeItem(idx)} disabled={items.length <= 1} className="row-delete">
                          <BsX aria-hidden="true" size={19} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <label className="block form-subsection">
          <span className="text-sm font-medium">Keterangan</span>
          <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
        </label>

        {msg && (
          <p className={`rounded-md px-3 py-2 text-sm ${msg.t === "success" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
            {msg.v}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Menyimpan…" : editId ? "Simpan Perubahan" : "Simpan"}
        </button>
      </form>
    </div>
  );
}
