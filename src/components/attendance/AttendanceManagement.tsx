import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { AttendanceDay, AttendanceRow, ClassItem } from '../../types/index.js';
import {
  Calendar,
  Plus,
  Trash2,
  CheckCircle,
  FileText,
  Printer,
  ChevronDown,
  Clock,
  Filter,
  Check,
  X,
  AlertCircle,
  CalendarCheck,
  Search,
  Sparkles
} from 'lucide-react';

export const AttendanceManagement: React.FC = () => {
  const { token, user, isSuperAdmin } = useAuth();
  const { t } = useLanguage();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [searchStudent, setSearchStudent] = useState<string>('');

  // Grid Data
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [calculationRule, setCalculationRule] = useState<{ include_excused_in_denominator: boolean }>({
    include_excused_in_denominator: false,
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // School Day Modal
  const [addDayModalOpen, setAddDayModalOpen] = useState(false);
  const [newDayDate, setNewDayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newDayPeriod, setNewDayPeriod] = useState<string>('Regular');

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Pending updates queue for debounced auto-save
  const pendingUpdatesRef = useRef<Array<{ attendance_day_id: string; student_id: string; status: string }>>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadClasses();
  }, [token]);

  useEffect(() => {
    if (selectedClassId) {
      loadGrid();
    }
  }, [selectedClassId, selectedMonth, token]);

  const loadClasses = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
        if (data.classes.length > 0 && !selectedClassId) {
          setSelectedClassId(data.classes[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadGrid = async () => {
    if (!token || !selectedClassId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance/grid?class_id=${selectedClassId}&month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load attendance grid');
      const data = await res.json();
      setDays(data.days || []);
      setRows(data.rows || []);
      if (data.calculationRule) {
        setCalculationRule(data.calculationRule);
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Recalculate totals, %, and ranks client-side immediately for zero lag
  const recalculateRows = (updatedRows: AttendanceRow[], daysList: AttendanceDay[], rule: { include_excused_in_denominator: boolean }) => {
    const computed = updatedRows.map((r) => {
      let p = 0, a = 0, e = 0;
      for (const d of daysList) {
        const val = r.records[d.id];
        if (val === 'P') p++;
        else if (val === 'A') a++;
        else if (val === 'E') e++;
      }
      const denom = rule.include_excused_in_denominator ? (p + a + e) : (p + a);
      const percentage = denom > 0 ? Math.round((p / denom) * 1000) / 10 : 0;
      return {
        ...r,
        totalP: p,
        totalA: a,
        totalE: e,
        percentage,
        rank: 0,
      };
    });

    // Sort to determine ranks
    const sorted = [...computed].sort((x, y) => y.percentage - x.percentage);
    let curRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].percentage < sorted[i - 1].percentage) {
        curRank = i + 1;
      }
      sorted[i].rank = curRank;
    }

    // Map back to original row order
    const rankMap: Record<string, number> = {};
    for (const item of sorted) {
      rankMap[item.student_id] = item.rank;
    }

    return computed.map((r) => ({
      ...r,
      rank: rankMap[r.student_id] || 1,
    }));
  };

  // Handle cell click / change
  const handleCellChange = (studentId: string, dayId: string, newStatus: 'P' | 'A' | 'E' | '') => {
    const updated = rows.map((r) => {
      if (r.student_id === studentId) {
        return {
          ...r,
          records: {
            ...r.records,
            [dayId]: newStatus,
          },
        };
      }
      return r;
    });

    const recalculated = recalculateRows(updated, days, calculationRule);
    setRows(recalculated);

    // Queue update for server persistence
    pendingUpdatesRef.current.push({
      attendance_day_id: dayId,
      student_id: studentId,
      status: newStatus,
    });

    triggerAutoSave();
  };

  // Quick cycle on cell click: Blank -> P -> A -> E -> Blank
  const handleCycleStatus = (studentId: string, dayId: string) => {
    const row = rows.find((r) => r.student_id === studentId);
    const current = row?.records[dayId] || '';
    let next: 'P' | 'A' | 'E' | '' = 'P';
    if (current === 'P') next = 'A';
    else if (current === 'A') next = 'E';
    else if (current === 'E') next = '';
    handleCellChange(studentId, dayId, next);
  };

  // Debounced auto-save to central database
  const triggerAutoSave = () => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      const updatesToSend = [...pendingUpdatesRef.current];
      pendingUpdatesRef.current = [];
      if (updatesToSend.length === 0) {
        setSaveStatus('saved');
        return;
      }

      try {
        const res = await fetch('/api/attendance/records/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            class_id: selectedClassId,
            updates: updatesToSend,
          }),
        });

        if (res.ok) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error('Error auto-saving attendance:', err);
        setSaveStatus('error');
      }
    }, 400); // 400ms debounce
  };

  // Add School Day for selected class
  const handleAddDay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/attendance/days', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class_id: selectedClassId,
          date: newDayDate,
          period_name: newDayPeriod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAddDayModalOpen(false);
      loadGrid();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Remove School Day
  const handleDeleteDay = async (dayId: string, dateStr: string) => {
    if (!confirm(`Are you sure you want to remove school day ${dateStr} for this class? All recorded entries for this day will be deleted.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/attendance/days/${dayId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        loadGrid();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Batch Fill: Mark all present for a specific day
  const handleMarkAllPresent = async (dayId: string) => {
    try {
      setSaveStatus('saving');
      const res = await fetch('/api/attendance/batch-fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          class_id: selectedClassId,
          attendance_day_id: dayId,
          status: 'P',
        }),
      });
      if (res.ok) {
        loadGrid();
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  // Open Monthly / Term Attendance Report
  const handleOpenReport = async () => {
    try {
      const res = await fetch(`/api/attendance/report?class_id=${selectedClassId}&month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        setReportModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter rows by search term
  const filteredRows = rows.filter((r) => {
    if (!searchStudent.trim()) return true;
    const term = searchStudent.toLowerCase();
    return (
      r.student_name.toLowerCase().includes(term) ||
      r.student_number.toLowerCase().includes(term)
    );
  });

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto space-y-5">
      {/* Module Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('navAttendance')} — Spreadsheet Grid
            </h1>
            {/* Auto-save indicator */}
            <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
              {saveStatus === 'saving' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-slate-600 font-medium">{t('saving')}</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle className="w-3 h-3 text-red-600" />
                  <span className="text-red-600 font-medium">Save failed</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-slate-600 font-medium">{t('saved')}</span>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Record daily school attendance, customize class days, and auto-compute percentages & rankings.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-xs text-slate-500">{t('class')}:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-xs text-slate-500">Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Add School Day Button */}
          <button
            onClick={() => setAddDayModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addSchoolDay')}</span>
          </button>

          {/* Report Button */}
          <button
            onClick={handleOpenReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('monthlyReport')}</span>
          </button>
        </div>
      </div>

      {/* Legend & Quick Batch Fill Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-medium">Click cell to cycle or choose code:</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded font-bold bg-emerald-100 text-emerald-800">
              P
            </span>
            <span className="text-slate-600 font-medium">= Present</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded font-bold bg-red-100 text-red-800">
              A
            </span>
            <span className="text-slate-600 font-medium">= Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded font-bold bg-amber-100 text-amber-800">
              E
            </span>
            <span className="text-slate-600 font-medium">= Excused</span>
          </div>
        </div>

        {/* Search student in grid */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
            placeholder="Search student in grid..."
            className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-md focus:outline-hidden focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Spreadsheet Grid Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[68vh]">
          <table className="w-full text-left text-xs border-collapse">
            {/* Sticky Header */}
            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-20 shadow-xs border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200 bg-slate-100 sticky left-0 z-30">
                  {t('colNo')}
                </th>
                <th className="py-2.5 px-3 min-w-[190px] border-r border-slate-200 bg-slate-100 sticky left-12 z-30">
                  {t('colStudentName')}
                </th>

                {/* Dynamic School Day Columns */}
                {days.length === 0 ? (
                  <th className="py-2.5 px-6 text-center text-slate-400 border-r border-slate-200">
                    No school days added for {selectedMonth}. Click "+ {t('addSchoolDay')}" above.
                  </th>
                ) : (
                  days.map((d) => (
                    <th
                      key={d.id}
                      className="py-2 px-2 text-center border-r border-slate-200 min-w-[70px] group relative"
                    >
                      <div className="text-[11px] font-mono text-slate-800">
                        {d.date.substring(5)}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate max-w-[65px] mx-auto">
                        {d.period_name}
                      </div>

                      {/* Day Action Hover Tooltip */}
                      <div className="flex items-center justify-center gap-1 mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleMarkAllPresent(d.id)}
                          title="Mark all active students Present for this day"
                          className="p-0.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDay(d.id, d.date)}
                          title="Delete this school day"
                          className="p-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  ))
                )}

                {/* Summary Columns */}
                <th className="py-2.5 px-2 w-16 text-center border-r border-slate-200 bg-emerald-50/50 text-emerald-900 font-bold">
                  {t('colTotalP')}
                </th>
                <th className="py-2.5 px-2 w-16 text-center border-r border-slate-200 bg-red-50/50 text-red-900 font-bold">
                  {t('colTotalA')}
                </th>
                <th className="py-2.5 px-2 w-16 text-center border-r border-slate-200 bg-amber-50/50 text-amber-900 font-bold">
                  {t('colTotalE')}
                </th>
                <th className="py-2.5 px-3 w-24 text-center border-r border-slate-200 bg-slate-100 font-bold text-indigo-900">
                  {t('colAttendancePct')}
                </th>
                <th className="py-2.5 px-2 w-16 text-center bg-slate-100 font-bold text-slate-900">
                  {t('colRank')}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7 + days.length} className="py-16 text-center text-slate-400">
                    Loading attendance grid...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7 + days.length} className="py-16 text-center text-slate-400">
                    No student records found in {selectedClass?.name || 'this class'}.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.student_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Index */}
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-mono text-slate-400 sticky left-0 bg-white z-10">
                      {idx + 1}
                    </td>

                    {/* Student Info */}
                    <td className="py-2 px-3 border-r border-slate-200 sticky left-12 bg-white z-10 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{row.student_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{row.student_number}</div>
                    </td>

                    {/* Day Cells */}
                    {days.map((day) => {
                      const status = row.records[day.id] || '';
                      return (
                        <td
                          key={day.id}
                          onClick={() => handleCycleStatus(row.student_id, day.id)}
                          className="py-1 px-1 text-center border-r border-slate-200 cursor-pointer select-none hover:bg-indigo-50/40 transition-colors"
                        >
                          <div
                            className={`w-7 h-7 mx-auto rounded flex items-center justify-center font-bold text-xs transition-transform active:scale-90 ${
                              status === 'P'
                                ? 'bg-emerald-100 text-emerald-800'
                                : status === 'A'
                                ? 'bg-red-100 text-red-800'
                                : status === 'E'
                                ? 'bg-amber-100 text-amber-800'
                                : 'text-slate-300 hover:text-slate-400'
                            }`}
                          >
                            {status || '·'}
                          </div>
                        </td>
                      );
                    })}

                    {/* Summary Columns */}
                    <td className="py-2 px-2 text-center border-r border-slate-200 font-bold tabular-nums text-emerald-700 bg-emerald-50/20">
                      {row.totalP}
                    </td>
                    <td className="py-2 px-2 text-center border-r border-slate-200 font-bold tabular-nums text-red-700 bg-red-50/20">
                      {row.totalA}
                    </td>
                    <td className="py-2 px-2 text-center border-r border-slate-200 font-bold tabular-nums text-amber-700 bg-amber-50/20">
                      {row.totalE}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-bold tabular-nums text-indigo-700 bg-slate-50/30">
                      {row.percentage}%
                    </td>
                    <td className="py-2 px-2 text-center font-bold tabular-nums text-slate-700">
                      #{row.rank}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add School Day Modal */}
      {addDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">{t('addSchoolDay')}</h3>
              <button onClick={() => setAddDayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDay} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('class')}</label>
                <input
                  type="text"
                  disabled
                  value={selectedClass?.name || ''}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-slate-100 text-slate-700"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('date')} *</label>
                <input
                  type="date"
                  required
                  value={newDayDate}
                  onChange={(e) => setNewDayDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('periodName')}</label>
                <input
                  type="text"
                  value={newDayPeriod}
                  onChange={(e) => setNewDayPeriod(e.target.value)}
                  placeholder="e.g. Regular, Morning, Afternoon"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddDayModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700"
                >
                  Add Day
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly / Term Report Printable View */}
      {reportModalOpen && reportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Official Attendance Summary Report — {reportData.class?.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('printReport')}</span>
                </button>
                <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Report Document */}
            <div className="p-8 overflow-y-auto space-y-6 text-xs print:p-0">
              <div className="border-b border-slate-200 pb-4 text-center">
                <h2 className="text-lg font-bold text-slate-900">BIZAIKIT INTERNATIONAL ACADEMY</h2>
                <p className="text-slate-500 text-xs">Academic Session 2026/2027 · Monthly Attendance Verification</p>
                <div className="mt-2 text-[11px] text-slate-600 flex justify-center gap-4">
                  <span>Class: <strong>{reportData.class?.name}</strong></span>
                  <span>Month: <strong>{reportData.filter?.month || 'All'}</strong></span>
                  <span>Total School Days: <strong>{reportData.totalDays}</strong></span>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 border border-slate-200 w-10 text-center">#</th>
                    <th className="py-2 px-3 border border-slate-200">Student ID</th>
                    <th className="py-2 px-3 border border-slate-200">Full Name</th>
                    <th className="py-2 px-3 border border-slate-200 text-center">Gender</th>
                    <th className="py-2 px-3 border border-slate-200 text-center">Present (P)</th>
                    <th className="py-2 px-3 border border-slate-200 text-center">Absent (A)</th>
                    <th className="py-2 px-3 border border-slate-200 text-center">Excused (E)</th>
                    <th className="py-2 px-3 border border-slate-200 text-center font-bold">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.students?.map((s: any, idx: number) => (
                    <tr key={s.student_id}>
                      <td className="py-2 px-3 border border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 border border-slate-200 font-mono text-indigo-700">{s.student_number}</td>
                      <td className="py-2 px-3 border border-slate-200 font-semibold text-slate-900">{s.full_name}</td>
                      <td className="py-2 px-3 border border-slate-200 text-center text-slate-600">{s.gender}</td>
                      <td className="py-2 px-3 border border-slate-200 text-center text-emerald-700 font-bold">{s.present}</td>
                      <td className="py-2 px-3 border border-slate-200 text-center text-red-700 font-bold">{s.absent}</td>
                      <td className="py-2 px-3 border border-slate-200 text-center text-amber-700 font-bold">{s.excused}</td>
                      <td className="py-2 px-3 border border-slate-200 text-center font-bold text-slate-900">{s.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 flex justify-between text-slate-500 text-[11px]">
                <div>
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span>Class Teacher Signature</span>
                </div>
                <div>
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span>Principal / Super Admin Seal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
