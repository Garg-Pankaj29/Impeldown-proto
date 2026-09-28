// Tiers: Jailer Beasts → Hannyabal → Magellan → Buster Call
// Follows docs/rules.md

export interface TierDef {
  readonly name: string;
  readonly teamName: string;
  readonly emoji: string;
}

/** Escalation tier definitions from prd.md §6 */
export const TIERS: Readonly<Record<number, TierDef>> = {
  0: { name: 'Jailer Beasts',            teamName: 'Jailer Beasts',      emoji: '🐂' },
  1: { name: 'Deputy Warden Hannyabal',  teamName: "Hannyabal's Guard",  emoji: '⚔️' },
  2: { name: 'Chief Warden Magellan',    teamName: "Magellan's Command", emoji: '☠️' },
  3: { name: 'BUSTER CALL',              teamName: 'Buster Call Fleet',  emoji: '🔱' },
};

export const MAX_TIER = 3;
export const BUSTER_CALL_TIER = 3;

/**
 * Grace-period multiplier per tier.
 * On escalation the new deadline = now + SLA[level] × multiplier.
 * Higher tiers → less grace → more urgency.
 */
export const TIER_GRACE_MULTIPLIER: Readonly<Record<number, number>> = {
  1: 0.75,  // Hannyabal gets 75 % of original SLA
  2: 0.50,  // Magellan gets 50 %
  3: 0.25,  // Buster Call — minimal window
};
