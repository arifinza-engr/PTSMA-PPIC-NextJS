ALTER TABLE "product_line" RENAME TO "jenis_produk";
ALTER TABLE "divisi" RENAME COLUMN "product_line_id" TO "jenis_produk_id";
ALTER TABLE "product" RENAME COLUMN "product_line_id" TO "jenis_produk_id";
ALTER TABLE "produksi" RENAME COLUMN "product_line_id" TO "jenis_produk_id";
ALTER TABLE "divisi" RENAME CONSTRAINT "divisi_product_line_id_product_line_id_fk" TO "divisi_jenis_produk_id_jenis_produk_id_fk";
ALTER TABLE "product" RENAME CONSTRAINT "product_product_line_id_product_line_id_fk" TO "product_jenis_produk_id_jenis_produk_id_fk";
ALTER TABLE "produksi" RENAME CONSTRAINT "produksi_product_line_id_product_line_id_fk" TO "produksi_jenis_produk_id_jenis_produk_id_fk";
