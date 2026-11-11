ALTER TABLE "product" ADD COLUMN "grade_ab" text;
ALTER TABLE "product" ADD COLUMN "posisi_handle" text;
INSERT INTO "product" ("jenis_produk_id", "type", "grade", "kulit")
SELECT (SELECT id FROM "jenis_produk" WHERE nama='brakeshoe'), source.type, source.grade, source.kulit
FROM "product" AS source
WHERE source.jenis_produk_id IS NULL
  AND (NULLIF(BTRIM(source.type), '') IS NOT NULL OR NULLIF(BTRIM(source.grade), '') IS NOT NULL OR NULLIF(BTRIM(source.kulit), '') IS NOT NULL)
GROUP BY source.type, source.grade, source.kulit;
INSERT INTO "product" ("jenis_produk_id", "kode", "nama_type", "tebal", "powder_coating")
SELECT (SELECT id FROM "jenis_produk" WHERE nama='discpad'), source.kode, source.nama_type, source.tebal, source.powder_coating
FROM "product" AS source
WHERE source.jenis_produk_id IS NULL
  AND (NULLIF(BTRIM(source.kode), '') IS NOT NULL OR NULLIF(BTRIM(source.nama_type), '') IS NOT NULL OR NULLIF(BTRIM(source.tebal), '') IS NOT NULL OR NULLIF(BTRIM(source.powder_coating), '') IS NOT NULL)
GROUP BY source.kode, source.nama_type, source.tebal, source.powder_coating;
INSERT INTO "product" ("jenis_produk_id", "grade_ab")
SELECT product_type.id, option.value FROM "jenis_produk" AS product_type
CROSS JOIN (VALUES ('A'), ('B')) AS option(value)
WHERE product_type.nama='discpad';
INSERT INTO "product" ("jenis_produk_id", "nama_barang", "warna")
SELECT (SELECT id FROM "jenis_produk" WHERE nama='handle'), source.nama_barang, source.warna
FROM "product" AS source
WHERE source.jenis_produk_id IS NULL
  AND (NULLIF(BTRIM(source.nama_barang), '') IS NOT NULL OR NULLIF(BTRIM(source.warna), '') IS NOT NULL)
GROUP BY source.nama_barang, source.warna;
INSERT INTO "product" ("jenis_produk_id", "posisi_handle")
SELECT product_type.id, option.value FROM "jenis_produk" AS product_type
CROSS JOIN (VALUES ('LH'), ('RH')) AS option(value)
WHERE product_type.nama='handle';
