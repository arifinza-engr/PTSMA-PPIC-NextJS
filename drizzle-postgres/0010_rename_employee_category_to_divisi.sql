ALTER TABLE "karyawan" RENAME COLUMN "jenis_produk" TO "divisi";--> statement-breakpoint
DROP INDEX "idx_karyawan_form_lini_nama";--> statement-breakpoint
CREATE INDEX "idx_karyawan_divisi_lini_nama" ON "karyawan" USING btree ("divisi","lini","nama");