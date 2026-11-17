export const PRODUCT_CODES = ["brakeshoe", "discpad", "handle"] as const;
export type ProductCode = (typeof PRODUCT_CODES)[number];

export type ProductionLineConfig = {
  nama: string;
  jenis: ProductCode;
  isCasting: number;
  isTeam: number;
  hasNg: number;
  hasMerk: number;
  hasCat: number;
  hasMesin: number;
  hasNgB: number;
  hasAb: number;
  hasProductionTotal: number;
  requiresPositiveTotal: number;
  hasProcess: number;
  hasShot: number;
  hasSet: number;
  hasPcsKg: number;
  targetMetrics: ("PCS" | "SET" | "SHOT")[];
  pcsPerSet: number;
  shotCapacity: number;
  isActive: number;
  sortOrder: number;
};

export type ProductionOptionCategory =
  | "types" | "grades" | "kulits" | "codes" | "coatings" | "tebals"
  | "abOptions" | "typeHandles" | "posisiHandles" | "warnas" | "processes";

export type ProductionOptions = Record<ProductionOptionCategory, string[]>;

export type ProductionProductMaster = {
  kode: ProductCode;
  nama: string;
  isActive: number;
  sortOrder: number;
  lines: ProductionLineConfig[];
  options: ProductionOptions;
};
