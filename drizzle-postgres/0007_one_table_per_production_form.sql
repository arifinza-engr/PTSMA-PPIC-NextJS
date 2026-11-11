CREATE TABLE "produksi_brakeshoe" (
	"id" serial PRIMARY KEY NOT NULL,
	"lini" text NOT NULL,
	"tanggal" text NOT NULL,
	"shift" text DEFAULT '-' NOT NULL,
	"jam_kerja" text DEFAULT '-' NOT NULL,
	"keterangan" text,
	"proses" text,
	"request_hash" text,
	"qty_total" integer,
	"operators" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" integer,
	"created_at" text NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "produksi_discpad" (
	"id" serial PRIMARY KEY NOT NULL,
	"lini" text NOT NULL,
	"tanggal" text NOT NULL,
	"shift" text DEFAULT '-' NOT NULL,
	"jam_kerja" text DEFAULT '-' NOT NULL,
	"keterangan" text,
	"proses" text,
	"request_hash" text,
	"qty_total" integer,
	"operators" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" integer,
	"created_at" text NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "produksi_handle" (
	"id" serial PRIMARY KEY NOT NULL,
	"lini" text NOT NULL,
	"tanggal" text NOT NULL,
	"shift" text DEFAULT '-' NOT NULL,
	"jam_kerja" text DEFAULT '-' NOT NULL,
	"keterangan" text,
	"proses" text,
	"request_hash" text,
	"qty_total" integer,
	"operators" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" integer,
	"created_at" text NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
INSERT INTO "produksi_brakeshoe" ("id", "lini", "tanggal", "shift", "jam_kerja", "keterangan", "proses", "request_hash", "qty_total", "operators", "items", "created_by", "created_at", "updated_at")
SELECT p."id", l."nama", p."tanggal", p."shift", p."jam_kerja", p."keterangan", p."proses", p."request_hash", p."qty_total",
  COALESCE((SELECT jsonb_agg(k."nama" ORDER BY po."urutan") FROM "produksi_operator" po JOIN "karyawan" k ON k."id" = po."karyawan_id" WHERE po."produksi_id" = p."id"), '[]'::jsonb),
  COALESCE((SELECT jsonb_agg(jsonb_build_object('type', i."type", 'grade', i."grade", 'kulit', i."kulit", 'merk', i."merk", 'kode', i."kode", 'gradeAb', i."grade_ab", 'tebal', i."tebal", 'cat', i."cat", 'typeHandle', i."type_handle", 'posisiHandle', i."posisi_handle", 'warna', i."warna", 'qty', i."qty", 'ng', i."ng", 'ngB', i."ng_b", 'mesin', i."mesin", 'qtyShot', i."qty_shot", 'qtySet', i."qty_set", 'qtyPcs', i."qty_pcs", 'qtyKg', i."qty_kg") ORDER BY i."urutan") FROM "produksi_item" i WHERE i."produksi_id" = p."id"), '[]'::jsonb),
  p."created_by", p."created_at", p."updated_at"
FROM "produksi" p JOIN "lini" l ON l."id" = p."lini_id" JOIN "jenis_produk" j ON j."id" = p."jenis_produk_id"
WHERE j."nama" = 'brakeshoe';
--> statement-breakpoint
INSERT INTO "produksi_discpad" ("id", "lini", "tanggal", "shift", "jam_kerja", "keterangan", "proses", "request_hash", "qty_total", "operators", "items", "created_by", "created_at", "updated_at")
SELECT p."id", l."nama", p."tanggal", p."shift", p."jam_kerja", p."keterangan", p."proses", p."request_hash", p."qty_total",
  COALESCE((SELECT jsonb_agg(k."nama" ORDER BY po."urutan") FROM "produksi_operator" po JOIN "karyawan" k ON k."id" = po."karyawan_id" WHERE po."produksi_id" = p."id"), '[]'::jsonb),
  COALESCE((SELECT jsonb_agg(jsonb_build_object('type', i."type", 'grade', i."grade", 'kulit', i."kulit", 'merk', i."merk", 'kode', i."kode", 'gradeAb', i."grade_ab", 'tebal', i."tebal", 'cat', i."cat", 'typeHandle', i."type_handle", 'posisiHandle', i."posisi_handle", 'warna', i."warna", 'qty', i."qty", 'ng', i."ng", 'ngB', i."ng_b", 'mesin', i."mesin", 'qtyShot', i."qty_shot", 'qtySet', i."qty_set", 'qtyPcs', i."qty_pcs", 'qtyKg', i."qty_kg") ORDER BY i."urutan") FROM "produksi_item" i WHERE i."produksi_id" = p."id"), '[]'::jsonb),
  p."created_by", p."created_at", p."updated_at"
FROM "produksi" p JOIN "lini" l ON l."id" = p."lini_id" JOIN "jenis_produk" j ON j."id" = p."jenis_produk_id"
WHERE j."nama" = 'discpad';
--> statement-breakpoint
INSERT INTO "produksi_handle" ("id", "lini", "tanggal", "shift", "jam_kerja", "keterangan", "proses", "request_hash", "qty_total", "operators", "items", "created_by", "created_at", "updated_at")
SELECT p."id", l."nama", p."tanggal", p."shift", p."jam_kerja", p."keterangan", p."proses", p."request_hash", p."qty_total",
  COALESCE((SELECT jsonb_agg(k."nama" ORDER BY po."urutan") FROM "produksi_operator" po JOIN "karyawan" k ON k."id" = po."karyawan_id" WHERE po."produksi_id" = p."id"), '[]'::jsonb),
  COALESCE((SELECT jsonb_agg(jsonb_build_object('type', i."type", 'grade', i."grade", 'kulit', i."kulit", 'merk', i."merk", 'kode', i."kode", 'gradeAb', i."grade_ab", 'tebal', i."tebal", 'cat', i."cat", 'typeHandle', i."type_handle", 'posisiHandle', i."posisi_handle", 'warna', i."warna", 'qty', i."qty", 'ng', i."ng", 'ngB', i."ng_b", 'mesin', i."mesin", 'qtyShot', i."qty_shot", 'qtySet', i."qty_set", 'qtyPcs', i."qty_pcs", 'qtyKg', i."qty_kg") ORDER BY i."urutan") FROM "produksi_item" i WHERE i."produksi_id" = p."id"), '[]'::jsonb),
  p."created_by", p."created_at", p."updated_at"
FROM "produksi" p JOIN "lini" l ON l."id" = p."lini_id" JOIN "jenis_produk" j ON j."id" = p."jenis_produk_id"
WHERE j."nama" = 'handle';
--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('produksi_brakeshoe', 'id'), COALESCE(MAX("id"), 1), COUNT(*) > 0) FROM "produksi_brakeshoe";
--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('produksi_discpad', 'id'), COALESCE(MAX("id"), 1), COUNT(*) > 0) FROM "produksi_discpad";
--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('produksi_handle', 'id'), COALESCE(MAX("id"), 1), COUNT(*) > 0) FROM "produksi_handle";
--> statement-breakpoint
DROP TABLE "produksi_operator";
--> statement-breakpoint
DROP TABLE "produksi_item";
--> statement-breakpoint
DROP TABLE "produksi";
--> statement-breakpoint
CREATE INDEX "idx_produksi_brakeshoe_tanggal" ON "produksi_brakeshoe" USING btree ("tanggal");--> statement-breakpoint
CREATE INDEX "idx_produksi_brakeshoe_lini_tanggal" ON "produksi_brakeshoe" USING btree ("lini","tanggal");--> statement-breakpoint
CREATE INDEX "idx_produksi_brakeshoe_request_hash" ON "produksi_brakeshoe" USING btree ("request_hash","created_at");--> statement-breakpoint
CREATE INDEX "idx_produksi_discpad_tanggal" ON "produksi_discpad" USING btree ("tanggal");--> statement-breakpoint
CREATE INDEX "idx_produksi_discpad_lini_tanggal" ON "produksi_discpad" USING btree ("lini","tanggal");--> statement-breakpoint
CREATE INDEX "idx_produksi_discpad_request_hash" ON "produksi_discpad" USING btree ("request_hash","created_at");--> statement-breakpoint
CREATE INDEX "idx_produksi_handle_tanggal" ON "produksi_handle" USING btree ("tanggal");--> statement-breakpoint
CREATE INDEX "idx_produksi_handle_lini_tanggal" ON "produksi_handle" USING btree ("lini","tanggal");--> statement-breakpoint
CREATE INDEX "idx_produksi_handle_request_hash" ON "produksi_handle" USING btree ("request_hash","created_at");