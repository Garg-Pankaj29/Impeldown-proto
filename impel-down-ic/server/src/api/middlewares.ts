import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { TransitionError } from '../domain/incident';

export interface AuthRequest extends Request {
  user?: any;
}

// ── Validation Middleware ────────────────────────────────────

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
        });
      } else {
        next(err);
      }
    }
  };
}

// ── Auth Middleware ───────────────────────────────────────────

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'impel-down-secret-key-123');
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Global Error Handler ──────────────────────────────────────

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Error]', err.stack || err);

  if (err instanceof TransitionError) {
    res.status(409).json({
      error: 'Invalid State Transition',
      message: err.message,
      from: err.from,
      to: err.to,
    });
    return;
  }

  res.status(500).json({ error: 'Internal Server Error' });
}
