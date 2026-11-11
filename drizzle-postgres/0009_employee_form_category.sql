DROP INDEX "idx_karyawan_lini_nama";
--> statement-breakpoint
ALTER TABLE "karyawan" ADD COLUMN "jenis_produk" text;
--> statement-breakpoint
UPDATE "karyawan" e SET "jenis_produk" = 'brakeshoe' WHERE EXISTS (SELECT 1 FROM "produksi_brakeshoe" p WHERE p."lini" = e."lini" AND p."operators" ? e."nama");
--> statement-breakpoint
UPDATE "karyawan" e SET "jenis_produk" = 'discpad' WHERE EXISTS (SELECT 1 FROM "produksi_discpad" p WHERE p."lini" = e."lini" AND p."operators" ? e."nama");
--> statement-breakpoint
UPDATE "karyawan" e SET "jenis_produk" = 'handle' WHERE EXISTS (SELECT 1 FROM "produksi_handle" p WHERE p."lini" = e."lini" AND p."operators" ? e."nama");
--> statement-breakpoint
UPDATE "karyawan" SET "jenis_produk" = 'brakeshoe' WHERE "jenis_produk" IS NULL AND "lini" IN ('PER', 'BARITORI/SORTIR CDS', 'ALODINE & BARREL', 'BONDING', 'BURRY', 'SPRAY', 'BARITORI/SORTIR', 'STAMPING', 'MCM', 'PELEBURAN', 'POWDER COATING');
--> statement-breakpoint
UPDATE "karyawan" SET "jenis_produk" = 'discpad' WHERE "jenis_produk" IS NULL AND "lini" IN ('PRESS CETAK', 'SHOT BLASTING', 'LEM');
--> statement-breakpoint
UPDATE "karyawan" SET "jenis_produk" = 'handle' WHERE "jenis_produk" IS NULL AND "lini" IN ('MACHINING', 'BUFFING');
--> statement-breakpoint
CREATE INDEX "idx_karyawan_form_lini_nama" ON "karyawan" USING btree ("jenis_produk", "lini", "nama");
