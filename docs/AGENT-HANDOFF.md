# Handoff konteks untuk agent

> Ringkasan percakapan dan status repo per 14 November 2026. Ini bukan transkrip verbatim. Jangan menaruh kredensial, token, password, atau URL koneksi rahasia di dokumen ini.

## Repo dan status kerja

- Workspace: repo Next.js `web-upgrade-16.4.2` di komputer Windows pengguna.
- Branch aktif: `feature/operator-perbantuan-lini`.
- Banyak perubahan fitur masih belum di-commit. Belum ada push atau deploy dari pekerjaan terbaru.
- Database yang disentuh selama pekerjaan master adalah database lokal `ppic` di PostgreSQL lokal. Database VPS tidak disentuh oleh migrasi ini.
- Migrasi lokal sampai dengan `0016_minor_northstar.sql` berhasil dijalankan. Seed master stok yang dimasukkan berisi 27 kombinasi valid.
- `npm run typecheck` berhasil setelah pembersihan file statis terakhir. Build sebelumnya berhasil sebelum pembersihan tersebut; pengguna lalu menjalankan build sendiri dan hasilnya sukses. Test tidak dijalankan.
- Aplikasi lokal dihentikan atas permintaan pengguna; port 3000 sudah dipastikan tidak memiliki listener pada saat itu. Pengguna kemudian menjalankan `npm run start`, tetapi membatalkannya. Jangan mengasumsikan app atau tunnel masih hidup.

## Keputusan produk dan data

- Produk saat ini tetap dibatasi ke tiga kode: `brakeshoe`, `discpad`, dan `handle`.
- Master produk dan konfigurasi lini/opsi produksinya sekarang dibaca dari tabel `production_product_master`. Struktur lini dan opsi disimpan sebagai JSONB di setiap produk, bukan sebagai tabel lini dan opsi yang dinormalisasi.
- Master stok opname sekarang ada di tabel `stock_opname_master`; entri bisa diaktifkan/nonaktifkan dan item historis tetap bisa dipakai membaca laporan.
- Target produksi, karyawan, pengguna, laporan produksi, dan stok opname juga memakai data database.
- Aturan proses khusus masih berada di kode, termasuk penanganan `PACKING`, `PAINTING`, `PRESS CETAK`, metrik casting/SHOT, serta tipe produk. Jangan menyebut seluruh perilaku aplikasi sudah bebas hardcode.
- File hardcode lama `lib/form-options.ts` dan `lib/stock-options.json` telah dihapus. Test `tests/lib/operations.test.ts` kini mengambil kombinasi stok dari database. Migration seed tetap dipertahankan sebagai riwayat dan bootstrap database.
- Jangan menghapus file migrasi lama atau mengubah urutan/journal Drizzle tanpa memeriksa database target. Migration lokal dan VPS harus disejajarkan; isi data VPS tetap terpisah dan tidak boleh ditimpa oleh seed.

## Fitur yang sudah dikerjakan di branch

- Operator perbantuan lini lain disimpan sebagai snapshot operator di data produksi; pencarian operator perbantuan tersedia dan pada lini target per-orang operator asli tidak wajib dipilih.
- Hasil produksi membedakan baris operator perbantuan dengan warna/badge.
- Handle `ALODINE & BARREL` adalah lini tim, seperti proses tim terkait.
- Hasil produksi/Excel memiliki kolom target master dan target per jam.
- Edit master administrasi menggunakan modal; aksi hapus/deaktivasi ditambahkan untuk data terkait.
- Master Produk & Lini tersedia di `/master/produksi`; Master Stok Opname tersedia di `/master/stok-opname`.
- Referensi awal untuk fitur perbantuan adalah migration `0013_production_assisted_operators.sql`; master produk ada di `0014`/`0015`; master stok di `0016`.

## Status

- Isu menu yang sempat dilaporkan pengguna sudah clear dan dinyatakan benar. Tidak perlu diselidiki ulang tanpa laporan baru.
- `AUTH_TRUST_HOST=true` dan `AUTH_URL` terkonfigurasi di `.env.production.local`. Jangan menampilkan nilai rahasia environment saat diagnosis.
- Catatan historis `docs/rekonsiliasi-data.md` menyebut data pemulihan historis yang ambigu; jangan mengarang/menautkan data historis tanpa sumber valid.

## Refactor konfigurasi lini terbaru

- Migration lokal `0017_dynamic_line_rules.sql` dan `0018_positive_total_rule.sql` menambah konfigurasi JSONB untuk kolom A/B, total produksi, syarat total positif, proses, Shot/Set/PCS/KG, dan metrik target. Migration `0020` menambah faktor PCS per SET, sedangkan `0021` menyimpan kapasitas shot. Semuanya sudah dijalankan pada database lokal.
- Form produksi, validasi submit, pemformatan laporan, target, dan metrik dashboard kini membaca aturan tersebut dari master. `Packing`/`Painting`/`Press Cetak` tidak lagi dikenali lewat nama lini pada jalur form/laporan/target utama.
- Master admin menyediakan kontrol untuk flags lini, metrik target, dan daftar proses. Validasi mencegah kombinasi yang belum didukung oleh jenis tabel produk saat ini.
- Sisa branching berdasarkan `brakeshoe`/`discpad`/`handle` tetap ada karena tiga jenis produk memiliki bentuk item dan tabel laporan berbeda. Itu batas struktur data sekarang, bukan daftar opsi operasional yang tidak diperlukan.
- Konversi PCS ke SET dan persentase Shot casting juga mengikuti nilai konfigurasi master. Label produk di filter hasil produksi ikut membaca master.
- Pemeriksaan terakhir: `npm run typecheck` dan `npm run build` sukses. Tidak menjalankan suite test. VPS belum disentuh dan tidak ada push/deploy.

## Panduan lanjut

- Baca `AGENTS.md` lokal sebelum mengubah kode. Proyek ini memakai Next.js 16.4.2 dengan aturan proyek yang meminta membaca panduan terkait di `node_modules/next/dist/docs/` sebelum menulis kode Next.js.
- Jangan push ke `main`, ubah visibility repo, deploy, atau mengubah database VPS kecuali diminta secara eksplisit.
- Jangan menyalin rahasia yang pernah muncul di percakapan lama ke file handoff, log, commit, atau balasan.
