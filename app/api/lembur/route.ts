import { type NextRequest } from "next/server";
import { getLemburList, getLemburNamaByDivisi, submitLembur } from "@/lib/lembur";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";
import { parseOvertime } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const list = req.nextUrl.searchParams.get("list") === "1";
  const forbidden = await requireRole(list ? ["hrd", "pimpinan"] : allRoles); if (forbidden) return forbidden;
  const divisi = req.nextUrl.searchParams.get("divisi") ?? "";
  try {
    return Response.json(await (list ? getLemburList() : getLemburNamaByDivisi(divisi)));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["leader_spv"]); if (forbidden) return forbidden;
  try {
    const body = parseOvertime(await req.json());
    return Response.json(await submitLembur(body));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
