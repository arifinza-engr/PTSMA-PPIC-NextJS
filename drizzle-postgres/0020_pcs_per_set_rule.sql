UPDATE "production_product_master" AS product
SET "lines" = COALESCE((
  SELECT jsonb_agg(line || jsonb_build_object('pcsPerSet', 2) ORDER BY (line->>'sortOrder')::integer)
  FROM jsonb_array_elements(product."lines") AS line
), '[]'::jsonb);
--> statement-breakpoint
