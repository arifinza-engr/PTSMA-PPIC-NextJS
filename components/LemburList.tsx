"use client";

import { useCallback, useEffect, useState } from "react";
import { formatTanggalID } from "@/lib/date";
import { useSession } from "next-auth/react";

type Lembur = {
  id: number; tanggal: string; lini: string | null; nama: string;
  jamMulai: string | null; jamSelesai: string | null; totalJam: number | null;
  alasan: string | null; atasan: string | null; status: string | null; buktiUrl: string | null;
  persetujuanAtasan: string | null;
};

export default function LemburList() {
  const { data: session } = useSession();
  const canApprove = session?.user.role === "hrd" || session?.user.role === "superadmin";
  const canDelete = session?.user.role === "superadmin";
  const [rows, setRows] = useState<Lembur[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/lembur?list=1");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat lembur.");
      setRows(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memuat lembur.");
    }
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/lembur?list=1")
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memuat lembur.");
        if (active) setRows(data);
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Gagal memuat lembur."); });
    return () => { active = false; };
  }, []);

  async function change(id: number, action: "Disetujui" | "Ditolak" | "hapus") {
    if (action === "hapus" && !window.confirm(`Hapus pengajuan lembur #${id}?`)) return;
    setBusyId(id); setError("");
    try {
      const response = await fetch(`/api/lembur/${id}`, action === "hapus"
        ? { method: "DELETE" }
        : { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyimpan.");
    } finally { setBusyId(null); }
  }

  const pending = rows.filter(row => !row.status || row.status === "Menunggu").length;
  const visibleRows = [...rows].sort((a, b) => Number(!b.status || b.status === "Menunggu") - Number(!a.status || a.status === "Menunggu"));

  return <section className="overtime-list-page">
    <div className="page-heading"><div><p className="eyebrow">Administrasi / Persetujuan</p><h1>Daftar Lembur</h1><p>Tinjau pengajuan terbaru dan putuskan statusnya. Pengajuan menunggu ditampilkan lebih dulu.</p></div><div className="count-chip"><strong>{pending}</strong><span>Menunggu</span></div></div>
    {error && <p role="alert" className="notice-error mb-4">{error}</p>}
    <div className="table-frame overflow-x-auto">
      <table>
        <thead><tr>{["Tanggal", "Karyawan", "Lini", "Waktu", "Alasan", "Atasan", "Persetujuan Atasan", "Status Admin", "Bukti", "Aksi"].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{visibleRows.map(row => <tr key={row.id}>
          <td>{formatTanggalID(row.tanggal)}</td><td>{row.nama}</td><td>{row.lini}</td>
          <td>{row.jamMulai}–{row.jamSelesai} ({row.totalJam} jam)</td>
          <td>{row.alasan}</td><td>{row.atasan}</td><td>{row.persetujuanAtasan || "Tidak tercatat"}</td><td><span className={`status-badge ${row.status === "Disetujui" ? "approved" : row.status === "Ditolak" ? "rejected" : "pending"}`}>{row.status || "Menunggu"}</span></td>
          <td>{row.buktiUrl?.startsWith("/api/lembur/bukti/") ? <a href={row.buktiUrl} target="_blank" rel="noreferrer" className="table-action">Lihat</a> : "—"}</td>
          <td><div className="flex gap-2 whitespace-nowrap">
            {canApprove && <><button type="button" className="table-action approved" disabled={busyId === row.id || row.status === "Disetujui"} onClick={() => change(row.id, "Disetujui")}>Setujui</button>
            <button type="button" className="table-action danger" disabled={busyId === row.id || row.status === "Ditolak"} onClick={() => change(row.id, "Ditolak")}>Tolak</button></>}
            {canDelete && <button type="button" className="table-action danger" disabled={busyId === row.id} onClick={() => change(row.id, "hapus")}>Hapus</button>}
            {!canApprove && !canDelete && <span className="text-muted-foreground">Lihat saja</span>}
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
    {!rows.length && !error && <p className="empty-inline">Belum ada pengajuan lembur dalam daftar.</p>}
  </section>;
}
