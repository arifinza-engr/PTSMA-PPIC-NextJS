import { pgTable, serial, integer, text, index, uniqueIndex, doublePrecision, jsonb } from "drizzle-orm/pg-core"
import type { ProductionLineConfig, ProductionOptions } from "../lib/production-master-types"

export const productionProductMaster = pgTable("production_product_master", {
	kode: text().primaryKey(),
	nama: text().notNull(),
	isActive: integer("is_active").default(1).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	lines: jsonb().$type<ProductionLineConfig[]>().notNull().default([]),
	options: jsonb().$type<ProductionOptions>().notNull().default({
		types: [], grades: [], kulits: [], codes: [], coatings: [], tebals: [],
		abOptions: [], typeHandles: [], posisiHandles: [], warnas: [], processes: [],
	}),
})

export const stockOpnameMaster = pgTable("stock_opname_master", {
	id: serial().primaryKey(),
	op: text(),
	kode: text().notNull(),
	type: text(),
	powder: text().notNull(),
	isActive: integer("is_active").default(1).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [index("idx_stock_opname_master_active_sort").on(table.isActive, table.sortOrder)]);

export const karyawan = pgTable("karyawan", {
	id: serial().primaryKey(),
	nama: text().notNull(),
	lini: text(),
	jabatan: text().default("operator").notNull(),
	isActive: integer("is_active").default(1).notNull(),
},
(table) => [
	index("idx_karyawan_lini_nama").on(table.lini, table.nama),
]);

export const productionTarget = pgTable("production_target", {
	id: serial().primaryKey(),
	produk: text().notNull(),
	lini: text().notNull(),
	shift: text().notNull(),
	basis: text().notNull(),
	satuan: text().notNull(),
	nilai: doublePrecision().notNull(),
}, (table) => [
	uniqueIndex("idx_production_target_unique").on(table.produk, table.lini, table.shift, table.satuan),
	index("idx_production_target_line_shift").on(table.produk, table.lini, table.shift),
]);

const productionFormColumns = () => ({
	id: serial().primaryKey(),
	lini: text().notNull(),
	tanggal: text().notNull(),
	shift: text().default("-").notNull(),
	jamKerja: text("jam_kerja").default("-").notNull(),
	keterangan: text(),
	proses: text(),
	requestHash: text("request_hash"),
	qtyTotal: integer("qty_total"),
	operators: jsonb().$type<string[]>().notNull().default([]),
	assistedOperators: jsonb("assisted_operators").$type<{ id: number; nama: string; liniAsal: string | null }[]>().notNull().default([]),
	items: jsonb().$type<Record<string, string | number | null>[]>().notNull().default([]),
	createdBy: integer("created_by"),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at"),
});

export const produksiBrakeshoe = pgTable("produksi_brakeshoe", productionFormColumns(), (table) => [
	index("idx_produksi_brakeshoe_tanggal").on(table.tanggal),
	index("idx_produksi_brakeshoe_lini_tanggal").on(table.lini, table.tanggal),
	index("idx_produksi_brakeshoe_request_hash").on(table.requestHash, table.createdAt),
]);

export const produksiDiscpad = pgTable("produksi_discpad", productionFormColumns(), (table) => [
	index("idx_produksi_discpad_tanggal").on(table.tanggal),
	index("idx_produksi_discpad_lini_tanggal").on(table.lini, table.tanggal),
	index("idx_produksi_discpad_request_hash").on(table.requestHash, table.createdAt),
]);

export const produksiHandle = pgTable("produksi_handle", productionFormColumns(), (table) => [
	index("idx_produksi_handle_tanggal").on(table.tanggal),
	index("idx_produksi_handle_lini_tanggal").on(table.lini, table.tanggal),
	index("idx_produksi_handle_request_hash").on(table.requestHash, table.createdAt),
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
	lini: text(),
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

