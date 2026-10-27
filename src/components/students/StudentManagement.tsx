import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { Student, ClassItem } from '../../types/index.js';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  AlertCircle,
  Check,
  X,
  BookOpen,
  Phone,
  Calendar,
  ShieldAlert
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const { token, isSuperAdmin, user } = useAuth();
  const { t } = useLanguage();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    student_number: '',
    full_name: '',
    class_id: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    date_of_birth: '',
    guardian_name: '',
    guardian_phone: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Class Management Modal
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('Grade 9');
  const [newRoom, setNewRoom] = useState('');

  // Deletion protection modal
  const [deleteWarning, setDeleteWarning] = useState<{
    open: boolean;
    student: Student | null;
    errorMessage?: string;
  }>({ open: false, student: null });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadClasses();
  }, [token]);

  useEffect(() => {
    loadStudents();
  }, [token, selectedClassId, selectedStatus, searchQuery]);

  const loadClasses = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
        if (data.classes.length > 0 && selectedClassId === 'all' && !isSuperAdmin) {
          setSelectedClassId(data.classes[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadStudents = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedClassId && selectedClassId !== 'all') params.append('class_id', selectedClassId);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/students?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load students' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      student_number: `STD-2026-${String(Math.floor(100 + Math.random() * 900))}`,
      full_name: '',
      class_id: classes[0]?.id || '',
      gender: 'Male',
      date_of_birth: '2011-01-01',
      guardian_name: '',
      guardian_phone: '',
      status: 'active',
    });
    setStudentModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      student_number: student.student_number,
      full_name: student.full_name,
      class_id: student.class_id,
      gender: student.gender,
      date_of_birth: student.date_of_birth || '',
      guardian_name: student.guardian_name || '',
      guardian_phone: student.guardian_phone || '',
      status: student.status,
    });
    setStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({
        type: 'success',
        message: editingStudent ? 'Student details updated.' : 'Student registered successfully!',
      });
      setStudentModalOpen(false);
      loadStudents();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleToggleStatus = async (student: Student) => {
    const newStatus = student.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/students/${student.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setNotification({ type: 'success', message: `Student status changed to ${newStatus}.` });
        loadStudents();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleDeleteClick = (student: Student) => {
    setDeleteWarning({ open: true, student, errorMessage: undefined });
  };

  const handleConfirmDelete = async () => {
    if (!deleteWarning.student) return;
    try {
      const res = await fetch(`/api/students/${deleteWarning.student.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        // Accidental deletion prevented!
        setDeleteWarning((prev) => ({
          ...prev,
          errorMessage: data.error,
        }));
        return;
      }

      setNotification({ type: 'success', message: 'Student permanently deleted.' });
      setDeleteWarning({ open: false, student: null });
      loadStudents();
    } catch (err: any) {
      setDeleteWarning((prev) => ({ ...prev, errorMessage: err.message }));
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newClassName,
          grade_level: newGradeLevel,
          room: newRoom,
          academic_year: '2026/2027',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: 'success', message: `Class "${newClassName}" created successfully!` });
      setNewClassName('');
      setNewRoom('');
      setClassModalOpen(false);
      loadClasses();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('navStudents')} & Enrollment
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student directory, classroom assignments, guardian contact details, and records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setClassModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('manageClasses')}</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addStudent')}</span>
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
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
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
          />
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 shrink-0">{t('class')}:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg py-1.5 px-2.5 bg-white text-slate-700 font-medium focus:outline-hidden"
          >
            {isSuperAdmin && <option value="all">{t('allClasses')}</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 shrink-0">{t('status')}:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg py-1.5 px-2.5 bg-white text-slate-700 font-medium focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="active">{t('statusActive')}</option>
            <option value="inactive">{t('statusInactive')}</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{t('studentNumber')}</th>
                <th className="py-3 px-4">{t('fullName')}</th>
                <th className="py-3 px-4">{t('class')}</th>
                <th className="py-3 px-4">{t('gender')}</th>
                <th className="py-3 px-4">{t('guardianName')}</th>
                <th className="py-3 px-4">{t('guardianPhone')}</th>
                <th className="py-3 px-4">{t('status')}</th>
                <th className="py-3 px-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    {t('noStudentsFound')}
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-700">
                      {st.student_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{st.full_name}</div>
                      <div className="text-[11px] text-slate-400">DOB: {st.date_of_birth || 'Not recorded'}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {st.class_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {st.gender === 'Male' ? t('male') : st.gender === 'Female' ? t('female') : st.gender}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {st.guardian_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {st.guardian_phone || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center text-[11px] font-semibold ${
                          st.status === 'active' ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {st.status === 'active' ? t('statusActive') : t('statusInactive')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(st)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title={t('edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(st)}
                          className={`p-1.5 rounded-md transition-colors ${
                            st.status === 'active'
                              ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={st.status === 'active' ? t('deactivate') : t('activate')}
                        >
                          {st.status === 'active' ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteClick(st)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Add / Edit Modal */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Edit Student Record' : t('addStudent')}
              </h3>
              <button
                onClick={() => setStudentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t('studentNumber')} *</label>
                  <input
                    type="text"
                    required
                    value={formData.student_number}
                    onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
                    placeholder="e.g. STD-2026-001"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t('class')} *</label>
                  <select
                    required
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('fullName')} *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                  placeholder="e.g. Mohamed Ali Abdi"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t('gender')}</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Male">{t('male')}</option>
                    <option value="Female">{t('female')}</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t('dob')}</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t('guardianName')}</label>
                  <input
                    type="text"
                    value={formData.guardian_name}
                    onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                    placeholder="Parent / Guardian"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t('guardianPhone')}</label>
                  <input
                    type="text"
                    value={formData.guardian_phone}
                    onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                    placeholder="+252 615..."
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('status')}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="active">{t('statusActive')}</option>
                  <option value="inactive">{t('statusInactive')}</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Manager Modal (Super Admin only) */}
      {classModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">{t('manageClasses')}</h3>
              <button onClick={() => setClassModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List existing classes */}
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
              {classes.map((cls) => (
                <div key={cls.id} className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">{cls.name}</span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      ({cls.grade_level} {cls.room ? `· ${cls.room}` : ''})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {cls.active_students_count || 0} students
                  </span>
                </div>
              ))}
            </div>

            {/* Add new class form */}
            <form onSubmit={handleCreateClass} className="space-y-3 pt-2 text-xs">
              <span className="font-bold text-slate-800 block">Add New Class:</span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Class Name (e.g. Grade 10-B)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="col-span-2 px-2.5 py-1.5 border border-slate-200 rounded-md"
                />
                <select
                  value={newGradeLevel}
                  onChange={(e) => setNewGradeLevel(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-md bg-white"
                >
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Classroom / Room Number (e.g. Room 204)"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md"
                >
                  {t('close')}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Dependency Warning Modal */}
      {deleteWarning.open && deleteWarning.student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">Confirm Deletion or Deactivation</h3>
            </div>

            {deleteWarning.errorMessage ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                  <span className="font-semibold block mb-1">Permanent Deletion Safeguard Active:</span>
                  <p>{deleteWarning.errorMessage}</p>
                </div>
                <p className="text-slate-600">
                  To protect your official school records and prevent data loss, please deactivate this student record instead. Deactivated students remain in historical marklists but are hidden from active enrollment.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setDeleteWarning({ open: false, student: null })}
                    className="px-3 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50"
                  >
                    {t('close')}
                  </button>
                  <button
                    onClick={() => {
                      handleToggleStatus(deleteWarning.student!);
                      setDeleteWarning({ open: false, student: null });
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md"
                  >
                    Deactivate Student
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-slate-700">
                  Are you sure you want to remove <strong>{deleteWarning.student.full_name}</strong> (
                  {deleteWarning.student.student_number})?
                </p>
                <p className="text-slate-500">
                  If this student has existing attendance days or assessment marks, the database integrity safeguard will automatically block deletion and prompt you to deactivate instead.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setDeleteWarning({ open: false, student: null })}
                    className="px-3 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md"
                  >
                    Confirm Permanent Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
