import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthRequest } from '../auth.js';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const isSuperAdmin = user.role === 'super_admin';
  const assignedClassIds = user.assignedClasses || [];

  // Filter conditions for teachers
  let classFilterSql = '';
  let classParams: any[] = [];
  if (!isSuperAdmin) {
    if (assignedClassIds.length === 0) {
      return res.json({
        totalStudents: 0,
        totalClasses: 0,
        todayAttendance: { total: 0, present: 0, absent: 0, excused: 0, percentage: 0 },
        recentAssessments: [],
        classSummaries: [],
        recentActivities: [],
      });
    }
    const placeholders = assignedClassIds.map(() => '?').join(',');
    classFilterSql = `WHERE id IN (${placeholders})`;
    classParams = [...assignedClassIds];
  }

  // 1. Total Classes
  const classes = db.prepare(`SELECT id, name, grade_level, section, room FROM classes ${classFilterSql}`).all(...classParams) as any[];
  const totalClasses = classes.length;

  // 2. Total Students
  let studentFilterSql = "WHERE status = 'active'";
  let studentParams: any[] = [];
  if (!isSuperAdmin) {
    const placeholders = assignedClassIds.map(() => '?').join(',');
    studentFilterSql += ` AND class_id IN (${placeholders})`;
    studentParams = [...assignedClassIds];
  }
  const totalStudents = (db.prepare(`SELECT COUNT(*) as count FROM students ${studentFilterSql}`).get(...studentParams) as any).count;

  // 3. Today's Attendance summary
  // Find attendance days for today
  const todayStr = new Date().toISOString().split('T')[0];
  let todayDaysQuery = 'SELECT id, class_id FROM attendance_days WHERE date = ?';
  let todayDaysParams: any[] = [todayStr];
  if (!isSuperAdmin) {
    const placeholders = assignedClassIds.map(() => '?').join(',');
    todayDaysQuery += ` AND class_id IN (${placeholders})`;
    todayDaysParams.push(...assignedClassIds);
  }
  const todayDays = db.prepare(todayDaysQuery).all(...todayDaysParams) as any[];

  let todayStats = { total: 0, present: 0, absent: 0, excused: 0, percentage: 0 };
  if (todayDays.length > 0) {
    const dayIds = todayDays.map(d => d.id);
    const dayPlaceholders = dayIds.map(() => '?').join(',');
    const records = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM attendance_records
      WHERE attendance_day_id IN (${dayPlaceholders})
      GROUP BY status
    `).all(...dayIds) as any[];

    for (const r of records) {
      if (r.status === 'P') todayStats.present = r.count;
      else if (r.status === 'A') todayStats.absent = r.count;
      else if (r.status === 'E') todayStats.excused = r.count;
    }
    todayStats.total = todayStats.present + todayStats.absent + todayStats.excused;
    if (todayStats.total > 0) {
      // Check attendance calc rule
      const settingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'attendance_rule'").get() as any;
      const rule = settingRow ? JSON.parse(settingRow.value) : { include_excused_in_denominator: false };
      const denom = rule.include_excused_in_denominator
        ? (todayStats.present + todayStats.absent + todayStats.excused)
        : (todayStats.present + todayStats.absent);
      todayStats.percentage = denom > 0 ? Math.round((todayStats.present / denom) * 100) : 0;
    }
  } else {
    // If no records today, get latest recorded day stats to show live context
    let latestDayQuery = `
      SELECT ad.id, ad.date, ad.class_id
      FROM attendance_days ad
      ${!isSuperAdmin ? `WHERE ad.class_id IN (${assignedClassIds.map(() => '?').join(',')})` : ''}
      ORDER BY ad.date DESC LIMIT 1
    `;
    const latestDay = db.prepare(latestDayQuery).get(...(!isSuperAdmin ? assignedClassIds : [])) as any;
    if (latestDay) {
      const records = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM attendance_records
        WHERE attendance_day_id = ?
        GROUP BY status
      `).all(latestDay.id) as any[];
      for (const r of records) {
        if (r.status === 'P') todayStats.present = r.count;
        else if (r.status === 'A') todayStats.absent = r.count;
        else if (r.status === 'E') todayStats.excused = r.count;
      }
      todayStats.total = todayStats.present + todayStats.absent + todayStats.excused;
      const denom = todayStats.present + todayStats.absent;
      todayStats.percentage = denom > 0 ? Math.round((todayStats.present / denom) * 100) : 0;
    }
  }

  // 4. Recent assessment results
  let assessQuery = `
    SELECT a.id, a.name, a.category, a.date, a.max_marks, a.weight, a.term,
           c.name as class_name, s.name as subject_name,
           COUNT(am.id) as submissions_count,
           AVG(am.marks) as average_marks
    FROM assessments a
    JOIN classes c ON a.class_id = c.id
    LEFT JOIN subjects s ON a.subject_id = s.id
    LEFT JOIN assessment_marks am ON a.id = am.assessment_id AND am.marks IS NOT NULL
    ${!isSuperAdmin ? `WHERE a.class_id IN (${assignedClassIds.map(() => '?').join(',')})` : ''}
    GROUP BY a.id
    ORDER BY a.date DESC
    LIMIT 6
  `;
  const recentAssessments = db.prepare(assessQuery).all(...(!isSuperAdmin ? assignedClassIds : []));

  // 5. Class-level summaries
  const classSummaries = classes.map(c => {
    const studentCount = (db.prepare("SELECT COUNT(*) as count FROM students WHERE class_id = ? AND status = 'active'").get(c.id) as any).count;
    
    // Assigned teachers
    const teachers = db.prepare(`
      SELECT DISTINCT u.full_name, s.name as subject_name
      FROM teacher_assignments ta
      JOIN users u ON ta.teacher_id = u.id
      LEFT JOIN subjects s ON ta.subject_id = s.id
      WHERE ta.class_id = ?
    `).all(c.id) as any[];

    // Latest attendance % for this class
    const latestClassDay = db.prepare('SELECT id FROM attendance_days WHERE class_id = ? ORDER BY date DESC LIMIT 1').get(c.id) as any;
    let attendanceRate = 0;
    if (latestClassDay) {
      const pCount = (db.prepare("SELECT COUNT(*) as c FROM attendance_records WHERE attendance_day_id = ? AND status = 'P'").get(latestClassDay.id) as any).c;
      const aCount = (db.prepare("SELECT COUNT(*) as c FROM attendance_records WHERE attendance_day_id = ? AND status = 'A'").get(latestClassDay.id) as any).c;
      const denom = pCount + aCount;
      attendanceRate = denom > 0 ? Math.round((pCount / denom) * 100) : 0;
    }

    return {
      id: c.id,
      name: c.name,
      grade_level: c.grade_level,
      room: c.room,
      studentCount,
      teachers: teachers.map(t => t.full_name + (t.subject_name ? ` (${t.subject_name})` : '')),
      latestAttendanceRate: attendanceRate,
    };
  });

  // 6. Recent activity logs (Super Admin sees all, teachers see relevant)
  let activityQuery = `
    SELECT id, user_name, user_role, action, module, details, created_at
    FROM activity_logs
    ORDER BY created_at DESC
    LIMIT 10
  `;
  const recentActivities = db.prepare(activityQuery).all();

  res.json({
    totalStudents,
    totalClasses,
    todayAttendance: todayStats,
    recentAssessments,
    classSummaries,
    recentActivities,
  });
});
