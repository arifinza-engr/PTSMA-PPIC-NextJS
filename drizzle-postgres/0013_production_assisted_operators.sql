ALTER TABLE "produksi_brakeshoe" ADD COLUMN "assisted_operators" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "produksi_discpad" ADD COLUMN "assisted_operators" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "produksi_handle" ADD COLUMN "assisted_operators" jsonb DEFAULT '[]'::jsonb NOT NULL;
