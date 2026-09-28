import { Router, Request, Response } from 'express';
import { getDb } from '../db/client';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export const authRouter = Router();

// Hashing utility using scrypt
const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
};

const verifyPassword = (password: string, hash: string): boolean => {
  const [salt, key] = hash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return key === derivedKey;
};

authRouter.post('/register', (req: Request, res: Response) => {
  const { email, password, role, name } = req.body;
  
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = getDb();
  
  try {
    const password_hash = hashPassword(password);
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, role, name)
      VALUES (?, ?, ?, ?)
    `);
    
    // Auto-generate name based on role if missing
    const nameMap: Record<string, string> = {
      guard: 'Reporter',
      responder: 'Response Team',
      warden: 'Incident Manager',
    };
    const finalName = name || nameMap[role] || 'User';

    const info = stmt.run(email, password_hash, role, finalName);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: info.lastInsertRowid, email, role, name: finalName }, 
      process.env.JWT_SECRET || 'impel-down-secret-key-123',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      user: { id: info.lastInsertRowid, email, role, name: finalName },
      token
    });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name }, 
    process.env.JWT_SECRET || 'impel-down-secret-key-123',
    { expiresIn: '24h' }
  );

  res.json({
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
    token
  });
});
