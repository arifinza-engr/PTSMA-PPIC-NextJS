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
    const canManage = role === "superadmin";
    const canManageEmployees = canManage || role === "ppic";
    const canManageTargets = canManage || role === "ppic";
    const isProductionForm = pathname.startsWith("/produksi/") && !/^\/produksi\/[^/]+\/view\/?$/.test(pathname);
    const isProductionEdit = isProductionForm && /^\d+$/.test(searchParams.get("edit") ?? "");
    const isArchivedStockFeature = pathname === "/stok-opname" || pathname.startsWith("/stok-opname/")
      || pathname === "/master/stok-opname" || pathname.startsWith("/master/stok-opname/");
    const isArchivedOvertimeSubmission = pathname === "/lembur";
    const isArchivedOvertimeList = pathname === "/lembur/daftar";
    const isEmployeeMaster = pathname === "/master";
    const isRestrictedMaster = pathname.startsWith("/master/");
    const isTargetMaster = pathname === "/target-produksi" || pathname.startsWith("/target-produksi/");
    const isUserAdmin = pathname === "/pengguna" || pathname.startsWith("/pengguna/");
    if (isArchivedStockFeature || isArchivedOvertimeSubmission || isArchivedOvertimeList
      || (isProductionForm && !(canInput || (canCorrectProduction && isProductionEdit)))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if ((isEmployeeMaster && !canManageEmployees) || ((isRestrictedMaster || isUserAdmin) && !canManage) || (isTargetMaster && !canManageTargets)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  return NextResponse.next();
});

export const config = { matcher: ["/((?!api|_next/static|_next/image|.*\\.[^/]+$).*)"] };
