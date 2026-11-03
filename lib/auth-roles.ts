export const roles = ["pimpinan", "ppic", "qc", "leader_spv", "hrd", "superadmin"] as const;
export type AppRole = (typeof roles)[number];

export const roleLabels: Record<AppRole, string> = {
  pimpinan: "Pimpinan",
  ppic: "PPIC",
  qc: "QC",
  leader_spv: "Leader / SPV",
  hrd: "HRD",
  superadmin: "Superadmin",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (roles as readonly string[]).includes(value);
}
