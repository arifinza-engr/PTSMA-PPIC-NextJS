import { redirect } from "next/navigation";

export default async function Page({ params, searchParams }: {
  params: Promise<{ line: string }>;
  searchParams: Promise<{ divisi?: string; from?: string; to?: string }>;
}) {
  const { line } = await params;
  const filters = await searchParams;
  const query = new URLSearchParams();
  if (["brakeshoe", "discpad", "handle"].includes(line)) query.set("line", line);
  if (filters.divisi) query.set("divisi", filters.divisi);
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  redirect(`/hasil-produksi?${query.toString()}`);
}
