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
import { validateTransition, Status, StatusValue, EventType, LEVEL_NAMES, ALL_CATEGORIES, Category } from '../domain/incident';
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
router.get('/teams', async (req: Request, res: Response) => {
  const db = getDb();
  const { rows } = await db.query('SELECT * FROM teams ORDER BY tier, id');
  res.json(rows);
});

// ── GET /api/stats ───────────────────────────────────────────
router.get('/stats', async (req: Request, res: Response) => {
  const db = getDb();
  const countsRes = await db.query('SELECT status, COUNT(*) as count FROM incidents GROUP BY status');
  const counts = countsRes.rows;
  
  const escalatedRes = await db.query('SELECT COUNT(*) as count FROM incidents WHERE tier > 0 AND status != $1', [Status.RESOLVED]);
  const escalated = escalatedRes.rows[0];
  
  const overdueRes = await db.query('SELECT deadline_at FROM incidents WHERE status != $1', [Status.RESOLVED]);
  const overdueRaw = overdueRes.rows;
  
  const now = clock.now();
  const overdueCount = overdueRaw.filter(r => isOverdue(new Date(r.deadline_at).getTime(), now)).length;

  res.json({
    counts: counts.reduce((acc, curr) => ({ ...acc, [curr.status]: Number(curr.count) }), {}),
    escalatedCount: Number(escalated.count),
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
router.get('/incidents/mine/stats', authenticate, async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const reporter = req.user!.name;

  const statsRes = await db.query(`
    SELECT status, tier FROM incidents WHERE reporter = $1
  `, [reporter]);
  const stats = statsRes.rows;

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
router.get('/incidents', authenticate, async (req: AuthRequest, res: Response) => {
  const { view, mine, q, limit } = req.query;
  const db = getDb();
  let query = 'SELECT * FROM incidents WHERE 1=1 ';
  let params: any[] = [];
  let paramIndex = 1;

  if (mine === '1') {
    query += `AND reporter = $${paramIndex++} `;
    params.push(req.user!.name);
  }

  if (q) {
    query += `AND (title LIKE $${paramIndex} OR location LIKE $${paramIndex+1} OR id::text = $${paramIndex+2}) `;
    params.push(`%${q}%`, `%${q}%`, q);
    paramIndex += 3;
  }

  if (view === 'escalated') {
    query += `AND tier > 0 AND status != $${paramIndex++} `;
    params.push(Status.RESOLVED);
  } else if (view === 'resolved') {
    query += `AND status = $${paramIndex++} `;
    params.push(Status.RESOLVED);
  } else if (view === 'active') {
    query += `AND status != $${paramIndex++} `;
    params.push(Status.RESOLVED);
  }

  query += 'ORDER BY created_at DESC ';
  
  if (limit) {
    query += `LIMIT $${paramIndex++}`;
    params.push(parseInt(limit as string, 10));
  }

  const { rows } = await db.query(query, params);
  res.json(rows.map(mapIncident));
});

// ── GET /api/incidents/:id ───────────────────────────────────
router.get('/incidents/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const incRes = await db.query('SELECT * FROM incidents WHERE id = $1', [req.params.id]);
  const incident = incRes.rows[0];
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  
  // If mine=1 logic is strict, check reporter
  if (req.query.mine === '1' && incident.reporter !== req.user!.name) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  
  const eventsRes = await db.query('SELECT * FROM incident_events WHERE incident_id = $1 ORDER BY at ASC', [req.params.id]);
  const attachmentsRes = await db.query('SELECT * FROM attachments WHERE incident_id = $1', [req.params.id]);
  
  res.json({ ...mapIncident(incident), events: eventsRes.rows, attachments: attachmentsRes.rows });
});

// ── POST /api/incidents ──────────────────────────────────────
router.post('/incidents', authenticate, upload.array('photos', 3), async (req: AuthRequest, res: Response, next) => {
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

    const client = await db.connect();
    let mapped;
    try {
      await client.query('BEGIN');
      const result = await client.query(`
        INSERT INTO incidents (title, description, location, occurred_at, category, level, reporter, team_id, created_at, deadline_at, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
        RETURNING *
      `, [data.title, data.description, data.location, data.occurredAt, data.category, level, req.user!.name, data.teamId || null, createdAt, deadlineAt]);
      
      const incident = result.rows[0];
      const insertId = incident.id;

      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          await client.query(`
            INSERT INTO attachments (incident_id, filename, url, size, mime_type, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [insertId, file.originalname, `/uploads/${file.filename}`, file.size, file.mimetype, createdAt]);
        }
      }

      await client.query(`
        INSERT INTO incident_events (incident_id, type, actor, to_value, message, at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [insertId, EventType.CREATED, req.user!.name, Status.REPORTED, 'Incident reported', createdAt]);

      await client.query('COMMIT');
      mapped = mapIncident(incident);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    eventBus.emitEvent(EventBusTypes.INCIDENT_CREATED, mapped);
    res.status(201).json(mapped);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/incidents/:id/status ──────────────────────────
router.patch('/incidents/:id/status', authenticate, validateBody(updateStatusSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const db = getDb();
    const { status: newStatus } = req.body;
    
    const client = await db.connect();
    let updated;
    try {
      await client.query('BEGIN');
      const incRes = await client.query('SELECT * FROM incidents WHERE id = $1 FOR UPDATE', [req.params.id]);
      const inc = incRes.rows[0];
      if (!inc) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found' });
      }

      validateTransition(inc.status as StatusValue, newStatus);
      
      const now = new Date(clock.now()).toISOString();
      let query = 'UPDATE incidents SET status = $1, version = version + 1 ';
      const params: any[] = [newStatus, req.params.id, now];

      if (newStatus === Status.RESOLVED) {
        query += ', resolved_at = $3 ';
      }

      query += 'WHERE id = $2 RETURNING *';
      const updatedRes = await client.query(query, newStatus === Status.RESOLVED ? params : [newStatus, req.params.id]);
      updated = updatedRes.rows[0];

      await client.query(`
        INSERT INTO incident_events (incident_id, type, actor, from_value, to_value, message, at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [inc.id, newStatus === Status.RESOLVED ? EventType.RESOLVED : EventType.STATUS_CHANGED, 'system', inc.status, newStatus, `Status changed to ${newStatus}`, now]);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const mapped = mapIncident(updated);
    eventBus.emitEvent(
      newStatus === Status.RESOLVED ? EventBusTypes.INCIDENT_RESOLVED : EventBusTypes.INCIDENT_UPDATED,
      mapped
    );
    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/incidents/:id/assign ───────────────────────────
router.post('/incidents/:id/assign', authenticate, validateBody(assignTeamSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const db = getDb();
    const { teamId } = req.body;
    
    const client = await db.connect();
    let updated;
    try {
      await client.query('BEGIN');
      const incRes = await client.query('SELECT * FROM incidents WHERE id = $1 FOR UPDATE', [req.params.id]);
      const inc = incRes.rows[0];
      if (!inc) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found' });
      }
      
      const teamRes = await client.query('SELECT * FROM teams WHERE id = $1', [teamId]);
      const team = teamRes.rows[0];
      if (!team) throw new Error('Team not found');

      // Auto-transition to ASSIGNED if currently REPORTED
      let newStatus = inc.status;
      if (inc.status === Status.REPORTED) {
        validateTransition(Status.REPORTED, Status.ASSIGNED);
        newStatus = Status.ASSIGNED;
      }

      const now = new Date(clock.now()).toISOString();
      const updatedRes = await client.query(`
        UPDATE incidents 
        SET team_id = $1, status = $2, version = version + 1
        WHERE id = $3 RETURNING *
      `, [teamId, newStatus, inc.id]);
      updated = updatedRes.rows[0];

      await client.query(`
        INSERT INTO incident_events (incident_id, type, actor, from_value, to_value, message, at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [inc.id, EventType.ASSIGNED, 'system', inc.team_id?.toString() || null, teamId.toString(), `Assigned to team ${team.name}`, now]);

      if (newStatus !== inc.status) {
         await client.query(`
          INSERT INTO incident_events (incident_id, type, actor, from_value, to_value, message, at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [inc.id, EventType.STATUS_CHANGED, 'system', inc.status, newStatus, `Status changed to ${newStatus}`, now]);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const mapped = mapIncident(updated);
    eventBus.emitEvent(EventBusTypes.INCIDENT_UPDATED, mapped);
    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/incidents/:id/resolve ──────────────────────────
router.post('/incidents/:id/resolve', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const db = getDb();
    
    const client = await db.connect();
    let updated;
    try {
      await client.query('BEGIN');
      const incRes = await client.query('SELECT * FROM incidents WHERE id = $1 FOR UPDATE', [req.params.id]);
      const inc = incRes.rows[0];
      if (!inc) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found' });
      }

      validateTransition(inc.status as StatusValue, Status.RESOLVED);
      
      const now = new Date(clock.now()).toISOString();
      const updatedRes = await client.query(`
        UPDATE incidents 
        SET status = $1, resolved_at = $2, version = version + 1
        WHERE id = $3 RETURNING *
      `, [Status.RESOLVED, now, inc.id]);
      updated = updatedRes.rows[0];

      await client.query(`
        INSERT INTO incident_events (incident_id, type, actor, from_value, to_value, message, at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [inc.id, EventType.RESOLVED, 'system', inc.status, Status.RESOLVED, 'Incident resolved', now]);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const mapped = mapIncident(updated);
    eventBus.emitEvent(EventBusTypes.INCIDENT_RESOLVED, mapped);
    res.json(mapped);
  } catch (err) {
    next(err);
  }
});
