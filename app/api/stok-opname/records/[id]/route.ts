import { type NextRequest } from "next/server";
import { requireRole, requireSameOrigin } from "@/lib/authorize";
import { deleteStokOpname } from "@/lib/stok-opname";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic", "qc"]); if (forbidden) return forbidden;
  try { return Response.json(await deleteStokOpname(Number((await params).id))); }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal menghapus stok." }, { status: 400 });
  }
}
