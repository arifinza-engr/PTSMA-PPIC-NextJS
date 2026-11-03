import { type NextRequest } from "next/server";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";
import { deleteProductionRecord, getProductionRecord, updateProductionRecord } from "@/lib/produksi";
import { lineSchema, parseProduction } from "@/lib/validation";

export const runtime = "nodejs";

function recordId(raw: string): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID laporan tidak valid.");
  return id;
}

function errorResponse(error: unknown) {
  return Response.json({ error: error instanceof Error ? error.message : "Permintaan gagal." }, { status: 400 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(allRoles); if (forbidden) return forbidden;
  try { return Response.json(await getProductionRecord(recordId((await params).id))); }
  catch (error) { return errorResponse(error); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic", "qc"]); if (forbidden) return forbidden;
  try {
    const id = recordId((await params).id);
    const record = await getProductionRecord(id);
    const line = lineSchema.parse(record.line);
    return Response.json(await updateProductionRecord(id, line, parseProduction(await req.json())));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic", "qc"]); if (forbidden) return forbidden;
  try { return Response.json(await deleteProductionRecord(recordId((await params).id))); }
  catch (error) { return errorResponse(error); }
}
