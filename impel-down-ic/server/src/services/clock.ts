// Service: injectable clock + demo speed
// Follows docs/architecture.md — all time from clock.now()

/** Clock interface — injectable for testing and demo-mode time warp */
export interface Clock {
  /** Current epoch-ms (may be accelerated in demo mode) */
  now(): number;
  /** Current speed multiplier */
  speed(): number;
  /** Change speed; re-anchors to avoid time jumps */
  setSpeed(multiplier: number): void;
}

// ── Production clock ────────────────────────────────────────

class SystemClock implements Clock {
  private realAnchor: number;
  private virtualAnchor: number;
  private multiplier: number;

  constructor(multiplier = 1) {
    this.realAnchor = Date.now();
    this.virtualAnchor = Date.now();
    this.multiplier = multiplier;
  }

  now(): number {
    const elapsed = Date.now() - this.realAnchor;
    return this.virtualAnchor + elapsed * this.multiplier;
  }

  speed(): number {
    return this.multiplier;
  }

  setSpeed(multiplier: number): void {
    // Re-anchor before changing speed to avoid a time jump
    this.virtualAnchor = this.now();
    this.realAnchor = Date.now();
    this.multiplier = multiplier;
  }
}

/** Singleton clock for production use */
export const clock: Clock = new SystemClock();

// ── Test clock ──────────────────────────────────────────────

export interface TestClock extends Clock {
  /** Advance virtual time by `ms` milliseconds */
  advance(ms: number): void;
  /** Set virtual time to an exact epoch-ms value */
  set(time: number): void;
}

/** Create a deterministic clock for unit tests */
export function createTestClock(startTime?: number): TestClock {
  let currentTime = startTime ?? 1_000_000_000_000;
  return {
    now: () => currentTime,
    speed: () => 1,
    setSpeed: () => {
      /* no-op in tests */
    },
    advance: (ms: number) => {
      currentTime += ms;
    },
    set: (time: number) => {
      currentTime = time;
    },
  };
}
