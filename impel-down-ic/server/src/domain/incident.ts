// Domain: state machine + validation
// Follows docs/architecture.md — pure logic, no Express/DB imports

// ── Status ──────────────────────────────────────────────────

export const Status = {
  REPORTED: 'REPORTED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
} as const;

export type StatusValue = (typeof Status)[keyof typeof Status];

export const ALL_STATUSES = Object.values(Status);

// ── Category ────────────────────────────────────────────────

export const Category = {
  SERVER_DOWN: 'Server Down / Network Outage',
  SECURITY_INCIDENT: 'Security Incident / Unauthorized Activity',
  HAZARDOUS_MATERIAL: 'Hazardous Material Leak / Chemical Exposure',
  UNAUTHORIZED_ACCESS: 'Unauthorized Access / Data Breach',
  ACCESS_CONTROL: 'Access Control / Authentication Failure',
  INFRASTRUCTURE_FAILURE: 'Infrastructure Failure / System Breach',
  POWER_OUTAGE: 'Power Outage / Electrical Failure',
  FIRE_EMERGENCY: 'Fire / Major Safety Emergency',
  MEDICAL_EMERGENCY: 'Medical Emergency / Health Incident',
  COMMUNICATION_FAILURE: 'Communication System Failure',
  APP_DATABASE_FAILURE: 'Application / Database Failure',
  MAJOR_INCIDENT: 'Major Incident / Multiple System Failure',
} as const;

export const LegacyCategory = {
  CELL_RIOT: 'CELL_RIOT',
  POISON_GAS_ALERT: 'POISON_GAS_ALERT',
  PRISONER_ESCAPE: 'PRISONER_ESCAPE',
  SEA_KING_BREACH: 'SEA_KING_BREACH',
  SEASTONE_FAILURE: 'SEASTONE_FAILURE',
  GATE_MALFUNCTION: 'GATE_MALFUNCTION',
  MARINE_PIRATE_INVASION: 'MARINE_PIRATE_INVASION',
} as const;

export type CategoryValue = (typeof Category)[keyof typeof Category] | (typeof LegacyCategory)[keyof typeof LegacyCategory];

export const ALL_CATEGORIES = [...Object.values(Category), ...Object.values(LegacyCategory)];

// ── Event types (for incident_events table) ─────────────────

export const EventType = {
  CREATED: 'CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  ASSIGNED: 'ASSIGNED',
  AUTO_ESCALATED: 'AUTO_ESCALATED',
  BUSTER_CALL: 'BUSTER_CALL',
  RESOLVED: 'RESOLVED',
} as const;

export type EventTypeValue = (typeof EventType)[keyof typeof EventType];

// ── Level display names ─────────────────────────────────────

export const LEVEL_NAMES: Readonly<Record<number, string>> = {
  1: 'Crimson Hell',
  2: 'Wild Beast Hell',
  3: 'Starvation Hell',
  4: 'Burning Hell',
  5: 'Freezing Hell',
  6: 'Eternal Hell',
};

// ── State machine ───────────────────────────────────────────

/**
 * Valid transitions — architecture.md §State Machine
 *   REPORTED → ASSIGNED → IN_PROGRESS → RESOLVED
 *   Resolving allowed from any non-resolved state.
 */
const VALID_TRANSITIONS: Readonly<Record<StatusValue, readonly StatusValue[]>> = {
  REPORTED: [Status.ASSIGNED, Status.RESOLVED],
  ASSIGNED: [Status.IN_PROGRESS, Status.RESOLVED],
  IN_PROGRESS: [Status.RESOLVED],
  RESOLVED: [],
};

/** Can `from` legally move to `to`? */
export function canTransition(from: StatusValue, to: StatusValue): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Validate a transition; throws TransitionError if illegal */
export function validateTransition(from: StatusValue, to: StatusValue): void {
  if (from === to) {
    throw new TransitionError(`Already in status ${from}`, from, to);
  }
  if (!canTransition(from, to)) {
    throw new TransitionError(`Invalid transition: ${from} → ${to}`, from, to);
  }
}

// ── Guards ──────────────────────────────────────────────────

export function isValidStatus(s: string): s is StatusValue {
  return ALL_STATUSES.includes(s as StatusValue);
}

export function isValidCategory(c: string): c is CategoryValue {
  return ALL_CATEGORIES.includes(c as CategoryValue);
}

export function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= 6;
}

// ── TransitionError ─────────────────────────────────────────

export class TransitionError extends Error {
  public readonly from: StatusValue;
  public readonly to: StatusValue;

  constructor(message: string, from: StatusValue, to: StatusValue) {
    super(message);
    this.name = 'TransitionError';
    this.from = from;
    this.to = to;
  }
}
