import { type NextRequest } from "next/server";
import { getProductionData, getMaster, type Line } from "@/lib/produksi";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";

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
    // Ambil lini dari params atau dari master.
    let lini = sp.get("lini");
    if (!lini) {
      const options = (await getMaster(line)).liniOptions;
      if (options.length > 0) lini = options[0];
    }
    const result = await getProductionData(line as Line, {
      lini,
      from: sp.get("from"),
      to: sp.get("to"),
      limit: sp.has("limit") ? sp.get("limit") : undefined,
    });

    return Response.json({
      ...result,
      lini: lini || null,
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
