// Domain: next tier, grace period, Buster Call rule
// Follows docs/rules.md — pure logic, no Express/DB imports

import { TIERS, MAX_TIER, BUSTER_CALL_TIER, TIER_GRACE_MULTIPLIER } from '../config/tiers';
import { slaMinutesForLevel } from '../config/sla';

const MS_PER_MINUTE = 60_000;

// ── Types ───────────────────────────────────────────────────

export interface EscalationCandidate {
  status: string;
  tier: number;
  deadlineAt: number;
  resolvedAt: number | null;
}

export interface BusterCallCandidate {
  status: string;
  tier: number;
  createdAt: number;
  busterCalledAt: number | null;
  resolvedAt: number | null;
}

// ── Predicates ──────────────────────────────────────────────

/**
 * Should this incident be escalated to the next tier?
 * True when overdue, unresolved, and below max tier.
 */
export function shouldEscalate(incident: EscalationCandidate, now: number): boolean {
  if (incident.status === 'RESOLVED') return false;
  if (incident.resolvedAt !== null) return false;
  if (incident.tier >= MAX_TIER) return false;
  return now >= incident.deadlineAt;
}

/**
 * Should this incident trigger the hard 15-minute Buster Call rule?
 * True when the incident age >= busterCallLimitMs, unresolved,
 * not already Buster-called, and not yet at the Buster Call tier.
 */
export function shouldBusterCall(
  incident: BusterCallCandidate,
  now: number,
  busterCallLimitMs: number,
): boolean {
  if (incident.status === 'RESOLVED') return false;
  if (incident.resolvedAt !== null) return false;
  if (incident.busterCalledAt !== null) return false;
  if (incident.tier >= BUSTER_CALL_TIER) return false;
  const age = now - incident.createdAt;
  return age >= busterCallLimitMs;
}

// ── Computations ────────────────────────────────────────────

/** Next tier (clamped at MAX_TIER) */
export function nextTier(currentTier: number): number {
  return Math.min(currentTier + 1, MAX_TIER);
}

/**
 * Grace period in ms when escalating to `tier` for an incident at `level`.
 * Formula: SLA[level] × TIER_GRACE_MULTIPLIER[tier].
 */
export function graceMs(level: number, tier: number): number {
  const multiplier = TIER_GRACE_MULTIPLIER[tier] ?? 1;
  return slaMinutesForLevel(level) * MS_PER_MINUTE * multiplier;
}

/** Team name for a given tier */
export function tierTeamName(tier: number): string {
  const def = TIERS[tier];
  if (!def) throw new Error(`Invalid tier: ${tier}`);
  return def.teamName;
}

/** Display name for a given tier */
export function tierDisplayName(tier: number): string {
  const def = TIERS[tier];
  if (!def) throw new Error(`Invalid tier: ${tier}`);
  return def.name;
}
