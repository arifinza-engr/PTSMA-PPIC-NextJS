import { type NextRequest } from "next/server";
import { getStokOpnamePreview } from "@/lib/stok-opname";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";

export async function GET(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(allRoles); if (forbidden) return forbidden;
  const sp = req.nextUrl.searchParams;
  try {
    return Response.json(
      await getStokOpnamePreview({ bulan: sp.get("month"), tahun: sp.get("year") }),
    );
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["leader_spv"]); if (forbidden) return forbidden;
  return Response.json({ error: "Fitur Stok Opname disembunyikan dari aplikasi." }, { status: 410 });
}
