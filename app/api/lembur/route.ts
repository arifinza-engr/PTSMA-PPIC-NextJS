import { type NextRequest } from "next/server";
import { getLemburList, getLemburNamaByLini } from "@/lib/lembur";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";

export async function GET(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const list = req.nextUrl.searchParams.get("list") === "1";
  const forbidden = await requireRole(list ? ["hrd", "pimpinan"] : allRoles); if (forbidden) return forbidden;
  const lini = req.nextUrl.searchParams.get("lini") ?? "";
  try {
    return Response.json(await (list ? getLemburList() : getLemburNamaByLini(lini)));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["leader_spv"]); if (forbidden) return forbidden;
  return Response.json({ error: "Fitur pengajuan lembur disembunyikan dari aplikasi." }, { status: 410 });
}
