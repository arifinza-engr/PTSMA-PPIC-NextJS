# PPIC Sinar Mas Autopart

Aplikasi internal untuk laporan produksi Brakeshoe, Discpad, dan Handle, stok opname, serta pengajuan lembur. Dibangun dengan Next.js 16, Drizzle ORM, dan PostgreSQL.

## Persiapan lokal

1. Pasang dependensi: `npm ci`.
2. Salin `.env.example` menjadi `.env.local` dan isi `AUTH_SECRET` dengan nilai acak yang kuat. Pada workspace yang sudah disiapkan, `.env.local` sudah berisi kredensial lokal dan diabaikan Git.
3. Jalankan PostgreSQL dan isi `DATABASE_URL` pada `.env.local` dengan connection string database.
4. Terapkan skema dengan `npm run db:migrate`.
5. Jalankan `npm run dev` dan buka `http://localhost:3000`.

Database PostgreSQL lokal sudah berisi seluruh data aplikasi dengan ID dan relasi yang dipertahankan.

## Konfigurasi

| Variabel | Kegunaan |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL (`postgresql://user:password@host:5432/database`). |
| `AUTH_SECRET` | Kunci acak untuk menandatangani sesi Auth.js. |
| `PG_SSL` | Set `true` bila server PostgreSQL mewajibkan TLS. |
| `PG_POOL_MAX` | Maksimum koneksi pool aplikasi. Bawaan: `10`. |
| `PG_BACKUP_DIR` | Direktori backup hasil `pg_dump`. Bawaan: `../db/backups`. |
| `LEMBUR_STORAGE_DIR` | Direktori privat yang persisten untuk bukti lembur. Bawaan: `storage/lembur`. |
| `DISCPAD_XLSX` | Path sumber Excel untuk pemulihan data historis Discpad. Bawaan: `../DATA DISCPAD.xlsx`. |

Jalankan `npm run db:backup` secara berkala; perintah ini membutuhkan `pg_dump` dari PostgreSQL client tools di PATH. Cadangkan database PostgreSQL dan direktori bukti lembur bersama-sama. Kredensial dan file `.env.local` tidak boleh disimpan di Git.

## Pemulihan data historis

Migrasi skema berikutnya dibuat dengan `npm run db:generate`, ditinjau di `drizzle-postgres/`, lalu diterapkan menggunakan `npm run db:migrate`.

```bash
npm run db:generate
npm run db:migrate
```

Importer menyalin baris apa adanya dan tidak menjalankan pemulihan historis otomatis. Data lama masih mengandung relasi yang tidak dapat ditentukan dengan aman: **35.176 item produksi** belum punya produk master yang cocok, **3 pengajuan lembur** belum punya pasangan karyawan/divisi yang pasti, dan **82 header produksi** tidak memiliki operator historis. Rincian tersedia di [docs/rekonsiliasi-data.md](docs/rekonsiliasi-data.md).

## Hak akses dan fitur

Seluruh halaman operasional dan endpoint data memerlukan sesi login. Izin perubahan juga diperiksa kembali pada server berdasarkan role akun.

## Pemeriksaan

```bash
npm run check    # TypeScript, ESLint, unit test
npm run build    # Build produksi
npm run e2e      # Alur browser di database salinan sementara
```

Vitest memerlukan `TEST_DATABASE_URL`; Playwright memerlukan `E2E_DATABASE_URL`. Keduanya harus menunjuk database PostgreSQL khusus, bukan database aplikasi. Tes login Playwright menggunakan akun yang ada pada database E2E melalui `E2E_ADMIN_USERNAME` dan `E2E_ADMIN_PASSWORD`; tanpa keduanya, tes login dilewati.
## Autentikasi dan akses peran

Autentikasi memakai Auth.js / NextAuth Credentials dan akun PostgreSQL. Setelah mengisi `DATABASE_URL` dan `AUTH_SECRET` di `.env.local`, jalankan migrasi:

```powershell
npm run db:migrate
```

Buat akun superadmin pertama. Password dibaca dari environment agar tidak tercatat sebagai argumen proses:

```powershell
$env:PPIC_USER_PASSWORD = "password-kuat-minimal-12-karakter"
npm run user:create -- admin superadmin "Administrator PPIC"
Remove-Item Env:PPIC_USER_PASSWORD
```

Setelah masuk sebagai superadmin, akun dan role lain dapat dikelola melalui menu **Pengguna**. Role yang tersedia: `pimpinan`, `ppic`, `qc`, `leader_spv`, `hrd`, `superadmin`.

Hak akses utama: Leader / SPV menginput produksi, stok, dan pengajuan lembur; PPIC dan QC mengoreksi atau menghapus laporan produksi dan stok; HRD menyetujui atau menolak lembur; Pimpinan memiliki akses baca; Superadmin dapat mengakses seluruh fitur dan mengelola akun.
