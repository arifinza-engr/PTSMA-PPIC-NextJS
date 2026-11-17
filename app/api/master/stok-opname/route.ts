import { type NextRequest } from "next/server";
import { requireRole, requireSameOrigin } from "@/lib/authorize";
import { listStockMaster } from "@/lib/stock-master";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  return Response.json({ error: error instanceof Error ? error.message : "Permintaan gagal." }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const denied = requireSameOrigin(req); if (denied) return denied;
  const forbidden = await requireRole(["superadmin"]); if (forbidden) return forbidden;
  try { return Response.json(await listStockMaster(), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return errorResponse(error); }
}

export async function POST(req: NextRequest) {
  const denied = requireSameOrigin(req); if (denied) return denied;
  const forbidden = await requireRole(["superadmin"]); if (forbidden) return forbidden;
  return Response.json({ error: "Master Stok Opname disembunyikan dari aplikasi." }, { status: 410 });
}

export async function PUT(req: NextRequest) {
  const denied = requireSameOrigin(req); if (denied) return denied;
  const forbidden = await requireRole(["superadmin"]); if (forbidden) return forbidden;
  return Response.json({ error: "Master Stok Opname disembunyikan dari aplikasi." }, { status: 410 });
}

export async function DELETE(req: NextRequest) {
  const denied = requireSameOrigin(req); if (denied) return denied;
  const forbidden = await requireRole(["superadmin"]); if (forbidden) return forbidden;
  return Response.json({ error: "Master Stok Opname disembunyikan dari aplikasi." }, { status: 410 });
}
