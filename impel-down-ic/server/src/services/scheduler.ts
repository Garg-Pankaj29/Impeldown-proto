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
  async tick() {
    if (this.isRunning) return; // Prevent overlapping ticks
    this.isRunning = true;
    try {
      await this.processEscalations();
    } catch (err) {
      console.error('[EscalationTicker] Error during tick:', err);
    } finally {
      this.isRunning = false;
    }
  }

  async processEscalations() {
    const db = getDb();
    const now = clock.now();
    
    // Fetch all unresolved incidents
    const res = await db.query('SELECT * FROM incidents WHERE status != $1', [Status.RESOLVED]);
    const incidents = res.rows;

    // Fetch team lookup for assignments
    const teamsRes = await db.query('SELECT id, name FROM teams');
    const teams = teamsRes.rows;
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

      const client = await db.connect();
      let success: any = false;

      try {
        await client.query('BEGIN');
        const currentRes = await client.query('SELECT version FROM incidents WHERE id = $1', [inc.id]);
        const current = currentRes.rows[0];
        
        if (current && current.version === inc.version) {
          const timestamp = new Date(now).toISOString();

          if (needsBusterCall) {
            const updatedRes = await client.query(`
              UPDATE incidents
              SET buster_called_at = $1, tier = 3, version = version + 1
              WHERE id = $2 AND version = $3
            `, [timestamp, inc.id, inc.version]);

            if (updatedRes.rowCount && updatedRes.rowCount > 0) {
              await client.query(`
                INSERT INTO incident_events (incident_id, type, actor, message, at)
                VALUES ($1, $2, $3, $4, $5)
              `, [inc.id, EventType.BUSTER_CALL, 'escalation-engine', '🔱 BUSTER CALL INITIATED — 15 minute limit reached or tier 3', timestamp]);
              success = { type: 'BUSTER_CALL', incidentId: inc.id };
            }
          } else if (needsEscalation) {
            const newTier = nextTier(inc.tier);
            const teamName = tierTeamName(newTier);
            const teamId = getTeamId(teamName);
            const newDeadline = new Date(now + graceMs(inc.level, newTier)).toISOString();

            const updatedRes = await client.query(`
              UPDATE incidents
              SET tier = $1, team_id = $2, deadline_at = $3, escalated_at = $4, escalation_count = escalation_count + 1, version = version + 1
              WHERE id = $5 AND version = $6
            `, [newTier, teamId, newDeadline, timestamp, inc.id, inc.version]);

            if (updatedRes.rowCount && updatedRes.rowCount > 0) {
              await client.query(`
                INSERT INTO incident_events (incident_id, type, actor, from_value, to_value, message, at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
              `, [inc.id, EventType.AUTO_ESCALATED, 'escalation-engine', inc.tier.toString(), newTier.toString(), `Auto-escalated to tier ${newTier} (${teamName})`, timestamp]);
              success = { type: 'ESCALATION', incidentId: inc.id, newTier, teamName };
            }
          }
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[EscalationTicker] db error:', err);
      } finally {
        client.release();
      }

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
