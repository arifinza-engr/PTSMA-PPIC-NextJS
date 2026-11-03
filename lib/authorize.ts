import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import type { AppRole } from "@/lib/auth-roles";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export const allRoles: readonly AppRole[] = ["pimpinan", "ppic", "qc", "leader_spv", "hrd", "superadmin"];

export async function requireRole(allowed: readonly AppRole[]): Promise<Response | null> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  const [account] = await db.select({ role: schema.appUser.role, isActive: schema.appUser.isActive }).from(schema.appUser).where(eq(schema.appUser.id, Number(session.user.id))).limit(1);
  if (!account || account.isActive !== 1) return Response.json({ error: "Akun tidak aktif. Silakan hubungi administrator." }, { status: 401 });
  if (account.role !== "superadmin" && !allowed.includes(account.role as AppRole)) {
    return Response.json({ error: "Anda tidak memiliki akses untuk tindakan ini." }, { status: 403 });
  }
  return null;
}

export function sameRequestOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;
  try { return new URL(origin).origin === req.nextUrl.origin; }
  catch { return false; }
}

export function requireSameOrigin(req: NextRequest): Response | null {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (!sameRequestOrigin(req)) {
      return Response.json({ error: "Asal permintaan tidak valid." }, { status: 403 });
    }
  }
  return null;
}
