import { type NextRequest } from "next/server";
import { getProductionData, submitProduksi, type Line } from "@/lib/produksi";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";
import { lineSchema, parseProduction } from "@/lib/validation";

function err(e: unknown) {
  return Response.json({ error: (e as Error).message }, { status: 400 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ line: string }> },
) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(allRoles); if (forbidden) return forbidden;
  const { line } = await params;
  const sp = req.nextUrl.searchParams;
  try {
    return Response.json(
      await getProductionData(line as Line, {
        lini: sp.get("lini"),
        from: sp.get("from"),
        to: sp.get("to"),
        limit: sp.has("limit") ? sp.get("limit") : undefined,
      }),
    );
  } catch (e) {
    return err(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ line: string }> },
) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["leader_spv"]); if (forbidden) return forbidden;
  const { line } = await params;
  try {
    const body = parseProduction(await req.json());
    return Response.json(await submitProduksi(lineSchema.parse(line), body));
  } catch (e) {
    return err(e);
  }
}
