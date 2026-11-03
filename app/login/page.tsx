import Link from "next/link";
import Image from "next/image";
import { count } from "drizzle-orm";
import { db, schema } from "@/db";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const [{ total }] = await db.select({ total: count() }).from(schema.appUser);

  return (
    <section className="login-page" aria-label="Masuk ke sistem produksi">
      <div className="login-shell">
        <aside className="login-context" aria-labelledby="login-company-title">
          <header className="login-company">
            <Image className="login-brand-mark" src="/LOGO-PTSMA-NOBG.png" alt="" width={45} height={45} priority />
            <span className="login-company-name">
              <strong id="login-company-title">PT Sinar Mas Autopart</strong>
              <small>PPIC · SISTEM INFORMASI PRODUKSI</small>
            </span>
          </header>

          <div className="login-intro">
            <p className="login-eyebrow">
              <span /> SISTEM INFORMASI PRODUKSI
            </p>
            <h1>
              Sistem informasi
              <br />
              <span>produksi.</span>
            </h1>
            <p className="login-lead">
              Aplikasi internal untuk pencatatan dan pemantauan data produksi
              PT Sinar Mas Autopart.
            </p>
          </div>

          <div className="login-production" aria-label="Produk yang dicatat">
            <div className="login-production-heading">
              <span>CAKUPAN PRODUKSI</span>
              <span className="login-production-rule" />
            </div>
            <ul>
              <li>
                <span className="login-product-code">01</span>
                <span>
                  <strong>Brakeshoe</strong>
                  <small>Komponen sistem rem</small>
                </span>
                <span className="login-product-state" aria-hidden="true" />
              </li>
              <li>
                <span className="login-product-code">02</span>
                <span>
                  <strong>Discpad</strong>
                  <small>Komponen sistem rem</small>
                </span>
                <span className="login-product-state" aria-hidden="true" />
              </li>
              <li>
                <span className="login-product-code">03</span>
                <span>
                  <strong>Handle</strong>
                  <small>Komponen kendali kendaraan</small>
                </span>
                <span className="login-product-state" aria-hidden="true" />
              </li>
            </ul>
          </div>

          <div className="login-context-foot">
            <span className="login-disc-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              Sistem internal PT Sinar Mas Autopart.
            </span>
          </div>
          <div className="login-coordinate" aria-hidden="true">
            SMA · PPIC / 01
          </div>
        </aside>

        <section className="login-access" aria-labelledby="login-heading">
          <div className="login-access-top">
            <span className="login-access-label">AKSES KARYAWAN</span>
            <span className="login-secure-mark">
              <span aria-hidden="true">●</span> SISTEM INTERNAL
            </span>
          </div>
          <div className="login-access-content">
            <div className="login-mobile-brand" aria-hidden="true">
              PT SINAR MAS AUTOPART <span>· PPIC</span>
            </div>
            <p className="login-access-eyebrow">SISTEM INFORMASI PRODUKSI</p>
            <h2 id="login-heading">Masuk ke akun Anda</h2>
            <p className="login-access-copy">
              Masuk menggunakan akun perusahaan Anda untuk melanjutkan.
            </p>

            <LoginForm />

            {total === 0 && (
              <p className="login-setup-note">
                Akun administrator belum tersedia?{" "}
                <Link href="/setup">
                  Buat akun administrator <span aria-hidden="true">→</span>
                </Link>
              </p>
            )}
          </div>
          <footer className="login-access-foot">
            <span>© PT Sinar Mas Autopart</span>
            <span>Sistem Informasi Produksi</span>
          </footer>
        </section>
      </div>
    </section>
  );
}
