CREATE TABLE "production_target" (
	"id" serial PRIMARY KEY NOT NULL,
	"produk" text NOT NULL,
	"lini" text NOT NULL,
	"shift" text NOT NULL,
	"basis" text NOT NULL,
	"satuan" text NOT NULL,
	"nilai" double precision NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_production_target_unique" ON "production_target" USING btree ("produk","lini","shift","satuan");--> statement-breakpoint
CREATE INDEX "idx_production_target_line_shift" ON "production_target" USING btree ("produk","lini","shift");