import { type NextRequest } from "next/server";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";
import { listStokOpname } from "@/lib/stok-opname";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(allRoles); if (forbidden) return forbidden;
  try {
    const month = Number(req.nextUrl.searchParams.get("month"));
    const year = Number(req.nextUrl.searchParams.get("year"));
    return Response.json(await listStokOpname(month, year));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal memuat stok." }, { status: 400 });
  }
}
