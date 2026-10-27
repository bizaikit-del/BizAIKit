import { Router } from 'express';
import { db, verifyPassword, logActivity } from '../db.js';
import { generateToken, requireAuth, AuthRequest } from '../auth.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare(`
    SELECT id, username, password_hash, salt, full_name, role, email, phone, is_active
    FROM users
    WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
  `).get(username.trim(), username.trim()) as any;

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  if (user.is_active !== 1) {
    return res.status(403).json({ error: 'This account has been deactivated. Please contact the administrator.' });
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
  }

  const token = generateToken({ id: user.id, username: user.username, role: user.role });

  // Fetch assigned classes if teacher
  let assignedClasses: any[] = [];
  let assignedSubjects: any[] = [];
  if (user.role === 'teacher') {
    const assignments = db.prepare(`
      SELECT ta.class_id, c.name as class_name, ta.subject_id, s.name as subject_name
      FROM teacher_assignments ta
      JOIN classes c ON ta.class_id = c.id
      LEFT JOIN subjects s ON ta.subject_id = s.id
      WHERE ta.teacher_id = ?
    `).all(user.id);
    assignedClasses = [...new Map(assignments.map((a: any) => [a.class_id, { id: a.class_id, name: a.class_name }])).values()];
    assignedSubjects = assignments.filter((a: any) => a.subject_id).map((a: any) => ({ id: a.subject_id, name: a.subject_name }));
  }

  logActivity(
    user.id,
    user.full_name,
    user.role,
    'USER_LOGIN',
    'Authentication',
    `User ${user.username} logged in successfully`,
    req.ip
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      assignedClasses,
      assignedSubjects,
    },
  });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const userDb = db.prepare(`
    SELECT id, username, full_name, role, email, phone FROM users WHERE id = ?
  `).get(user.id) as any;

  let assignedClasses: any[] = [];
  let assignedSubjects: any[] = [];
  if (user.role === 'teacher') {
    const assignments = db.prepare(`
      SELECT ta.class_id, c.name as class_name, ta.subject_id, s.name as subject_name
      FROM teacher_assignments ta
      JOIN classes c ON ta.class_id = c.id
      LEFT JOIN subjects s ON ta.subject_id = s.id
      WHERE ta.teacher_id = ?
    `).all(user.id);
    assignedClasses = [...new Map(assignments.map((a: any) => [a.class_id, { id: a.class_id, name: a.class_name }])).values()];
    assignedSubjects = assignments.filter((a: any) => a.subject_id).map((a: any) => ({ id: a.subject_id, name: a.subject_name }));
  }

  res.json({
    user: {
      ...userDb,
      assignedClasses,
      assignedSubjects,
    },
  });
});

// POST /api/auth/logout
authRouter.post('/logout', requireAuth, (req: AuthRequest, res) => {
  if (req.user) {
    logActivity(
      req.user.id,
      req.user.full_name,
      req.user.role,
      'USER_LOGOUT',
      'Authentication',
      `User ${req.user.username} signed out`,
      req.ip
    );
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});
