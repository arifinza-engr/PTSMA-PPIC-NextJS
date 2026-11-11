ALTER TABLE "karyawan" DROP CONSTRAINT "karyawan_lini_id_lini_id_fk";
--> statement-breakpoint
ALTER TABLE "lembur" DROP CONSTRAINT "lembur_lini_id_lini_id_fk";
--> statement-breakpoint
ALTER TABLE "karyawan" ADD COLUMN "lini" text;
--> statement-breakpoint
UPDATE "karyawan" k SET "lini" = l."nama" FROM "lini" l WHERE k."lini_id" = l."id";
--> statement-breakpoint
DROP INDEX "idx_karyawan_lini";
--> statement-breakpoint
ALTER TABLE "karyawan" DROP COLUMN "lini_id";
--> statement-breakpoint
CREATE INDEX "idx_karyawan_lini_nama" ON "karyawan" USING btree ("lini", "nama");
--> statement-breakpoint
ALTER TABLE "lembur" DROP COLUMN "lini_id";
--> statement-breakpoint
DROP TABLE "product" CASCADE;
--> statement-breakpoint
DROP TABLE "lini" CASCADE;
--> statement-breakpoint
DROP TABLE "jenis_produk" CASCADE;
