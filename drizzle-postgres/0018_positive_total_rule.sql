UPDATE "production_product_master" AS product
SET "lines" = COALESCE((
  SELECT jsonb_agg(line || jsonb_build_object(
    'requiresPositiveTotal', CASE WHEN product."kode" = 'discpad' AND line->>'nama' = 'PACKING' THEN 1 ELSE 0 END
  ) ORDER BY (line->>'sortOrder')::integer)
  FROM jsonb_array_elements(product."lines") AS line
), '[]'::jsonb);
--> statement-breakpoint
