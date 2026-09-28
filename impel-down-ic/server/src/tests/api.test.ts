import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { createMemoryDb, closeDb } from '../db/client';
import { migrate } from '../db/migrate';
import { LegacyCategory as Category, Status, EventType } from '../domain/incident';
import { clock, createTestClock } from '../services/clock';

describe('API endpoints', () => {
  let db: any;
  let token: string;

  beforeAll(() => {
    // Setup in-memory DB for tests
    db = createMemoryDb();
    migrate(db);

    token = jwt.sign({ name: 'Tester', role: 'reporter' }, process.env.JWT_SECRET || 'impel-down-secret-key-123');

    // Mock the clock singleton methods using test clock
    const testClock = createTestClock(1000000000000);
    clock.now = testClock.now;
    clock.speed = testClock.speed;
    clock.setSpeed = testClock.setSpeed;

    // Seed Teams
    db.exec(`
      INSERT INTO teams (name, tier, emoji) VALUES 
      ('Jailer Beasts', 0, '🐂'),
      ('Blugori Squad', 0, '🦍')
    `);
  });

  afterAll(() => {
    db.close();
  });

  it('400 on bad input (create incident)', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'a', level: 9 }); // Invalid title length and level
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('create → assign → progress → resolve', async () => {
    // 1. Create
    const createRes = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({
      title: 'Test Incident',
      description: 'Test description',
      category: Category.CELL_RIOT,
      location: 'Level 1',
      occurredAt: new Date().toISOString(),
      level: 4,
      reporter: 'Tester',
    });
    
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe(Status.REPORTED);
    expect(createRes.body.remainingSeconds).toBeDefined();
    
    const incidentId = createRes.body.id;

    // 2. Assign
    const assignRes = await request(app)
      .post(`/api/incidents/${incidentId}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({
      teamId: 1
    });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.status).toBe(Status.ASSIGNED);
    expect(assignRes.body.team_id).toBe(1);

    // 3. Progress (PATCH status)
    const progRes = await request(app)
      .patch(`/api/incidents/${incidentId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
      status: Status.IN_PROGRESS
    });
    expect(progRes.status).toBe(200);
    expect(progRes.body.status).toBe(Status.IN_PROGRESS);

    // 4. Resolve (POST resolve)
    const resolveRes = await request(app)
      .post(`/api/incidents/${incidentId}/resolve`)
      .set('Authorization', `Bearer ${token}`);
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.status).toBe(Status.RESOLVED);
    expect(resolveRes.body.resolved_at).not.toBeNull();

    // 5. Verify history contains all events
    const detailRes = await request(app)
      .get(`/api/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detailRes.status).toBe(200);
    const events = detailRes.body.events;
    
    const types = events.map((e: any) => e.type);
    expect(types).toEqual([
      EventType.CREATED,
      EventType.ASSIGNED,
      EventType.STATUS_CHANGED,
      EventType.STATUS_CHANGED, // One for assignment auto-status change, one for IN_PROGRESS
      EventType.RESOLVED
    ]);
  });

  it('409 on invalid transition', async () => {
    // Create new incident
    const createRes = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({
      title: 'Another Incident',
      category: Category.PRISONER_ESCAPE,
      location: 'Level 2',
      occurredAt: new Date().toISOString(),
      level: 1,
      reporter: 'Tester',
    });
    
    const incidentId = createRes.body.id;

    // Try to resolve and then transition back to REPORTED
    await request(app)
      .post(`/api/incidents/${incidentId}/resolve`)
      .set('Authorization', `Bearer ${token}`);

    const patchRes = await request(app)
      .patch(`/api/incidents/${incidentId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({
      status: Status.REPORTED
    });
    
    expect(patchRes.status).toBe(409);
    expect(patchRes.body.error).toBe('Invalid State Transition');
  });

  it('ignores client-supplied deadline_at and version', async () => {
    const createRes = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({
      title: 'Hacker Incident',
      category: Category.CELL_RIOT,
      location: 'Level 3',
      occurredAt: new Date().toISOString(),
      level: 2,
      reporter: 'Tester',
      deadline_at: '2099-01-01T00:00:00Z',
      version: 999
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.version).toBe(1); // Ignored version
    // computeDeadline for Level 2 should be clock + 12 mins.
    const expectedDeadlineMs = 1000000000000 + (12 * 60 * 1000);
    const actualDeadlineMs = new Date(createRes.body.deadline_at).getTime();
    expect(actualDeadlineMs).toBe(expectedDeadlineMs);
  });
});
