CREATE TABLE "stock_opname_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"op" text,
	"kode" text NOT NULL,
	"type" text,
	"powder" text NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_stock_opname_master_active_sort" ON "stock_opname_master" USING btree ("is_active","sort_order");--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40701.0', 'C043', 'GRAND', 'HOT53', 1, 0);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40702.0', 'C006', 'FORCE', 'MAX', 1, 1);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40703.0', 'C005', 'SHOGUN', 'SAM', 1, 2);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40704.0', 'C041', 'KARISMA', 'POLOS', 1, 3);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40705.0', 'C040', 'VARIO', 'YMM', 1, 4);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40706.0', 'C117', 'RXK', 'KAPPA', 1, 5);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40707.0', 'C057', 'VEGA ZR', 'HMD', 1, 6);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40708.0', 'C052', 'MIO', 'KEIJI', 1, 7);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40709.0', 'C002', 'THUNDER', 'NWT', 1, 8);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40710.0', 'C056', 'GL PRO', 'TRN', 1, 9);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40711.0', 'C059', 'NEX', 'RAPTHORS', 1, 10);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40712.0', 'C210', 'BORIN 6103 UP', '128PLUS', 1, 11);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40713.0', 'C053', 'BORIN 6103 LOW', 'SKY', 1, 12);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40714.0', 'C021', 'CDS SPORT LIGHT', '24+', 1, 13);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40715.0', 'C065', 'BORINE 1011 UP', 'RBTE', 1, 14);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40716.0', 'C163', 'BORINE 1011 LOW', 'YSR', 1, 15);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40717.0', 'C060', 'HANDLE BEAT LH', 'YMT', 1, 16);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40718.0', 'C142', 'HANDLE SATRIA FU LH', 'YAKAWA', 1, 17);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40719.0', 'C347', 'HANDLE MEGA PRO', 'CREVON', 1, 18);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40720.0', 'C058', 'HANDLE N MAX LH', 'ECO', 1, 19);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40721.0', 'C009', 'HANDLE SMASH NEW RH', 'HOT53', 1, 20);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40722.0', 'C140', '', 'NEWBEST', 1, 21);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40723.0', 'C165', '', 'HP', 1, 22);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40724.0', 'C054', '', 'MP', 1, 23);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40725.0', 'C149', '', 'YAKA', 1, 24);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40726.0', 'C273', '', 'YAPAN', 1, 25);
--> statement-breakpoint
INSERT INTO "stock_opname_master" ("op", "kode", "type", "powder", "is_active", "sort_order") VALUES ('40727.0', 'C164', '', 'WTM', 1, 26);
--> statement-breakpoint
