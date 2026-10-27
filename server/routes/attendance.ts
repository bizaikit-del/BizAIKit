import { Router } from 'express';
import crypto from 'crypto';
import { db, logActivity } from '../db.js';
import { requireAuth, requireSuperAdmin, checkClassAccess, AuthRequest } from '../auth.js';

export const attendanceRouter = Router();

// GET /api/attendance/grid?class_id=...&month=YYYY-MM&start_date=...&end_date=...
attendanceRouter.get('/grid', requireAuth, (req: AuthRequest, res) => {
  const { class_id, month, start_date, end_date } = req.query;

  if (!class_id || typeof class_id !== 'string') {
    return res.status(400).json({ error: 'class_id is required.' });
  }

  if (!checkClassAccess(req, class_id)) {
    return res.status(403).json({ error: 'Forbidden: You do not have access to attendance for this class.' });
  }

  // 1. Get class details
  const classItem = db.prepare('SELECT id, name, grade_level, section FROM classes WHERE id = ?').get(class_id) as any;
  if (!classItem) return res.status(404).json({ error: 'Class not found.' });

  // 2. Fetch days for this class (filtered by month or date range if specified)
  let dayQuery = 'SELECT id, class_id, date, period_name, order_index FROM attendance_days WHERE class_id = ?';
  const dayParams: any[] = [class_id];

  if (month && typeof month === 'string') {
    dayQuery += ' AND date LIKE ?';
    dayParams.push(`${month}%`);
  } else if (start_date && end_date) {
    dayQuery += ' AND date BETWEEN ? AND ?';
    dayParams.push(start_date, end_date);
  }

  dayQuery += ' ORDER BY order_index ASC, date ASC';
  const days = db.prepare(dayQuery).all(...dayParams) as any[];

  // 3. Fetch active students in this class
  const students = db.prepare(`
    SELECT id, student_number, full_name, gender, status
    FROM students
    WHERE class_id = ? AND status = 'active'
    ORDER BY full_name ASC
  `).all(class_id) as any[];

  // 4. Fetch attendance records for these days
  let records: any[] = [];
  if (days.length > 0 && students.length > 0) {
    const dayIds = days.map(d => d.id);
    const dayPlaceholders = dayIds.map(() => '?').join(',');
    records = db.prepare(`
      SELECT attendance_day_id, student_id, status, remarks
      FROM attendance_records
      WHERE attendance_day_id IN (${dayPlaceholders})
    `).all(...dayIds) as any[];
  }

  // 5. System settings for calculation rules
  const settingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'attendance_rule'").get() as any;
  const attendanceRule = settingRow ? JSON.parse(settingRow.value) : { include_excused_in_denominator: false };

  // 6. Map records into quick lookup: recordsMap[studentId][dayId] = status
  const recordsMap: Record<string, Record<string, string>> = {};
  for (const s of students) {
    recordsMap[s.id] = {};
  }
  for (const r of records) {
    if (recordsMap[r.student_id]) {
      recordsMap[r.student_id][r.attendance_day_id] = r.status;
    }
  }

  // 7. Calculate totals & percentages per student
  const studentRows = students.map((s, idx) => {
    let totalP = 0;
    let totalA = 0;
    let totalE = 0;

    for (const d of days) {
      const status = recordsMap[s.id]?.[d.id];
      if (status === 'P') totalP++;
      else if (status === 'A') totalA++;
      else if (status === 'E') totalE++;
    }

    const totalDaysRecorded = totalP + totalA + totalE;
    let percentage = 0;
    if (totalDaysRecorded > 0) {
      const denom = attendanceRule.include_excused_in_denominator
        ? (totalP + totalA + totalE)
        : (totalP + totalA);
      percentage = denom > 0 ? Math.round((totalP / denom) * 1000) / 10 : 0; // 1 decimal place
    }

    return {
      student_id: s.id,
      student_number: s.student_number,
      student_name: s.full_name,
      gender: s.gender,
      records: recordsMap[s.id] || {},
      totalP,
      totalA,
      totalE,
      percentage,
      rank: 0,
    };
  });

  // Calculate ranks based on percentage (descending)
  const sorted = [...studentRows].sort((a, b) => b.percentage - a.percentage);
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].percentage < sorted[i - 1].percentage) {
      currentRank = i + 1;
    }
    sorted[i].rank = currentRank;
  }

  res.json({
    class: classItem,
    days,
    rows: studentRows,
    calculationRule: attendanceRule,
  });
});

// POST /api/attendance/days (Add school day for a class)
attendanceRouter.post('/days', requireAuth, (req: AuthRequest, res) => {
  const { class_id, date, period_name } = req.body;
  if (!class_id || !date) {
    return res.status(400).json({ error: 'class_id and date (YYYY-MM-DD) are required.' });
  }

  if (!checkClassAccess(req, class_id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  // Check unique date for this class
  const existing = db.prepare('SELECT id FROM attendance_days WHERE class_id = ? AND date = ?').get(class_id, date);
  if (existing) {
    return res.status(400).json({ error: `An attendance school day for ${date} already exists for this class.` });
  }

  // Get max order index
  const maxOrder = (db.prepare('SELECT MAX(order_index) as m FROM attendance_days WHERE class_id = ?').get(class_id) as any).m || 0;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO attendance_days (id, class_id, date, period_name, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, class_id, date, period_name || 'Regular', maxOrder + 1, now);

  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'ADD_ATTENDANCE_DAY', 'Attendance', `Added school day ${date} for class ${class_id}`);
  res.status(201).json({ id, date, period_name: period_name || 'Regular', message: 'School day added successfully.' });
});

// PUT /api/attendance/days/:id (Update school day date or period name)
attendanceRouter.put('/days/:id', requireAuth, (req: AuthRequest, res) => {
  const { date, period_name, order_index } = req.body;
  const day = db.prepare('SELECT id, class_id, date FROM attendance_days WHERE id = ?').get(req.params.id) as any;
  if (!day) return res.status(404).json({ error: 'School day not found.' });

  if (!checkClassAccess(req, day.class_id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  if (date && date !== day.date) {
    const conflict = db.prepare('SELECT id FROM attendance_days WHERE class_id = ? AND date = ? AND id != ?').get(day.class_id, date, day.id);
    if (conflict) return res.status(400).json({ error: `An attendance day for ${date} already exists in this class.` });
  }

  db.prepare(`
    UPDATE attendance_days
    SET date = COALESCE(?, date),
        period_name = COALESCE(?, period_name),
        order_index = COALESCE(?, order_index)
    WHERE id = ?
  `).run(date || null, period_name || null, order_index !== undefined ? order_index : null, day.id);

  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'UPDATE_ATTENDANCE_DAY', 'Attendance', `Updated school day ${day.id}`);
  res.json({ message: 'School day updated successfully.' });
});

// DELETE /api/attendance/days/:id (Delete school day and its attendance records)
attendanceRouter.delete('/days/:id', requireAuth, (req: AuthRequest, res) => {
  const day = db.prepare('SELECT id, class_id, date FROM attendance_days WHERE id = ?').get(req.params.id) as any;
  if (!day) return res.status(404).json({ error: 'School day not found.' });

  if (!checkClassAccess(req, day.class_id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  // Deleting attendance day cascades to attendance_records
  db.prepare('DELETE FROM attendance_days WHERE id = ?').run(day.id);
  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'DELETE_ATTENDANCE_DAY', 'Attendance', `Deleted school day ${day.date} for class ${day.class_id}`);
  res.json({ message: 'School day removed.' });
});

// POST /api/attendance/records/save (Save single or batch attendance records)
attendanceRouter.post('/records/save', requireAuth, (req: AuthRequest, res) => {
  const { class_id, updates } = req.body;
  // updates: array of { attendance_day_id, student_id, status: 'P'|'A'|'E'|'', remarks? }

  if (!class_id || !Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'class_id and updates array are required.' });
  }

  if (!checkClassAccess(req, class_id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const now = new Date().toISOString();
  const upsertStmt = db.prepare(`
    INSERT INTO attendance_records (id, attendance_day_id, student_id, status, remarks, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(attendance_day_id, student_id) DO UPDATE SET
      status = excluded.status,
      remarks = COALESCE(excluded.remarks, attendance_records.remarks),
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `);

  const deleteStmt = db.prepare(`
    DELETE FROM attendance_records WHERE attendance_day_id = ? AND student_id = ?
  `);

  const transaction = db.transaction((items: any[]) => {
    for (const item of items) {
      if (!item.status) {
        // empty status means clear record
        deleteStmt.run(item.attendance_day_id, item.student_id);
      } else if (['P', 'A', 'E'].includes(item.status)) {
        upsertStmt.run(
          crypto.randomUUID(),
          item.attendance_day_id,
          item.student_id,
          item.status,
          item.remarks || '',
          req.user!.id,
          now
        );
      }
    }
  });

  transaction(updates);

  logActivity(
    req.user!.id,
    req.user!.full_name,
    req.user!.role,
    'UPDATE_ATTENDANCE',
    'Attendance',
    `Updated ${updates.length} attendance records for class ${class_id}`
  );

  res.json({ success: true, count: updates.length, savedAt: now });
});

// POST /api/attendance/batch-fill (e.g. Mark all active students Present for a day)
attendanceRouter.post('/batch-fill', requireAuth, (req: AuthRequest, res) => {
  const { class_id, attendance_day_id, status } = req.body;
  if (!class_id || !attendance_day_id || !status || !['P', 'A', 'E'].includes(status)) {
    return res.status(400).json({ error: 'class_id, attendance_day_id, and valid status (P, A, E) are required.' });
  }

  if (!checkClassAccess(req, class_id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const students = db.prepare("SELECT id FROM students WHERE class_id = ? AND status = 'active'").all(class_id) as any[];
  const now = new Date().toISOString();

  const upsert = db.prepare(`
    INSERT INTO attendance_records (id, attendance_day_id, student_id, status, remarks, updated_by, updated_at)
    VALUES (?, ?, ?, ?, '', ?, ?)
    ON CONFLICT(attendance_day_id, student_id) DO UPDATE SET
      status = excluded.status,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `);

  const fillTx = db.transaction((list: any[]) => {
    for (const s of list) {
      upsert.run(crypto.randomUUID(), attendance_day_id, s.id, status, req.user!.id, now);
    }
  });

  fillTx(students);

  logActivity(
    req.user!.id,
    req.user!.full_name,
    req.user!.role,
    'BATCH_ATTENDANCE',
    'Attendance',
    `Batch marked ${students.length} students as "${status}" for day ${attendance_day_id}`
  );

  res.json({ success: true, count: students.length, message: `All active students marked as ${status}.` });
});

// GET /api/attendance/report (Monthly or Term Summary Report)
attendanceRouter.get('/report', requireAuth, (req: AuthRequest, res) => {
  const { class_id, term, month } = req.query;
  if (!class_id || typeof class_id !== 'string') {
    return res.status(400).json({ error: 'class_id is required.' });
  }

  if (!checkClassAccess(req, class_id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const classItem = db.prepare('SELECT * FROM classes WHERE id = ?').get(class_id) as any;
  let dayQuery = 'SELECT id, date, period_name FROM attendance_days WHERE class_id = ?';
  const dayParams: any[] = [class_id];

  if (month && typeof month === 'string') {
    dayQuery += ' AND date LIKE ?';
    dayParams.push(`${month}%`);
  }

  dayQuery += ' ORDER BY date ASC';
  const days = db.prepare(dayQuery).all(...dayParams) as any[];
  const students = db.prepare("SELECT id, student_number, full_name, gender FROM students WHERE class_id = ? AND status = 'active' ORDER BY full_name ASC").all(class_id) as any[];

  const settingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'attendance_rule'").get() as any;
  const attendanceRule = settingRow ? JSON.parse(settingRow.value) : { include_excused_in_denominator: false };

  // Calculate stats per student
  const studentStats = students.map(s => {
    const records = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM attendance_records
      WHERE student_id = ? AND attendance_day_id IN (${days.length > 0 ? days.map(() => '?').join(',') : 'NULL'})
      GROUP BY status
    `).all(s.id, ...days.map(d => d.id)) as any[];

    let p = 0, a = 0, e = 0;
    for (const r of records) {
      if (r.status === 'P') p = r.count;
      else if (r.status === 'A') a = r.count;
      else if (r.status === 'E') e = r.count;
    }
    const denom = attendanceRule.include_excused_in_denominator ? (p + a + e) : (p + a);
    const percentage = denom > 0 ? Math.round((p / denom) * 1000) / 10 : 0;

    return {
      student_id: s.id,
      student_number: s.student_number,
      full_name: s.full_name,
      gender: s.gender,
      present: p,
      absent: a,
      excused: e,
      total_days: days.length,
      percentage,
    };
  });

  res.json({
    class: classItem,
    totalDays: days.length,
    students: studentStats,
    filter: { term, month },
    generatedAt: new Date().toISOString(),
  });
});
