import { NextResponse } from "next/server";
import { auth } from "./auth";

export default auth((request) => {
  const { pathname, searchParams } = request.nextUrl;
  if (!request.auth && pathname !== "/login" && pathname !== "/setup") {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  if (request.auth && (pathname === "/login" || pathname === "/setup")) return NextResponse.redirect(new URL("/", request.url));
  if (request.auth) {
    const role = request.auth.user.role;
    const canInput = role === "leader_spv" || role === "superadmin";
    const canCorrectProduction = role === "ppic" || role === "qc" || role === "superadmin";
    const canCorrectStock = canCorrectProduction;
    const canManage = role === "superadmin";
    const canManageTargets = canManage || role === "ppic";
    const canReviewOvertime = role === "hrd" || role === "pimpinan" || role === "superadmin";
    const isProductionForm = pathname.startsWith("/produksi/") && !/^\/produksi\/[^/]+\/view\/?$/.test(pathname);
    const isProductionEdit = isProductionForm && /^\d+$/.test(searchParams.get("edit") ?? "");
    const isStockOpname = pathname === "/stok-opname" || pathname.startsWith("/stok-opname/");
    const isOvertimeSubmission = pathname === "/lembur" || pathname.startsWith("/lembur/") && pathname !== "/lembur/daftar";
    const isOvertimeList = pathname === "/lembur/daftar";
    const isMaster = pathname === "/master" || pathname.startsWith("/master/");
    const isTargetMaster = pathname === "/target-produksi" || pathname.startsWith("/target-produksi/");
    const isUserAdmin = pathname === "/pengguna" || pathname.startsWith("/pengguna/");
    if ((isProductionForm && !(canInput || (canCorrectProduction && isProductionEdit))) || (isStockOpname && !(canInput || canCorrectStock)) || (isOvertimeSubmission && !canInput)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (isOvertimeList && !canReviewOvertime) return NextResponse.redirect(new URL("/", request.url));
    if (((isMaster || isUserAdmin) && !canManage) || (isTargetMaster && !canManageTargets)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  return NextResponse.next();
});

export const config = { matcher: ["/((?!api|_next/static|_next/image|.*\\.[^/]+$).*)"] };
