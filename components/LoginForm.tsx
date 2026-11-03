"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      username: form.get("username"),
      password: form.get("password"),
      redirect: false,
    });
    if (result?.error) {
      setError("Nama pengguna atau kata sandi tidak sesuai.");
      setPending(false);
      return;
    }
    const callbackUrl = new URL(window.location.href).searchParams.get("callbackUrl");
    window.location.assign(callbackUrl?.startsWith("/") ? callbackUrl : "/");
  }

  return <form className="space-y-5" onSubmit={submit}>
    <label className="block space-y-2 text-sm font-medium">Nama pengguna
      <input name="username" autoComplete="username" required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
    </label>
    <label className="block space-y-2 text-sm font-medium">Kata sandi
      <input name="password" type="password" autoComplete="current-password" required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
    </label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={pending} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
      {pending ? "Memeriksa akun…" : "Masuk"}
    </button>
  </form>;
}
