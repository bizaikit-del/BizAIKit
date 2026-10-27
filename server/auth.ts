import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bizaikit-school-mgmt-super-secret-key-2026';

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: 'super_admin' | 'teacher';
  email?: string;
  assignedClasses?: string[]; // class IDs
  assignedSubjects?: string[]; // subject IDs
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function generateToken(payload: { id: string; username: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { id: string; username: string; role: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token is missing.' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }

  // Load user from database to ensure still active and get fresh permissions
  const user = db.prepare('SELECT id, username, full_name, role, email, is_active FROM users WHERE id = ?').get(payload.id) as any;
  if (!user || user.is_active !== 1) {
    return res.status(401).json({ error: 'Unauthorized: Account not found or deactivated.' });
  }

  // If teacher, fetch assigned classes and subjects
  let assignedClasses: string[] = [];
  let assignedSubjects: string[] = [];
  if (user.role === 'teacher') {
    const assignments = db.prepare(`
      SELECT class_id, subject_id FROM teacher_assignments WHERE teacher_id = ?
    `).all(user.id) as Array<{ class_id: string; subject_id: string | null }>;
    assignedClasses = [...new Set(assignments.map(a => a.class_id))];
    assignedSubjects = [...new Set(assignments.filter(a => a.subject_id).map(a => a.subject_id!))];
  }

  req.user = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    email: user.email,
    assignedClasses,
    assignedSubjects,
  };

  next();
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Super Administrator privileges required.' });
  }
  next();
}

export function checkClassAccess(req: AuthRequest, classId: string): boolean {
  if (!req.user) return false;
  if (req.user.role === 'super_admin') return true;
  return req.user.assignedClasses?.includes(classId) || false;
}
