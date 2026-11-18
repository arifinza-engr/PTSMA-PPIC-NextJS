UPDATE "production_product_master" AS product
SET "lines" = COALESCE((
  SELECT jsonb_agg(
    CASE
      WHEN line->>'isCasting' = '1'
        THEN line || jsonb_build_object('castingCategories', '["Besar","Kecil","Handle"]'::jsonb)
      ELSE line
    END
    ORDER BY ordinal
  )
  FROM jsonb_array_elements(product."lines") WITH ORDINALITY AS configured(line, ordinal)
), '[]'::jsonb)
WHERE product."kode" IN ('brakeshoe', 'handle')
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(product."lines") AS configured(line)
    WHERE line->>'isCasting' = '1'
  );
