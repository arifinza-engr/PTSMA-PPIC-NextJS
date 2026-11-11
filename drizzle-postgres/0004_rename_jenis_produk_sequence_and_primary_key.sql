ALTER TABLE "jenis_produk" RENAME CONSTRAINT "product_line_pkey" TO "jenis_produk_pkey";
ALTER SEQUENCE "product_line_id_seq" RENAME TO "jenis_produk_id_seq";
