# Rekonsiliasi data historis yang membutuhkan sumber tambahan

Pemeriksaan pada database kanonik tanggal 27 Oktober 2026 menyisakan relasi yang tidak dapat disimpulkan dengan pasti. Skrip pemulihan sengaja tidak menebak nilainya.

## Produk: 35.176 item

Pada snapshot historis, katalog produk berisi 77 baris campuran. Sebanyak 20.376 item berhasil ditautkan ke tepat satu produk; 35.176 item lain belum memiliki pasangan tunggal. Baris terbanyak berasal dari Brakeshoe PER (7.269), BONDING (7.133), GERINDA (4.234), PACKING (2.920), STAMPING (2.478), ALODINE & BARREL (2.448), SPRAY (2.269), dan CASTING (1.722). Katalog operasional kini disimpan sebagai opsi statis aplikasi, bukan tabel master.

Angka ini menjelaskan relasi historis yang tidak dapat dipastikan. Jangan mengubah baris laporan lama tanpa sumber resmi yang cocok.

## Karyawan lembur: 3 pengajuan

| ID | Tanggal | Nama sumber | Divisi sumber |
| --- | --- | --- | --- |
| 1 | 2025-11-26 | M. ASROI | ALODINE |
| 2 | 2025-11-26 | ARDIYANTO | BARREL |
| 3 | 2025-11-26 | AGUS TRI AFIFUDIN | ALODINE & BARREL |

Tanggal telah dinormalisasi dan diaudit. `karyawan_id` tetap kosong karena kombinasi nama dan lini tersebut tidak memiliki pasangan pasti dalam roster aktif. Periksa roster periode November 2025 sebelum menghubungkan pengajuan.

## Operator produksi: 82 laporan

Laporan tanpa operator historis tersebar di Brakeshoe CASTING (27), PER (25), BONDING (18), GERINDA (10), SPRAY (1), dan Discpad GERINDA (1). Perlu sumber absensi atau sheet produksi asli untuk menentukan operator masing-masing laporan.

Cadangkan PostgreSQL sebelum rekonsiliasi. Jangan menghubungkan baris berdasarkan kemiripan nama saja; periksa identitas, divisi, dan periode kerja terlebih dahulu.
