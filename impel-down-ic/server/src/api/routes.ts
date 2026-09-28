import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { getDb } from '../db/client';
import { validateBody, authenticate, AuthRequest } from './middlewares';
import { z } from 'zod';
import {
  createIncidentSchema,
  updateStatusSchema,
  assignTeamSchema,
} from '../schemas/incident.schema';
import { computeDeadline, remainingMs, isOverdue, urgency, slaDurationMs } from '../domain/sla';
import { validateTransition, Status, EventType, LEVEL_NAMES, ALL_CATEGORIES, Category } from '../domain/incident';
import { clock } from '../services/clock';
import { eventBus, EventBusTypes } from '../services/events';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), '../client/public/uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = crypto.randomBytes(16).toString('hex');
    cb(null, `${id}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024, files: 3 }, // 3MB, max 3 files
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  }
});

export const router = Router();

// Helper to inject computed fields (remaining seconds, urgency, overdue)
function mapIncident(inc: any) {
  const now = clock.now();
  const deadlineAt = new Date(inc.deadline_at).getTime();
  const slaMs = slaDurationMs(inc.level);

  return {
    ...inc,
    isOverdue: isOverdue(deadlineAt, now),
    remainingSeconds: Math.floor(remainingMs(deadlineAt, now) / 1000),
    urgency: urgency(deadlineAt, now, slaMs),
    attachments: [], // We'll populate this if needed
  };
}

// ── SSE Endpoint ─────────────────────────────────────────────
router.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connected message
  res.write('event: connected\ndata: {}\n\n');

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {}\n\n');
  }, 15000);

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onCreated = (data: any) => sendEvent('incident.created', data);
  const onUpdated = (data: any) => sendEvent('incident.updated', data);
  const onResolved = (data: any) => sendEvent('incident.resolved', data);
  const onEscalated = (data: any) => sendEvent('incident.escalated', data);
  const onBusterCall = (data: any) => sendEvent('incident.buster_call', data);

  eventBus.on(EventBusTypes.INCIDENT_CREATED, onCreated);
  eventBus.on(EventBusTypes.INCIDENT_UPDATED, onUpdated);
  eventBus.on(EventBusTypes.INCIDENT_RESOLVED, onResolved);
  eventBus.on(EventBusTypes.INCIDENT_ESCALATED, onEscalated);
  eventBus.on(EventBusTypes.BUSTER_CALL_TRIGGERED, onBusterCall);

  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.off(EventBusTypes.INCIDENT_CREATED, onCreated);
    eventBus.off(EventBusTypes.INCIDENT_UPDATED, onUpdated);
    eventBus.off(EventBusTypes.INCIDENT_RESOLVED, onResolved);
    eventBus.off(EventBusTypes.INCIDENT_ESCALATED, onEscalated);
    eventBus.off(EventBusTypes.BUSTER_CALL_TRIGGERED, onBusterCall);
  });
});

// ── GET /api/teams ───────────────────────────────────────────
router.get('/teams', (req: Request, res: Response) => {
  const db = getDb();
  const teams = db.prepare('SELECT * FROM teams ORDER BY tier, id').all();
  res.json(teams);
});

// ── GET /api/stats ───────────────────────────────────────────
router.get('/stats', (req: Request, res: Response) => {
  const db = getDb();
  const counts = db.prepare('SELECT status, COUNT(*) as count FROM incidents GROUP BY status').all() as any[];
  const escalated = db.prepare('SELECT COUNT(*) as count FROM incidents WHERE tier > 0 AND status != ?').get(Status.RESOLVED) as any;
  const overdueRaw = db.prepare('SELECT deadline_at FROM incidents WHERE status != ?').all(Status.RESOLVED) as any[];
  
  const now = clock.now();
  const overdueCount = overdueRaw.filter(r => isOverdue(new Date(r.deadline_at).getTime(), now)).length;

  res.json({
    counts: counts.reduce((acc, curr) => ({ ...acc, [curr.status]: curr.count }), {}),
    escalatedCount: escalated.count,
    overdueCount: overdueCount,
  });
});

// ── GET /api/meta ─────────────────────────────────────────────
router.get('/meta', (req: Request, res: Response) => {
  res.json({
    categories: Object.values(Category),
    levels: LEVEL_NAMES,
    locations: [
      'Network & Communication Center',
      'Security & Operations Zone',
      'Hazardous Materials Zone',
      'Entry & Access Control',
      'Critical Infrastructure Zone',
      'Medical & Health Services',
      'Central Command',
      'Server & Database Center',
      'Administration & Management',
      'External / Perimeter Zone',
      'Facilities & Utility Areas',
      'Entire Facility / Organization'
    ]
  });
});

// ── GET /api/incidents/mine/stats ───────────────────────────
router.get('/incidents/mine/stats', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const reporter = req.user.name;

  const stats = db.prepare(`
    SELECT status, tier FROM incidents WHERE reporter = ?
  `).all(reporter) as any[];

  let myReports = stats.length;
  let inProgress = stats.filter(s => s.status === Status.IN_PROGRESS).length;
  let resolved = stats.filter(s => s.status === Status.RESOLVED).length;
  let needAction = stats.filter(s => s.status !== Status.RESOLVED && s.tier > 0).length;

  res.json({
    myReports,
    inProgress,
    resolved,
    needAction
  });
});

// ── GET /api/incidents ───────────────────────────────────────
router.get('/incidents', authenticate, (req: AuthRequest, res: Response) => {
  const { view, mine, q, limit } = req.query;
  const db = getDb();
  let query = 'SELECT * FROM incidents WHERE 1=1 ';
  let params: any[] = [];

  if (mine === '1') {
    query += 'AND reporter = ? ';
    params.push(req.user.name);
  }

  if (q) {
    query += 'AND (title LIKE ? OR location LIKE ? OR id = ?) ';
    params.push(`%${q}%`, `%${q}%`, q);
  }

  if (view === 'escalated') {
    query += 'AND tier > 0 AND status != ? ';
    params.push(Status.RESOLVED);
  } else if (view === 'resolved') {
    query += 'AND status = ? ';
    params.push(Status.RESOLVED);
  } else if (view === 'active') {
    query += 'AND status != ? ';
    params.push(Status.RESOLVED);
  }

  query += 'ORDER BY created_at DESC ';
  
  if (limit) {
    query += 'LIMIT ?';
    params.push(parseInt(limit as string, 10));
  }

  const rows = db.prepare(query).all(...params);
  res.json(rows.map(mapIncident));
});

// ── GET /api/incidents/:id ───────────────────────────────────
router.get('/incidents/:id', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id) as any;
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  
  // If mine=1 logic is strict, check reporter
  if (req.query.mine === '1' && incident.reporter !== req.user.name) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  
  const events = db.prepare('SELECT * FROM incident_events WHERE incident_id = ? ORDER BY at ASC').all(req.params.id);
  const attachments = db.prepare('SELECT * FROM attachments WHERE incident_id = ?').all(req.params.id);
  
  res.json({ ...mapIncident(incident), events, attachments });
});

// ── POST /api/incidents ──────────────────────────────────────
router.post('/incidents', authenticate, upload.array('photos', 3), (req: AuthRequest, res: Response, next) => {
  try {
    let data;
    try {
      data = createIncidentSchema.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error("Zod Validation Error:", JSON.stringify(err.errors, null, 2));
        console.error("Req body was:", JSON.stringify(req.body, null, 2));
        return res.status(400).json({
          error: 'Validation Error',
          details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      console.error("Unknown error parsing schema:", err);
      throw err;
    }

    const db = getDb();
    const now = clock.now();
    const createdAt = new Date(now).toISOString();
    // Default level if not provided (resolved via default mapping logic)
    const level = data.level || 3;
    const deadlineAt = new Date(computeDeadline(now, level)).toISOString();

    const run = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO incidents (title, description, location, occurred_at, category, level, reporter, team_id, created_at, deadline_at, version)
        VALUES (@title, @description, @location, @occurredAt, @category, @level, @reporter, @teamId, @createdAt, @deadlineAt, 1)
      `).run({
        ...data,
        level,
        reporter: req.user.name,
        teamId: data.teamId || null,
        createdAt,
        deadlineAt,
      });

      const insertId = result.lastInsertRowid;

      // Handle attachments
      if (req.files && Array.isArray(req.files)) {
        const insertAttachment = db.prepare(`
          INSERT INTO attachments (incident_id, filename, url, size, mime_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const file of req.files) {
          insertAttachment.run(insertId, file.originalname, `/uploads/${file.filename}`, file.size, file.mimetype, createdAt);
        }
      }

      db.prepare(`
        INSERT INTO incident_events (incident_id, type, actor, to_value, message, at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(insertId, EventType.CREATED, req.user.name, Status.REPORTED, 'Incident reported', createdAt);

      return db.prepare('SELECT * FROM incidents WHERE id = ?').get(insertId);
    });

    const incident = run();
    const mapped = mapIncident(incident);
    eventBus.emitEvent(EventBusTypes.INCIDENT_CREATED, mapped);
    res.status(201).json(mapped);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/incidents/:id/status ──────────────────────────
router.patch('/incidents/:id/status', authenticate, validateBody(updateStatusSchema), (req: Request, res: Response, next) => {
  try {
    const db = getDb();
    const { status: newStatus } = req.body;
    
    const run = db.transaction(() => {
      const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id) as any;
      if (!inc) return null;

      validateTransition(inc.status as Status, newStatus);
      
      const now = new Date(clock.now()).toISOString();
      const updates: any = { status: newStatus, id: req.params.id, now };
      let query = 'UPDATE incidents SET status = @status, version = version + 1 ';

      if (newStatus === Status.RESOLVED) {
        query += ', resolved_at = @now ';
      }

      query += 'WHERE id = @id RETURNING *';
      const updated = db.prepare(query).get(updates) as any;

      db.prepare(`
        INSERT INTO incident_events (incident_id, type, actor, from_value, to_value, message, at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(inc.id, newStatus === Status.RESOLVED ? EventType.RESOLVED : EventType.STATUS_CHANGED, 'system', inc.status, newStatus, `Status changed to ${newStatus}`, now);

      return updated;
    });

    const updated = run();
    if (!updated) res.status(404).json({ error: 'Not found' });
    else {
      const mapped = mapIncident(updated);
      eventBus.emitEvent(
        newStatus === Status.RESOLVED ? EventBusTypes.INCIDENT_RESOLVED : EventBusTypes.INCIDENT_UPDATED,
        mapped
      );
      res.json(mapped);
    }
  } catch (err) {
    next(err);
  }
});

// ── POST /api/incidents/:id/assign ───────────────────────────
router.post('/incidents/:id/assign', authenticate, validateBody(assignTeamSchema), (req: Request, res: Response, next) => {
  try {
    const db = getDb();
    const { teamId } = req.body;
    
    const run = db.transaction(() => {
      const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id) as any;
      if (!inc) return null;
      
      const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as any;
      if (!team) throw new Error('Team not found');

      // Auto-transition to ASSIGNED if currently REPORTED
      let newStatus = inc.status;
      if (inc.status === Status.REPORTED) {
        validateTransition(Status.REPORTED, Status.ASSIGNED);
        newStatus = Status.ASSIGNED;
      }

      const now = new Date(clock.now()).toISOString();
      const updated = db.prepare(`
        UPDATE incidents 
        SET team_id = ?, status = ?, version = version + 1
        WHERE id = ? RETURNING *
      `).get(teamId, newStatus, inc.id) as any;

      db.prepare(`
        INSERT INTO incident_events (incident_id, type, actor, from_value, to_value, message, at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(inc.id, EventType.ASSIGNED, 'system', inc.team_id?.toString() || null, teamId.toString(), `Assigned to team ${team.name}`, now);

      if (newStatus !== inc.status) {
         db.prepare(`
          INSERT INTO incident_events (incident_id, type, actor, from_value, to_value, message, at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(inc.id, EventType.STATUS_CHANGED, 'system', inc.status, newStatus, `Status changed to ${newStatus}`, now);
      }

      return updated;
    });

    const updated = run();
    if (!updated) res.status(404).json({ error: 'Not found' });
    else {
      const mapped = mapIncident(updated);
      eventBus.emitEvent(EventBusTypes.INCIDENT_UPDATED, mapped);
      res.json(mapped);
    }
  } catch (err) {
    next(err);
  }
});

// ── POST /api/incidents/:id/resolve ──────────────────────────
router.post('/incidents/:id/resolve', authenticate, (req: Request, res: Response, next) => {
  try {
    const db = getDb();
    
    const run = db.transaction(() => {
      const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id) as any;
      if (!inc) return null;

      validateTransition(inc.status as Status, Status.RESOLVED);
      
      const now = new Date(clock.now()).toISOString();
      const updated = db.prepare(`
        UPDATE incidents 
        SET status = ?, resolved_at = ?, version = version + 1
        WHERE id = ? RETURNING *
      `).get(Status.RESOLVED, now, inc.id) as any;

      db.prepare(`
        INSERT INTO incident_events (incident_id, type, actor, from_value, to_value, message, at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(inc.id, EventType.RESOLVED, 'system', inc.status, Status.RESOLVED, 'Incident resolved', now);

      return updated;
    });

    const updated = run();
    if (!updated) res.status(404).json({ error: 'Not found' });
    else {
      const mapped = mapIncident(updated);
      eventBus.emitEvent(EventBusTypes.INCIDENT_RESOLVED, mapped);
      res.json(mapped);
    }
  } catch (err) {
    next(err);
  }
});
