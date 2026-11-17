"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { isAppRole, roleLabels } from "@/lib/auth-roles";
import { Button } from "@/components/ui/button";
import type { ProductionProductMaster } from "@/lib/production-master-types";
import {
  BsClipboardCheck,
  BsBoxArrowRight, BsGrid, BsList, BsPeople, BsTable, BsX,
} from "react-icons/bs";

const groups = [
  { label: "Ruang kerja", links: [
    { href: "/", label: "Ringkasan", icon: BsGrid, exact: true },
  ] },
  { label: "Pencatatan", links: [
  ] },
  { label: "Pemantauan", links: [
    { href: "/hasil-produksi", label: "Hasil Produksi", icon: BsTable },
  ] },
];

const adminLinks = [
  { href: "/master", label: "Master Karyawan", icon: BsPeople, exact: true },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [productionProducts, setProductionProducts] = useState<ProductionProductMaster[]>([]);
  const { data: session } = useSession();
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/master/produksi").then(async (response) => {
      if (response.ok) setProductionProducts(await response.json());
    }).catch(() => undefined);
  }, [session?.user]);
  if (pathname === "/login") return null;
  const role: unknown = session?.user.role;
  const canInput = role === "leader_spv" || role === "superadmin";
  const canManage = role === "superadmin";
  const canManageEmployees = canManage || role === "ppic";
  const canManageTargets = canManage || role === "ppic";

  const renderLink = (link: { href: string; label: string; icon: typeof BsGrid; exact?: boolean }) => {
    const active = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
    const Icon = link.icon;
    return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
      onClick={() => setOpen(false)} className={`nav-link${active ? " active" : ""}`}>
      <Icon aria-hidden="true" size={17} />
      <span>{link.label}</span>
    </Link>;
  };

  return <>
    <header className="mobile-topbar">
      <Link href="/" className="brand-mark" aria-label="PPIC Autopart, ke ringkasan">
        <Image className="brand-symbol" src="/LOGO-PTSMA-NOBG.png" alt="" width={42} height={42} priority />
        <span className="brand-copy"><strong>PPIC Autopart</strong><small>Operations</small></span>
      </Link>
      <button type="button" className="menu-toggle" aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open} aria-controls="app-navigation" onClick={() => setOpen(value => !value)}>
        {open ? <BsX size={23} /> : <BsList size={23} />}
      </button>
    </header>
    {open && <button type="button" className="nav-overlay" aria-label="Tutup menu navigasi" onClick={() => setOpen(false)} />}
    <nav id="app-navigation" className={`app-nav${open ? " is-open" : ""}`} aria-label="Navigasi utama">
      <div className="sidebar-top">
        <Link href="/" onClick={() => setOpen(false)} className="brand-mark" aria-label="PPIC Autopart, ke ringkasan">
          <Image className="brand-symbol" src="/LOGO-PTSMA-NOBG.png" alt="" width={42} height={42} priority />
          <span className="brand-copy"><strong>PPIC Autopart</strong><small>Operations workspace</small></span>
        </Link>
        <div className="workspace-tag"><span className="status-dot" /> Sistem operasional aktif</div>
      </div>
      <div className="nav-scroll">
        {groups.map(group => {
          const visibleLinks = group.links.filter(link => {
            return true;
          });
          const productionLinks = group.label === "Pencatatan" && canInput
            ? productionProducts.map((product) => ({ href: `/produksi/${product.kode}`, label: product.nama, icon: BsClipboardCheck }))
            : [];
          const links = [...productionLinks, ...visibleLinks];
          return links.length ? <section key={group.label} className="nav-group" aria-label={group.label}>
            <h2>{group.label}</h2>
            {links.map(renderLink)}
          </section> : null;
        })}
        <section className="nav-group" aria-label="Administrasi">
          {(canManageEmployees || canManage || canManageTargets) && <><h2>Administrasi</h2>
          {canManageEmployees && renderLink(adminLinks[0])}
          {canManage && renderLink({ href: "/master/produksi", label: "Master Produk & Lini", icon: BsTable })}
          {canManageTargets && renderLink({ href: "/target-produksi", label: "Target Produksi", icon: BsTable })}
          {canManage && renderLink({ href: "/pengguna", label: "Pengguna", icon: BsPeople })}</>}
        </section>
      </div>
      <div className="sidebar-footer">
        <div className="profile-chip"><span className="profile-avatar">PA</span>
          <span><strong>{session?.user.name ?? "Pengguna"}</strong><small>{isAppRole(role) ? roleLabels[role] : ""}</small></span>
        </div>
        <Button type="button" variant="destructive" className="mt-3 w-full justify-center" onClick={() => signOut({ callbackUrl: "/login" })}>
          <BsBoxArrowRight aria-hidden="true" size={17} />
          <span>Log Out</span>
        </Button>
      </div>
    </nav>
  </>;
}
