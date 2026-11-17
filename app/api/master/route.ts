import { type NextRequest } from "next/server";
import { requireRole, requireSameOrigin } from "@/lib/authorize";
import { deleteMasterRecord, getMasterRecords, saveMasterRecord } from "@/lib/master";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  return Response.json({ error: error instanceof Error ? error.message : "Permintaan gagal." }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic"]); if (forbidden) return forbidden;
  return Response.json(await getMasterRecords(), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic"]); if (forbidden) return forbidden;
  try {
    const body = await req.json();
    if (body.kind !== "employee") throw new Error("Akses hanya diizinkan untuk data karyawan.");
    return Response.json(await saveMasterRecord(body.kind, null, body.value));
  } catch (error) { return errorResponse(error); }
}

export async function PUT(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic"]); if (forbidden) return forbidden;
  try {
    const body = await req.json();
    if (body.kind !== "employee") throw new Error("Akses hanya diizinkan untuk data karyawan.");
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID tidak valid.");
    return Response.json(await saveMasterRecord(body.kind, id, body.value));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["superadmin"]); if (forbidden) return forbidden;
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID karyawan tidak valid.");
    return Response.json(await deleteMasterRecord(body.kind, id));
  } catch (error) { return errorResponse(error); }
}
