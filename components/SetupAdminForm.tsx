"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function SetupAdminForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), username: form.get("username"), password: form.get("password") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal membuat akun administrator.");
      router.push("/login");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal membuat akun administrator."); setPending(false); }
  }
  return <form className="mt-7 space-y-5" onSubmit={submit}>
    <label className="block space-y-2 text-sm font-medium">Nama administrator<input name="name" required maxLength={120} autoComplete="name" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
    <label className="block space-y-2 text-sm font-medium">Username<input name="username" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9._-]+" autoComplete="username" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
    <label className="block space-y-2 text-sm font-medium">Kata sandi (minimal 12 karakter)<input name="password" required minLength={12} type="password" autoComplete="new-password" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={pending} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{pending ? "Menyimpan…" : "Buat superadmin"}</button>
  </form>;
}
