// SLA config: level → minutes
// Follows docs/rules.md — no magic numbers

/** Default SLA minutes per Impel Down level (from prd.md §6) */
export const SLA_MINUTES: Readonly<Record<number, number>> = {
  1: 15, // Crimson Hell    — Low
  2: 12, // Wild Beast Hell — Minor
  3: 10, // Starvation Hell — Medium
  4: 7,  // Burning Hell    — High
  5: 5,  // Freezing Hell   — Critical
  6: 3,  // Eternal Hell    — Catastrophic
};

/** Look up SLA minutes for a level; throws on invalid level */
export function slaMinutesForLevel(level: number): number {
  const mins = SLA_MINUTES[level];
  if (mins === undefined) {
    throw new Error(`Invalid Impel Down level: ${level}. Must be 1–6.`);
  }
  return mins;
}
