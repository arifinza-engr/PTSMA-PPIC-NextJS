import { pgTable, serial, integer, text, index, uniqueIndex, primaryKey, doublePrecision } from "drizzle-orm/pg-core"

export const productLine = pgTable("product_line", {
	id: serial().primaryKey(),
	nama: text().notNull(),
	label: text(),
	urutan: integer().default(0).notNull(),
});

export const divisi = pgTable("divisi", {
	id: serial().primaryKey(),
	productLineId: integer("product_line_id").notNull().references(() => productLine.id, { onDelete: "cascade" } ),
	nama: text().notNull(),
	isCasting: integer("is_casting").default(0).notNull(),
	isTeam: integer("is_team").default(0).notNull(),
	hasNg: integer("has_ng").default(0).notNull(),
	hasMerk: integer("has_merk").default(0).notNull(),
	hasCat: integer("has_cat").default(0).notNull(),
	hasMesin: integer("has_mesin").default(0).notNull(),
	hasNgB: integer("has_ng_b").default(0).notNull(),
	urutan: integer().default(0).notNull(),
});

export const karyawan = pgTable("karyawan", {
	id: serial().primaryKey(),
	nama: text().notNull(),
	divisiId: integer("divisi_id").references(() => divisi.id, { onDelete: "set null" } ),
	jabatan: text().default("operator").notNull(),
	isActive: integer("is_active").default(1).notNull(),
},
(table) => [
	index("idx_karyawan_divisi").on(table.divisiId, table.nama),
]);

export const product = pgTable("product", {
	id: serial().primaryKey(),
	productLineId: integer("product_line_id").references(() => productLine.id, { onDelete: "set null" } ),
	type: text(),
	grade: text(),
	kulit: text(),
	namaBarang: text("nama_barang"),
	warna: text(),
	op: text(),
	kode: text(),
	namaType: text("nama_type"),
	tebal: text(),
	powderCoating: text("powder_coating"),
},
(table) => [
	index("idx_product_powder").on(table.powderCoating),
	index("idx_product_kode").on(table.kode),
]);

export const produksi = pgTable("produksi", {
	id: serial().primaryKey(),
	productLineId: integer("product_line_id").notNull().references(() => productLine.id),
	divisiId: integer("divisi_id").notNull().references(() => divisi.id),
	tanggal: text().notNull(),
	shift: text().default("-").notNull(),
	jamKerja: text("jam_kerja").default("-").notNull(),
	keterangan: text(),
	proses: text(),
	requestHash: text("request_hash"),
	qtyTotal: integer("qty_total"),
	createdBy: integer("created_by"),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at"),
},
(table) => [
	index("idx_produksi_divisi").on(table.divisiId),
	index("idx_produksi_tanggal").on(table.tanggal),
	index("idx_produksi_request_hash").on(table.requestHash, table.createdAt),
]);

export const produksiOperator = pgTable("produksi_operator", {
	produksiId: integer("produksi_id").notNull().references(() => produksi.id, { onDelete: "cascade" } ),
	karyawanId: integer("karyawan_id").notNull().references(() => karyawan.id),
	urutan: integer().default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.produksiId, table.karyawanId], name: "produksi_operator_produksi_id_karyawan_id_pk"})
]);

export const produksiItem = pgTable("produksi_item", {
	id: serial().primaryKey(),
	produksiId: integer("produksi_id").notNull().references(() => produksi.id, { onDelete: "cascade" } ),
	urutan: integer().default(0).notNull(),
	productId: integer("product_id").references(() => product.id, { onDelete: "set null" } ),
	type: text(),
	grade: text(),
	kulit: text(),
	merk: text(),
	kode: text(),
	gradeAb: text("grade_ab"),
	tebal: text(),
	cat: text(),
	namaBarang: text("nama_barang"),
	warna: text(),
	qty: integer().default(0).notNull(),
	ng: integer(),
	ngB: integer("ng_b"),
	mesin: text(),
	qtyShot: integer("qty_shot"),
	qtySet: integer("qty_set"),
	qtyPcs: integer("qty_pcs"),
	qtyKg: doublePrecision("qty_kg"),
	createdAt: text("created_at"),
},
(table) => [
	index("idx_produksi_item_produksi").on(table.produksiId),
]);

export const stokOpname = pgTable("stok_opname", {
	id: serial().primaryKey(),
	bulan: integer().notNull(),
	tahun: integer().notNull(),
	op: text().notNull(),
	kode: text().notNull(),
	type: text(),
	powder: text().notNull(),
	gradeA: integer("grade_a").default(0).notNull(),
	gradeB: integer("grade_b").default(0).notNull(),
	createdAt: text("created_at"),
},
(table) => [
	index("idx_stok_opname_periode").on(table.bulan, table.tahun),
	uniqueIndex("idx_stok_opname_unique").on(table.bulan, table.tahun, table.op, table.kode, table.powder),
]);

export const lembur = pgTable("lembur", {
	id: serial().primaryKey(),
	tanggal: text().notNull(),
	divisi: text(),
	divisiId: integer("divisi_id").references(() => divisi.id, { onDelete: "set null" } ),
	nama: text().notNull(),
	karyawanId: integer("karyawan_id").references(() => karyawan.id, { onDelete: "set null" } ),
	jamMulai: text("jam_mulai"),
	jamSelesai: text("jam_selesai"),
	totalJam: doublePrecision("total_jam"),
	alasan: text(),
	atasan: text(),
	persetujuanAtasan: text("persetujuan_atasan"),
	status: text(),
	buktiUrl: text("bukti_url"),
	pernyataan: text(),
	createdAt: text("created_at"),
},
(table) => [
	index("idx_lembur_tanggal").on(table.tanggal),
]);

export const auditLog = pgTable("audit_log", {
	id: serial().primaryKey(),
	entity: text().notNull(),
	entityId: integer("entity_id").notNull(),
	aksi: text().notNull(),
	actor: text().default("system").notNull(),
	detail: text(),
	createdAt: text("created_at").notNull(),
}, (table) => [index("idx_audit_log_entity").on(table.entity, table.entityId)]);

export const appUser = pgTable("app_user", {
	id: serial().primaryKey(),
	username: text().notNull().unique(),
	name: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	role: text().notNull(),
	isActive: integer("is_active").default(1).notNull(),
	createdAt: text("created_at").notNull(),
}, (table) => [index("idx_app_user_role").on(table.role)]);

