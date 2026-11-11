import { type NextRequest } from "next/server";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";
import { getTargetPerformance } from "@/lib/production-targets";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(allRoles);
  if (forbidden) return forbidden;
  const params = req.nextUrl.searchParams;
  try {
    const mode = params.get("mode");
    if (mode === "day") {
      return Response.json(await getTargetPerformance({ mode, date: params.get("date") ?? "" }));
    }
    if (mode === "month") {
      return Response.json(await getTargetPerformance({ mode, month: params.get("month") ?? "" }));
    }
    return Response.json({ error: "Periode laporan tidak valid." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal memuat laporan target." }, { status: 400 });
  }
}
