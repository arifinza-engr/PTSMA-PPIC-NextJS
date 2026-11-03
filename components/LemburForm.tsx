"use client";

import { useEffect, useRef, useState } from "react";
import { todayWIBISO } from "@/lib/date";
import Select, { type StylesConfig } from "react-select";
import Image from "next/image";
import { BsFileEarmarkPdf } from "react-icons/bs";
import { overtimeSchema } from "@/lib/validation";

const toOptions = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));
type Choice = { value: string; label: string };

const selectStyles: StylesConfig<Choice, false> = {
  control: (base) => ({ ...base, borderRadius: "9px", minHeight: "43px", borderColor: "#cbd5e1", backgroundColor: "#ffffff", boxShadow: "none", flexWrap: "nowrap" }),
  valueContainer: (base) => ({ ...base, flexWrap: "nowrap", overflow: "hidden" }),
  input: (base) => ({ ...base, color: "#0f172a" }),
  singleValue: (base) => ({ ...base, color: "#0f172a", whiteSpace: "nowrap" }),
  placeholder: (base) => ({ ...base, color: "#94a3b8" }),
  dropdownIndicator: (base) => ({ ...base, color: "#9eb4c1" }),
  clearIndicator: (base) => ({ ...base, color: "#9eb4c1" }),
  indicatorSeparator: () => ({ display: "none" }),
  menu: (base) => ({ ...base, borderRadius: "9px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#0f172a", zIndex: 50 }),
  menuList: (base) => ({ ...base, padding: "4px" }),
  option: (base, state) => ({ ...base, borderRadius: "6px", fontSize: "0.8125rem", whiteSpace: "nowrap",
    color: state.isSelected ? "#ffffff" : "#334155",
    backgroundColor: state.isSelected ? "#0f766e" : state.isFocused ? "#f1f5f9" : "transparent" }),
};

export default function LemburForm() {
  const [options, setOptions] = useState<{ divisiOptions: string[]; atasanOptions: string[] } | null>(null);
  const [divisi, setDivisi] = useState("");
  const [nama, setNama] = useState("");
  const [namaOptions, setNamaOptions] = useState<string[]>([]);
  const [tanggal, setTanggal] = useState(() => todayWIBISO());
  const [jamMulai, setJamMulai] = useState("");
  const [jamSelesai, setJamSelesai] = useState("");
  const [alasan, setAlasan] = useState("");
  const [atasan, setAtasan] = useState("");
  const [persetujuanAtasan, setPersetujuanAtasan] = useState("");
  const [pernyataan, setPernyataan] = useState("");
  const [msg, setMsg] = useState<{ t: "success" | "error"; v: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // File upload state
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [buktiPreview, setBuktiPreview] = useState<string | null>(null);
  const [buktiUrl, setBuktiUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/lembur/options");
      setOptions(await r.json());
    })();
  }, []);

  useEffect(() => {
    if (!divisi) return;
    (async () => {
      const r = await fetch(`/api/lembur?divisi=${encodeURIComponent(divisi)}`);
      setNamaOptions(r.ok ? await r.json() : []);
    })();
  }, [divisi]);

  // Handle file selection with preview
  function handleBuktiChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // PPIC V1 accepts JPG/JPEG/PNG files up to 5 MB.
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ukuran file maksimal 5MB.");
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Tipe file tidak diizinkan. Gunakan JPG, JPEG, atau PNG.");
      return;
    }

    setUploadError(null);
    setBuktiFile(file);

    // Generate preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBuktiPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setBuktiPreview(null);
    }
  }

  // Remove selected file
  function handleRemoveBukti() {
    setBuktiFile(null);
    setBuktiPreview(null);
    setBuktiUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Upload bukti file to server
  async function uploadBukti(): Promise<string | null> {
    if (!buktiFile) return null;

    setUploadProgress(0);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("bukti", buktiFile);
      formData.append("nama", nama);
      formData.append("tanggal", tanggal);

      // Simulate progress (actual progress requires XMLHttpRequest)
      setUploadProgress(30);

      const response = await fetch("/api/lembur/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal upload file.");
      }

      setUploadProgress(100);
      setBuktiUrl(result.url);
      return result.url;
    } catch (e) {
      setUploadError((e as Error).message);
      return null;
    } finally {
      setUploadProgress(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const validation = overtimeSchema.safeParse({
      tanggal,
      divisi,
      nama,
      jamMulai,
      jamSelesai,
      alasan,
      atasan,
      persetujuanAtasan,
      pernyataan,
      buktiUrl: buktiUrl || null,
    });
    if (!validation.success) {
      return setMsg({ t: "error", v: validation.error.issues[0]?.message ?? "Data lembur tidak valid." });
    }
    setSubmitting(true);

    try {
      // Step 1: Upload bukti if exists
      let finalBuktiUrl = buktiUrl;
      if (buktiFile && !buktiUrl) {
        finalBuktiUrl = await uploadBukti();
        if (!finalBuktiUrl) {
          throw new Error("Gagal upload bukti lembur.");
        }
      }

      // Step 2: Submit lembur data
      const payload = { ...validation.data, buktiUrl: finalBuktiUrl };

      const r = await fetch("/api/lembur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal menyimpan");

      // Success - reset form
      setMsg({ t: "success", v: j });
      setTanggal(todayWIBISO());
      setDivisi("");
      setNama("");
      setNamaOptions([]);
      setJamMulai("");
      setJamSelesai("");
      setAtasan("");
      setPersetujuanAtasan("");
      setAlasan("");
      setPernyataan("");
      handleRemoveBukti();
    } catch (e) {
      setMsg({ t: "error", v: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  if (!options) return <p className="text-zinc-500">Memuat data…</p>;

  return (
    <div className="overtime-page">
      <div className="page-heading"><div><p className="eyebrow">Karyawan / Pengajuan</p><h1>Input Lembur</h1><p>Ajukan jam kerja tambahan dan lampirkan bukti bila tersedia.</p></div></div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="form-section-heading"><span>01</span><div><h2>Informasi karyawan & jadwal</h2><p>Pilih divisi dahulu, lalu nama karyawan dan waktu lembur.</p></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Tanggal</span>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
            <small className="text-zinc-500">Tanggal lembur dilakukan</small>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Divisi</span>
            <Select
              styles={selectStyles}
              className="mt-1"
              options={toOptions(options.divisiOptions)}
              value={divisi ? { value: divisi, label: divisi } : null}
              onChange={(opt) => { setDivisi(opt?.value ?? ""); setNama(""); setNamaOptions([]); }}
              placeholder="-- Pilih Divisi --"
              isClearable
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Nama</span>
            <Select
              styles={selectStyles}
              className="mt-1"
              options={toOptions(namaOptions)}
              value={nama ? { value: nama, label: nama } : null}
              onChange={(opt) => setNama(opt?.value ?? "")}
              placeholder="-- Pilih Nama --"
              isClearable
              isDisabled={!divisi}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Jam Mulai</span>
            <input type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Jam Selesai</span>
            <input type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Atasan yang Menyetujui</span>
            <Select
              styles={selectStyles}
              className="mt-1"
              options={toOptions(options.atasanOptions)}
              value={atasan ? { value: atasan, label: atasan } : null}
              onChange={(opt) => setAtasan(opt?.value ?? "")}
              placeholder="-- Pilih Atasan --"
              isClearable
            />
            <small className="text-zinc-500">Leader / SPV / Manager</small>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Apakah sudah disetujui atasan?</span>
            <Select
              styles={selectStyles}
              className="mt-1"
              options={toOptions(["Sudah Disetujui", "Belum Disetujui"])}
              value={persetujuanAtasan ? { value: persetujuanAtasan, label: persetujuanAtasan } : null}
              onChange={(opt) => setPersetujuanAtasan(opt?.value ?? "")}
              placeholder="-- Pilih Status --"
              isClearable
            />
          </label>
          <p className="sm:col-span-2 pending-note">Status awal: Menunggu persetujuan admin.</p>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">Alasan Lembur</span>
            <textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">Pernyataan</span>
            <textarea value={pernyataan} onChange={(e) => setPernyataan(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
          </label>
        </div>

        {/* Bukti Lembur Upload Section */}
        <div className="upload-panel space-y-3">
          <div>
            <div className="form-section-heading"><span>02</span><div><h2>Bukti Lembur</h2><p>Opsional. JPG, JPEG, atau PNG maksimal 5 MB.</p></div></div>
          </div>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleBuktiChange}
            className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700"
          />

          {/* Upload Error */}
          {uploadError && (
            <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
          )}

          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div className="space-y-1">
              <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500">Mengupload… {uploadProgress}%</p>
            </div>
          )}

          {/* Image Preview */}
          {buktiPreview && (
            <div className="relative inline-block">
              <Image
                src={buktiPreview}
                alt="Preview bukti lembur"
                width={160}
                height={160}
                unoptimized
                className="max-h-40 rounded-md border border-zinc-300 dark:border-zinc-600"
              />
              <button
                type="button"
                onClick={handleRemoveBukti}
                aria-label="Hapus bukti lembur"
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* PDF indicator */}
          {buktiFile && !buktiPreview && (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                <span className="text-sm inline-flex items-center gap-2"><BsFileEarmarkPdf aria-hidden="true" /> {buktiFile.name}</span>
              <button
                type="button"
                onClick={handleRemoveBukti}
                  aria-label="Hapus bukti lembur"
                  className="w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* Already uploaded indicator */}
          {buktiUrl && !buktiFile && (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900 rounded-md">
              <span className="text-sm text-green-700 dark:text-green-300">✓ Bukti sudah diupload</span>
            </div>
          )}
        </div>

        {msg && (
          <p className={`rounded-md px-3 py-2 text-sm ${msg.t === "success" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
            {msg.v}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || (buktiFile !== null && buktiUrl === null && uploadProgress !== null)}
          className="flex items-center gap-2"
        >
          {submitting ? (
            <>
              <span className="animate-spin">⏳</span>
              Menyimpan…
            </>
          ) : (
            "Simpan"
          )}
        </button>
      </form>
    </div>
  );
}
