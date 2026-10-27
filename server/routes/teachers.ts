import { Router } from 'express';
import crypto from 'crypto';
import { db, hashPassword, logActivity } from '../db.js';
import { requireAuth, requireSuperAdmin, AuthRequest } from '../auth.js';

export const teachersRouter = Router();

// All teacher management routes require Super Admin
teachersRouter.use(requireAuth, requireSuperAdmin);

// GET /api/teachers
teachersRouter.get('/', (req: AuthRequest, res) => {
  const teachers = db.prepare(`
    SELECT id, username, full_name, role, email, phone, is_active, created_at
    FROM users
    WHERE role = 'teacher'
    ORDER BY full_name ASC
  `).all() as any[];

  // Attach assignments to each teacher
  const assignments = db.prepare(`
    SELECT ta.id as assignment_id, ta.teacher_id, ta.class_id, c.name as class_name, ta.subject_id, s.name as subject_name
    FROM teacher_assignments ta
    JOIN classes c ON ta.class_id = c.id
    LEFT JOIN subjects s ON ta.subject_id = s.id
  `).all() as any[];

  const teachersWithAssignments = teachers.map(t => {
    const myAssignments = assignments.filter(a => a.teacher_id === t.id);
    return {
      ...t,
      assignments: myAssignments,
    };
  });

  res.json({ teachers: teachersWithAssignments });
});

// POST /api/teachers (Create new teacher account)
teachersRouter.post('/', (req: AuthRequest, res) => {
  const { username, password, full_name, email, phone, assignments } = req.body;

  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password, and full name are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: `Username "${username}" is already taken.` });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { hash, salt } = hashPassword(password);

  db.prepare(`
    INSERT INTO users (id, username, password_hash, salt, full_name, role, email, phone, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 'teacher', ?, ?, 1, ?)
  `).run(id, username.trim(), hash, salt, full_name.trim(), email ? email.trim() : null, phone ? phone.trim() : null, now);

  // Add assignments if provided: array of { class_id, subject_id }
  if (Array.isArray(assignments)) {
    const insertAssign = db.prepare(`
      INSERT OR IGNORE INTO teacher_assignments (id, teacher_id, class_id, subject_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const item of assignments) {
      if (item.class_id) {
        insertAssign.run(crypto.randomUUID(), id, item.class_id, item.subject_id || null, now);
      }
    }
  }

  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'CREATE_TEACHER', 'User Management', `Created teacher account for ${full_name} (${username})`);
  res.status(201).json({ id, message: 'Teacher account created successfully.' });
});

// PUT /api/teachers/:id (Update teacher account & assignments)
teachersRouter.put('/:id', (req: AuthRequest, res) => {
  const { full_name, email, phone, password, is_active, assignments } = req.body;
  const teacher = db.prepare("SELECT id, username, full_name FROM users WHERE id = ? AND role = 'teacher'").get(req.params.id) as any;
  if (!teacher) return res.status(404).json({ error: 'Teacher account not found.' });

  // Optional password update
  if (password && password.trim()) {
    const { hash, salt } = hashPassword(password.trim());
    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, teacher.id);
  }

  db.prepare(`
    UPDATE users
    SET full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    full_name ? full_name.trim() : null,
    email !== undefined ? (email ? email.trim() : null) : null,
    phone !== undefined ? (phone ? phone.trim() : null) : null,
    is_active !== undefined ? is_active : null,
    teacher.id
  );

  // Update assignments if provided
  if (Array.isArray(assignments)) {
    // Delete existing
    db.prepare('DELETE FROM teacher_assignments WHERE teacher_id = ?').run(teacher.id);
    const now = new Date().toISOString();
    const insertAssign = db.prepare(`
      INSERT OR IGNORE INTO teacher_assignments (id, teacher_id, class_id, subject_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const item of assignments) {
      if (item.class_id) {
        insertAssign.run(crypto.randomUUID(), teacher.id, item.class_id, item.subject_id || null, now);
      }
    }
  }

  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'UPDATE_TEACHER', 'User Management', `Updated teacher profile & assignments for ${teacher.full_name}`);
  res.json({ message: 'Teacher updated successfully.' });
});

// PATCH /api/teachers/:id/status (Deactivate or activate)
teachersRouter.patch('/:id/status', (req: AuthRequest, res) => {
  const { is_active } = req.body;
  const teacher = db.prepare("SELECT id, full_name FROM users WHERE id = ? AND role = 'teacher'").get(req.params.id) as any;
  if (!teacher) return res.status(404).json({ error: 'Teacher not found.' });

  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, teacher.id);
  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'STATUS_TEACHER', 'User Management', `${is_active ? 'Activated' : 'Deactivated'} teacher ${teacher.full_name}`);
  res.json({ message: `Teacher account ${is_active ? 'activated' : 'deactivated'}.` });
});
