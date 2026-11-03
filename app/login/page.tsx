import LoginForm from "@/components/LoginForm";
import Link from "next/link";
import { db, schema } from "@/db";
import { count } from "drizzle-orm";

export default async function LoginPage() {
  const [{ total }] = await db.select({ total: count() }).from(schema.appUser);
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 text-slate-900">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">PPIC Autopart</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Masuk ke ruang kerja</h1>
        <p className="mt-2 text-sm text-slate-600">Gunakan akun perusahaan yang telah diberikan administrator.</p>
      </div>
      <LoginForm />
      {total === 0 && <p className="mt-6 border-t pt-5 text-sm text-slate-600">Belum ada administrator? <Link className="font-semibold text-blue-700 hover:underline" href="/setup">Buat akun superadmin pertama</Link></p>}
    </section>
  </main>;
}
