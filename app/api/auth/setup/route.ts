import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { type NextRequest } from "next/server";
import { pool, schema } from "@/db";
import { hashPassword } from "@/lib/password";
import { requireSameOrigin } from "@/lib/authorize";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const denied = requireSameOrigin(request); if (denied) return denied;
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || name.length > 120) throw new Error("Nama wajib diisi (maksimal 120 karakter).");
    if (!/^[a-z0-9._-]{3,50}$/.test(username)) throw new Error("Username harus 3–50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.");
    const passwordHash = await hashPassword(password);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query('LOCK TABLE "app_user" IN EXCLUSIVE MODE');
      const tx = drizzle(client, { schema });
      const [{ total }] = await tx.select({ total: count() }).from(schema.appUser);
      if (total > 0) throw new Error("Setup sudah ditutup karena akun sudah tersedia.");
      await tx.insert(schema.appUser).values({ username, name, passwordHash, role: "superadmin", createdAt: new Date().toISOString() });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal membuat akun administrator." }, { status: 400 });
  }
}
