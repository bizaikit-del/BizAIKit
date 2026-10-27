import { Router } from 'express';
import crypto from 'crypto';
import { db, logActivity } from '../db.js';
import { requireAuth, requireSuperAdmin, checkClassAccess, AuthRequest } from '../auth.js';

export const classesRouter = Router();

// GET /api/classes
classesRouter.get('/', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const isSuperAdmin = user.role === 'super_admin';

  let classes: any[] = [];
  if (isSuperAdmin) {
    classes = db.prepare(`
      SELECT c.*,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as active_students_count,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as total_students_count
      FROM classes c
      ORDER BY c.grade_level ASC, c.name ASC
    `).all();
  } else {
    const assigned = user.assignedClasses || [];
    if (assigned.length === 0) return res.json({ classes: [] });
    const placeholders = assigned.map(() => '?').join(',');
    classes = db.prepare(`
      SELECT c.*,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as active_students_count,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as total_students_count
      FROM classes c
      WHERE c.id IN (${placeholders})
      ORDER BY c.grade_level ASC, c.name ASC
    `).all(...assigned);
  }

  res.json({ classes });
});

// POST /api/classes (Super Admin only)
classesRouter.post('/', requireAuth, requireSuperAdmin, (req: AuthRequest, res) => {
  const { name, grade_level, section, academic_year, room } = req.body;
  if (!name || !grade_level) {
    return res.status(400).json({ error: 'Class name and grade level are required.' });
  }

  const existing = db.prepare('SELECT id FROM classes WHERE LOWER(name) = LOWER(?)').get(name.trim());
  if (existing) {
    return res.status(400).json({ error: `A class with name "${name}" already exists.` });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO classes (id, name, grade_level, section, academic_year, room, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name.trim(),
    grade_level.trim(),
    section ? section.trim() : null,
    academic_year || '2026/2027',
    room ? room.trim() : null,
    now
  );

  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'CREATE_CLASS', 'Class Management', `Created class "${name}"`);
  res.status(201).json({ id, message: 'Class created successfully.' });
});

// PUT /api/classes/:id (Super Admin only)
classesRouter.put('/:id', requireAuth, requireSuperAdmin, (req: AuthRequest, res) => {
  const { name, grade_level, section, academic_year, room } = req.body;
  const current = db.prepare('SELECT id, name FROM classes WHERE id = ?').get(req.params.id) as any;
  if (!current) return res.status(404).json({ error: 'Class not found.' });

  if (name && name.trim().toLowerCase() !== current.name.toLowerCase()) {
    const conflict = db.prepare('SELECT id FROM classes WHERE LOWER(name) = LOWER(?) AND id != ?').get(name.trim(), current.id);
    if (conflict) return res.status(400).json({ error: `Class name "${name}" is already taken.` });
  }

  db.prepare(`
    UPDATE classes
    SET name = COALESCE(?, name),
        grade_level = COALESCE(?, grade_level),
        section = COALESCE(?, section),
        academic_year = COALESCE(?, academic_year),
        room = COALESCE(?, room)
    WHERE id = ?
  `).run(name ? name.trim() : null, grade_level || null, section || null, academic_year || null, room || null, current.id);

  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'UPDATE_CLASS', 'Class Management', `Updated class details for "${name || current.name}"`);
  res.json({ message: 'Class updated successfully.' });
});

// DELETE /api/classes/:id (Super Admin only - with dependency check)
classesRouter.delete('/:id', requireAuth, requireSuperAdmin, (req: AuthRequest, res) => {
  const current = db.prepare('SELECT id, name FROM classes WHERE id = ?').get(req.params.id) as any;
  if (!current) return res.status(404).json({ error: 'Class not found.' });

  const studentCount = (db.prepare('SELECT COUNT(*) as c FROM students WHERE class_id = ?').get(current.id) as any).c;
  const attCount = (db.prepare('SELECT COUNT(*) as c FROM attendance_days WHERE class_id = ?').get(current.id) as any).c;
  const assessCount = (db.prepare('SELECT COUNT(*) as c FROM assessments WHERE class_id = ?').get(current.id) as any).c;

  if (studentCount > 0 || attCount > 0 || assessCount > 0) {
    return res.status(400).json({
      error: `Cannot delete class "${current.name}". It currently has ${studentCount} students enrolled, ${attCount} attendance days, and ${assessCount} assessments associated with it. Please reassign or remove these records first.`,
    });
  }

  db.prepare('DELETE FROM classes WHERE id = ?').run(current.id);
  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'DELETE_CLASS', 'Class Management', `Deleted empty class "${current.name}"`);
  res.json({ message: 'Class deleted successfully.' });
});

// GET /api/classes/subjects
classesRouter.get('/subjects/list', requireAuth, (req: AuthRequest, res) => {
  const subjects = db.prepare('SELECT * FROM subjects ORDER BY name ASC').all();
  res.json({ subjects });
});

// POST /api/classes/subjects
classesRouter.post('/subjects', requireAuth, requireSuperAdmin, (req: AuthRequest, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Subject name and code are required.' });

  const existing = db.prepare('SELECT id FROM subjects WHERE LOWER(code) = LOWER(?)').get(code.trim());
  if (existing) return res.status(400).json({ error: `Subject code "${code}" already exists.` });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO subjects (id, name, code, created_at) VALUES (?, ?, ?, ?)').run(id, name.trim(), code.trim(), now);
  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'CREATE_SUBJECT', 'Class Management', `Created subject ${name} (${code})`);
  res.status(201).json({ id, message: 'Subject created successfully.' });
});
