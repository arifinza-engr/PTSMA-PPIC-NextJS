import "next-auth";
import "next-auth/jwt";
import type { AppRole } from "@/lib/auth-roles";

declare module "next-auth" {
  interface User { role: AppRole; username: string; }
  interface Session { user: { id: string; role: AppRole; username: string } & NonNullable<Session["user"]>; }
}

declare module "next-auth/jwt" {
  interface JWT { userId?: string; role?: string; username?: string; }
}
