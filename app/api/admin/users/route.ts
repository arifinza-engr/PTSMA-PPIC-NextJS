import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { isAppRole } from "@/lib/auth-roles";
import { hashPassword } from "@/lib/password";
import { requireSameOrigin } from "@/lib/authorize";
import { type NextRequest } from "next/server";

async function allowed() {
  const session = await auth();
  if (!session) return null;
  const [account] = await db.select({ role: schema.appUser.role, isActive: schema.appUser.isActive }).from(schema.appUser).where(eq(schema.appUser.id, Number(session.user.id))).limit(1);
  return account?.isActive === 1 && account.role === "superadmin" ? session : null;
}

export async function GET() {
  if (!(await allowed())) return Response.json({ error: "Akses ditolak." }, { status: 403 });
  const users = await db.select({ id: schema.appUser.id, username: schema.appUser.username, name: schema.appUser.name, role: schema.appUser.role, isActive: schema.appUser.isActive, createdAt: schema.appUser.createdAt }).from(schema.appUser).orderBy(asc(schema.appUser.name));
  return Response.json(users, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied;
  const session = await allowed();
  if (!session) return Response.json({ error: "Akses ditolak." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-z0-9._-]{3,50}$/.test(username)) throw new Error("Username harus 3–50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.");
    if (!name || name.length > 120) throw new Error("Nama wajib diisi (maksimal 120 karakter).");
    if (!isAppRole(body.role)) throw new Error("Role tidak valid.");
    const [existing] = await db.select({ id: schema.appUser.id }).from(schema.appUser).where(eq(schema.appUser.username, username)).limit(1);
    if (existing) throw new Error("Username sudah digunakan.");
    const [created] = await db.insert(schema.appUser).values({ username, name, role: body.role, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() }).returning({ id: schema.appUser.id, username: schema.appUser.username, name: schema.appUser.name, role: schema.appUser.role, isActive: schema.appUser.isActive });
    return Response.json(created, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal membuat akun." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied;
  const session = await allowed();
  if (!session) return Response.json({ error: "Akses ditolak." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID akun tidak valid.");
    if (String(id) === session.user.id && body.isActive === 0) throw new Error("Akun yang sedang digunakan tidak dapat dinonaktifkan.");
    const update: Partial<typeof schema.appUser.$inferInsert> = {};
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > 120) throw new Error("Nama wajib diisi (maksimal 120 karakter).");
      update.name = name;
    }
    if (typeof body.username === "string") {
      const username = body.username.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,50}$/.test(username)) throw new Error("Username harus 3–50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.");
      const [existing] = await db.select({ id: schema.appUser.id }).from(schema.appUser).where(eq(schema.appUser.username, username)).limit(1);
      if (existing && existing.id !== id) throw new Error("Username sudah digunakan.");
      update.username = username;
    }
    if (isAppRole(body.role)) update.role = body.role;
    if (body.isActive === 0 || body.isActive === 1) update.isActive = body.isActive;
    if (typeof body.password === "string" && body.password.length) update.passwordHash = await hashPassword(body.password);
    if (!Object.keys(update).length) throw new Error("Tidak ada perubahan yang dikirim.");
    const [updated] = await db.update(schema.appUser).set(update).where(eq(schema.appUser.id, id)).returning({ id: schema.appUser.id, username: schema.appUser.username, name: schema.appUser.name, role: schema.appUser.role, isActive: schema.appUser.isActive });
    if (!updated) throw new Error("Akun tidak ditemukan.");
    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal memperbarui akun." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied;
  const session = await allowed();
  if (!session) return Response.json({ error: "Akses ditolak." }, { status: 403 });
  try {
    const body = await request.json() as { id?: unknown };
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID akun tidak valid.");
    if (String(id) === session.user.id) throw new Error("Akun yang sedang digunakan tidak dapat dihapus.");
    await db.delete(schema.appUser).where(eq(schema.appUser.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal menghapus akun." }, { status: 400 });
  }
}
