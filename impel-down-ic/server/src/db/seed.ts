// DB seeding logic — One Piece themed sample data
// Follows docs/architecture.md

import { getDb, closeDb } from './client';
import { migrate } from './migrate';
import { SLA_MINUTES } from '../config/sla';
import { computeDeadline } from '../domain/sla';
import { graceMs } from '../domain/escalation';
import { Status, LegacyCategory as Category, EventType } from '../domain/incident';

const MIN = 60_000;

// ── Teams (prd.md §6) ──────────────────────────────────────

const TEAMS = [
  { name: 'Jailer Beasts',      tier: 0, emoji: '🐂' },
  { name: 'Blugori Squad',      tier: 0, emoji: '🦍' },
  { name: "Hannyabal's Guard",  tier: 1, emoji: '⚔️' },
  { name: "Magellan's Command", tier: 2, emoji: '☠️' },
  { name: 'Seastone Engineering', tier: 0, emoji: '🔧' },
  { name: 'Buster Call Fleet',  tier: 3, emoji: '🔱' },
];

// ── Seed runner ─────────────────────────────────────────────

export function seed(): void {
  const db = getDb();
  migrate(db);

  const run = db.transaction(() => {
    // Clear existing data (reverse dependency order)
    db.exec('DELETE FROM incident_events');
    db.exec('DELETE FROM incidents');
    db.exec('DELETE FROM sla_config');
    db.exec('DELETE FROM teams');

    // ── SLA config ──────────────────────────────────────────
    const insertSla = db.prepare('INSERT INTO sla_config (level, minutes) VALUES (?, ?)');
    for (const [level, minutes] of Object.entries(SLA_MINUTES)) {
      insertSla.run(parseInt(level), minutes);
    }

    // ── Teams ───────────────────────────────────────────────
    const insertTeam = db.prepare('INSERT INTO teams (name, tier, emoji) VALUES (?, ?, ?)');
    for (const t of TEAMS) {
      insertTeam.run(t.name, t.tier, t.emoji);
    }

    // Build team-name → id lookup
    const teamRows = db.prepare('SELECT id, name FROM teams').all() as { id: number; name: string }[];
    const teamId = (name: string) => {
      const row = teamRows.find((r) => r.name === name);
      if (!row) throw new Error(`Team not found: ${name}`);
      return row.id;
    };

    // ── Incidents ───────────────────────────────────────────
    const insertIncident = db.prepare(`
      INSERT INTO incidents
        (title, description, category, level, status, team_id, tier,
         reporter, location, occurred_at, created_at, deadline_at, resolved_at, escalated_at,
         buster_called_at, escalation_count, version)
      VALUES
        (@title, @description, @category, @level, @status, @teamId, @tier,
         @reporter, @location, @occurredAt, @createdAt, @deadlineAt, @resolvedAt, @escalatedAt,
         @busterCalledAt, @escalationCount, @version)
    `);

    const insertEvent = db.prepare(`
      INSERT INTO incident_events
        (incident_id, type, actor, from_value, to_value, message, at)
      VALUES
        (@incidentId, @type, @actor, @fromValue, @toValue, @message, @at)
    `);

    const now = Date.now();
    const iso = (ms: number) => new Date(ms).toISOString();

    // Helper to insert an incident + CREATED event
    type IncidentSeed = {
      title: string;
      description: string;
      category: string;
      level: number;
      status: string;
      teamName: string | null;
      tier: number;
      reporter: string;
      location?: string;
      occurredAgoMin?: number;
      agoMin: number; // created X minutes ago
      resolvedAgoMin: number | null;
      escalatedAgoMin: number | null;
      busterCalledAgoMin: number | null;
      escalationCount: number;
    };

    const incidents: IncidentSeed[] = [
      // ── Demo Reporter Incidents ───────────────────────
      {
        title: 'Suspicious Activity near Docks',
        description: 'Spotted a small boat approaching the underwater docks without clearance.',
        category: Category.MARINE_PIRATE_INVASION, level: 1, status: Status.REPORTED,
        teamName: null, tier: 0, reporter: 'Reporter', location: 'Underground Dock',
        agoMin: 5, resolvedAgoMin: null, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },
      {
        title: 'Broken Seastone Cuffs',
        description: 'Found a broken pair of seastone cuffs in the Level 3 hallway.',
        category: Category.SEASTONE_FAILURE, level: 3, status: Status.IN_PROGRESS,
        teamName: 'Seastone Engineering', tier: 0, reporter: 'Reporter', location: 'Level 3: Starvation Hell',
        agoMin: 120, resolvedAgoMin: null, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },
      {
        title: 'Strange Gas Odor',
        description: 'Smell of poison gas near the ventilation shaft.',
        category: Category.POISON_GAS_ALERT, level: 4, status: Status.ASSIGNED,
        teamName: "Hannyabal's Guard", tier: 1, reporter: 'Reporter', location: 'Level 4: Burning Hell',
        agoMin: 45, resolvedAgoMin: null, escalatedAgoMin: 40, busterCalledAgoMin: null, escalationCount: 1,
      },
      {
        title: 'Prisoner Escaped Cell 4B',
        description: 'Cell 4B is empty and the bars are bent.',
        category: Category.PRISONER_ESCAPE, level: 2, status: Status.REPORTED,
        teamName: 'Jailer Beasts', tier: 2, reporter: 'Reporter', location: 'Level 2: Wild Beast Hell',
        agoMin: 60, resolvedAgoMin: null, escalatedAgoMin: 30, busterCalledAgoMin: null, escalationCount: 2,
      },
      {
        title: 'Main Gate Malfunction',
        description: 'The main entrance gate is stuck halfway open.',
        category: Category.GATE_MALFUNCTION, level: 1, status: Status.RESOLVED,
        teamName: 'Seastone Engineering', tier: 0, reporter: 'Reporter', location: 'Main Gate',
        agoMin: 300, resolvedAgoMin: 250, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },
      {
        title: 'Sea King Sighted',
        description: 'A massive Sea King is bumping against the outer hull of Level 6.',
        category: Category.SEA_KING_BREACH, level: 6, status: Status.RESOLVED,
        teamName: 'Buster Call Fleet', tier: 3, reporter: 'Reporter', location: 'Level 6: Eternal Hell',
        agoMin: 1440, resolvedAgoMin: 1400, escalatedAgoMin: 1420, busterCalledAgoMin: 1415, escalationCount: 3,
      },

      // ── Active (REPORTED) ──────────────────────────────
      {
        title: 'Cell Riot in Block C',
        description: 'Level 1 prisoners causing disturbance in C wing. Jailer beasts deployed.',
        category: Category.CELL_RIOT, level: 1, status: Status.REPORTED,
        teamName: 'Jailer Beasts', tier: 0, reporter: 'Guard Saldeath',
        agoMin: 2, resolvedAgoMin: null, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },
      {
        title: 'Gate 3 Mechanical Failure',
        description: 'Gate 3 hydraulics unresponsive. Manual override engaged.',
        category: Category.GATE_MALFUNCTION, level: 2, status: Status.REPORTED,
        teamName: null, tier: 0, reporter: 'Guard Domino',
        agoMin: 1, resolvedAgoMin: null, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },
      {
        title: 'Blugori Containment Breach',
        description: 'Two Blugori escaped holding pen near Level 4 entrance.',
        category: Category.PRISONER_ESCAPE, level: 4, status: Status.REPORTED,
        teamName: 'Blugori Squad', tier: 0, reporter: 'Jailer Sadi-chan',
        agoMin: 1, resolvedAgoMin: null, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },

      // ── ASSIGNED ───────────────────────────────────────
      {
        title: 'Poison Gas Leak — Level 4 Corridor',
        description: 'Minor gas leak detected near Burning Hell ventilation shaft.',
        category: Category.POISON_GAS_ALERT, level: 4, status: Status.ASSIGNED,
        teamName: 'Jailer Beasts', tier: 0, reporter: 'Guard Hannyabal',
        agoMin: 3, resolvedAgoMin: null, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },
      {
        title: 'Seastone Suppression Field Failure',
        description: 'Devil Fruit suppression failing in Cell Block E. Priority 1.',
        category: Category.SEASTONE_FAILURE, level: 5, status: Status.ASSIGNED,
        teamName: 'Seastone Engineering', tier: 0, reporter: 'Chief Jailer Shiryu',
        agoMin: 4, resolvedAgoMin: null, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },
      {
        title: 'Riot in Eternal Hell',
        description: 'Level 6 prisoners coordinating. Extreme caution required.',
        category: Category.CELL_RIOT, level: 6, status: Status.ASSIGNED,
        teamName: "Magellan's Command", tier: 0, reporter: 'Vice Warden Hannyabal',
        agoMin: 2, resolvedAgoMin: null, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },

      // ── IN_PROGRESS ────────────────────────────────────
      {
        title: 'Prisoner Escape Attempt — Level 3',
        description: 'Buggy the Clown spotted near stairwell. Blugori in pursuit.',
        category: Category.PRISONER_ESCAPE, level: 3, status: Status.IN_PROGRESS,
        teamName: 'Blugori Squad', tier: 0, reporter: 'Guard Saldeath',
        agoMin: 5, resolvedAgoMin: null, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },
      {
        title: 'Prisoner Uprising — Floor 1',
        description: 'Mass disturbance in Crimson Hell. Multiple cells breached.',
        category: Category.CELL_RIOT, level: 1, status: Status.IN_PROGRESS,
        teamName: 'Blugori Squad', tier: 0, reporter: 'Guard Domino',
        agoMin: 10, resolvedAgoMin: null, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },

      // ── IN_PROGRESS + ESCALATED ────────────────────────
      {
        title: 'Marine Spy Infiltration — Level 2',
        description: 'Unidentified marine officer spotted in restricted zone.',
        category: Category.MARINE_PIRATE_INVASION, level: 5, status: Status.IN_PROGRESS,
        teamName: "Hannyabal's Guard", tier: 1, reporter: 'Guard Saldeath',
        agoMin: 8, resolvedAgoMin: null, escalatedAgoMin: 3, busterCalledAgoMin: null, escalationCount: 1,
      },
      {
        title: 'Devil Fruit User Breakout',
        description: 'Paramecia user broke seastone restraints. Logia threat suspected.',
        category: Category.PRISONER_ESCAPE, level: 5, status: Status.IN_PROGRESS,
        teamName: "Magellan's Command", tier: 2, reporter: 'Jailer Sadi-chan',
        agoMin: 10, resolvedAgoMin: null, escalatedAgoMin: 3, busterCalledAgoMin: null, escalationCount: 2,
      },
      {
        title: 'Seastone Lock Override Detected',
        description: 'Someone bypassed seastone locks on Level 4. Investigating.',
        category: Category.SEASTONE_FAILURE, level: 4, status: Status.IN_PROGRESS,
        teamName: "Hannyabal's Guard", tier: 1, reporter: 'Seastone Tech Gorilla',
        agoMin: 8, resolvedAgoMin: null, escalatedAgoMin: 1, busterCalledAgoMin: null, escalationCount: 1,
      },
      {
        title: 'Marine-Pirate Alliance Breach',
        description: 'Coordinated attack on Level 6. Whitebeard pirates suspected.',
        category: Category.MARINE_PIRATE_INVASION, level: 6, status: Status.IN_PROGRESS,
        teamName: "Magellan's Command", tier: 2, reporter: 'Vice Warden Hannyabal',
        agoMin: 14, resolvedAgoMin: null, escalatedAgoMin: 5, busterCalledAgoMin: null, escalationCount: 2,
      },

      // ── RESOLVED ───────────────────────────────────────
      {
        title: 'Sea King Breach at Gate 1',
        description: 'Sea King rammed outer gate. Structural damage minimal.',
        category: Category.SEA_KING_BREACH, level: 2, status: Status.RESOLVED,
        teamName: 'Jailer Beasts', tier: 0, reporter: 'Guard Domino',
        agoMin: 15, resolvedAgoMin: 5, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },
      {
        title: 'Venom Demon Gas Alert',
        description: 'Magellan released controlled venom in Level 3 corridor. Now neutralised.',
        category: Category.POISON_GAS_ALERT, level: 3, status: Status.RESOLVED,
        teamName: 'Jailer Beasts', tier: 0, reporter: 'Warden Magellan',
        agoMin: 20, resolvedAgoMin: 12, escalatedAgoMin: null, busterCalledAgoMin: null, escalationCount: 0,
      },
      {
        title: 'Gate of Justice Destruction',
        description: 'Gate of Justice damaged during Luffy incursion. Buster Call was authorised.',
        category: Category.GATE_MALFUNCTION, level: 5, status: Status.RESOLVED,
        teamName: 'Buster Call Fleet', tier: 3, reporter: 'Fleet Admiral Sengoku',
        agoMin: 25, resolvedAgoMin: 16, escalatedAgoMin: 18, busterCalledAgoMin: 17, escalationCount: 3,
      },
    ];

    for (const inc of incidents) {
      const createdAt = now - inc.agoMin * MIN;
      let deadlineAt: number;

      if (inc.tier > 0 && inc.escalatedAgoMin !== null) {
        // Escalated: deadline = escalation time + grace
        const escalatedAt = now - inc.escalatedAgoMin * MIN;
        deadlineAt = escalatedAt + graceMs(inc.level, inc.tier);
      } else {
        deadlineAt = computeDeadline(createdAt, inc.level);
      }

      const resolvedAt = inc.resolvedAgoMin !== null ? now - inc.resolvedAgoMin * MIN : null;
      const escalatedAt = inc.escalatedAgoMin !== null ? now - inc.escalatedAgoMin * MIN : null;
      const busterCalledAt = inc.busterCalledAgoMin !== null ? now - inc.busterCalledAgoMin * MIN : null;
      const occurredAt = inc.occurredAgoMin !== undefined ? now - inc.occurredAgoMin * MIN : createdAt;

      const result = insertIncident.run({
        title: inc.title,
        description: inc.description,
        category: inc.category,
        level: inc.level,
        status: inc.status,
        teamId: inc.teamName ? teamId(inc.teamName) : null,
        tier: inc.tier,
        reporter: inc.reporter,
        location: inc.location || 'Unknown Location',
        occurredAt: iso(occurredAt),
        createdAt: iso(createdAt),
        deadlineAt: iso(deadlineAt),
        resolvedAt: resolvedAt ? iso(resolvedAt) : null,
        escalatedAt: escalatedAt ? iso(escalatedAt) : null,
        busterCalledAt: busterCalledAt ? iso(busterCalledAt) : null,
        escalationCount: inc.escalationCount,
        version: 1 + inc.escalationCount + (inc.status !== Status.REPORTED ? 1 : 0),
      });

      const incidentId = result.lastInsertRowid;

      // CREATED event
      insertEvent.run({
        incidentId,
        type: EventType.CREATED,
        actor: inc.reporter,
        fromValue: null,
        toValue: Status.REPORTED,
        message: `Incident reported: ${inc.title}`,
        at: iso(createdAt),
      });

      // Status-change events
      if (inc.status !== Status.REPORTED) {
        if (inc.status === Status.ASSIGNED || inc.status === Status.IN_PROGRESS || inc.status === Status.RESOLVED) {
          insertEvent.run({
            incidentId,
            type: EventType.STATUS_CHANGED,
            actor: 'system',
            fromValue: Status.REPORTED,
            toValue: Status.ASSIGNED,
            message: `Assigned to ${inc.teamName ?? 'unassigned'}`,
            at: iso(createdAt + 10_000),
          });
        }
        if (inc.status === Status.IN_PROGRESS || inc.status === Status.RESOLVED) {
          insertEvent.run({
            incidentId,
            type: EventType.STATUS_CHANGED,
            actor: 'system',
            fromValue: Status.ASSIGNED,
            toValue: Status.IN_PROGRESS,
            message: 'Work in progress',
            at: iso(createdAt + 30_000),
          });
        }
        if (inc.status === Status.RESOLVED && resolvedAt) {
          insertEvent.run({
            incidentId,
            type: EventType.RESOLVED,
            actor: inc.reporter,
            fromValue: Status.IN_PROGRESS,
            toValue: Status.RESOLVED,
            message: 'Incident resolved',
            at: iso(resolvedAt),
          });
        }
      }

      // Escalation events
      if (inc.escalationCount > 0 && escalatedAt) {
        for (let t = 1; t <= inc.escalationCount && t <= inc.tier; t++) {
          insertEvent.run({
            incidentId,
            type: EventType.AUTO_ESCALATED,
            actor: 'escalation-engine',
            fromValue: `tier-${t - 1}`,
            toValue: `tier-${t}`,
            message: `Auto-escalated to tier ${t}`,
            at: iso(escalatedAt - (inc.escalationCount - t) * 2 * MIN),
          });
        }
      }

      // Buster Call event
      if (busterCalledAt) {
        insertEvent.run({
          incidentId,
          type: EventType.BUSTER_CALL,
          actor: 'escalation-engine',
          fromValue: null,
          toValue: 'BUSTER_CALL',
          message: '🔱 BUSTER CALL INITIATED — Fleet Admiral Akainu authorised',
          at: iso(busterCalledAt),
        });
      }
    }
  });

  run();
  console.log(`🌊 Seeded ${TEAMS.length} teams + 15 incidents with events`);
}

// ── Run if executed directly ────────────────────────────────
seed();
closeDb();
