import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import {
  X,
  Users,
  Award,
  History,
  Database,
  Server,
  Plus,
  Save,
  Trash2,
  Check,
  AlertCircle,
  Download,
  ShieldCheck,
  Clock,
  BookOpen,
  CalendarCheck
} from 'lucide-react';
import { GradingRule, ActivityLog, ClassItem, SubjectItem } from '../../types/index.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, token, isSuperAdmin } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'teachers' | 'grading' | 'logs' | 'backup'>('teachers');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Teachers State
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [subjectsList, setSubjectsList] = useState<SubjectItem[]>([]);
  const [newTeacherModal, setNewTeacherModal] = useState(false);
  const [newTeacherData, setNewTeacherData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    selectedClassId: '',
    selectedSubjectId: '',
  });

  // Grading Rules & Attendance Rules State
  const [gradingRules, setGradingRules] = useState<GradingRule[]>([]);
  const [attendanceCalcRule, setAttendanceCalcRule] = useState<{
    include_excused_in_denominator: boolean;
    passing_attendance_threshold: number;
  }>({ include_excused_in_denominator: false, passing_attendance_threshold: 80 });

  // Audit Logs State
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Hostinger Info State
  const [hostingerInfo, setHostingerInfo] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !token) return;

    loadData();
  }, [isOpen, token, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setNotification(null);
    try {
      // Load public settings / rules
      const pubRes = await fetch('/api/settings/public', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        setGradingRules(pubData.gradingRules || []);
        if (pubData.settings?.attendance_rule) {
          setAttendanceCalcRule(pubData.settings.attendance_rule);
        }
      }

      // Load classes and subjects for assignment dropdowns
      const clsRes = await fetch('/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (clsRes.ok) {
        const clsData = await clsRes.json();
        setClassesList(clsData.classes || []);
      }

      const sbjRes = await fetch('/api/classes/subjects/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (sbjRes.ok) {
        const sbjData = await sbjRes.json();
        setSubjectsList(sbjData.subjects || []);
      }

      if (isSuperAdmin) {
        if (activeTab === 'teachers') {
          const tRes = await fetch('/api/teachers', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (tRes.ok) {
            const tData = await tRes.json();
            setTeachers(tData.teachers || []);
          }
        } else if (activeTab === 'logs') {
          const lRes = await fetch('/api/settings/activity-logs?limit=40', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (lRes.ok) {
            const lData = await lRes.json();
            setActivityLogs(lData.logs || []);
          }
        } else if (activeTab === 'backup') {
          const hRes = await fetch('/api/settings/hostinger-info', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (hRes.ok) {
            const hData = await hRes.json();
            setHostingerInfo(hData);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: err.message || 'Failed to fetch administration data' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assignments = [];
      if (newTeacherData.selectedClassId) {
        assignments.push({
          class_id: newTeacherData.selectedClassId,
          subject_id: newTeacherData.selectedSubjectId || null,
        });
      }

      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newTeacherData.username,
          password: newTeacherData.password,
          full_name: newTeacherData.full_name,
          email: newTeacherData.email,
          phone: newTeacherData.phone,
          assignments,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: 'success', message: 'Teacher account created successfully!' });
      setNewTeacherModal(false);
      setNewTeacherData({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone: '',
        selectedClassId: '',
        selectedSubjectId: '',
      });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleToggleTeacherStatus = async (teacherId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        loadData();
        setNotification({ type: 'success', message: `Teacher status updated.` });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleSaveAttendanceRule = async (newIncludeExcused: boolean) => {
    try {
      const updated = {
        ...attendanceCalcRule,
        include_excused_in_denominator: newIncludeExcused,
      };
      const res = await fetch('/api/settings/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: 'attendance_rule',
          value: updated,
        }),
      });
      if (res.ok) {
        setAttendanceCalcRule(updated);
        setNotification({ type: 'success', message: 'Attendance calculation formula updated!' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = `/api/settings/backup/export-json?token=${token}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>{t('settingsTitle')}</span>
            </h2>
            <span className="text-xs text-slate-500">
              Configure teachers, academic grading rules, audit logs, and Hostinger deployment
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2 text-xs font-medium overflow-x-auto">
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('teachers')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'teachers'
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t('userManagement')}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('grading')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'grading'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>{t('gradingScales')}</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'logs'
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{t('activityAuditLogs')}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Hostinger & Deployment</span>
          </button>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`mx-6 mt-3 p-3 rounded-lg text-xs flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: TEACHER MANAGEMENT */}
          {activeTab === 'teachers' && isSuperAdmin && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Registered Teacher Accounts</h3>
                  <p className="text-xs text-slate-500">
                    Teachers only have access to their explicitly assigned classes and subjects.
                  </p>
                </div>
                <button
                  onClick={() => setNewTeacherModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('addTeacher')}</span>
                </button>
              </div>

              {/* Teachers Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Teacher</th>
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Assigned Classes & Subjects</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((tch) => (
                      <tr key={tch.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{tch.full_name}</div>
                          <div className="text-[11px] text-slate-400">{tch.email || 'No email provided'}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{tch.username}</td>
                        <td className="py-2.5 px-3">
                          {tch.assignments && tch.assignments.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {tch.assignments.map((a: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-sm border border-slate-200"
                                >
                                  {a.class_name} {a.subject_name ? `• ${a.subject_name}` : ''}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No assignments yet</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center text-[11px] font-medium ${
                              tch.is_active === 1 ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {tch.is_active === 1 ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleToggleTeacherStatus(tch.id, tch.is_active === 1)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                          >
                            {tch.is_active === 1 ? t('deactivate') : t('activate')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* New Teacher Form Modal */}
              {newTeacherModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40">
                  <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h4 className="text-sm font-bold text-slate-900">{t('addTeacher')}</h4>
                      <button
                        onClick={() => setNewTeacherModal(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateTeacher} className="space-y-3 text-xs">
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">{t('fullName')}</label>
                        <input
                          type="text"
                          required
                          value={newTeacherData.full_name}
                          onChange={(e) => setNewTeacherData({ ...newTeacherData, full_name: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                          placeholder="e.g. Hassan Jama Duale"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">{t('username')}</label>
                          <input
                            type="text"
                            required
                            value={newTeacherData.username}
                            onChange={(e) => setNewTeacherData({ ...newTeacherData, username: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                            placeholder="e.g. teacher.hassan"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">{t('password')}</label>
                          <input
                            type="password"
                            required
                            value={newTeacherData.password}
                            onChange={(e) => setNewTeacherData({ ...newTeacherData, password: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Assign Class</label>
                          <select
                            value={newTeacherData.selectedClassId}
                            onChange={(e) => setNewTeacherData({ ...newTeacherData, selectedClassId: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white"
                          >
                            <option value="">-- None / Later --</option>
                            {classesList.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Assign Subject</label>
                          <select
                            value={newTeacherData.selectedSubjectId}
                            onChange={(e) => setNewTeacherData({ ...newTeacherData, selectedSubjectId: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white"
                          >
                            <option value="">-- All / General --</option>
                            {subjectsList.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setNewTeacherModal(false)}
                          className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
                        >
                          Create Teacher Account
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GRADING SCALES & CALCULATION RULES */}
          {activeTab === 'grading' && (
            <div className="space-y-6">
              {/* Attendance Calculation Rule */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-indigo-600" />
                  <span>Attendance Percentage Calculation Rule</span>
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Choose whether Excused Absences (E) reduce the percentage or are omitted from the denominator.
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="att_rule"
                      checked={!attendanceCalcRule.include_excused_in_denominator}
                      onChange={() => isSuperAdmin && handleSaveAttendanceRule(false)}
                      disabled={!isSuperAdmin}
                      className="text-indigo-600"
                    />
                    <span>
                      <strong className="font-semibold">Exclude E from denominator (Recommended):</strong> Formula ={' '}
                      <code className="bg-white px-1.5 py-0.5 rounded-sm border border-slate-200 text-slate-700">
                        P / (P + A) × 100
                      </code>{' '}
                      (Excused students are not penalized)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="att_rule"
                      checked={attendanceCalcRule.include_excused_in_denominator}
                      onChange={() => isSuperAdmin && handleSaveAttendanceRule(true)}
                      disabled={!isSuperAdmin}
                      className="text-indigo-600"
                    />
                    <span>
                      <strong className="font-semibold">Count E in denominator:</strong> Formula ={' '}
                      <code className="bg-white px-1.5 py-0.5 rounded-sm border border-slate-200 text-slate-700">
                        P / (P + A + E) × 100
                      </code>
                    </span>
                  </label>
                </div>
              </div>

              {/* Grading Scales */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Configured Grading Scales & GPA</h4>
                    <p className="text-xs text-slate-500">
                      Standardized grading rules applied automatically across all assessments and marklists.
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Grade Letter</th>
                        <th className="py-2.5 px-3">Percentage Range</th>
                        <th className="py-2.5 px-3">GPA Equivalent</th>
                        <th className="py-2.5 px-3">Academic Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gradingRules.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-bold text-indigo-700 text-sm">{r.grade_letter}</td>
                          <td className="py-2.5 px-3 tabular-nums font-mono">
                            {r.min_score}% – {r.max_score}%
                          </td>
                          <td className="py-2.5 px-3 tabular-nums font-semibold">{r.gpa_point.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-slate-600">{r.description || r.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT TRAIL LOGS */}
          {activeTab === 'logs' && isSuperAdmin && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">System Activity & Audit Trail</h3>
                  <p className="text-xs text-slate-500">
                    Live chronological history of changes to attendance, assessments, and student records.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">User & Role</th>
                      <th className="py-2 px-3">Module</th>
                      <th className="py-2 px-3">Action Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-900">{log.user_name}</span>
                          <span className="text-[11px] text-slate-400 block capitalize">{log.user_role}</span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-700 font-medium">
                          {log.module}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: HOSTINGER DEPLOYMENT & DATABASE BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Hostinger Deployment Card */}
              <div className="p-4 bg-indigo-50/40 border border-indigo-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-5 h-5 text-indigo-700" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Deployment on Hostinger Business Web Hosting (bizaikit.com)
                  </h4>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  This application is architected specifically for Node.js production deployment on Hostinger Business Hosting using your existing domain <strong>bizaikit.com</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border border-indigo-100 rounded-md">
                    <span className="font-semibold text-slate-900 block mb-1">Hostinger Runtime Environment</span>
                    <ul className="space-y-1 text-slate-600">
                      <li>• Target Domain: <strong>bizaikit.com</strong></li>
                      <li>• Node.js Version: <strong>v18, v20, or v22</strong></li>
                      <li>• Startup Script: <code className="bg-slate-100 px-1 py-0.5 rounded">npm start</code></li>
                      <li>• Database Engine: <strong>SQLite (WAL mode, persistent at data/school.db)</strong></li>
                    </ul>
                  </div>

                  <div className="p-3 bg-white border border-indigo-100 rounded-md">
                    <span className="font-semibold text-slate-900 block mb-1">Production Environment Variables</span>
                    <ul className="space-y-1 font-mono text-[11px] text-slate-700">
                      <li>PORT=3000</li>
                      <li>NODE_ENV=production</li>
                      <li>APP_URL=https://bizaikit.com</li>
                      <li>JWT_SECRET=(secure-random-32-chars)</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-100 text-xs text-slate-700">
                  <span className="font-semibold block mb-1">Hostinger hPanel Steps:</span>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                    <li>Log in to Hostinger hPanel → Select your Business Web Hosting plan for <strong>bizaikit.com</strong>.</li>
                    <li>Go to <strong>Advanced → Node.js</strong>, create a new Node.js application, set application root to your project folder.</li>
                    <li>Set Application startup file to <code className="bg-slate-100 px-1 rounded">server.ts</code> (or run <code className="bg-slate-100 px-1 rounded">npm run build</code> and point to production bundle).</li>
                    <li>In the Node.js console, run <code className="bg-slate-100 px-1 rounded">npm install</code>.</li>
                    <li>Restart the Node.js application. Your database is automatically created in <code className="bg-slate-100 px-1 rounded">./data/school.db</code> and persists safely on Hostinger disk storage.</li>
                  </ol>
                </div>
              </div>

              {/* Database Backup & Export Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-600" />
                      <span>Central Database Backup & Recovery</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Download a complete, structured JSON backup of all tables: students, classes, attendance records, marklists, grading scales, and audit logs.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadBackup}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('exportDatabaseJson')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
