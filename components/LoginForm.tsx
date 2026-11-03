"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { safeRedirectPath } from "@/lib/safe-redirect";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", {
        username: form.get("username"),
        password: form.get("password"),
        redirect: false,
      });
      if (!result || result.error) {
        setError("Nama pengguna atau kata sandi salah. Periksa kembali lalu coba lagi.");
        setPending(false);
        return;
      }
      const callbackUrl = new URL(window.location.href).searchParams.get("callbackUrl");
      window.location.assign(safeRedirectPath(callbackUrl));
    } catch {
      setError("Tidak dapat masuk saat ini. Silakan coba lagi.");
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="login-username">Nama pengguna</label>
      <input id="login-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={pending} />
      <label htmlFor="login-password">Kata sandi</label>
      <input id="login-password" name="password" type="password" autoComplete="current-password" required disabled={pending} />
      {error && <p role="alert" className="login-error">{error}</p>}
      <button type="submit" disabled={pending}>
        <span>{pending ? "Sedang masuk…" : "Masuk"}</span>
        {!pending && <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M4.5 10h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        {pending && <span className="login-spinner" aria-hidden="true" />}
      </button>
    </form>
  );
}
