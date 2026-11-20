export const STANDARD_TARGET_HOURS = 7;

export function targetPerHour(masterTarget: number): number {
  return masterTarget / STANDARD_TARGET_HOURS;
}

export function targetForWorkHours(masterTarget: number, hours: number): number {
  return targetPerHour(masterTarget) * hours;
}
