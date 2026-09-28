import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryDb, closeDb, getDb } from '../db/client';
import { migrate } from '../db/migrate';
import { clock, createTestClock } from '../services/clock';
import { ticker } from '../services/scheduler';
import { LegacyCategory as Category, Status, EventType } from '../domain/incident';
import { eventBus, EventBusTypes } from '../services/events';
import { computeDeadline } from '../domain/sla';
import { graceMs } from '../domain/escalation';

const BASE_TIME = 1000000000000;
const MIN = 60 * 1000;

describe('Escalation ticker', () => {
  let db: any;
  let testClock: any;

  beforeEach(() => {
    db = createMemoryDb();
    migrate(db);

    testClock = createTestClock(BASE_TIME);
    clock.now = testClock.now;
    clock.speed = testClock.speed;
    clock.setSpeed = testClock.setSpeed;

    db.exec(`
      INSERT INTO teams (name, tier, emoji) VALUES 
      ('Jailer Beasts', 0, '🐂'),
      ('Hannyabal''s Guard', 1, '⚔️'),
      ('Magellan''s Command', 2, '☠️'),
      ('Buster Call Fleet', 3, '🔱')
    `);
    
    // Clear event listeners
    eventBus.removeAllListeners();
  });

  afterEach(() => {
    closeDb();
  });

  function insertIncident(level: number, status: string, overrides = {}) {
    const createdAt = new Date(BASE_TIME).toISOString();
    const deadlineAt = new Date(computeDeadline(BASE_TIME, level)).toISOString();

    const result = db.prepare(`
      INSERT INTO incidents (title, description, category, level, reporter, status, tier, team_id, created_at, deadline_at, version, location, occurred_at)
      VALUES ('Test', 'Desc', ?, ?, 'Tester', ?, 0, 1, ?, ?, 1, 'Main Gate', ?)
    `).run(Category.CELL_RIOT, level, status, createdAt, deadlineAt, createdAt);
    
    // Apply overrides
    if (Object.keys(overrides).length > 0) {
      const sets = Object.entries(overrides).map(([k]) => `${k} = ?`).join(', ');
      const values = Object.values(overrides);
      db.prepare(`UPDATE incidents SET ${sets} WHERE id = ?`).run(...values, result.lastInsertRowid);
    }
    
    return result.lastInsertRowid;
  }

  it('escalates overdue incidents on tick once', () => {
    const id = insertIncident(4, Status.REPORTED); // 7 min SLA
    
    let escalatedCount = 0;
    eventBus.on(EventBusTypes.INCIDENT_ESCALATED, () => escalatedCount++);

    // Advance 8 mins
    testClock.advance(8 * MIN);
    
    ticker.tick(); // Should escalate to tier 1
    
    const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    expect(inc.tier).toBe(1);
    expect(inc.escalation_count).toBe(1);
    expect(inc.team_id).toBe(2); // Hannyabal's Guard
    expect(escalatedCount).toBe(1);

    const events = db.prepare('SELECT * FROM incident_events WHERE incident_id = ?').all(id);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(EventType.AUTO_ESCALATED);

    // Tick again immediately
    ticker.tick();
    
    const incAfter = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    expect(incAfter.tier).toBe(1); // No change
    expect(incAfter.escalation_count).toBe(1);
    expect(escalatedCount).toBe(1); // No new event
  });

  it('triggers Buster Call at 15-min age', () => {
    const id = insertIncident(4, Status.IN_PROGRESS); // 7 min SLA
    
    let busterCalled = false;
    eventBus.on(EventBusTypes.BUSTER_CALL_TRIGGERED, () => busterCalled = true);

    // Advance 15 mins (triggers Buster Call rule independently of tier/SLA)
    testClock.advance(15 * MIN);
    
    ticker.tick();
    
    const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    expect(inc.tier).toBe(3);
    expect(inc.buster_called_at).not.toBeNull();
    expect(busterCalled).toBe(true);
    
    const events = db.prepare('SELECT type FROM incident_events WHERE incident_id = ?').all(id);
    expect(events.some((e: any) => e.type === EventType.BUSTER_CALL)).toBe(true);
  });

  it('resolved incidents never escalate', () => {
    const id = insertIncident(1, Status.RESOLVED, { resolved_at: new Date(BASE_TIME).toISOString() });
    
    let escalatedCount = 0;
    eventBus.on(EventBusTypes.INCIDENT_ESCALATED, () => escalatedCount++);

    testClock.advance(16 * MIN); // Past 15m SLA
    ticker.tick();
    
    const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    expect(inc.tier).toBe(0);
    expect(escalatedCount).toBe(0);
  });

  it('multi-tier chain works', () => {
    const id = insertIncident(6, Status.REPORTED); // 3 min SLA
    
    // Pass deadline
    testClock.advance(4 * MIN);
    ticker.tick(); // Tier 0 -> Tier 1 (Hannyabal)
    
    let inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    expect(inc.tier).toBe(1);
    expect(inc.escalation_count).toBe(1);
    
    // Advance past grace period for level 6, tier 1
    const grace1 = graceMs(6, 1);
    testClock.advance(grace1 + 1000);
    
    ticker.tick(); // Tier 1 -> Tier 2 (Magellan)
    inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    expect(inc.tier).toBe(2);
    expect(inc.escalation_count).toBe(2);
    expect(inc.team_id).toBe(3);
  });

  it('is idempotent (no double-escalation on restart mid-way)', () => {
    const id = insertIncident(1, Status.REPORTED); // 15 min SLA
    
    testClock.advance(16 * MIN);
    
    // Simulate someone updating the incident between our check and our update
    // by changing the `version` field directly right after fetching the incidents
    // We will override the db.prepare method temporarily just to intercept the loop
    const originalPrepare = db.prepare.bind(db);
    db.prepare = (sql: string) => {
      const stmt = originalPrepare(sql);
      if (sql.includes('SELECT * FROM incidents WHERE status != ?')) {
        const originalAll = stmt.all.bind(stmt);
        stmt.all = (...args: any[]) => {
          const rows = originalAll(...args);
          // Before returning the rows to the loop, increment the DB version
          // to simulate a concurrent update.
          originalPrepare('UPDATE incidents SET version = version + 1 WHERE id = ?').run(id);
          return rows;
        };
      }
      return stmt;
    };
    
    ticker.processEscalations(); 
    db.prepare = originalPrepare; // restore
    
    const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    expect(inc.tier).toBe(0); // Should NOT have escalated
  });
});
