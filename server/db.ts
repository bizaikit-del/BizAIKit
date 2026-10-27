import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Ensure data directory exists for persistent SQLite database
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'school.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'teacher')),
      email TEXT,
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      grade_level TEXT NOT NULL,
      section TEXT,
      academic_year TEXT NOT NULL,
      room TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      UNIQUE(teacher_id, class_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      student_number TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      class_id TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('Male', 'Female', 'Other')),
      date_of_birth TEXT,
      guardian_name TEXT,
      guardian_phone TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS attendance_days (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      date TEXT NOT NULL,
      period_name TEXT NOT NULL DEFAULT 'Regular',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      UNIQUE(class_id, date)
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      attendance_day_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('P', 'A', 'E')),
      remarks TEXT,
      updated_by TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (attendance_day_id) REFERENCES attendance_days(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
      UNIQUE(attendance_day_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      max_marks REAL NOT NULL DEFAULT 100,
      weight REAL NOT NULL DEFAULT 10,
      term TEXT NOT NULL DEFAULT 'Term 1',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS assessment_marks (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      marks REAL,
      remarks TEXT,
      updated_by TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
      UNIQUE(assessment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS grading_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      min_score REAL NOT NULL,
      max_score REAL NOT NULL,
      grade_letter TEXT NOT NULL,
      gpa_point REAL NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default data if empty
  seedInitialData();
}

export function logActivity(
  userId: string,
  userName: string,
  userRole: string,
  action: string,
  module: string,
  details: string,
  ipAddress?: string
) {
  const insert = db.prepare(`
    INSERT INTO activity_logs (id, user_id, user_name, user_role, action, module, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run(
    crypto.randomUUID(),
    userId,
    userName,
    userRole,
    action,
    module,
    details,
    ipAddress || '127.0.0.1',
    new Date().toISOString()
  );
}

function seedInitialData() {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0) return;

  const now = new Date().toISOString();

  // 1. Super Admin user
  const adminPass = hashPassword('Admin@123');
  const adminId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, username, password_hash, salt, full_name, role, email, phone, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(adminId, 'admin', adminPass.hash, adminPass.salt, 'Principal Sarah Jenkins', 'super_admin', 'bizaikit@gmail.com', '+251 911 234567', now);

  // 2. Teachers
  const teacher1Pass = hashPassword('Teacher@123');
  const teacher1Id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, username, password_hash, salt, full_name, role, email, phone, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(teacher1Id, 'teacher.ahmed', teacher1Pass.hash, teacher1Pass.salt, 'Ahmed Nur Hassan', 'teacher', 'ahmed.nur@school.edu', '+252 615 112233', now);

  const teacher2Pass = hashPassword('Teacher@123');
  const teacher2Id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, username, password_hash, salt, full_name, role, email, phone, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(teacher2Id, 'teacher.fatima', teacher2Pass.hash, teacher2Pass.salt, 'Fatima Mohamed Ali', 'teacher', 'fatima.ali@school.edu', '+252 612 998877', now);

  // 3. Classes
  const classAId = crypto.randomUUID();
  const classBId = crypto.randomUUID();
  const classCId = crypto.randomUUID();

  const insertClass = db.prepare(`
    INSERT INTO classes (id, name, grade_level, section, academic_year, room, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertClass.run(classAId, 'Grade 9-A', 'Grade 9', 'A', '2026/2027', 'Room 101', now);
  insertClass.run(classBId, 'Grade 9-B', 'Grade 9', 'B', '2026/2027', 'Room 102', now);
  insertClass.run(classCId, 'Grade 10-A', 'Grade 10', 'A', '2026/2027', 'Room 201', now);

  // 4. Subjects
  const subjMath = crypto.randomUUID();
  const subjEng = crypto.randomUUID();
  const subjSci = crypto.randomUUID();
  const subjHist = crypto.randomUUID();

  const insertSubj = db.prepare(`
    INSERT INTO subjects (id, name, code, created_at)
    VALUES (?, ?, ?, ?)
  `);
  insertSubj.run(subjMath, 'Mathematics', 'MATH-101', now);
  insertSubj.run(subjEng, 'English Language', 'ENG-101', now);
  insertSubj.run(subjSci, 'Integrated Science', 'SCI-101', now);
  insertSubj.run(subjHist, 'History & Social Studies', 'HIST-101', now);

  // 5. Teacher Assignments
  const insertAssign = db.prepare(`
    INSERT INTO teacher_assignments (id, teacher_id, class_id, subject_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  // Teacher Ahmed -> Grade 9-A (Math), Grade 10-A (Math)
  insertAssign.run(crypto.randomUUID(), teacher1Id, classAId, subjMath, now);
  insertAssign.run(crypto.randomUUID(), teacher1Id, classCId, subjMath, now);
  // Teacher Fatima -> Grade 9-B (English), Grade 9-A (English)
  insertAssign.run(crypto.randomUUID(), teacher2Id, classBId, subjEng, now);
  insertAssign.run(crypto.randomUUID(), teacher2Id, classAId, subjEng, now);

  // 6. Students
  const insertStudent = db.prepare(`
    INSERT INTO students (id, student_number, full_name, class_id, gender, date_of_birth, guardian_name, guardian_phone, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `);

  const studentA1 = crypto.randomUUID();
  const studentA2 = crypto.randomUUID();
  const studentA3 = crypto.randomUUID();
  const studentA4 = crypto.randomUUID();
  const studentA5 = crypto.randomUUID();
  const studentA6 = crypto.randomUUID();

  insertStudent.run(studentA1, 'STD-2026-001', 'Abdi Qasim Warsame', classAId, 'Male', '2011-04-12', 'Qasim Warsame', '+252 615 0001', now);
  insertStudent.run(studentA2, 'STD-2026-002', 'Amina Yusuf Barkhadle', classAId, 'Female', '2011-08-23', 'Yusuf Barkhadle', '+252 615 0002', now);
  insertStudent.run(studentA3, 'STD-2026-003', 'Bilal Daniel Gemechu', classAId, 'Male', '2011-02-15', 'Daniel Gemechu', '+251 911 0003', now);
  insertStudent.run(studentA4, 'STD-2026-004', 'Chaltu Bekele Tadesse', classAId, 'Female', '2011-11-30', 'Bekele Tadesse', '+251 911 0004', now);
  insertStudent.run(studentA5, 'STD-2026-005', 'Dawit Haile Selassie', classAId, 'Male', '2011-06-05', 'Haile Selassie', '+251 911 0005', now);
  insertStudent.run(studentA6, 'STD-2026-006', 'Faduma Omar Farah', classAId, 'Female', '2011-09-18', 'Omar Farah', '+252 615 0006', now);

  const studentB1 = crypto.randomUUID();
  const studentB2 = crypto.randomUUID();
  const studentB3 = crypto.randomUUID();
  const studentB4 = crypto.randomUUID();

  insertStudent.run(studentB1, 'STD-2026-010', 'Girma Wolde Michael', classBId, 'Male', '2011-03-21', 'Wolde Michael', '+251 911 0010', now);
  insertStudent.run(studentB2, 'STD-2026-011', 'Halima Jama Adan', classBId, 'Female', '2011-07-14', 'Jama Adan', '+252 615 0011', now);
  insertStudent.run(studentB3, 'STD-2026-012', 'Ibrahim Said Barre', classBId, 'Male', '2011-12-01', 'Said Barre', '+252 615 0012', now);
  insertStudent.run(studentB4, 'STD-2026-013', 'Kenna Tolosa Desta', classBId, 'Female', '2011-05-19', 'Tolosa Desta', '+251 911 0013', now);

  // 7. Attendance Days for Grade 9-A (Recent days)
  const insertDay = db.prepare(`
    INSERT INTO attendance_days (id, class_id, date, period_name, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const todayStr = '2026-10-27';
  const day1Id = crypto.randomUUID();
  const day2Id = crypto.randomUUID();
  const day3Id = crypto.randomUUID();
  const day4Id = crypto.randomUUID();
  const dayTodayId = crypto.randomUUID();

  insertDay.run(day1Id, classAId, '2026-10-21', 'Regular', 1, now);
  insertDay.run(day2Id, classAId, '2026-10-22', 'Regular', 2, now);
  insertDay.run(day3Id, classAId, '2026-10-23', 'Regular', 3, now);
  insertDay.run(day4Id, classAId, '2026-10-26', 'Regular', 4, now);
  insertDay.run(dayTodayId, classAId, todayStr, 'Regular', 5, now);

  // Attendance Records for Grade 9-A
  const insertAttRecord = db.prepare(`
    INSERT INTO attendance_records (id, attendance_day_id, student_id, status, remarks, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const studentsListA = [studentA1, studentA2, studentA3, studentA4, studentA5, studentA6];
  // Day 1
  insertAttRecord.run(crypto.randomUUID(), day1Id, studentA1, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day1Id, studentA2, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day1Id, studentA3, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day1Id, studentA4, 'E', 'Doctor visit', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day1Id, studentA5, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day1Id, studentA6, 'A', 'Unexcused', adminId, now);

  // Day 2
  insertAttRecord.run(crypto.randomUUID(), day2Id, studentA1, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day2Id, studentA2, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day2Id, studentA3, 'A', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day2Id, studentA4, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day2Id, studentA5, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day2Id, studentA6, 'P', '', adminId, now);

  // Day 3
  insertAttRecord.run(crypto.randomUUID(), day3Id, studentA1, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day3Id, studentA2, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day3Id, studentA3, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day3Id, studentA4, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day3Id, studentA5, 'E', 'Family emergency', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), day3Id, studentA6, 'P', '', adminId, now);

  // Today
  insertAttRecord.run(crypto.randomUUID(), dayTodayId, studentA1, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), dayTodayId, studentA2, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), dayTodayId, studentA3, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), dayTodayId, studentA4, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), dayTodayId, studentA5, 'P', '', adminId, now);
  insertAttRecord.run(crypto.randomUUID(), dayTodayId, studentA6, 'E', 'Sports tournament', adminId, now);

  // 8. Assessments for Grade 9-A
  const insertAssess = db.prepare(`
    INSERT INTO assessments (id, name, class_id, subject_id, category, date, max_marks, weight, term, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const asm1Id = crypto.randomUUID();
  const asm2Id = crypto.randomUUID();
  const asm3Id = crypto.randomUUID();
  const asm4Id = crypto.randomUUID();

  insertAssess.run(asm1Id, 'Algebra Quiz 1', classAId, subjMath, 'Quiz', '2026-10-10', 20, 15, 'Term 1', 1, now);
  insertAssess.run(asm2Id, 'Homework 1: Polynomials', classAId, subjMath, 'Homework', '2026-10-16', 30, 15, 'Term 1', 2, now);
  insertAssess.run(asm3Id, 'Midterm Examination', classAId, subjMath, 'Major Examination', '2026-10-24', 100, 40, 'Term 1', 3, now);
  insertAssess.run(asm4Id, 'Lab & Practical Test', classAId, subjMath, 'Practical', '2026-10-26', 50, 30, 'Term 1', 4, now);

  // Assessment Marks
  const insertMark = db.prepare(`
    INSERT INTO assessment_marks (id, assessment_id, student_id, marks, remarks, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Scores for student A1
  insertMark.run(crypto.randomUUID(), asm1Id, studentA1, 19, 'Excellent', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm2Id, studentA1, 28, 'Very neat', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm3Id, studentA1, 94, 'Outstanding algebra mastery', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm4Id, studentA1, 47, 'Fast calculations', teacher1Id, now);

  // Scores for student A2
  insertMark.run(crypto.randomUUID(), asm1Id, studentA2, 17, 'Good', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm2Id, studentA2, 26, '', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm3Id, studentA2, 88, 'Great work', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm4Id, studentA2, 44, '', teacher1Id, now);

  // Scores for student A3
  insertMark.run(crypto.randomUUID(), asm1Id, studentA3, 14, '', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm2Id, studentA3, 22, '', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm3Id, studentA3, 76, 'Solid effort', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm4Id, studentA3, 39, '', teacher1Id, now);

  // Scores for student A4
  insertMark.run(crypto.randomUUID(), asm1Id, studentA4, 18, 'Very good', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm2Id, studentA4, 29, 'Top marks', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm3Id, studentA4, 91, 'Clear step-by-step logic', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm4Id, studentA4, 48, '', teacher1Id, now);

  // Scores for student A5
  insertMark.run(crypto.randomUUID(), asm1Id, studentA5, 12, 'Needs revision', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm2Id, studentA5, 18, '', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm3Id, studentA5, 62, 'Pass mark achieved', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm4Id, studentA5, 30, '', teacher1Id, now);

  // Scores for student A6
  insertMark.run(crypto.randomUUID(), asm1Id, studentA6, 16, '', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm2Id, studentA6, 24, '', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm3Id, studentA6, 81, 'Good improvement', teacher1Id, now);
  insertMark.run(crypto.randomUUID(), asm4Id, studentA6, 41, '', teacher1Id, now);

  // 9. Grading Rules
  const insertRule = db.prepare(`
    INSERT INTO grading_rules (id, name, min_score, max_score, grade_letter, gpa_point, description, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRule.run(crypto.randomUUID(), 'Distinction Plus', 90, 100, 'A+', 4.0, 'Outstanding academic mastery', 1);
  insertRule.run(crypto.randomUUID(), 'Distinction', 80, 89.99, 'A', 3.7, 'Excellent grasp of curriculum', 2);
  insertRule.run(crypto.randomUUID(), 'High Merit', 70, 79.99, 'B', 3.0, 'Good competent performance', 3);
  insertRule.run(crypto.randomUUID(), 'Merit', 60, 69.99, 'C', 2.0, 'Satisfactory understanding', 4);
  insertRule.run(crypto.randomUUID(), 'Pass', 50, 59.99, 'D', 1.0, 'Minimum passing criteria met', 5);
  insertRule.run(crypto.randomUUID(), 'Fail', 0, 49.99, 'F', 0.0, 'Requires remedial intervention', 6);

  // 10. System Settings
  const insertSetting = db.prepare(`
    INSERT INTO system_settings (key, value) VALUES (?, ?)
  `);
  insertSetting.run('attendance_rule', JSON.stringify({
    include_excused_in_denominator: false, // P / (P + A) * 100
    passing_attendance_threshold: 80,
  }));
  insertSetting.run('school_profile', JSON.stringify({
    name: 'Bizaikit International School',
    academic_year: '2026/2027',
    current_term: 'Term 1',
    address: 'Bizaikit Academic Campus, Main Road',
    phone: '+251 911 234567',
    email: 'admin@bizaikit.com',
    website: 'https://bizaikit.com',
  }));

  // Log initial seeding
  logActivity(
    adminId,
    'Principal Sarah Jenkins',
    'super_admin',
    'SYSTEM_INIT',
    'Settings',
    'Database initialized with standard classes, subjects, grading rules, and sample records.'
  );
}
