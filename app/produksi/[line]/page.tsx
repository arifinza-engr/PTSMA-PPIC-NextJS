import ProduksiForm from "@/components/ProduksiForm";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ line: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { line } = await params;
  const { edit } = await searchParams;
  const editId = edit && /^\d+$/.test(edit) ? Number(edit) : undefined;
  return <ProduksiForm line={line as "brakeshoe" | "discpad" | "handle"} editId={editId} />;
}
