// Domain: deadline + remaining time
// Follows docs/architecture.md — pure logic, no Express/DB imports

import { slaMinutesForLevel } from '../config/sla';

const MS_PER_MINUTE = 60_000;

/** Compute deadline from creation time and level.  FR-04 */
export function computeDeadline(createdAt: number, level: number): number {
  return createdAt + slaMinutesForLevel(level) * MS_PER_MINUTE;
}

/** SLA duration in ms for a given level */
export function slaDurationMs(level: number): number {
  return slaMinutesForLevel(level) * MS_PER_MINUTE;
}

/** Remaining milliseconds until deadline (negative = overdue) */
export function remainingMs(deadlineAt: number, now: number): number {
  return deadlineAt - now;
}

/** Is the incident past its deadline? */
export function isOverdue(deadlineAt: number, now: number): boolean {
  return now >= deadlineAt;
}

/**
 * Urgency band for UI display (rules.md §UI Rules).
 *   green  — > 50 % remaining
 *   amber  — 20–50 %
 *   red    — < 20 %
 *   overdue — past deadline
 */
export function urgency(
  deadlineAt: number,
  now: number,
  slaMs: number,
): 'green' | 'amber' | 'red' | 'overdue' {
  const remaining = remainingMs(deadlineAt, now);
  if (remaining <= 0) return 'overdue';
  const pct = remaining / slaMs;
  if (pct > 0.5) return 'green';
  if (pct > 0.2) return 'amber';
  return 'red';
}
