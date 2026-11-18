DROP INDEX "idx_production_target_unique";--> statement-breakpoint
ALTER TABLE "production_target" ADD COLUMN "kategori" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_production_target_unique" ON "production_target" USING btree ("produk","lini","shift","satuan","kategori");--> statement-breakpoint
UPDATE "production_product_master" AS product
SET "lines" = COALESCE((
  SELECT jsonb_agg(
    CASE
      WHEN line->>'isCasting' = '1' THEN line || jsonb_build_object('castingCategories', jsonb_build_array('Besar', 'Kecil'))
      ELSE line
    END
    ORDER BY ordinal
  )
  FROM jsonb_array_elements(product."lines") WITH ORDINALITY AS configured(line, ordinal)
), '[]'::jsonb)
WHERE product."kode" = 'brakeshoe';
