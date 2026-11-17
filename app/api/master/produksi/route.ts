import { type NextRequest } from "next/server";
import { requireRole, requireSameOrigin } from "@/lib/authorize";
import { getProductionMaster, saveProductionProductMaster } from "@/lib/production-master";
import { PRODUCT_CODES } from "@/lib/production-master-types";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  return Response.json({ error: error instanceof Error ? error.message : "Permintaan gagal." }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["leader_spv", "ppic", "qc", "hrd", "pimpinan", "superadmin"]);
  if (forbidden) return forbidden;
  try {
    return Response.json(await getProductionMaster(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["superadmin"]);
  if (forbidden) return forbidden;
  try {
    const body = await req.json() as { kode?: unknown; value?: unknown };
    if (typeof body.kode !== "string" || !(PRODUCT_CODES as readonly string[]).includes(body.kode)) throw new Error("Kode produk tidak dikenal.");
    return Response.json(await saveProductionProductMaster(body.kode, body.value));
  } catch (error) { return errorResponse(error); }
}
