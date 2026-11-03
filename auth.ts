import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { verifyPassword } from "@/lib/password";
import { isAppRole } from "@/lib/auth-roles";

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [Credentials({
    credentials: {
      username: { label: "Nama pengguna", type: "text" },
      password: { label: "Kata sandi", type: "password" },
    },
    async authorize(credentials) {
      const username = typeof credentials.username === "string" ? credentials.username.trim().toLowerCase() : "";
      const password = typeof credentials.password === "string" ? credentials.password : "";
      if (!username || !password) return null;
      const [user] = await db.select().from(schema.appUser).where(eq(schema.appUser.username, username)).limit(1);
      if (!user || user.isActive !== 1 || !isAppRole(user.role)) return null;
      if (!(await verifyPassword(password, user.passwordHash))) return null;
      return { id: String(user.id), name: user.name, username: user.username, role: user.role };
    },
  })],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as typeof user & { role?: string }).role;
        token.username = (user as typeof user & { username?: string }).username;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? "");
        session.user.role = isAppRole(token.role) ? token.role : "pimpinan";
        session.user.username = String(token.username ?? "");
      }
      return session;
    },
  },
});
