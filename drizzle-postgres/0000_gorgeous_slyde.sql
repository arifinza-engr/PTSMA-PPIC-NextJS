CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"entity_id" integer NOT NULL,
	"aksi" text NOT NULL,
	"actor" text DEFAULT 'system' NOT NULL,
	"detail" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "divisi" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_line_id" integer NOT NULL,
	"nama" text NOT NULL,
	"is_casting" integer DEFAULT 0 NOT NULL,
	"is_team" integer DEFAULT 0 NOT NULL,
	"has_ng" integer DEFAULT 0 NOT NULL,
	"has_merk" integer DEFAULT 0 NOT NULL,
	"has_cat" integer DEFAULT 0 NOT NULL,
	"has_mesin" integer DEFAULT 0 NOT NULL,
	"has_ng_b" integer DEFAULT 0 NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "karyawan" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"divisi_id" integer,
	"jabatan" text DEFAULT 'operator' NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lembur" (
	"id" serial PRIMARY KEY NOT NULL,
	"tanggal" text NOT NULL,
	"divisi" text,
	"divisi_id" integer,
	"nama" text NOT NULL,
	"karyawan_id" integer,
	"jam_mulai" text,
	"jam_selesai" text,
	"total_jam" double precision,
	"alasan" text,
	"atasan" text,
	"persetujuan_atasan" text,
	"status" text,
	"bukti_url" text,
	"pernyataan" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_line_id" integer,
	"type" text,
	"grade" text,
	"kulit" text,
	"nama_barang" text,
	"warna" text,
	"op" text,
	"kode" text,
	"nama_type" text,
	"tebal" text,
	"powder_coating" text
);
--> statement-breakpoint
CREATE TABLE "product_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"label" text,
	"urutan" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produksi" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_line_id" integer NOT NULL,
	"divisi_id" integer NOT NULL,
	"tanggal" text NOT NULL,
	"shift" text DEFAULT '-' NOT NULL,
	"jam_kerja" text DEFAULT '-' NOT NULL,
	"keterangan" text,
	"proses" text,
	"request_hash" text,
	"qty_total" integer,
	"created_by" integer,
	"created_at" text NOT NULL,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "produksi_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"produksi_id" integer NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"product_id" integer,
	"type" text,
	"grade" text,
	"kulit" text,
	"merk" text,
	"kode" text,
	"grade_ab" text,
	"tebal" text,
	"cat" text,
	"nama_barang" text,
	"warna" text,
	"qty" integer DEFAULT 0 NOT NULL,
	"ng" integer,
	"ng_b" integer,
	"mesin" text,
	"qty_shot" integer,
	"qty_set" integer,
	"qty_pcs" integer,
	"qty_kg" integer,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "produksi_operator" (
	"produksi_id" integer NOT NULL,
	"karyawan_id" integer NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "produksi_operator_produksi_id_karyawan_id_pk" PRIMARY KEY("produksi_id","karyawan_id")
);
--> statement-breakpoint
CREATE TABLE "stok_opname" (
	"id" serial PRIMARY KEY NOT NULL,
	"bulan" integer NOT NULL,
	"tahun" integer NOT NULL,
	"op" text NOT NULL,
	"kode" text NOT NULL,
	"type" text,
	"powder" text NOT NULL,
	"grade_a" integer DEFAULT 0 NOT NULL,
	"grade_b" integer DEFAULT 0 NOT NULL,
	"created_at" text
);
--> statement-breakpoint
ALTER TABLE "divisi" ADD CONSTRAINT "divisi_product_line_id_product_line_id_fk" FOREIGN KEY ("product_line_id") REFERENCES "public"."product_line"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_divisi_id_divisi_id_fk" FOREIGN KEY ("divisi_id") REFERENCES "public"."divisi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lembur" ADD CONSTRAINT "lembur_divisi_id_divisi_id_fk" FOREIGN KEY ("divisi_id") REFERENCES "public"."divisi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lembur" ADD CONSTRAINT "lembur_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_product_line_id_product_line_id_fk" FOREIGN KEY ("product_line_id") REFERENCES "public"."product_line"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produksi" ADD CONSTRAINT "produksi_product_line_id_product_line_id_fk" FOREIGN KEY ("product_line_id") REFERENCES "public"."product_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produksi" ADD CONSTRAINT "produksi_divisi_id_divisi_id_fk" FOREIGN KEY ("divisi_id") REFERENCES "public"."divisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produksi_item" ADD CONSTRAINT "produksi_item_produksi_id_produksi_id_fk" FOREIGN KEY ("produksi_id") REFERENCES "public"."produksi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produksi_item" ADD CONSTRAINT "produksi_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produksi_operator" ADD CONSTRAINT "produksi_operator_produksi_id_produksi_id_fk" FOREIGN KEY ("produksi_id") REFERENCES "public"."produksi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produksi_operator" ADD CONSTRAINT "produksi_operator_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_entity" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "idx_karyawan_divisi" ON "karyawan" USING btree ("divisi_id","nama");--> statement-breakpoint
CREATE INDEX "idx_lembur_tanggal" ON "lembur" USING btree ("tanggal");--> statement-breakpoint
CREATE INDEX "idx_product_powder" ON "product" USING btree ("powder_coating");--> statement-breakpoint
CREATE INDEX "idx_product_kode" ON "product" USING btree ("kode");--> statement-breakpoint
CREATE INDEX "idx_produksi_divisi" ON "produksi" USING btree ("divisi_id");--> statement-breakpoint
CREATE INDEX "idx_produksi_tanggal" ON "produksi" USING btree ("tanggal");--> statement-breakpoint
CREATE INDEX "idx_produksi_request_hash" ON "produksi" USING btree ("request_hash","created_at");--> statement-breakpoint
CREATE INDEX "idx_produksi_item_produksi" ON "produksi_item" USING btree ("produksi_id");--> statement-breakpoint
CREATE INDEX "idx_stok_opname_periode" ON "stok_opname" USING btree ("bulan","tahun");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stok_opname_unique" ON "stok_opname" USING btree ("bulan","tahun","op","kode","powder");