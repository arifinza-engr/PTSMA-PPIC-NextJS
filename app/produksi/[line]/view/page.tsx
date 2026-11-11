import { redirect } from "next/navigation";

export default async function Page({ params, searchParams }: {
  params: Promise<{ line: string }>;
  searchParams: Promise<{ lini?: string; from?: string; to?: string }>;
}) {
  const { line } = await params;
  const filters = await searchParams;
  const query = new URLSearchParams();
  if (["brakeshoe", "discpad", "handle"].includes(line)) query.set("line", line);
  if (filters.lini) query.set("lini", filters.lini);
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  redirect(`/hasil-produksi?${query.toString()}`);
}
