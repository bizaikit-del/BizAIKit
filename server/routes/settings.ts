import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db, logActivity } from '../db.js';
import { requireAuth, requireSuperAdmin, AuthRequest } from '../auth.js';

export const settingsRouter = Router();

// GET /api/settings/public (accessible to all authenticated users)
settingsRouter.get('/public', requireAuth, (req: AuthRequest, res) => {
  const settingsRows = db.prepare('SELECT key, value FROM system_settings').all() as any[];
  const settingsMap: Record<string, any> = {};
  for (const row of settingsRows) {
    try {
      settingsMap[row.key] = JSON.parse(row.value);
    } catch {
      settingsMap[row.key] = row.value;
    }
  }

  const gradingRules = db.prepare('SELECT * FROM grading_rules ORDER BY min_score DESC').all();

  res.json({
    settings: settingsMap,
    gradingRules,
  });
});

// Admin-only routes below
settingsRouter.use(requireAuth, requireSuperAdmin);

// POST /api/settings/system (Update school profile, calculation rules, etc.)
settingsRouter.post('/system', (req: AuthRequest, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'key and value are required.' });
  }

  const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);

  db.prepare(`
    INSERT INTO system_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, strVal);

  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'UPDATE_SETTINGS', 'Settings', `Updated setting ${key}`);
  res.json({ message: 'Settings saved successfully.' });
});

// CRUD for Grading Rules
settingsRouter.get('/grading-rules', (req: AuthRequest, res) => {
  const rules = db.prepare('SELECT * FROM grading_rules ORDER BY min_score DESC').all();
  res.json({ rules });
});

settingsRouter.post('/grading-rules', (req: AuthRequest, res) => {
  const { name, min_score, max_score, grade_letter, gpa_point, description } = req.body;
  if (!name || min_score === undefined || max_score === undefined || !grade_letter) {
    return res.status(400).json({ error: 'Name, min_score, max_score, and grade_letter are required.' });
  }

  const id = crypto.randomUUID();
  const maxOrder = (db.prepare('SELECT MAX(order_index) as m FROM grading_rules').get() as any).m || 0;

  db.prepare(`
    INSERT INTO grading_rules (id, name, min_score, max_score, grade_letter, gpa_point, description, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name.trim(),
    parseFloat(min_score),
    parseFloat(max_score),
    grade_letter.trim(),
    gpa_point !== undefined ? parseFloat(gpa_point) : 0,
    description ? description.trim() : null,
    maxOrder + 1
  );

  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'CREATE_GRADE_RULE', 'Settings', `Created grading rule ${grade_letter} (${min_score}-${max_score})`);
  res.status(201).json({ id, message: 'Grading rule added.' });
});

settingsRouter.put('/grading-rules/:id', (req: AuthRequest, res) => {
  const { name, min_score, max_score, grade_letter, gpa_point, description } = req.body;
  const current = db.prepare('SELECT id FROM grading_rules WHERE id = ?').get(req.params.id) as any;
  if (!current) return res.status(404).json({ error: 'Grading rule not found.' });

  db.prepare(`
    UPDATE grading_rules
    SET name = COALESCE(?, name),
        min_score = COALESCE(?, min_score),
        max_score = COALESCE(?, max_score),
        grade_letter = COALESCE(?, grade_letter),
        gpa_point = COALESCE(?, gpa_point),
        description = COALESCE(?, description)
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    min_score !== undefined ? parseFloat(min_score) : null,
    max_score !== undefined ? parseFloat(max_score) : null,
    grade_letter ? grade_letter.trim() : null,
    gpa_point !== undefined ? parseFloat(gpa_point) : null,
    description !== undefined ? description : null,
    current.id
  );

  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'UPDATE_GRADE_RULE', 'Settings', `Updated grading rule ${req.params.id}`);
  res.json({ message: 'Grading rule updated.' });
});

settingsRouter.delete('/grading-rules/:id', (req: AuthRequest, res) => {
  db.prepare('DELETE FROM grading_rules WHERE id = ?').run(req.params.id);
  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'DELETE_GRADE_RULE', 'Settings', `Deleted grading rule ${req.params.id}`);
  res.json({ message: 'Grading rule removed.' });
});

// GET /api/settings/activity-logs
settingsRouter.get('/activity-logs', (req: AuthRequest, res) => {
  const { limit, module, search } = req.query;
  let q = 'SELECT * FROM activity_logs WHERE 1=1';
  const params: any[] = [];

  if (module && typeof module === 'string' && module !== 'all') {
    q += ' AND module = ?';
    params.push(module);
  }

  if (search && typeof search === 'string' && search.trim()) {
    q += ' AND (user_name LIKE ? OR details LIKE ? OR action LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  q += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit as string, 10) || 50);

  const logs = db.prepare(q).all(...params);
  res.json({ logs });
});

// GET /api/settings/backup/export-json (Export full database as structured JSON)
settingsRouter.get('/backup/export-json', (req: AuthRequest, res) => {
  const backup = {
    exportedAt: new Date().toISOString(),
    system: 'Bizaikit School Management System',
    users: db.prepare('SELECT id, username, full_name, role, email, phone, is_active, created_at FROM users').all(),
    classes: db.prepare('SELECT * FROM classes').all(),
    subjects: db.prepare('SELECT * FROM subjects').all(),
    teacher_assignments: db.prepare('SELECT * FROM teacher_assignments').all(),
    students: db.prepare('SELECT * FROM students').all(),
    attendance_days: db.prepare('SELECT * FROM attendance_days').all(),
    attendance_records: db.prepare('SELECT * FROM attendance_records').all(),
    assessments: db.prepare('SELECT * FROM assessments').all(),
    assessment_marks: db.prepare('SELECT * FROM assessment_marks').all(),
    grading_rules: db.prepare('SELECT * FROM grading_rules').all(),
    system_settings: db.prepare('SELECT * FROM system_settings').all(),
  };

  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'BACKUP_EXPORT', 'Settings', 'Exported database backup JSON');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=bizaikit_school_backup_${new Date().toISOString().split('T')[0]}.json`);
  res.send(JSON.stringify(backup, null, 2));
});

// GET /api/settings/hostinger-info (Deployment details and health)
settingsRouter.get('/hostinger-info', (req: AuthRequest, res) => {
  const dbFile = path.resolve(process.cwd(), 'data', 'school.db');
  let dbSize = 0;
  if (fs.existsSync(dbFile)) {
    dbSize = fs.statSync(dbFile).size;
  }

  res.json({
    targetDomain: 'bizaikit.com',
    hostingProvider: 'Hostinger Business Web Hosting',
    runtime: `Node.js ${process.version}`,
    database: {
      engine: 'SQLite3 (ACID, WAL mode, relational schema)',
      storagePath: 'data/school.db',
      sizeBytes: dbSize,
      sizeFormatted: `${(dbSize / 1024).toFixed(1)} KB`,
    },
    deploymentSteps: [
      { step: 1, title: 'Upload Files', desc: 'Deploy app files to Hostinger Node.js Application root or git repository.' },
      { step: 2, title: 'Configure Node.js in Hostinger hPanel', desc: 'Select Node.js version (18, 20, or 22). Set Application Startup File to "server.ts" or compiled "dist/server.js".' },
      { step: 3, title: 'Set Environment Variables', desc: 'In hPanel Node.js settings, set PORT=3000, NODE_ENV=production, APP_URL=https://bizaikit.com, JWT_SECRET=(secure secret).' },
      { step: 4, title: 'Install and Build', desc: 'Run "npm install" and "npm run build" via Hostinger Terminal or deployment script.' },
      { step: 5, title: 'Domain & SSL', desc: 'Link bizaikit.com to the Node.js application port in Hostinger hPanel and enable Free SSL Certificate.' }
    ]
  });
});
