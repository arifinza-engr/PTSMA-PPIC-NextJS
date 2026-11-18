export type GroupResult = {
  label: string;
  kategori: string;
  mesin: string[];
  target: number;
  actual: number;
  percentage: number | null;
  operatorCount: number;
};

export type LineResult = {
  id: number;
  produk: string;
  lini: string;
  kategori: string;
  hasMesin: boolean;
  shift: string;
  satuan: "PCS" | "SET" | "SHOT";
  basis: "per_orang" | "tim";
  target: number;
  targetPerUnit: number;
  actual: number;
  percentage: number | null;
  groups: GroupResult[];
};

export type Performance = {
  periodLabel: string;
  activeProducts: {
    kode: string;
    nama: string;
    lines: { nama: string; hasTargets: boolean; castingCategories: string[] }[];
  }[];
  summary: { targetLines: number; activeLines: number; averageProductionAchievement: number | null; operatorGroups: number };
  lines: LineResult[];
};

export type DashboardMetric = LineResult & { noReport?: boolean };
