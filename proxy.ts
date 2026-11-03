import { NextResponse } from "next/server";
import { auth } from "./auth";

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  if (!request.auth && pathname !== "/login" && pathname !== "/setup") {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  if (request.auth && (pathname === "/login" || pathname === "/setup")) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
});

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
