import { db, pool, schema } from "@/db";
import { hashPassword } from "@/lib/password";
import { isAppRole, roles } from "@/lib/auth-roles";
import { eq } from "drizzle-orm";

async function main() {
  const [rawUsername, rawRole, ...rawName] = process.argv.slice(2);
  const username = rawUsername?.trim().toLowerCase() ?? "";
  const password = process.env.PPIC_USER_PASSWORD ?? "";
  const role = rawRole ?? "";
  const name = rawName.join(" ").trim();
  if (!/^[a-z0-9._-]{3,50}$/.test(username) || !name || !isAppRole(role)) {
    throw new Error(`Cara pakai: set PPIC_USER_PASSWORD terlebih dahulu, lalu npm run user:create -- <username> <${roles.join("|")}> <nama lengkap>`);
  }
  const [existing] = await db.select({ id: schema.appUser.id }).from(schema.appUser).where(eq(schema.appUser.username, username)).limit(1);
  if (existing) throw new Error("Username sudah terdaftar.");
  await db.insert(schema.appUser).values({ username, name, role, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() });
  console.info(`Akun ${username} dibuat dengan role ${role}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => pool.end());
