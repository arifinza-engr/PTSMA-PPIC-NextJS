import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireRole, requireSameOrigin } from "@/lib/authorize";
import { deleteProductionTarget, listProductionTargets, saveProductionTarget } from "@/lib/production-targets";

export const runtime = "nodejs";

function targetValue(body: unknown): unknown {
  if (body && typeof body === "object" && !Array.isArray(body) && "value" in body) {
    return body.value;
  }
  return body;
}

function failure(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  if (code === "42P01") {
    return Response.json({ error: "Tabel target belum tersedia. Jalankan npm run db:migrate pada database aplikasi." }, { status: 503 });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: error.issues.map((issue) => issue.message).join(" ") }, { status: 400 });
  }
  return Response.json({ error: error instanceof Error ? error.message : "Permintaan gagal." }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic"]);
  if (forbidden) return forbidden;
  try {
    return Response.json(await listProductionTargets(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic"]);
  if (forbidden) return forbidden;
  try {
    const body = await req.json();
    return Response.json(await saveProductionTarget(null, targetValue(body)));
  }
  catch (error) { return failure(error); }
}

export async function PUT(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic"]);
  if (forbidden) return forbidden;
  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID target tidak valid.");
    return Response.json(await saveProductionTarget(id, targetValue(body)));
  } catch (error) { return failure(error); }
}

export async function DELETE(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["ppic"]);
  if (forbidden) return forbidden;
  try {
    const id = Number((await req.json()).id);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID target tidak valid.");
    return Response.json(await deleteProductionTarget(id));
  } catch (error) { return failure(error); }
}
