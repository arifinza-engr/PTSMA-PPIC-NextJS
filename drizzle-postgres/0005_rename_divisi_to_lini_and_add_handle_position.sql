ALTER TABLE "divisi" RENAME TO "lini";
ALTER TABLE "lini" RENAME CONSTRAINT "divisi_pkey" TO "lini_pkey";
ALTER SEQUENCE "divisi_id_seq" RENAME TO "lini_id_seq";
ALTER TABLE "lini" RENAME CONSTRAINT "divisi_jenis_produk_id_jenis_produk_id_fk" TO "lini_jenis_produk_id_jenis_produk_id_fk";
ALTER TABLE "karyawan" RENAME COLUMN "divisi_id" TO "lini_id";
ALTER TABLE "karyawan" RENAME CONSTRAINT "karyawan_divisi_id_divisi_id_fk" TO "karyawan_lini_id_lini_id_fk";
ALTER INDEX "idx_karyawan_divisi" RENAME TO "idx_karyawan_lini";
ALTER TABLE "produksi" RENAME COLUMN "divisi_id" TO "lini_id";
ALTER TABLE "produksi" RENAME CONSTRAINT "produksi_divisi_id_divisi_id_fk" TO "produksi_lini_id_lini_id_fk";
ALTER INDEX "idx_produksi_divisi" RENAME TO "idx_produksi_lini";
ALTER TABLE "lembur" RENAME COLUMN "divisi_id" TO "lini_id";
ALTER TABLE "lembur" RENAME COLUMN "divisi" TO "lini";
ALTER TABLE "lembur" RENAME CONSTRAINT "lembur_divisi_id_divisi_id_fk" TO "lembur_lini_id_lini_id_fk";
ALTER TABLE "produksi_item" RENAME COLUMN "nama_barang" TO "type_handle";
ALTER TABLE "produksi_item" ADD COLUMN "posisi_handle" text;
UPDATE "produksi_item" AS item
SET "type_handle" = item."type"
FROM "produksi" AS report
JOIN "jenis_produk" AS product_type ON product_type."id" = report."jenis_produk_id"
JOIN "lini" AS process_line ON process_line."id" = report."lini_id"
WHERE item."produksi_id" = report."id"
  AND product_type."nama" = 'handle'
  AND process_line."nama" = 'CASTING'
  AND item."type_handle" IS NULL;
