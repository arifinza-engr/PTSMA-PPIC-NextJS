import { type NextRequest } from "next/server";
import { requireRole, requireSameOrigin } from "@/lib/authorize";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["hrd"]); if (forbidden) return forbidden;
  void params;
  return Response.json({ error: "Persetujuan lembur disembunyikan dari aplikasi." }, { status: 410 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["superadmin"]); if (forbidden) return forbidden;
  void params;
  return Response.json({ error: "Persetujuan lembur disembunyikan dari aplikasi." }, { status: 410 });
}
