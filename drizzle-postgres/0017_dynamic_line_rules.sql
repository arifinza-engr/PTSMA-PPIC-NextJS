UPDATE "production_product_master" AS product
SET
  "lines" = COALESCE((
    SELECT jsonb_agg(line || jsonb_build_object(
      'hasAb', CASE WHEN product."kode" = 'discpad' AND line->>'nama' <> 'PACKING' THEN 1 ELSE 0 END,
      'hasProductionTotal', CASE WHEN product."kode" = 'discpad' THEN 1 ELSE 0 END,
      'requiresPositiveTotal', CASE WHEN product."kode" = 'discpad' AND line->>'nama' = 'PACKING' THEN 1 ELSE 0 END,
      'pcsPerSet', 2,
      'shotCapacity', CASE WHEN product."kode" = 'brakeshoe' AND line->>'isCasting' = '1' THEN 2048 ELSE 0 END,
      'hasProcess', CASE WHEN product."kode" = 'discpad' AND line->>'nama' = 'PAINTING' THEN 1 ELSE 0 END,
      'hasShot', CASE WHEN line->>'isCasting' = '1' OR (product."kode" = 'discpad' AND line->>'nama' = 'PRESS CETAK') THEN 1 ELSE 0 END,
      'hasSet', CASE WHEN line->>'isCasting' = '1' OR (product."kode" = 'discpad' AND line->>'nama' <> 'PRESS CETAK') THEN 1 ELSE 0 END,
      'hasPcsKg', CASE WHEN line->>'isCasting' = '1' AND product."kode" <> 'discpad' THEN 1 ELSE 0 END,
      'targetMetrics', CASE WHEN line->>'isCasting' = '1' OR (product."kode" = 'discpad' AND line->>'nama' = 'PRESS CETAK') THEN '["SHOT"]'::jsonb ELSE '["PCS","SET"]'::jsonb END
    ) ORDER BY (line->>'sortOrder')::integer)
    FROM jsonb_array_elements(product."lines") AS line
  ), '[]'::jsonb),
  "options" = product."options" || jsonb_build_object(
    'processes', CASE WHEN product."kode" = 'discpad' THEN '["Painting 1","Painting 2"]'::jsonb ELSE '[]'::jsonb END
  );
--> statement-breakpoint
