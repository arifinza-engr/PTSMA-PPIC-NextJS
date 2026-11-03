import { relations } from "drizzle-orm/relations";
import { productLine, divisi, karyawan, product, produksi, produksiOperator, produksiItem, lembur } from "./schema";

export const divisiRelations = relations(divisi, ({one, many}) => ({
	productLine: one(productLine, {
		fields: [divisi.productLineId],
		references: [productLine.id]
	}),
	karyawans: many(karyawan),
	produksis: many(produksi),
	lemburs: many(lembur),
}));

export const productLineRelations = relations(productLine, ({many}) => ({
	divisis: many(divisi),
	products: many(product),
	produksis: many(produksi),
}));

export const karyawanRelations = relations(karyawan, ({one, many}) => ({
	divisi: one(divisi, {
		fields: [karyawan.divisiId],
		references: [divisi.id]
	}),
	produksiOperators: many(produksiOperator),
	lemburs: many(lembur),
}));

export const productRelations = relations(product, ({one, many}) => ({
	productLine: one(productLine, {
		fields: [product.productLineId],
		references: [productLine.id]
	}),
	produksiItems: many(produksiItem),
}));

export const produksiRelations = relations(produksi, ({one, many}) => ({
	divisi: one(divisi, {
		fields: [produksi.divisiId],
		references: [divisi.id]
	}),
	productLine: one(productLine, {
		fields: [produksi.productLineId],
		references: [productLine.id]
	}),
	produksiOperators: many(produksiOperator),
	produksiItems: many(produksiItem),
}));

export const produksiOperatorRelations = relations(produksiOperator, ({one}) => ({
	karyawan: one(karyawan, {
		fields: [produksiOperator.karyawanId],
		references: [karyawan.id]
	}),
	produksi: one(produksi, {
		fields: [produksiOperator.produksiId],
		references: [produksi.id]
	}),
}));

export const produksiItemRelations = relations(produksiItem, ({one}) => ({
	product: one(product, {
		fields: [produksiItem.productId],
		references: [product.id]
	}),
	produksi: one(produksi, {
		fields: [produksiItem.produksiId],
		references: [produksi.id]
	}),
}));

export const lemburRelations = relations(lembur, ({one}) => ({
	karyawan: one(karyawan, {
		fields: [lembur.karyawanId],
		references: [karyawan.id]
	}),
	divisi: one(divisi, {
		fields: [lembur.divisiId],
		references: [divisi.id]
	}),
}));