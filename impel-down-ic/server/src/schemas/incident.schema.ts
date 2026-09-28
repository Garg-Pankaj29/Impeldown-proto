// Schemas: Zod validation for incident
// Follows docs/architecture.md + security.md — validate at route boundary

import { z } from 'zod';
import { ALL_CATEGORIES, ALL_STATUSES } from '../domain/incident';

// ── Create incident ─────────────────────────────────────────

export const createIncidentSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be 3–120 characters')
    .max(120, 'Title must be 3–120 characters'),
  description: z.string().max(2000).default(''),
  location: z.string().min(1, 'Location is required').max(200),
  occurredAt: z.string().datetime(),
  category: z.enum(ALL_CATEGORIES as [string, ...string[]]),
  level: z.number().int().min(1, 'Level must be 1–6').max(6, 'Level must be 1–6').optional(),
  reporter: z.string().min(1).max(100),
  teamId: z.number().int().positive().optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

// ── Update status ───────────────────────────────────────────

export const updateStatusSchema = z.object({
  status: z.enum(ALL_STATUSES as [string, ...string[]]),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// ── Assign team ─────────────────────────────────────────────

export const assignTeamSchema = z.object({
  teamId: z.number().int().positive(),
});

export type AssignTeamInput = z.infer<typeof assignTeamSchema>;
