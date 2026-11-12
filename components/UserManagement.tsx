"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { roleLabels, roles, type AppRole } from "@/lib/auth-roles";

type Account = { id: number; username: string; name: string; role: AppRole; isActive: number };

function PasswordEditor({ onSave }: { onSave: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(password);
      setPassword("");
      setVisible(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal mengubah password.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="flex min-w-64 items-center gap-2">
    <input
      type={visible ? "text" : "password"}
      value={password}
      onChange={(event) => setPassword(event.target.value)}
      placeholder="Password baru (min. 8)"
      aria-label="Password baru"
      autoComplete="new-password"
      minLength={8}
      required
      className="w-48 rounded-md border bg-background px-2 py-1.5"
    />
    <button type="button" onClick={() => setVisible((value) => !value)} className="rounded-md border px-2 py-1.5">
      {visible ? "Sembunyikan" : "Lihat"}
    </button>
    <button type="submit" disabled={busy} className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground disabled:opacity-50">
      {busy ? "Menyimpan…" : "Simpan"}
    </button>
    {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
  </form>;
}

export default function UserManagement() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const queryClient = useQueryClient();

  const usersQuery = useQuery<Account[]>({ queryKey: ["admin-users"], queryFn: async () => {
    const response = await fetch("/api/admin/users");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Gagal memuat akun.");
    return data;
  } });
  const users = usersQuery.data ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), name: form.get("name"), password: form.get("password"), role: form.get("role") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal membuat akun.");
      formElement.reset(); setMessage("Akun berhasil dibuat."); await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal membuat akun."); }
    finally { setBusy(false); }
  }

  async function change(id: number, values: Record<string, unknown>) {
    setError(""); setMessage("");
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...values }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Gagal memperbarui akun.");
    setMessage("Perubahan akun tersimpan."); await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return <div className="space-y-6">
    <form onSubmit={submit} className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-5">
      <label className="grid gap-2 text-sm font-medium">Nama<input name="name" required maxLength={120} className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-2 text-sm font-medium">Username<input name="username" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9._-]+" className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-2 text-sm font-medium">Kata sandi<input name="password" type="password" required minLength={8} autoComplete="new-password" className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-2 text-sm font-medium">Peran<select name="role" className="rounded-md border bg-background px-3 py-2">{roles.filter((role) => role !== "superadmin").map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
      <button disabled={busy} className="self-end rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">{busy ? "Menyimpan…" : "Tambah akun"}</button>
    </form>
    {(error || usersQuery.error) && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error || (usersQuery.error instanceof Error ? usersQuery.error.message : "Gagal memuat akun.")}</p>}
    {message && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50"><tr>{["Nama", "Username", "Peran", "Akses", "Password", "Aksi"].map((title) => <th key={title} className="px-4 py-3 font-semibold">{title}</th>)}</tr></thead><tbody className="divide-y">{users.map((user) => <tr key={user.id}>
      <td className="px-4 py-3">{editingId === user.id ? <input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={120} required aria-label="Nama akun" className="w-40 rounded-md border bg-background px-2 py-1.5" /> : user.name}</td><td className="px-4 py-3">{editingId === user.id ? <input value={editUsername} onChange={(event) => setEditUsername(event.target.value)} minLength={3} maxLength={50} pattern="[a-zA-Z0-9._-]+" required aria-label="Username akun" className="w-36 rounded-md border bg-background px-2 py-1.5" /> : user.username}</td>
      <td className="px-4 py-3"><select value={user.role} onChange={(event) => void change(user.id, { role: event.target.value }).catch((cause) => setError(cause.message))} className="rounded-md border bg-background px-2 py-1">{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></td>
      <td className="px-4 py-3">{user.isActive ? "Aktif" : "Nonaktif"}</td>
      <td className="px-4 py-3"><PasswordEditor onSave={(password) => change(user.id, { password })} /></td>
      <td className="px-4 py-3"><div className="flex flex-wrap gap-2">{editingId === user.id ? <><button type="button" className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground" onClick={() => void change(user.id, { name: editName, username: editUsername }).then(() => setEditingId(null)).catch((cause) => setError(cause.message))}>Simpan</button><button type="button" className="rounded-md border px-3 py-1.5" onClick={() => setEditingId(null)}>Batal</button></> : <button type="button" className="rounded-md border px-3 py-1.5" onClick={() => { setEditingId(user.id); setEditName(user.name); setEditUsername(user.username); }}>Edit</button>}<button type="button" className="rounded-md border px-3 py-1.5" onClick={() => void change(user.id, { isActive: user.isActive ? 0 : 1 }).catch((cause) => setError(cause.message))}>{user.isActive ? "Nonaktifkan" : "Aktifkan"}</button></div></td>
    </tr>)}</tbody></table>{users.length === 0 && <p className="p-6 text-sm text-muted-foreground">Belum ada akun.</p>}</div>
    <p className="text-xs text-muted-foreground">Password minimal 8 karakter. Password tersimpan sebagai hash sehingga password lama tidak dapat dilihat; superadmin dapat menggantinya dengan password baru. Akun superadmin tambahan dapat dibuat melalui perubahan peran setelah akun dibuat.</p>
  </div>;
}
