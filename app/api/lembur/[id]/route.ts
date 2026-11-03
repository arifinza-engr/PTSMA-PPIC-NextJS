import { type NextRequest } from "next/server";
import { requireRole, requireSameOrigin } from "@/lib/authorize";
import { deleteLembur, updateLemburStatus } from "@/lib/lembur";

export const runtime = "nodejs";

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID tidak valid.");
  return id;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["hrd"]); if (forbidden) return forbidden;
  try {
    const { id } = await params;
    const body: unknown = await req.json();
    const status = typeof body === "object" && body !== null && "status" in body ? body.status : null;
    if (status !== "Disetujui" && status !== "Ditolak") throw new Error("Status harus Disetujui atau Ditolak.");
    return Response.json(await updateLemburStatus(parseId(id), status));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal mengubah status." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["superadmin"]); if (forbidden) return forbidden;
  try {
    const { id } = await params;
    return Response.json(await deleteLembur(parseId(id)));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal menghapus lembur." }, { status: 400 });
  }
}
