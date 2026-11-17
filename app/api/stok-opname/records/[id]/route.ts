import { type NextRequest } from "next/server";
import { requireRole, requireSameOrigin } from "@/lib/authorize";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic", "qc"]); if (forbidden) return forbidden;
  void params;
  return Response.json({ error: "Fitur Stok Opname disembunyikan dari aplikasi." }, { status: 410 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic", "qc"]); if (forbidden) return forbidden;
  void params;
  return Response.json({ error: "Fitur Stok Opname disembunyikan dari aplikasi." }, { status: 410 });
}
