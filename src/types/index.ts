export type UserRole = 'super_admin' | 'teacher';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  is_active?: number;
  assignedClasses?: Array<{ id: string; name: string }>;
  assignedSubjects?: Array<{ id: string; name: string }>;
}

export interface ClassItem {
  id: string;
  name: string;
  grade_level: string;
  section?: string;
  academic_year: string;
  room?: string;
  active_students_count?: number;
  total_students_count?: number;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
}

export interface Student {
  id: string;
  student_number: string;
  full_name: string;
  class_id: string;
  class_name?: string;
  grade_level?: string;
  gender: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  guardian_name?: string;
  guardian_phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
  attendanceRecordCount?: number;
  assessmentMarkCount?: number;
}

export interface AttendanceDay {
  id: string;
  class_id: string;
  date: string;
  period_name: string;
  order_index: number;
}

export interface AttendanceRow {
  student_id: string;
  student_number: string;
  student_name: string;
  gender: string;
  records: Record<string, 'P' | 'A' | 'E' | ''>;
  totalP: number;
  totalA: number;
  totalE: number;
  percentage: number;
  rank: number;
}

export interface AssessmentColumn {
  id: string;
  name: string;
  class_id: string;
  subject_id?: string;
  subject_name?: string;
  subject_code?: string;
  category: 'Major Examination' | 'Class Test' | 'Quiz' | 'Homework' | 'Assignment' | 'Practical' | 'Custom';
  date: string;
  max_marks: number;
  weight: number;
  term: string;
  order_index: number;
}

export interface MarklistRow {
  student_id: string;
  student_number: string;
  student_name: string;
  gender: string;
  marks: Record<string, number | null>;
  rawTotalEarned: number;
  rawTotalPossible: number;
  percentage: number;
  gradeLetter: string;
  gpaPoint: number;
  rank: number | string;
  hasAnyMarks: boolean;
}

export interface GradingRule {
  id: string;
  name: string;
  min_score: number;
  max_score: number;
  grade_letter: string;
  gpa_point: number;
  description?: string;
  order_index: number;
}

export interface ActivityLog {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  details: string;
  created_at: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  todayAttendance: {
    total: number;
    present: number;
    absent: number;
    excused: number;
    percentage: number;
  };
  recentAssessments: Array<{
    id: string;
    name: string;
    category: string;
    date: string;
    max_marks: number;
    weight: number;
    term: string;
    class_name: string;
    subject_name?: string;
    submissions_count: number;
    average_marks: number | null;
  }>;
  classSummaries: Array<{
    id: string;
    name: string;
    grade_level: string;
    room?: string;
    studentCount: number;
    teachers: string[];
    latestAttendanceRate: number;
  }>;
  recentActivities: ActivityLog[];
}

export type SupportedLanguage = 'en' | 'so' | 'om' | 'am';
