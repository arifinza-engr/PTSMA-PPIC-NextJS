import type { ProductionDetailField, ProductCode } from "./production-master-types";

export function availableDetailFields(product: ProductCode, isCasting: boolean): ProductionDetailField[] {
  if (product === "brakeshoe") return isCasting ? ["type", "grade"] : ["type", "grade", "kulit"];
  if (product === "discpad") return ["kode", "tebal"];
  return ["typeHandle", "posisiHandle", "warna"];
}

export function defaultDetailFields(product: ProductCode, isCasting: boolean): ProductionDetailField[] {
  return availableDetailFields(product, isCasting);
}

export const detailFieldLabels: Record<ProductionDetailField, string> = {
  type: "Type",
  grade: "Grade",
  kulit: "Kulit",
  kode: "Kode",
  tebal: "Tebal",
  typeHandle: "Type Handle",
  posisiHandle: "Posisi Handle",
  warna: "Warna",
};
