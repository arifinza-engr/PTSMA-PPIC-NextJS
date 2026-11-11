DROP INDEX "idx_karyawan_divisi_lini_nama";--> statement-breakpoint
CREATE INDEX "idx_karyawan_lini_nama" ON "karyawan" USING btree ("lini","nama");--> statement-breakpoint
ALTER TABLE "karyawan" DROP COLUMN "divisi";