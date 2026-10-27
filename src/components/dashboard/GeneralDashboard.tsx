import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { DashboardStats } from '../../types/index.js';
import {
  Users,
  BookOpen,
  CalendarCheck,
  Award,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface GeneralDashboardProps {
  onNavigateTab: (tab: 'dashboard' | 'students' | 'attendance' | 'marklist') => void;
}

export const GeneralDashboard: React.FC<GeneralDashboardProps> = ({ onNavigateTab }) => {
  const { token, user, isSuperAdmin } = useAuth();
  const { t } = useLanguage();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load dashboard metrics');
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="h-20 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-slate-200 rounded-xl" />
          <div className="h-28 bg-slate-200 rounded-xl" />
          <div className="h-28 bg-slate-200 rounded-xl" />
          <div className="h-28 bg-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-red-900 mb-1">Failed to connect to database</h3>
          <p className="text-xs text-red-700 mb-4">{error || 'Unknown error occurred'}</p>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
          >
            Retry Loading Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Bizaikit Central School System</span>
            <span aria-hidden="true">·</span>
            <span>Academic Year 2026/2027</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-700">
              {isSuperAdmin ? 'Full School Administration' : `Teacher Access (${user?.full_name})`}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Academic Performance & Attendance Overview
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('attendance')}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Open Attendance Grid
          </button>
          <button
            onClick={() => onNavigateTab('marklist')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Open Marklist Editor
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div
          onClick={() => onNavigateTab('students')}
          className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-indigo-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium">{t('totalStudents')}</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
            {stats.totalStudents}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Active enrolled records in database
          </div>
        </div>

        {/* Total Classes */}
        <div
          onClick={() => onNavigateTab('students')}
          className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-indigo-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium">{t('totalClasses')}</span>
            <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
            {stats.totalClasses}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isSuperAdmin ? 'All registered school classes' : 'Your assigned classes'}
          </div>
        </div>

        {/* Today's Attendance % */}
        <div
          onClick={() => onNavigateTab('attendance')}
          className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-indigo-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium">{t('todayAttendance')}</span>
            <CalendarCheck className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              {stats.todayAttendance.percentage}%
            </span>
            <span className="text-xs text-emerald-700 font-medium">Rate</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
            <span className="text-emerald-600 font-semibold">{stats.todayAttendance.present} P</span>
            <span>·</span>
            <span className="text-red-500 font-semibold">{stats.todayAttendance.absent} A</span>
            <span>·</span>
            <span className="text-amber-500 font-semibold">{stats.todayAttendance.excused} E</span>
          </div>
        </div>

        {/* Recent Assessment Average */}
        <div
          onClick={() => onNavigateTab('marklist')}
          className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-indigo-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium">Recent Assessments</span>
            <Award className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
            {stats.recentAssessments.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Active examination & test columns recorded
          </div>
        </div>
      </div>

      {/* Mid Section: Class Summaries & Recent Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class-Level Summaries */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('classSummaries')}</h3>
              <p className="text-[11px] text-slate-500">Class roster count and latest attendance rating</p>
            </div>
            <button
              onClick={() => onNavigateTab('students')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View Roster</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 divide-y divide-slate-100 flex-1">
            {stats.classSummaries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No classes assigned yet.</div>
            ) : (
              stats.classSummaries.map((cls) => (
                <div key={cls.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-900 flex items-center gap-2">
                      <span>{cls.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({cls.grade_level} {cls.room ? `· ${cls.room}` : ''})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {cls.teachers.length > 0 ? cls.teachers.join(', ') : 'No teacher assigned'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-900 tabular-nums">
                      {cls.studentCount} students
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Attendance: <span className="font-medium text-emerald-600 tabular-nums">{cls.latestAttendanceRate}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Assessment Results */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('recentAssessments')}</h3>
              <p className="text-[11px] text-slate-500">Recently evaluated tests, quizzes, and exams</p>
            </div>
            <button
              onClick={() => onNavigateTab('marklist')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Open Marklist</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 divide-y divide-slate-100 flex-1">
            {stats.recentAssessments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No assessments created yet.</div>
            ) : (
              stats.recentAssessments.map((asm) => (
                <div key={asm.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-slate-900">
                      {asm.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>{asm.class_name}</span>
                      {asm.subject_name && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{asm.subject_name}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[10px] text-slate-400">{asm.date}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-900 tabular-nums">
                      Avg: {asm.average_marks !== null ? asm.average_marks.toFixed(1) : '-'} / {asm.max_marks}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {asm.submissions_count} students evaluated (Weight: {asm.weight}%)
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Teacher Activity (Audit Log) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">{t('recentTeacherActivity')}</h3>
          </div>
          <span className="text-[11px] text-slate-500">Live transaction synchronization</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto text-xs">
          {stats.recentActivities.length === 0 ? (
            <div className="p-6 text-center text-slate-400">No recent activity logged.</div>
          ) : (
            stats.recentActivities.map((act) => (
              <div key={act.id} className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{act.user_name}</span>
                    <span className="text-[11px] text-slate-400 capitalize">({act.user_role})</span>
                    <span className="text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                      {act.module}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{act.details}</p>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap font-mono shrink-0">
                  {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
