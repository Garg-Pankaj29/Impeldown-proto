// Tests for incident domain — state machine
// Follows docs/architecture.md

import { describe, it, expect } from 'vitest';
import {
  canTransition,
  validateTransition,
  TransitionError,
  Status,
  LegacyCategory,
  isValidStatus,
  isValidCategory,
  isValidLevel,
} from '../domain/incident';

describe('Incident domain — state machine', () => {
  // ── Valid transitions ───────────────────────────────────
  describe('canTransition – valid', () => {
    it('REPORTED → ASSIGNED', () => expect(canTransition(Status.REPORTED, Status.ASSIGNED)).toBe(true));
    it('REPORTED → RESOLVED', () => expect(canTransition(Status.REPORTED, Status.RESOLVED)).toBe(true));
    it('ASSIGNED → IN_PROGRESS', () => expect(canTransition(Status.ASSIGNED, Status.IN_PROGRESS)).toBe(true));
    it('ASSIGNED → RESOLVED', () => expect(canTransition(Status.ASSIGNED, Status.RESOLVED)).toBe(true));
    it('IN_PROGRESS → RESOLVED', () => expect(canTransition(Status.IN_PROGRESS, Status.RESOLVED)).toBe(true));
  });

  // ── Invalid transitions ─────────────────────────────────
  describe('canTransition – invalid', () => {
    it('RESOLVED → REPORTED', () => expect(canTransition(Status.RESOLVED, Status.REPORTED)).toBe(false));
    it('RESOLVED → ASSIGNED', () => expect(canTransition(Status.RESOLVED, Status.ASSIGNED)).toBe(false));
    it('RESOLVED → IN_PROGRESS', () => expect(canTransition(Status.RESOLVED, Status.IN_PROGRESS)).toBe(false));
    it('IN_PROGRESS → REPORTED', () => expect(canTransition(Status.IN_PROGRESS, Status.REPORTED)).toBe(false));
    it('IN_PROGRESS → ASSIGNED', () => expect(canTransition(Status.IN_PROGRESS, Status.ASSIGNED)).toBe(false));
    it('REPORTED → IN_PROGRESS (skip)', () => expect(canTransition(Status.REPORTED, Status.IN_PROGRESS)).toBe(false));
    it('ASSIGNED → REPORTED (backward)', () => expect(canTransition(Status.ASSIGNED, Status.REPORTED)).toBe(false));
  });

  // ── validateTransition ──────────────────────────────────
  describe('validateTransition', () => {
    it('does not throw on valid transition', () => {
      expect(() => validateTransition(Status.REPORTED, Status.ASSIGNED)).not.toThrow();
    });

    it('throws TransitionError on invalid transition', () => {
      expect(() => validateTransition(Status.RESOLVED, Status.REPORTED)).toThrow(TransitionError);
    });

    it('throws on same-status (no-op)', () => {
      expect(() => validateTransition(Status.ASSIGNED, Status.ASSIGNED)).toThrow(TransitionError);
    });

    it('TransitionError has from/to fields', () => {
      try {
        validateTransition(Status.RESOLVED, Status.REPORTED);
      } catch (e) {
        expect(e).toBeInstanceOf(TransitionError);
        expect((e as TransitionError).from).toBe(Status.RESOLVED);
        expect((e as TransitionError).to).toBe(Status.REPORTED);
      }
    });
  });

  // ── Guards ──────────────────────────────────────────────
  describe('isValidStatus', () => {
    it('accepts valid statuses', () => {
      expect(isValidStatus('REPORTED')).toBe(true);
      expect(isValidStatus('RESOLVED')).toBe(true);
    });

    it('rejects garbage', () => {
      expect(isValidStatus('PENDING')).toBe(false);
      expect(isValidStatus('')).toBe(false);
    });
  });

  describe('isValidCategory', () => {
    it('accepts valid categories', () => {
      expect(isValidCategory(LegacyCategory.CELL_RIOT)).toBe(true);
      expect(isValidCategory(LegacyCategory.SEASTONE_FAILURE)).toBe(true);
    });

    it('rejects garbage', () => {
      expect(isValidCategory('FIRE')).toBe(false);
    });
  });

  describe('isValidLevel', () => {
    it('accepts 1–6', () => {
      for (let i = 1; i <= 6; i++) expect(isValidLevel(i)).toBe(true);
    });

    it('rejects 0, 7, decimals, negatives', () => {
      expect(isValidLevel(0)).toBe(false);
      expect(isValidLevel(7)).toBe(false);
      expect(isValidLevel(1.5)).toBe(false);
      expect(isValidLevel(-1)).toBe(false);
    });
  });
});
