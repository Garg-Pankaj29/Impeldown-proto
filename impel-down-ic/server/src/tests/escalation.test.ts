// Tests for escalation domain
// Follows docs/architecture.md

import { describe, it, expect } from 'vitest';
import {
  shouldEscalate,
  shouldBusterCall,
  nextTier,
  graceMs,
  tierTeamName,
  tierDisplayName,
} from '../domain/escalation';

const BASE = 1_000_000_000_000;
const MIN = 60_000;
const BUSTER_LIMIT_MS = 15 * MIN;

describe('Escalation domain', () => {
  // ── shouldEscalate ──────────────────────────────────────
  describe('shouldEscalate', () => {
    it('true when overdue, unresolved, tier < 3', () => {
      expect(
        shouldEscalate(
          { status: 'IN_PROGRESS', tier: 0, deadlineAt: BASE, resolvedAt: null },
          BASE + 1,
        ),
      ).toBe(true);
    });

    it('true exactly at deadline', () => {
      expect(
        shouldEscalate(
          { status: 'ASSIGNED', tier: 1, deadlineAt: BASE, resolvedAt: null },
          BASE,
        ),
      ).toBe(true);
    });

    it('false when not yet overdue', () => {
      expect(
        shouldEscalate(
          { status: 'IN_PROGRESS', tier: 0, deadlineAt: BASE + 10_000, resolvedAt: null },
          BASE,
        ),
      ).toBe(false);
    });

    it('false when resolved', () => {
      expect(
        shouldEscalate(
          { status: 'RESOLVED', tier: 0, deadlineAt: BASE, resolvedAt: BASE - 1_000 },
          BASE + 1,
        ),
      ).toBe(false);
    });

    it('false when already at max tier (3)', () => {
      expect(
        shouldEscalate(
          { status: 'IN_PROGRESS', tier: 3, deadlineAt: BASE, resolvedAt: null },
          BASE + 1,
        ),
      ).toBe(false);
    });
  });

  // ── shouldBusterCall (15-min hard rule) ─────────────────
  describe('shouldBusterCall', () => {
    it('true when age >= 15 min, unresolved, not yet called', () => {
      expect(
        shouldBusterCall(
          { status: 'IN_PROGRESS', tier: 1, createdAt: BASE, busterCalledAt: null, resolvedAt: null },
          BASE + BUSTER_LIMIT_MS,
          BUSTER_LIMIT_MS,
        ),
      ).toBe(true);
    });

    it('true when age exactly 15 min', () => {
      expect(
        shouldBusterCall(
          { status: 'REPORTED', tier: 0, createdAt: BASE, busterCalledAt: null, resolvedAt: null },
          BASE + BUSTER_LIMIT_MS,
          BUSTER_LIMIT_MS,
        ),
      ).toBe(true);
    });

    it('false when age < 15 min', () => {
      expect(
        shouldBusterCall(
          { status: 'REPORTED', tier: 0, createdAt: BASE, busterCalledAt: null, resolvedAt: null },
          BASE + BUSTER_LIMIT_MS - 1,
          BUSTER_LIMIT_MS,
        ),
      ).toBe(false);
    });

    it('false when already buster-called', () => {
      expect(
        shouldBusterCall(
          { status: 'IN_PROGRESS', tier: 2, createdAt: BASE, busterCalledAt: BASE + 10 * MIN, resolvedAt: null },
          BASE + BUSTER_LIMIT_MS,
          BUSTER_LIMIT_MS,
        ),
      ).toBe(false);
    });

    it('false when resolved', () => {
      expect(
        shouldBusterCall(
          { status: 'RESOLVED', tier: 1, createdAt: BASE, busterCalledAt: null, resolvedAt: BASE + 5 * MIN },
          BASE + BUSTER_LIMIT_MS,
          BUSTER_LIMIT_MS,
        ),
      ).toBe(false);
    });

    it('false when already at buster-call tier', () => {
      expect(
        shouldBusterCall(
          { status: 'IN_PROGRESS', tier: 3, createdAt: BASE, busterCalledAt: null, resolvedAt: null },
          BASE + BUSTER_LIMIT_MS,
          BUSTER_LIMIT_MS,
        ),
      ).toBe(false);
    });
  });

  // ── nextTier ────────────────────────────────────────────
  describe('nextTier', () => {
    it('0 → 1', () => expect(nextTier(0)).toBe(1));
    it('1 → 2', () => expect(nextTier(1)).toBe(2));
    it('2 → 3', () => expect(nextTier(2)).toBe(3));
    it('3 → 3 (clamped at max)', () => expect(nextTier(3)).toBe(3));
  });

  // ── graceMs ─────────────────────────────────────────────
  describe('graceMs', () => {
    it('tier 1, level 1 → 75 % of 15 min', () => {
      expect(graceMs(1, 1)).toBe(15 * MIN * 0.75);
    });

    it('tier 2, level 6 → 50 % of 3 min', () => {
      expect(graceMs(6, 2)).toBe(3 * MIN * 0.5);
    });

    it('tier 3, level 4 → 25 % of 7 min', () => {
      expect(graceMs(4, 3)).toBe(7 * MIN * 0.25);
    });
  });

  // ── tier helpers ────────────────────────────────────────
  describe('tierTeamName', () => {
    it('tier 0 → Jailer Beasts', () => expect(tierTeamName(0)).toBe('Jailer Beasts'));
    it('tier 1 → Hannyabal\'s Guard', () => expect(tierTeamName(1)).toBe("Hannyabal's Guard"));
    it('tier 2 → Magellan\'s Command', () => expect(tierTeamName(2)).toBe("Magellan's Command"));
    it('tier 3 → Buster Call Fleet', () => expect(tierTeamName(3)).toBe('Buster Call Fleet'));
    it('throws on invalid tier', () => expect(() => tierTeamName(5)).toThrow());
  });

  describe('tierDisplayName', () => {
    it('tier 3 → BUSTER CALL', () => expect(tierDisplayName(3)).toBe('BUSTER CALL'));
  });
});
