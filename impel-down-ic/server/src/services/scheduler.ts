import { getDb } from '../db/client';
import { clock } from './clock';
import {
  shouldEscalate,
  shouldBusterCall,
  nextTier,
  graceMs,
  tierTeamName,
} from '../domain/escalation';
import { Status, EventType } from '../domain/incident';
import { eventBus, EventBusTypes } from './events';

export const TICKER_INTERVAL_MS = 5000;
const BUSTER_LIMIT_MS = 15 * 60 * 1000;

export class EscalationTicker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICKER_INTERVAL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Run one iteration of the escalation loop */
  tick() {
    if (this.isRunning) return; // Prevent overlapping ticks
    this.isRunning = true;
    try {
      this.processEscalations();
    } catch (err) {
      console.error('[EscalationTicker] Error during tick:', err);
    } finally {
      this.isRunning = false;
    }
  }

  processEscalations() {
    const db = getDb();
    const now = clock.now();
    
    // Fetch all unresolved incidents
    const incidents = db.prepare('SELECT * FROM incidents WHERE status != ?').all(Status.RESOLVED) as any[];

    // Fetch team lookup for assignments
    const teams = db.prepare('SELECT id, name FROM teams').all() as { id: number, name: string }[];
    const getTeamId = (name: string) => teams.find(t => t.name === name)?.id;

    for (const inc of incidents) {
      // Setup payload for domain functions
      const candidateInfo = {
        status: inc.status,
        tier: inc.tier,
        deadlineAt: new Date(inc.deadline_at).getTime(),
        createdAt: new Date(inc.created_at).getTime(),
        busterCalledAt: inc.buster_called_at ? new Date(inc.buster_called_at).getTime() : null,
        resolvedAt: null,
      };

      const needsBusterCall = shouldBusterCall(candidateInfo, now, BUSTER_LIMIT_MS);
      const needsEscalation = shouldEscalate(candidateInfo, now);

      if (!needsBusterCall && !needsEscalation) {
        continue; // Nothing to do
      }

      // Process inside a transaction with optimistic concurrency (version checking)
      const success = db.transaction(() => {
        // Read current version to ensure it hasn't changed
        const current = db.prepare('SELECT version FROM incidents WHERE id = ?').get(inc.id) as any;
        if (!current || current.version !== inc.version) return false;

        const timestamp = new Date(now).toISOString();

        if (needsBusterCall) {
          const updated = db.prepare(`
            UPDATE incidents
            SET buster_called_at = ?, tier = 3, version = version + 1
            WHERE id = ? AND version = ?
          `).run(timestamp, inc.id, inc.version);

          if (updated.changes === 0) return false;

          db.prepare(`
            INSERT INTO incident_events (incident_id, type, actor, message, at)
            VALUES (?, ?, ?, ?, ?)
          `).run(inc.id, EventType.BUSTER_CALL, 'escalation-engine', '🔱 BUSTER CALL INITIATED — 15 minute limit reached or tier 3', timestamp);

          return { type: 'BUSTER_CALL', incidentId: inc.id };
        }

        if (needsEscalation) {
          const newTier = nextTier(inc.tier);
          const teamName = tierTeamName(newTier);
          const teamId = getTeamId(teamName);
          const newDeadline = new Date(now + graceMs(inc.level, newTier)).toISOString();

          const updated = db.prepare(`
            UPDATE incidents
            SET tier = ?, team_id = ?, deadline_at = ?, escalated_at = ?, escalation_count = escalation_count + 1, version = version + 1
            WHERE id = ? AND version = ?
          `).run(newTier, teamId, newDeadline, timestamp, inc.id, inc.version);

          if (updated.changes === 0) return false;

          db.prepare(`
            INSERT INTO incident_events (incident_id, type, actor, from_value, to_value, message, at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(inc.id, EventType.AUTO_ESCALATED, 'escalation-engine', inc.tier.toString(), newTier.toString(), `Auto-escalated to tier ${newTier} (${teamName})`, timestamp);

          return { type: 'ESCALATION', incidentId: inc.id, newTier, teamName };
        }

        return false;
      })();

      if (success) {
        if (success.type === 'BUSTER_CALL') {
          eventBus.emitEvent(EventBusTypes.BUSTER_CALL_TRIGGERED, { incidentId: inc.id });
        } else if (success.type === 'ESCALATION') {
          eventBus.emitEvent(EventBusTypes.INCIDENT_ESCALATED, { 
            incidentId: inc.id, 
            tier: success.newTier, 
            teamName: success.teamName 
          });
        }
      }
    }
  }
}

export const ticker = new EscalationTicker();
