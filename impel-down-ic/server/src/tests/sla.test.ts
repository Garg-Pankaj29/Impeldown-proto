// Tests for SLA domain
// Follows docs/architecture.md

import { describe, it, expect } from 'vitest';
import { computeDeadline, remainingMs, isOverdue, urgency, slaDurationMs } from '../domain/sla';

const BASE = 1_000_000_000_000; // fixed epoch ms

describe('SLA domain', () => {
  // ── computeDeadline ─────────────────────────────────────
  describe('computeDeadline', () => {
    it('Level 1 (Crimson Hell) → 15 min', () => {
      expect(computeDeadline(BASE, 1)).toBe(BASE + 15 * 60_000);
    });

    it('Level 3 (Starvation Hell) → 10 min', () => {
      expect(computeDeadline(BASE, 3)).toBe(BASE + 10 * 60_000);
    });

    it('Level 6 (Eternal Hell) → 3 min', () => {
      expect(computeDeadline(BASE, 6)).toBe(BASE + 3 * 60_000);
    });

    it('throws on level 0', () => {
      expect(() => computeDeadline(BASE, 0)).toThrow('Invalid');
    });

    it('throws on level 7', () => {
      expect(() => computeDeadline(BASE, 7)).toThrow('Invalid');
    });
  });

  // ── slaDurationMs ───────────────────────────────────────
  describe('slaDurationMs', () => {
    it('Level 4 → 7 min in ms', () => {
      expect(slaDurationMs(4)).toBe(7 * 60_000);
    });
  });

  // ── remainingMs ─────────────────────────────────────────
  describe('remainingMs', () => {
    it('positive before deadline', () => {
      expect(remainingMs(BASE + 10_000, BASE)).toBe(10_000);
    });

    it('zero at deadline', () => {
      expect(remainingMs(BASE, BASE)).toBe(0);
    });

    it('negative after deadline', () => {
      expect(remainingMs(BASE, BASE + 5_000)).toBe(-5_000);
    });
  });

  // ── isOverdue ───────────────────────────────────────────
  describe('isOverdue', () => {
    it('false before deadline', () => {
      expect(isOverdue(BASE + 1_000, BASE)).toBe(false);
    });

    it('true at deadline', () => {
      expect(isOverdue(BASE, BASE)).toBe(true);
    });

    it('true past deadline', () => {
      expect(isOverdue(BASE, BASE + 1)).toBe(true);
    });
  });

  // ── urgency ─────────────────────────────────────────────
  describe('urgency', () => {
    const sla = 10 * 60_000; // 10 min

    it('green when > 50 % remaining', () => {
      // 100 % remaining
      expect(urgency(BASE + sla, BASE, sla)).toBe('green');
      // 51 % remaining
      expect(urgency(BASE + sla, BASE + sla * 0.49, sla)).toBe('green');
    });

    it('amber when 20–50 % remaining', () => {
      // 40 % remaining
      expect(urgency(BASE + sla, BASE + sla * 0.6, sla)).toBe('amber');
      // 21 % remaining
      expect(urgency(BASE + sla, BASE + sla * 0.79, sla)).toBe('amber');
    });

    it('red when < 20 % remaining', () => {
      // 15 % remaining
      expect(urgency(BASE + sla, BASE + sla * 0.85, sla)).toBe('red');
      // 1 % remaining
      expect(urgency(BASE + sla, BASE + sla * 0.99, sla)).toBe('red');
    });

    it('overdue when past deadline', () => {
      expect(urgency(BASE, BASE + 1, sla)).toBe('overdue');
    });
  });
});
