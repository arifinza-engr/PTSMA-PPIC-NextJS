import { redirect } from "next/navigation";
import { count } from "drizzle-orm";
import { db, schema } from "@/db";
import SetupAdminForm from "@/components/SetupAdminForm";

export default async function SetupPage() {
  const [{ total }] = await db.select({ total: count() }).from(schema.appUser);
  if (total > 0) redirect("/login");
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 text-slate-900">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">PPIC Autopart</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Setup administrator</h1>
      <p className="mt-2 text-sm text-slate-600">Buat superadmin pertama. Form setup akan terkunci setelah akun dibuat.</p>
      <SetupAdminForm />
    </section>
  </main>;
}
