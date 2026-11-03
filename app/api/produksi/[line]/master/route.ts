import { type NextRequest } from "next/server";
import { getMaster, type Line } from "@/lib/produksi";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ line: string }> },
) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(allRoles); if (forbidden) return forbidden;
  const { line } = await params;
  const divisi = req.nextUrl.searchParams.get("divisi") ?? undefined;
  try {
    return Response.json(await getMaster(line as Line, divisi));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
