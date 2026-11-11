import HasilProduksi from "@/components/HasilProduksi";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ line?: string; lini?: string; from?: string; to?: string }>;
}) {
  const filters = await searchParams;
  const line = (["brakeshoe", "discpad", "handle"].includes(filters.line ?? "") ? filters.line : "brakeshoe") as "brakeshoe" | "discpad" | "handle";
  return <HasilProduksi initialLine={line} initialLini={filters.lini ?? ""}
    initialFrom={filters.from ?? ""} initialTo={filters.to ?? ""} />;
}
