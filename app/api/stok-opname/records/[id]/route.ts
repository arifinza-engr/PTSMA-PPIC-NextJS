import { type NextRequest } from "next/server";
import { requireRole, requireSameOrigin } from "@/lib/authorize";
import { deleteStokOpname, updateStokOpname } from "@/lib/stok-opname";
import { parseStock } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic", "qc"]); if (forbidden) return forbidden;
  try {
    const id = Number((await params).id);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID entri stok tidak valid.");
    return Response.json(await updateStokOpname(id, parseStock(await req.json())));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal mengubah stok." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic", "qc"]); if (forbidden) return forbidden;
  try { return Response.json(await deleteStokOpname(Number((await params).id))); }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal menghapus stok." }, { status: 400 });
  }
}
