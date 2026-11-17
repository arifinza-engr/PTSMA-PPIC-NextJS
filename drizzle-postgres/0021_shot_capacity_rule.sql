UPDATE "production_product_master" AS product
SET "lines" = COALESCE((
  SELECT jsonb_agg(line || jsonb_build_object(
    'shotCapacity', CASE WHEN product."kode" = 'brakeshoe' AND line->>'isCasting' = '1' THEN 2048 ELSE 0 END
  ) ORDER BY (line->>'sortOrder')::integer)
  FROM jsonb_array_elements(product."lines") AS line
), '[]'::jsonb);
--> statement-breakpoint
