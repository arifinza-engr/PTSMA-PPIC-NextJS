"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { roleLabels, roles, type AppRole } from "@/lib/auth-roles";
import { Modal } from "@/components/ui/modal";

type Account = { id: number; username: string; name: string; role: AppRole; isActive: number };
type AccountForm = { username: string; name: string; role: AppRole; isActive: boolean; password: string };
const EMPTY_FORM: AccountForm = { username: "", name: "", role: "leader_spv", isActive: true, password: "" };

export default function UserManagement() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState<AccountForm>(EMPTY_FORM);
  const [passwordVisible, setPasswordVisible] = useState(false);
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

  function openEditor(user: Account) {
    setError(""); setMessage(""); setEditing(user); setPasswordVisible(false);
    setEditForm({ username: user.username, name: user.name, role: user.role, isActive: Boolean(user.isActive), password: "" });
  }

  function closeEditor() {
    setEditing(null); setEditForm(EMPTY_FORM); setPasswordVisible(false); setError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const values: Record<string, unknown> = {
        name: editForm.name, username: editForm.username, role: editForm.role,
        isActive: editForm.isActive ? 1 : 0,
      };
      if (editForm.password) values.password = editForm.password;
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...values }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memperbarui akun.");
      setEditing(null); setEditForm(EMPTY_FORM); setMessage("Perubahan akun tersimpan.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal memperbarui akun."); }
    finally { setBusy(false); }
  }

  async function remove(user: Account) {
    if (!window.confirm(`Hapus akun ${user.username} (${user.name})? Penghapusan ini permanen.`)) return;
    setDeletingId(user.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus akun.");
      setMessage(`Akun ${user.username} berhasil dihapus.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal menghapus akun."); }
    finally { setDeletingId(null); }
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

    <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50"><tr>{["Nama", "Username", "Peran", "Akses", "Aksi"].map((title) => <th key={title} className="px-4 py-3 font-semibold">{title}</th>)}</tr></thead><tbody className="divide-y">{users.map((user) => <tr key={user.id}>
      <td className="px-4 py-3">{user.name}</td>
      <td className="px-4 py-3">{user.username}</td>
      <td className="px-4 py-3">{roleLabels[user.role]}</td>
      <td className="px-4 py-3">{user.isActive ? "Aktif" : "Nonaktif"}</td>
      <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-md border px-3 py-1.5" onClick={() => openEditor(user)}>Ubah</button>
        <button type="button" disabled={deletingId === user.id} className="rounded-md border border-red-200 px-3 py-1.5 text-red-700 disabled:opacity-50" onClick={() => void remove(user)}>{deletingId === user.id ? "Menghapus…" : "Hapus"}</button>
      </div></td>
    </tr>)}</tbody></table>{users.length === 0 && <p className="p-6 text-sm text-muted-foreground">Belum ada akun.</p>}</div>

    <p className="text-xs text-muted-foreground">Password minimal 8 karakter. Kosongkan password saat edit jika tidak ingin menggantinya. Password tersimpan sebagai hash sehingga password lama tidak dapat dilihat.</p>

    <Modal open={editing !== null} title={`Ubah akun ${editing?.username ?? ""}`} description="Edit identitas, peran, akses, atau ganti password akun." onClose={closeEditor}>
      <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">Nama<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required maxLength={120} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-2 text-sm font-medium">Username<input value={editForm.username} onChange={(event) => setEditForm({ ...editForm, username: event.target.value })} required minLength={3} maxLength={50} pattern="[a-zA-Z0-9._-]+" className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-2 text-sm font-medium">Peran<select value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value as AppRole })} className="rounded-md border bg-background px-3 py-2">{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><input type="checkbox" checked={editForm.isActive} onChange={(event) => setEditForm({ ...editForm, isActive: event.target.checked })} />Akun aktif</label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">Password baru (opsional)<div className="flex gap-2"><input type={passwordVisible ? "text" : "password"} value={editForm.password} onChange={(event) => setEditForm({ ...editForm, password: event.target.value })} minLength={8} autoComplete="new-password" placeholder="Kosongkan jika tidak diganti" className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2" /><button type="button" className="rounded-md border px-3" onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? "Sembunyikan" : "Lihat"}</button></div></label>
        {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="rounded-md border px-4 py-2" onClick={closeEditor}>Batal</button><button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">{busy ? "Menyimpan…" : "Simpan Perubahan"}</button></div>
      </form>
    </Modal>
  </div>;
}
