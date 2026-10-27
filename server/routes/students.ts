import { Router } from 'express';
import crypto from 'crypto';
import { db, logActivity } from '../db.js';
import { requireAuth, requireSuperAdmin, checkClassAccess, AuthRequest } from '../auth.js';

export const studentsRouter = Router();

// GET /api/students
studentsRouter.get('/', requireAuth, (req: AuthRequest, res) => {
  const { class_id, status, search } = req.query;
  const user = req.user!;
  const isSuperAdmin = user.role === 'super_admin';

  let query = `
    SELECT s.id, s.student_number, s.full_name, s.class_id, s.gender,
           s.date_of_birth, s.guardian_name, s.guardian_phone, s.status, s.created_at,
           c.name as class_name, c.grade_level
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Enforce teacher class isolation
  if (!isSuperAdmin) {
    const assigned = user.assignedClasses || [];
    if (assigned.length === 0) return res.json({ students: [] });
    query += ` AND s.class_id IN (${assigned.map(() => '?').join(',')})`;
    params.push(...assigned);
  }

  if (class_id && typeof class_id === 'string' && class_id !== 'all') {
    if (!checkClassAccess(req, class_id)) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this class.' });
    }
    query += ' AND s.class_id = ?';
    params.push(class_id);
  }

  if (status && typeof status === 'string' && status !== 'all') {
    query += ' AND s.status = ?';
    params.push(status);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ' AND (s.full_name LIKE ? OR s.student_number LIKE ? OR s.guardian_name LIKE ?)';
    params.push(term, term, term);
  }

  query += ' ORDER BY c.name ASC, s.full_name ASC';
  const students = db.prepare(query).all(...params);
  res.json({ students });
});

// GET /api/students/:id
studentsRouter.get('/:id', requireAuth, (req: AuthRequest, res) => {
  const student = db.prepare(`
    SELECT s.*, c.name as class_name
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `).get(req.params.id) as any;

  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  if (!checkClassAccess(req, student.class_id)) {
    return res.status(403).json({ error: 'Forbidden: Access to this student record is restricted.' });
  }

  // Count attendance & assessment marks records
  const attCount = (db.prepare('SELECT COUNT(*) as c FROM attendance_records WHERE student_id = ?').get(student.id) as any).c;
  const markCount = (db.prepare('SELECT COUNT(*) as c FROM assessment_marks WHERE student_id = ?').get(student.id) as any).c;

  res.json({
    student: {
      ...student,
      attendanceRecordCount: attCount,
      assessmentMarkCount: markCount,
    },
  });
});

// POST /api/students
studentsRouter.post('/', requireAuth, (req: AuthRequest, res) => {
  const { student_number, full_name, class_id, gender, date_of_birth, guardian_name, guardian_phone, status } = req.body;

  if (!student_number || !full_name || !class_id) {
    return res.status(400).json({ error: 'Student number, full name, and class are required.' });
  }

  if (!checkClassAccess(req, class_id)) {
    return res.status(403).json({ error: 'Forbidden: You cannot enroll students into unauthorized classes.' });
  }

  // Check unique student number
  const existing = db.prepare('SELECT id FROM students WHERE student_number = ?').get(student_number.trim());
  if (existing) {
    return res.status(400).json({ error: `Student number "${student_number}" is already registered to another student.` });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO students (id, student_number, full_name, class_id, gender, date_of_birth, guardian_name, guardian_phone, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    student_number.trim(),
    full_name.trim(),
    class_id,
    gender || 'Male',
    date_of_birth || null,
    guardian_name ? guardian_name.trim() : null,
    guardian_phone ? guardian_phone.trim() : null,
    status || 'active',
    now
  );

  logActivity(
    req.user!.id,
    req.user!.full_name,
    req.user!.role,
    'CREATE_STUDENT',
    'Student Management',
    `Created student ${full_name} (${student_number}) in class ${class_id}`
  );

  res.status(201).json({ id, message: 'Student registered successfully.' });
});

// PUT /api/students/:id
studentsRouter.put('/:id', requireAuth, (req: AuthRequest, res) => {
  const { student_number, full_name, class_id, gender, date_of_birth, guardian_name, guardian_phone, status } = req.body;

  const current = db.prepare('SELECT id, class_id, full_name, student_number FROM students WHERE id = ?').get(req.params.id) as any;
  if (!current) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  if (!checkClassAccess(req, current.class_id)) {
    return res.status(403).json({ error: 'Forbidden: You cannot edit students from this class.' });
  }

  if (class_id && class_id !== current.class_id && !checkClassAccess(req, class_id)) {
    return res.status(403).json({ error: 'Forbidden: You cannot move students to unauthorized classes.' });
  }

  // Check student number conflict
  if (student_number && student_number !== current.student_number) {
    const conflict = db.prepare('SELECT id FROM students WHERE student_number = ? AND id != ?').get(student_number.trim(), current.id);
    if (conflict) {
      return res.status(400).json({ error: `Student number "${student_number}" already in use.` });
    }
  }

  db.prepare(`
    UPDATE students
    SET student_number = COALESCE(?, student_number),
        full_name = COALESCE(?, full_name),
        class_id = COALESCE(?, class_id),
        gender = COALESCE(?, gender),
        date_of_birth = COALESCE(?, date_of_birth),
        guardian_name = COALESCE(?, guardian_name),
        guardian_phone = COALESCE(?, guardian_phone),
        status = COALESCE(?, status)
    WHERE id = ?
  `).run(
    student_number ? student_number.trim() : null,
    full_name ? full_name.trim() : null,
    class_id || null,
    gender || null,
    date_of_birth || null,
    guardian_name ? guardian_name.trim() : null,
    guardian_phone ? guardian_phone.trim() : null,
    status || null,
    current.id
  );

  logActivity(
    req.user!.id,
    req.user!.full_name,
    req.user!.role,
    'UPDATE_STUDENT',
    'Student Management',
    `Updated details for student ${full_name || current.full_name} (${student_number || current.student_number})`
  );

  res.json({ message: 'Student updated successfully.' });
});

// PATCH /api/students/:id/status (toggle active / inactive)
studentsRouter.patch('/:id/status', requireAuth, (req: AuthRequest, res) => {
  const { status } = req.body;
  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Valid status ("active" or "inactive") is required.' });
  }

  const student = db.prepare('SELECT id, full_name, class_id, status FROM students WHERE id = ?').get(req.params.id) as any;
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  if (!checkClassAccess(req, student.class_id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  db.prepare('UPDATE students SET status = ? WHERE id = ?').run(status, student.id);

  logActivity(
    req.user!.id,
    req.user!.full_name,
    req.user!.role,
    'STATUS_CHANGE_STUDENT',
    'Student Management',
    `Changed status of ${student.full_name} to ${status}`
  );

  res.json({ message: `Student marked as ${status}.`, status });
});

// DELETE /api/students/:id (with safeguard against accidental deletion of referenced records)
studentsRouter.delete('/:id', requireAuth, requireSuperAdmin, (req: AuthRequest, res) => {
  const student = db.prepare('SELECT id, full_name, student_number, class_id FROM students WHERE id = ?').get(req.params.id) as any;
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  // Safeguard: Check if referenced by attendance or assessment marks
  const attCount = (db.prepare('SELECT COUNT(*) as c FROM attendance_records WHERE student_id = ?').get(student.id) as any).c;
  const markCount = (db.prepare('SELECT COUNT(*) as c FROM assessment_marks WHERE student_id = ?').get(student.id) as any).c;

  if (attCount > 0 || markCount > 0) {
    return res.status(400).json({
      error: `Cannot permanently delete "${student.full_name}". This student has ${attCount} attendance records and ${markCount} assessment marks. Deleting would corrupt academic history. Please deactivate the student record instead to preserve integrity.`,
      canDeactivate: true,
      attendanceRecords: attCount,
      assessmentMarks: markCount,
    });
  }

  db.prepare('DELETE FROM students WHERE id = ?').run(student.id);

  logActivity(
    req.user!.id,
    req.user!.full_name,
    req.user!.role,
    'DELETE_STUDENT',
    'Student Management',
    `Permanently deleted unreferenced student record ${student.full_name} (${student.student_number})`
  );

  res.json({ message: 'Student deleted successfully.' });
});
