// API route untuk upload bukti lembur
// POST: upload file bukti lembur

import { type NextRequest } from "next/server";
import { requireRole, requireSameOrigin } from "@/lib/authorize";

export async function POST(req: NextRequest) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(["leader_spv"]); if (forbidden) return forbidden;
  return Response.json({ error: "Fitur pengajuan lembur disembunyikan dari aplikasi." }, { status: 410 });
}

// Max body size untuk file upload (10MB)
export const runtime = "nodejs";
export const maxDuration = 60;
