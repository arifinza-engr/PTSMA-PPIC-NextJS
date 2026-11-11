import { FORM_MASTER } from "./form-options";

export type TargetMetric = "PCS" | "SET" | "SHOT";

export function metricsForLine(produk: string, lini: string): TargetMetric[] {
  const line = FORM_MASTER.lines.find((item) => item.jenis === produk && item.nama === lini);
  if (!line) return [];
  return line.isCasting || (produk === "discpad" && lini === "PRESS CETAK")
    ? ["SHOT"]
    : ["PCS", "SET"];
}
