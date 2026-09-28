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

authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, password, role, name } = req.body;
  
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = getDb();
  
  try {
    const password_hash = hashPassword(password);
    
    // Auto-generate name based on role if missing
    const nameMap: Record<string, string> = {
      guard: 'Reporter',
      responder: 'Response Team',
      warden: 'Incident Manager',
    };
    const finalName = name || nameMap[role] || 'User';

    const result = await db.query(`
      INSERT INTO users (email, password_hash, role, name)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [email, password_hash, role, finalName]);
    
    const newUserId = result.rows[0].id;
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUserId, email, role, name: finalName }, 
      process.env.JWT_SECRET || 'impel-down-secret-key-123',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      user: { id: newUserId, email, role, name: finalName },
      token
    });
  } catch (err: any) {
    if (err.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const db = getDb();
  
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
  
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

authRouter.post('/register-responder', async (req: Request, res: Response) => {
  const { email, password, fullName, teamId, skills, availability, location, contactNumber, motivation } = req.body;
  
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = getDb();
  
  try {
    const password_hash = hashPassword(password);
    
    // 1. Create user
    const userResult = await db.query(`
      INSERT INTO users (email, password_hash, role, name)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [email, password_hash, 'responder', fullName]);
    
    const newUserId = userResult.rows[0].id;

    // 2. Insert response team details
    await db.query(`
      INSERT INTO response_team_details (team_id, specialty, shift, contact_number, notes)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      teamId ? parseInt(teamId, 10) : null,
      skills ? JSON.stringify(skills) : null,
      availability || null,
      contactNumber || null,
      motivation || null
    ]);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUserId, email, role: 'responder', name: fullName }, 
      process.env.JWT_SECRET || 'impel-down-secret-key-123',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      user: { id: newUserId, email, role: 'responder', name: fullName },
      token
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
