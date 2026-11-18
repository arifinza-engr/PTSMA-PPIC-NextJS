"use client";

import { useEffect, useMemo, useState } from "react";
import { todayWIBISO } from "@/lib/date";
import Select, { type StylesConfig } from "react-select";
import CreatableSelect from "react-select/creatable";
import { BsX } from "react-icons/bs";
import { productionSchema } from "@/lib/validation";

type Line = "brakeshoe" | "discpad" | "handle";
type Item = Record<string, string>;
type LiniFlags = {
  nama: string;
  isCasting: number;
  isTeam: number;
  hasMerk: number;
  hasNg: number;
  hasCat: number;
  hasMesin: number;
  hasNgB: number;
  hasAb: number;
  hasProductionTotal: number;
  requiresPositiveTotal: number;
  hasProcess: number;
  hasShot: number;
  hasSet: number;
  hasPcsKg: number;
  targetMetrics: ("PCS" | "SET" | "SHOT")[];
  castingCategories: string[];
  detailFields: string[];
  pcsPerSet: number;
};
type MasterData = {
  productName?: string;
  liniOptions: string[];
  linis: LiniFlags[];
  productOptions: {
    types?: string[];
    grades?: string[];
    kulits?: string[];
    codes?: string[];
    coatings?: string[];
    tebals?: string[];
    typeHandles?: string[];
    posisiHandles?: string[];
    abOptions?: string[];
    warnas?: string[];
    processes?: string[];
  };
  paintingProcessOptions?: string[];
};

const toOptions = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

type Choice = { value: string; label: string };
type AssistanceOption = { id: number; nama: string; lini: string | null };
const selectStyles: StylesConfig<Choice, false> = {
  control: (base, state) => ({
    ...base,
    flexWrap: "nowrap",
    borderRadius: "9px",
    minHeight: "43px",
    boxShadow: state.isFocused ? "0 0 0 3px #203ea126" : "none",
    borderColor: state.isFocused ? "#203ea1" : "#cbd5e1",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  }),
  valueContainer: (base) => ({
    ...base,
    flexWrap: "nowrap",
    overflow: "hidden",
  }),
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
    backgroundColor: state.isSelected
      ? "#203ea1"
      : state.isFocused
        ? "#dbeafe"
        : "transparent",
  }),
};

const EMPTY: Item = {
  type: "",
  grade: "",
  castingCategory: "",
  kulit: "",
  merk: "",
  kode: "",
  ab: "",
  cat: "",
  tebal: "",
  typeHandle: "",
  posisiHandle: "",
  warna: "",
  qty: "",
  ng: "",
  ngA: "",
  ngB: "",
};

type Col = {
  key: string;
  label: string;
  opts?: string[];
  num?: boolean;
  text?: boolean;
};

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function columnsFor(
  line: Line,
  flags: Partial<LiniFlags>,
  master: MasterData | null,
): Col[] {
  const po = master?.productOptions;
  if (line === "brakeshoe") {
    const fields = flags.detailFields ?? ["type", "grade", ...(flags.isCasting ? [] : ["kulit"])];
    if (flags.isCasting) {
      const cols: Col[] = [];
      if (fields.includes("type")) cols.push({ key: "type", label: "Type", opts: po?.types ?? [] });
      if (fields.includes("grade")) cols.push({ key: "grade", label: "Grade", opts: po?.grades ?? [] });
      if (flags.hasMerk) cols.push({ key: "merk", label: "Merk", text: true });
      if (flags.hasNg) cols.push({ key: "ng", label: "Total NG", num: true });
      return cols;
    }
    const cols: Col[] = [];
    if (fields.includes("type")) cols.push({ key: "type", label: "Type", opts: po?.types ?? [] });
    if (fields.includes("grade")) cols.push({ key: "grade", label: "Grade", opts: po?.grades ?? [] });
    if (fields.includes("kulit")) cols.push({ key: "kulit", label: "Kulit", opts: po?.kulits ?? [] });
    if (flags.hasMerk) cols.push({ key: "merk", label: "Merk", text: true });
    cols.push({ key: "qty", label: "Produksi", num: true });
    if (flags.hasNg) cols.push({ key: "ng", label: "Total NG", num: true });
    return cols;
  }
  if (line === "discpad") {
    const fields = flags.detailFields ?? ["kode", "tebal"];
    const cols: Col[] = [];
    if (fields.includes("kode")) cols.push({ key: "kode", label: "Kode", opts: po?.codes ?? [] });
    if (flags.hasAb)
      cols.push({ key: "ab", label: "A/B", opts: po?.abOptions ?? [] });
    if (flags.hasCat)
      cols.push({ key: "cat", label: "Cat", opts: po?.coatings ?? [] });
    if (fields.includes("tebal")) cols.push({ key: "tebal", label: "Tebal", opts: po?.tebals ?? [] });
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
  const fields = flags.detailFields ?? ["typeHandle", "posisiHandle", "warna"];
  const base: Col[] = [];
  if (fields.includes("typeHandle")) base.push({ key: "typeHandle", label: "Type Handle", opts: po?.typeHandles ?? [] });
  if (fields.includes("posisiHandle")) base.push({ key: "posisiHandle", label: "Posisi Handle", opts: po?.posisiHandles ?? [] });
  if (fields.includes("warna")) base.push({ key: "warna", label: "Warna", opts: po?.warnas ?? [] });
  if (flags.isCasting) {
    if (flags.hasNg) base.push({ key: "ng", label: "Total NG", num: true });
    return base;
  }
  return [
    ...base,
    { key: "qty", label: "Produksi", num: true },
    ...(flags.hasNg ? [{ key: "ng", label: "Total NG", num: true }] : []),
  ];
}

export default function ProduksiForm({
  line,
  editId,
}: {
  line: Line;
  editId?: number;
}) {
  const [master, setMaster] = useState<MasterData | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [lini, setLini] = useState("");
  const [operator, setOperator] = useState("");
  const [anggota, setAnggota] = useState<string[]>([]);
  const [assistedOperators, setAssistedOperators] = useState<AssistanceOption[]>([]);
  const [tanggal, setTanggal] = useState(() => todayWIBISO());
  const [shift, setShift] = useState("Shift 1");
  const [jam, setJam] = useState("");
  const [mesin, setMesin] = useState("");
  const [shot, setShot] = useState("");
  const [setv, setSetv] = useState("");
  const [pcs, setPcs] = useState("");
  const [kg, setKg] = useState("");
  const [proses, setProses] = useState("");
  const [jumlahProduksi, setJumlahProduksi] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [items, setItems] = useState<Item[]>([{ ...EMPTY }]);
  const [opts, setOpts] = useState<string[]>([]);
  const [assistanceOpts, setAssistanceOpts] = useState<AssistanceOption[]>([]);
  const [assistanceSearch, setAssistanceSearch] = useState("");
  const [msg, setMsg] = useState<{ t: "success" | "error"; v: string } | null>(
    null,
  );
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

  const flags: Partial<LiniFlags> = useMemo(
    () => (master?.linis || []).find((d) => d.nama === lini) || {},
    [master, lini],
  );
  const isCasting = !!flags.isCasting;
  const isTeam = !!flags.isTeam;
  const processOptions = master?.paintingProcessOptions ?? master?.productOptions.processes ?? [];
  useEffect(() => {
    if (flags.hasProcess && processOptions.length && !processOptions.includes(proses)) setProses(processOptions[0]);
  }, [flags.hasProcess, processOptions, proses]);
  const visibleAssistanceOptions = useMemo(() => {
    const query = assistanceSearch.trim().toLocaleLowerCase("id");
    if (!query) return assistanceOpts;
    return assistanceOpts.filter((employee) =>
      `${employee.nama} ${employee.lini ?? ""}`.toLocaleLowerCase("id").includes(query),
    );
  }, [assistanceOpts, assistanceSearch]);
  const cols = useMemo(
    () => columnsFor(line, flags, master),
    [line, flags, master],
  );

  useEffect(() => {
    if (!lini) return;
    (async () => {
      const [regularResponse, assistanceResponse] = await Promise.all([
        fetch(`/api/produksi/${line}/operators?lini=${encodeURIComponent(lini)}`),
        fetch(`/api/produksi/${line}/operators?type=assistance&lini=${encodeURIComponent(lini)}`),
      ]);
      setOpts(regularResponse.ok ? await regularResponse.json() : []);
      setAssistanceOpts(assistanceResponse.ok ? await assistanceResponse.json() : []);
    })();
  }, [lini, line]);

  useEffect(() => {
    if (!editId || !master) return;
    (async () => {
      try {
        const response = await fetch(`/api/produksi/record/${editId}?line=${line}`);
        const record = await response.json();
        if (!response.ok)
          throw new Error(record.error || "Gagal membuka laporan.");
        if (record.line !== line) throw new Error("Jenis produk laporan tidak cocok.");
        setLini(record.lini);
        setTanggal(record.header.tanggal);
        setShift(record.header.shift);
        setJam(record.header.jamKerja === "-" ? "" : record.header.jamKerja);
        setKeterangan(record.header.keterangan || "");
        setProses(record.header.proses || master.paintingProcessOptions?.[0] || master.productOptions.processes?.[0] || "");
        setJumlahProduksi(String(record.header.qtyTotal ?? ""));
        setOperator(record.operators[0] || "");
        setAnggota(record.operators);
        setAssistedOperators((record.assistedOperators || []).map((employee: { id: number; nama: string; liniAsal: string | null }) => ({ id: employee.id, nama: employee.nama, lini: employee.liniAsal })));
        const first = record.items[0] || {};
        setMesin(first.mesin || "");
        setShot(String(first.qtyShot ?? ""));
        setSetv(String(first.qtySet ?? ""));
        setPcs(String(first.qtyPcs ?? ""));
        setKg(String(first.qtyKg ?? ""));
        setItems(
          record.items.map((item: Record<string, string | number | null>) => ({
            type: String(item.type ?? ""),
            grade: String(item.grade ?? ""),
            castingCategory: String(item.castingCategory ?? ""),
            kulit: String(item.kulit ?? ""),
            merk: String(item.merk ?? ""),
            kode: String(item.kode ?? ""),
            ab: String(item.gradeAb ?? ""),
            cat: String(item.cat ?? ""),
            tebal: String(item.tebal ?? ""),
            typeHandle: String(item.typeHandle ?? (line === "handle" ? (item.type ?? "") : "")),
            posisiHandle: String(item.posisiHandle ?? ""),
            warna: String(item.warna ?? ""),
            qty: String(item.qty ?? ""),
            ng: String(item.ng ?? ""),
            ngA: String(item.ng ?? ""),
            ngB: String(item.ngB ?? ""),
          })),
        );
      } catch (cause) {
        setLoadErr(
          cause instanceof Error ? cause.message : "Gagal membuka laporan.",
        );
      }
    })();
  }, [editId, line, master]);

  const toggleAnggota = (nama: string) =>
    setAnggota((a) =>
      a.includes(nama) ? a.filter((x) => x !== nama) : [...a, nama],
    );

  const setItem = (idx: number, key: string, value: string) =>
    setItems((its) =>
      its.map((it, i) => (i === idx ? { ...it, [key]: value } : it)),
    );

  const addItem = () => setItems((its) => [...its, { ...EMPTY }]);
  const removeItem = (idx: number) =>
    setItems((its) => its.filter((_, i) => i !== idx));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!lini) return setMsg({ t: "error", v: "Lini wajib dipilih." });
    if (!tanggal) return setMsg({ t: "error", v: "Tanggal wajib diisi." });
    const jamKerjaValue = Number(jam);
    if (!jam.trim() || !Number.isFinite(jamKerjaValue) || jamKerjaValue <= 0 || jamKerjaValue > 24) {
      return setMsg({ t: "error", v: "Jam kerja harus berupa angka lebih dari 0 dan maksimal 24 jam." });
    }
    if (flags.hasMesin === 1 && !/^(?:[1-9]|10)$/.test(mesin.trim())) {
      return setMsg({ t: "error", v: "Nomor mesin harus berupa angka 1 sampai 10." });
    }

    let operatorVal = "";
    let anggotaTim: string[] = [];
    if (isTeam) {
      anggotaTim = anggota;
      if (!anggotaTim.length)
        return setMsg({ t: "error", v: "Minimal pilih 1 anggota tim." });
    } else {
      operatorVal = operator;
      if (!operatorVal && !assistedOperators.length)
        return setMsg({ t: "error", v: "Pilih operator lini ini atau minimal satu operator perbantuan." });
    }

    let payloadItems: Record<string, string | number>[] = [];
    if (line === "brakeshoe") {
      payloadItems = (isCasting ? [items[0]] : items)
        .map((i) => ({
          type: i.type,
          grade: i.grade,
          castingCategory: i.castingCategory,
          kulit: i.kulit,
          merk: i.merk,
          qty: num(i.qty),
          ng: num(i.ng),
        }))
        .filter((i) => i.type || i.grade || i.castingCategory || i.kulit || i.merk || i.qty || i.ng);
    } else if (line === "discpad") {
      payloadItems = items
        .map((i) => ({
          kode: i.kode,
          ab: i.ab,
          cat: i.cat,
          tebal: i.tebal,
          qty: num(i.qty),
          ng: num(i.ng),
          ngA: num(i.ngA),
          ngB: num(i.ngB),
        }))
        .filter((i) => i.kode || i.tebal || i.qty);
    } else {
      payloadItems = (isCasting ? [items[0]] : items)
        .map((i) => ({
          typeHandle: i.typeHandle,
          castingCategory: i.castingCategory,
          posisiHandle: i.posisiHandle,
          warna: i.warna,
          qty: num(i.qty),
          ng: num(i.ng),
        }))
        .filter((i) => i.typeHandle || i.castingCategory || i.posisiHandle || i.warna || i.qty || i.ng);
    }
    if (!payloadItems.length)
      return setMsg({ t: "error", v: "Detail produksi minimal 1 item." });
    if (flags.requiresPositiveTotal && Number(jumlahProduksi) <= 0) {
      return setMsg({
        t: "error",
        v: "Jumlah produksi lini ini wajib lebih dari nol.",
      });
    }

    const payload: Record<string, unknown> = {
      lini,
      tanggal,
      shift,
      jam,
      keterangan,
      operator: operatorVal,
      anggotaTim,
      assistedOperators: assistedOperators.map(({ id, nama }) => ({ id, nama })),
      items: payloadItems,
    };
    if (line === "brakeshoe" || line === "handle") {
      if (flags.hasMesin) payload.mesin = mesin;
      if (flags.hasShot) payload.jumlahShot = num(shot);
      if (flags.hasSet) payload.jumlahSet = num(setv);
      if (flags.hasPcsKg) {
        payload.jumlahPcs = num(pcs);
        payload.jumlahKg = num(kg);
      }
    }
    if (line === "discpad") {
      if (flags.hasProcess) payload.proses = proses;
      payload.jumlahProduksi = num(jumlahProduksi);
      if (jumlahProduksi === "") return setMsg({ t: "error", v: "Jumlah Produksi (PCS) wajib diisi." });
      if (flags.hasShot) payload.jumlahShot = shot === "" ? null : num(shot);
      if (flags.hasSet) payload.jumlahSet = jumlahProduksi === "" ? null : Number(jumlahProduksi) / (flags.pcsPerSet || 1);
    }

    const validation = productionSchema.safeParse(payload);
    if (!validation.success) {
      return setMsg({
        t: "error",
        v: validation.error.issues[0]?.message ?? "Data produksi tidak valid.",
      });
    }

    setSubmitting(true);
    try {
      const r = await fetch(
        editId ? `/api/produksi/record/${editId}?line=${line}` : `/api/produksi/${line}`,
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.data),
        },
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal menyimpan");
      setMsg({
        t: "success",
        v: editId ? "Laporan produksi berhasil diperbarui." : j,
      });
      if (!editId) {
        setItems([{ ...EMPTY }]);
        setJam("");
        setMesin("");
        setShot("");
        setSetv("");
        setPcs("");
        setKg("");
        setJumlahProduksi("");
        setKeterangan("");
        setOperator("");
        setAnggota([]);
        setAssistedOperators([]);
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
      <div className="page-heading">
        <div>
          <p className="eyebrow">Produksi / {master.productName || line}</p>
          <h1>
            {editId ? "Ubah" : "Form"} Produksi {master.productName || line}
          </h1>
          <p>
            Catat informasi shift, operator, dan detail hasil produksi dalam
            satu laporan.
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="form-section-heading">
          <span>01</span>
          <div>
            <h2>Informasi laporan</h2>
            <p>
              Pilih lini lebih dulu agar operator dan detail yang sesuai
              tersedia.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Lini</span>
            <Select
              options={toOptions(master?.liniOptions || [])}
              value={lini ? { value: lini, label: lini } : null}
              onChange={(opt) => {
                setLini(opt?.value || "");
                setOperator("");
                setAnggota([]);
                setAssistedOperators([]);
                setAssistanceSearch("");
                setOpts([]);
                setAssistanceOpts([]);
                setJumlahProduksi("");
                setShot("");
              }}
              placeholder="-- Pilih Lini --"
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
              <span className="mt-1 block text-xs text-zinc-500">
                Boleh dikosongkan jika operator yang bertugas hanya karyawan perbantuan.
              </span>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium">Tanggal</span>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Shift</span>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
            >
              {["Shift 1", "Shift 2", "Shift 3"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Jam Kerja</span>
            <input
              type="number"
              min="0.1"
              max="24"
              step="0.1"
              required
              value={jam}
              onChange={(e) => setJam(e.target.value)}
              placeholder="Contoh: 8"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
            />
          </label>

          {flags.hasProcess === 1 && (
            <label className="block">
              <span className="text-sm font-medium">Proses</span>
              <select
                value={proses}
                onChange={(e) => setProses(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
              >
                {(master?.paintingProcessOptions ?? master?.productOptions.processes ?? []).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          )}

          {flags.hasProductionTotal === 1 && lini && (
            <>
              <label className="block">
                <span className="text-sm font-medium">
                  Jumlah Produksi (PCS)
                </span>
                <input
                  type="number"
                  min="0"
                  value={jumlahProduksi}
                  onChange={(e) => setJumlahProduksi(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
                />
              </label>
              {flags.hasShot === 1 && flags.hasSet !== 1 ? (
                <label className="block">
                  <span className="text-sm font-medium">Jumlah Produksi (Shot)</span>
                  <input
                    type="number"
                    min="0"
                    value={shot}
                    onChange={(e) => setShot(e.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="text-sm font-medium">Jumlah Produksi (SET)</span>
                  <input
                    type="number"
                    step="any"
                    value={jumlahProduksi === "" ? "" : Number(jumlahProduksi) / (flags.pcsPerSet || 1)}
                    readOnly
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </label>
              )}
            </>
          )}
        </div>

        {lini && (
          <fieldset className="border border-amber-300 rounded-lg p-3 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
            <legend className="px-2 text-sm font-medium">Perbantuan dari lini lain</legend>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
              Pilih karyawan aktif yang lini utamanya berbeda. Nama mereka akan ditandai sebagai perbantuan di laporan.
            </p>
            <input
              type="search"
              value={assistanceSearch}
              onChange={(event) => setAssistanceSearch(event.target.value)}
              placeholder="Cari nama atau lini asal..."
              aria-label="Cari operator perbantuan berdasarkan nama atau lini asal"
              className="mb-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
            />
            {assistanceOpts.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-auto">
                {visibleAssistanceOptions.map((name) => (
                  <label key={name.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={assistedOperators.some((employee) => employee.id === name.id)}
                      onChange={() => setAssistedOperators((selected) => selected.some((employee) => employee.id === name.id) ? selected.filter((employee) => employee.id !== name.id) : [...selected, name])}
                      className="rounded accent-amber-600"
                    />
                    <span>{name.nama} <span className="text-amber-700 dark:text-amber-400">(dari {name.lini || "lini belum diatur"})</span></span>
                  </label>
                ))}
              </div>
            ) : <p className="text-sm text-zinc-500">Tidak ada karyawan aktif dari lini lain.</p>}
            {assistanceOpts.length > 0 && visibleAssistanceOptions.length === 0 && (
              <p className="text-sm text-zinc-500">Tidak ada karyawan yang cocok dengan pencarian.</p>
            )}
          </fieldset>
        )}

        {isTeam && (
          <fieldset className="border border-zinc-300 rounded-lg p-3 dark:border-zinc-700">
            <legend className="px-2 text-sm font-medium">Anggota Tim</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-auto">
              {opts.map((o) => (
                <label key={o} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={anggota.includes(o)}
                    onChange={() => toggleAnggota(o)}
                    className="rounded"
                  />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* casting section */}
        {isCasting && (
          <div className="form-subsection">
            <div className="form-section-heading">
              <span>02</span>
              <div>
                <h2>Parameter casting</h2>
                <p>Isi mesin dan keluaran proses untuk laporan ini.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {!!flags.castingCategories?.length && <label className="block"><span className="text-sm font-medium">Kategori Casting</span><select required value={items[0]?.castingCategory ?? ""} onChange={(event) => setItem(0, "castingCategory", event.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"><option value="">Pilih kategori</option>{flags.castingCategories.map((category) => <option key={category}>{category}</option>)}</select></label>}
              {flags.hasMesin === 1 && <label className="block">
                <span className="text-sm font-medium">Mesin</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  required
                  value={mesin}
                  onChange={(e) => setMesin(e.target.value)}
                  placeholder="Nomor 1–10"
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
                />
              </label>}
              {flags.hasShot === 1 && <label className="block">
                <span className="text-sm font-medium">Jumlah Shot</span>
                <input
                  type="number"
                  value={shot}
                  onChange={(e) => setShot(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
                />
              </label>}
              {flags.hasSet === 1 && <label className="block">
                <span className="text-sm font-medium">Jumlah Set</span>
                <input
                  type="number"
                  value={setv}
                  onChange={(e) => setSetv(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
                />
              </label>}
              {flags.hasPcsKg === 1 && (
                <>
                  <label className="block">
                    <span className="text-sm font-medium">Jumlah Pcs</span>
                    <input
                      type="number"
                      value={pcs}
                      onChange={(e) => setPcs(e.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Jumlah Kg</span>
                    <input
                      type="number"
                      value={kg}
                      onChange={(e) => setKg(e.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        )}

        {/* detail items */}
        <div className="form-subsection">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="form-section-heading">
              <span>{isCasting ? "03" : "02"}</span>
              <div>
                <h2>Detail Produksi</h2>
                <p>Isi minimal satu baris item hasil proses.</p>
              </div>
            </div>
            {!isCasting && (
              <button
                type="button"
                onClick={addItem}
                className="action-secondary shrink-0"
              >
                + Tambah Baris
              </button>
            )}
          </div>

          <div className="table-frame overflow-x-auto">
            <table
              className="w-full text-sm border-collapse"
              style={{
                tableLayout: "fixed",
                minWidth: `${cols.length * 170 + (isCasting ? 0 : 48)}px`,
              }}
            >
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  {cols.map((c) => (
                    <th key={c.key} className="px-2 py-1.5 font-medium">
                      {c.label}
                    </th>
                  ))}
                  {!isCasting && <th className="w-8"></th>}
                </tr>
              </thead>
              <tbody>
                {(isCasting ? items.slice(0, 1) : items).map((it, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    {cols.map((c) => (
                      <td key={c.key} className="px-2 py-1.5">
                        {c.opts ? (
                          <CreatableSelect
                            options={toOptions(c.opts)}
                            value={
                              it[c.key]
                                ? { value: it[c.key], label: it[c.key] }
                                : null
                            }
                            onChange={(opt) =>
                              setItem(idx, c.key, opt?.value || "")
                            }
                            placeholder="--"
                            isSearchable
                            menuPortalTarget={
                              typeof document === "undefined"
                                ? undefined
                                : document.body
                            }
                            menuPosition="fixed"
                            styles={selectStyles}
                          />
                        ) : (
                          <input
                            type={c.num ? "number" : "text"}
                            value={it[c.key]}
                            onChange={(e) =>
                              setItem(idx, c.key, e.target.value)
                            }
                            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:bg-zinc-900 dark:border-zinc-700"
                          />
                        )}
                      </td>
                    ))}
                    {!isCasting && (
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          aria-label={`Hapus baris ${idx + 1}`}
                          title={`Hapus baris ${idx + 1}`}
                          onClick={() => removeItem(idx)}
                          disabled={items.length <= 1}
                          className="row-delete"
                        >
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
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700"
          />
        </label>

        {msg && (
          <p
            className={`rounded-md px-3 py-2 text-sm ${msg.t === "success" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}
          >
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
