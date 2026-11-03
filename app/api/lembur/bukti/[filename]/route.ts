import { readFile } from "node:fs/promises";
import { type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lembur } from "@/db/schema";
import { allRoles, requireRole, requireSameOrigin } from "@/lib/authorize";
import { getBuktiPath } from "@/lib/lembur-upload";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const denied = requireSameOrigin(req);
  if (denied) return denied;
  const forbidden = await requireRole(allRoles); if (forbidden) return forbidden;
  const { filename } = await params;
  try {
    const url = `/api/lembur/bukti/${filename}`;
    const [record] = await db.select({ id: lembur.id }).from(lembur).where(eq(lembur.buktiUrl, url));
    if (!record) return Response.json({ error: "Bukti tidak ditemukan." }, { status: 404 });
    const bytes = await readFile(getBuktiPath(filename));
    const type = filename.endsWith(".pdf") ? "application/pdf" :
      filename.endsWith(".png") ? "image/png" : filename.endsWith(".gif") ? "image/gif" :
      filename.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(bytes, { headers: {
      "Content-Type": type, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    } });
  } catch {
    return Response.json({ error: "Bukti tidak ditemukan." }, { status: 404 });
  }
}
