import { getLemburOptions } from "@/lib/lembur";
import { type NextRequest } from "next/server";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";

export async function GET(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(allRoles); if (forbidden) return forbidden;
  try {
    return Response.json(await getLemburOptions());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
