import { Router } from 'express';
import crypto from 'crypto';
import { db, logActivity } from '../db.js';
import { requireAuth, requireSuperAdmin, checkClassAccess, AuthRequest } from '../auth.js';

export const assessmentsRouter = Router();

// GET /api/assessments/grid?class_id=...&subject_id=...&term=...
assessmentsRouter.get('/grid', requireAuth, (req: AuthRequest, res) => {
  const { class_id, subject_id, term } = req.query;

  if (!class_id || typeof class_id !== 'string') {
    return res.status(400).json({ error: 'class_id is required.' });
  }

  if (!checkClassAccess(req, class_id)) {
    return res.status(403).json({ error: 'Forbidden: You do not have access to this class.' });
  }

  // 1. Class and subject details
  const classItem = db.prepare('SELECT id, name, grade_level, section FROM classes WHERE id = ?').get(class_id) as any;
  if (!classItem) return res.status(404).json({ error: 'Class not found.' });

  let subjectItem = null;
  if (subject_id && typeof subject_id === 'string' && subject_id !== 'all') {
    subjectItem = db.prepare('SELECT id, name, code FROM subjects WHERE id = ?').get(subject_id) as any;
  }

  // 2. Fetch assessment columns for this class & subject & term
  let assessQuery = `
    SELECT a.*, s.name as subject_name, s.code as subject_code
    FROM assessments a
    LEFT JOIN subjects s ON a.subject_id = s.id
    WHERE a.class_id = ?
  `;
  const assessParams: any[] = [class_id];

  if (subject_id && typeof subject_id === 'string' && subject_id !== 'all') {
    assessQuery += ' AND a.subject_id = ?';
    assessParams.push(subject_id);
  }

  if (term && typeof term === 'string' && term !== 'all') {
    assessQuery += ' AND a.term = ?';
    assessParams.push(term);
  }

  assessQuery += ' ORDER BY a.order_index ASC, a.date ASC';
  const columns = db.prepare(assessQuery).all(...assessParams) as any[];

  // 3. Fetch active students in class
  const students = db.prepare(`
    SELECT id, student_number, full_name, gender
    FROM students
    WHERE class_id = ? AND status = 'active'
    ORDER BY full_name ASC
  `).all(class_id) as any[];

  // 4. Fetch marks for these columns
  let marksRecords: any[] = [];
  if (columns.length > 0 && students.length > 0) {
    const colIds = columns.map(c => c.id);
    const colPlaceholders = colIds.map(() => '?').join(',');
    marksRecords = db.prepare(`
      SELECT assessment_id, student_id, marks, remarks
      FROM assessment_marks
      WHERE assessment_id IN (${colPlaceholders})
    `).all(...colIds) as any[];
  }

  const marksMap: Record<string, Record<string, number | null>> = {};
  for (const s of students) {
    marksMap[s.id] = {};
  }
  for (const m of marksRecords) {
    if (marksMap[m.student_id]) {
      marksMap[m.student_id][m.assessment_id] = m.marks;
    }
  }

  // 5. Fetch grading scale rules
  const gradingRules = db.prepare(`
    SELECT * FROM grading_rules ORDER BY min_score DESC
  `).all() as any[];

  // Helper to determine letter grade and GPA
  function getGrade(scorePct: number) {
    if (gradingRules.length === 0) {
      if (scorePct >= 90) return { letter: 'A+', gpa: 4.0 };
      if (scorePct >= 80) return { letter: 'A', gpa: 3.7 };
      if (scorePct >= 70) return { letter: 'B', gpa: 3.0 };
      if (scorePct >= 60) return { letter: 'C', gpa: 2.0 };
      if (scorePct >= 50) return { letter: 'D', gpa: 1.0 };
      return { letter: 'F', gpa: 0.0 };
    }

    for (const rule of gradingRules) {
      if (scorePct >= rule.min_score && scorePct <= rule.max_score) {
        return { letter: rule.grade_letter, gpa: rule.gpa_point, description: rule.description };
      }
    }
    // fallback to lowest rule if any
    const lowest = gradingRules[gradingRules.length - 1];
    return { letter: lowest.grade_letter, gpa: lowest.gpa_point, description: lowest.description };
  }

  // Calculate sum of column weights to properly normalize
  const totalWeight = columns.reduce((acc, c) => acc + (c.weight || 0), 0);

  // 6. Calculate rows
  const studentRows = students.map(s => {
    let rawTotalEarned = 0;
    let rawTotalPossible = 0;
    let weightedEarned = 0;
    let hasAnyMarks = false;

    for (const col of columns) {
      const mark = marksMap[s.id]?.[col.id];
      if (typeof mark === 'number' && !isNaN(mark)) {
        hasAnyMarks = true;
        rawTotalEarned += mark;
        rawTotalPossible += col.max_marks;
        if (col.max_marks > 0 && totalWeight > 0) {
          const itemWeightRatio = col.weight / totalWeight;
          weightedEarned += (mark / col.max_marks) * (itemWeightRatio * 100);
        }
      } else {
        rawTotalPossible += col.max_marks;
      }
    }

    // Weighted percentage:
    const percentage = hasAnyMarks ? Math.round(weightedEarned * 10) / 10 : 0;
    const grade = hasAnyMarks ? getGrade(percentage) : { letter: '-', gpa: 0 };

    return {
      student_id: s.id,
      student_number: s.student_number,
      student_name: s.full_name,
      gender: s.gender,
      marks: marksMap[s.id] || {},
      rawTotalEarned: Math.round(rawTotalEarned * 10) / 10,
      rawTotalPossible,
      percentage,
      gradeLetter: grade.letter,
      gpaPoint: grade.gpa,
      rank: 0 as number | string,
      hasAnyMarks,
    };
  });

  // Calculate ranks
  const sorted = [...studentRows].sort((a, b) => b.percentage - a.percentage);
  let rankCounter = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].percentage < sorted[i - 1].percentage) {
      rankCounter = i + 1;
    }
    sorted[i].rank = sorted[i].hasAnyMarks ? rankCounter : '-';
  }

  res.json({
    class: classItem,
    subject: subjectItem,
    columns,
    rows: studentRows,
    totalWeight,
    gradingRules,
  });
});

// POST /api/assessments/columns (Create assessment column)
assessmentsRouter.post('/columns', requireAuth, (req: AuthRequest, res) => {
  const { name, class_id, subject_id, category, date, max_marks, weight, term } = req.body;

  if (!name || !class_id || !category || max_marks === undefined) {
    return res.status(400).json({ error: 'Name, class_id, category, and max_marks are required.' });
  }

  if (!checkClassAccess(req, class_id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const numMax = parseFloat(max_marks);
  if (isNaN(numMax) || numMax <= 0) {
    return res.status(400).json({ error: 'Maximum marks must be a positive number greater than 0.' });
  }

  const numWeight = weight !== undefined ? parseFloat(weight) : 10;
  if (isNaN(numWeight) || numWeight < 0) {
    return res.status(400).json({ error: 'Weight must be a non-negative number.' });
  }

  const maxOrder = (db.prepare('SELECT MAX(order_index) as m FROM assessments WHERE class_id = ?').get(class_id) as any).m || 0;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO assessments (id, name, class_id, subject_id, category, date, max_marks, weight, term, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name.trim(),
    class_id,
    subject_id || null,
    category.trim(),
    date || now.split('T')[0],
    numMax,
    numWeight,
    term || 'Term 1',
    maxOrder + 1,
    now
  );

  logActivity(
    req.user!.id,
    req.user!.full_name,
    req.user!.role,
    'CREATE_ASSESSMENT',
    'Marklist',
    `Created assessment column "${name}" (${category}) for class ${class_id}`
  );

  res.status(201).json({ id, message: 'Assessment column created.' });
});

// PUT /api/assessments/columns/:id (Update column settings)
assessmentsRouter.put('/columns/:id', requireAuth, (req: AuthRequest, res) => {
  const { name, category, subject_id, date, max_marks, weight, term, order_index } = req.body;
  const col = db.prepare('SELECT id, class_id, name FROM assessments WHERE id = ?').get(req.params.id) as any;
  if (!col) return res.status(404).json({ error: 'Assessment column not found.' });

  if (!checkClassAccess(req, col.class_id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  if (max_marks !== undefined && (isNaN(parseFloat(max_marks)) || parseFloat(max_marks) <= 0)) {
    return res.status(400).json({ error: 'Maximum marks must be greater than 0.' });
  }

  db.prepare(`
    UPDATE assessments
    SET name = COALESCE(?, name),
        category = COALESCE(?, category),
        subject_id = COALESCE(?, subject_id),
        date = COALESCE(?, date),
        max_marks = COALESCE(?, max_marks),
        weight = COALESCE(?, weight),
        term = COALESCE(?, term),
        order_index = COALESCE(?, order_index)
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    category ? category.trim() : null,
    subject_id !== undefined ? subject_id : null,
    date || null,
    max_marks !== undefined ? parseFloat(max_marks) : null,
    weight !== undefined ? parseFloat(weight) : null,
    term || null,
    order_index !== undefined ? order_index : null,
    col.id
  );

  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'UPDATE_ASSESSMENT', 'Marklist', `Updated assessment column "${col.name}"`);
  res.json({ message: 'Assessment updated successfully.' });
});

// DELETE /api/assessments/columns/:id (Delete column and entered marks)
assessmentsRouter.delete('/columns/:id', requireAuth, (req: AuthRequest, res) => {
  const col = db.prepare('SELECT id, class_id, name FROM assessments WHERE id = ?').get(req.params.id) as any;
  if (!col) return res.status(404).json({ error: 'Assessment column not found.' });

  if (!checkClassAccess(req, col.class_id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  db.prepare('DELETE FROM assessments WHERE id = ?').run(col.id);
  logActivity(req.user!.id, req.user!.full_name, req.user!.role, 'DELETE_ASSESSMENT', 'Marklist', `Deleted assessment column "${col.name}"`);
  res.json({ message: 'Assessment column deleted.' });
});

// POST /api/assessments/marks/save (Batch save marks with server-side validation)
assessmentsRouter.post('/marks/save', requireAuth, (req: AuthRequest, res) => {
  const { class_id, updates } = req.body;
  // updates: array of { assessment_id, student_id, marks: number | null | '', remarks?: string }

  if (!class_id || !Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'class_id and updates array are required.' });
  }

  if (!checkClassAccess(req, class_id)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  // Validation: Check each mark against the assessment's max_marks
  const assessCache: Record<string, any> = {};
  for (const item of updates) {
    if (!assessCache[item.assessment_id]) {
      const a = db.prepare('SELECT id, name, max_marks FROM assessments WHERE id = ?').get(item.assessment_id) as any;
      if (!a) {
        return res.status(400).json({ error: `Assessment column ${item.assessment_id} not found.` });
      }
      assessCache[item.assessment_id] = a;
    }

    if (item.marks !== null && item.marks !== '' && item.marks !== undefined) {
      const val = parseFloat(item.marks);
      if (isNaN(val)) {
        return res.status(400).json({ error: `Marks value must be a valid number. Received: ${item.marks}` });
      }
      if (val < 0) {
        return res.status(400).json({ error: `Marks cannot be negative (${val}).` });
      }
      if (val > assessCache[item.assessment_id].max_marks) {
        return res.status(400).json({
          error: `Marks value (${val}) exceeds maximum allowed marks (${assessCache[item.assessment_id].max_marks}) for "${assessCache[item.assessment_id].name}".`,
        });
      }
    }
  }

  const now = new Date().toISOString();
  const upsertMark = db.prepare(`
    INSERT INTO assessment_marks (id, assessment_id, student_id, marks, remarks, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(assessment_id, student_id) DO UPDATE SET
      marks = excluded.marks,
      remarks = COALESCE(excluded.remarks, assessment_marks.remarks),
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `);

  const deleteMark = db.prepare(`
    DELETE FROM assessment_marks WHERE assessment_id = ? AND student_id = ?
  `);

  const tx = db.transaction((items: any[]) => {
    for (const item of items) {
      if (item.marks === null || item.marks === '' || item.marks === undefined) {
        deleteMark.run(item.assessment_id, item.student_id);
      } else {
        upsertMark.run(
          crypto.randomUUID(),
          item.assessment_id,
          item.student_id,
          parseFloat(item.marks),
          item.remarks || '',
          req.user!.id,
          now
        );
      }
    }
  });

  tx(updates);

  logActivity(
    req.user!.id,
    req.user!.full_name,
    req.user!.role,
    'UPDATE_MARKS',
    'Marklist',
    `Saved ${updates.length} marks entries for class ${class_id}`
  );

  res.json({ success: true, count: updates.length, savedAt: now });
});
