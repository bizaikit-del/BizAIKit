import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { AssessmentColumn, MarklistRow, ClassItem, SubjectItem, GradingRule } from '../../types/index.js';
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit,
  Printer,
  Check,
  AlertCircle,
  Search,
  BookOpen,
  X,
  FileSpreadsheet,
  Award,
  ChevronDown
} from 'lucide-react';

export const MarklistManagement: React.FC = () => {
  const { token, user, isSuperAdmin } = useAuth();
  const { t } = useLanguage();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [searchStudent, setSearchStudent] = useState<string>('');

  // Grid Data
  const [columns, setColumns] = useState<AssessmentColumn[]>([]);
  const [rows, setRows] = useState<MarklistRow[]>([]);
  const [gradingRules, setGradingRules] = useState<GradingRule[]>([]);
  const [totalWeight, setTotalWeight] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Input validation errors per cell: errors[`${studentId}_${columnId}`] = 'Error msg'
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});

  // Column Modal
  const [colModalOpen, setColModalOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<AssessmentColumn | null>(null);
  const [colFormData, setColFormData] = useState({
    name: '',
    category: 'Class Test' as AssessmentColumn['category'],
    subject_id: '',
    date: new Date().toISOString().split('T')[0],
    max_marks: 50,
    weight: 20,
    term: 'Term 1',
  });

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Debounced auto-save queue
  const pendingMarksRef = useRef<Array<{ assessment_id: string; student_id: string; marks: number | null }>>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadClassesAndSubjects();
  }, [token]);

  useEffect(() => {
    if (selectedClassId) {
      loadGrid();
    }
  }, [selectedClassId, selectedSubjectId, selectedTerm, token]);

  const loadClassesAndSubjects = async () => {
    if (!token) return;
    try {
      const clsRes = await fetch('/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (clsRes.ok) {
        const data = await clsRes.json();
        setClasses(data.classes || []);
        if (data.classes.length > 0 && !selectedClassId) {
          setSelectedClassId(data.classes[0].id);
        }
      }

      const sbjRes = await fetch('/api/classes/subjects/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (sbjRes.ok) {
        const data = await sbjRes.json();
        setSubjects(data.subjects || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadGrid = async () => {
    if (!token || !selectedClassId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        class_id: selectedClassId,
        term: selectedTerm,
      });
      if (selectedSubjectId && selectedSubjectId !== 'all') {
        params.append('subject_id', selectedSubjectId);
      }

      const res = await fetch(`/api/assessments/grid?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load marklist grid');
      const data = await res.json();

      setColumns(data.columns || []);
      setRows(data.rows || []);
      setGradingRules(data.gradingRules || []);
      setTotalWeight(data.totalWeight || 100);
      setCellErrors({});
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine grade letter & GPA
  const getGradeInfo = (pct: number, rules: GradingRule[]) => {
    for (const rule of rules) {
      if (pct >= rule.min_score && pct <= rule.max_score) {
        return { letter: rule.grade_letter, gpa: rule.gpa_point };
      }
    }
    return { letter: 'F', gpa: 0.0 };
  };

  // Recalculate marks row-by-row instantly on client
  const recalculateRows = (updatedRows: MarklistRow[], colsList: AssessmentColumn[], rules: GradingRule[]) => {
    const sumWeight = colsList.reduce((acc, c) => acc + (c.weight || 0), 0);

    const calculated = updatedRows.map((r) => {
      let rawEarned = 0;
      let rawPossible = 0;
      let weightedEarned = 0;
      let hasMarks = false;

      for (const col of colsList) {
        const m = r.marks[col.id];
        if (typeof m === 'number' && !isNaN(m)) {
          hasMarks = true;
          rawEarned += m;
          rawPossible += col.max_marks;
          if (col.max_marks > 0 && sumWeight > 0) {
            const ratio = col.weight / sumWeight;
            weightedEarned += (m / col.max_marks) * (ratio * 100);
          }
        } else {
          rawPossible += col.max_marks;
        }
      }

      const percentage = hasMarks ? Math.round(weightedEarned * 10) / 10 : 0;
      const grade = hasMarks ? getGradeInfo(percentage, rules) : { letter: '-', gpa: 0 };

      return {
        ...r,
        rawTotalEarned: Math.round(rawEarned * 10) / 10,
        rawTotalPossible: rawPossible,
        percentage,
        gradeLetter: grade.letter,
        gpaPoint: grade.gpa,
        hasAnyMarks: hasMarks,
      };
    });

    // Rank sorting
    const sorted = [...calculated].sort((a, b) => b.percentage - a.percentage);
    let curRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].percentage < sorted[i - 1].percentage) {
        curRank = i + 1;
      }
      sorted[i].rank = sorted[i].hasAnyMarks ? curRank : '-';
    }

    const rankMap: Record<string, number | string> = {};
    for (const item of sorted) {
      rankMap[item.student_id] = item.rank;
    }

    return calculated.map((r) => ({
      ...r,
      rank: rankMap[r.student_id] || '-',
    }));
  };

  // Handle cell text input & validation against max_marks
  const handleMarkChange = (studentId: string, col: AssessmentColumn, rawValue: string) => {
    const cellKey = `${studentId}_${col.id}`;

    if (rawValue.trim() === '') {
      // Empty cell
      const newErrors = { ...cellErrors };
      delete newErrors[cellKey];
      setCellErrors(newErrors);

      const updated = rows.map((r) => {
        if (r.student_id === studentId) {
          return {
            ...r,
            marks: { ...r.marks, [col.id]: null },
          };
        }
        return r;
      });
      setRows(recalculateRows(updated, columns, gradingRules));

      pendingMarksRef.current.push({
        assessment_id: col.id,
        student_id: studentId,
        marks: null,
      });
      triggerAutoSave();
      return;
    }

    const numVal = parseFloat(rawValue);
    if (isNaN(numVal)) {
      setCellErrors({ ...cellErrors, [cellKey]: 'Must be a number' });
      return;
    }

    if (numVal < 0) {
      setCellErrors({ ...cellErrors, [cellKey]: 'Cannot be negative' });
      return;
    }

    if (numVal > col.max_marks) {
      setCellErrors({ ...cellErrors, [cellKey]: `Max is ${col.max_marks}` });
      return;
    }

    // Valid mark
    const newErrors = { ...cellErrors };
    delete newErrors[cellKey];
    setCellErrors(newErrors);

    const updated = rows.map((r) => {
      if (r.student_id === studentId) {
        return {
          ...r,
          marks: { ...r.marks, [col.id]: numVal },
        };
      }
      return r;
    });

    setRows(recalculateRows(updated, columns, gradingRules));

    pendingMarksRef.current.push({
      assessment_id: col.id,
      student_id: studentId,
      marks: numVal,
    });
    triggerAutoSave();
  };

  // Auto-save debounced sync
  const triggerAutoSave = () => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      const batch = [...pendingMarksRef.current];
      pendingMarksRef.current = [];
      if (batch.length === 0) {
        setSaveStatus('saved');
        return;
      }

      try {
        const res = await fetch('/api/assessments/marks/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            class_id: selectedClassId,
            updates: batch,
          }),
        });

        if (res.ok) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error('Error saving assessment marks:', err);
        setSaveStatus('error');
      }
    }, 450);
  };

  // Create / Edit Assessment Column
  const handleOpenAddCol = () => {
    setEditingCol(null);
    setColFormData({
      name: '',
      category: 'Class Test',
      subject_id: selectedSubjectId !== 'all' ? selectedSubjectId : (subjects[0]?.id || ''),
      date: new Date().toISOString().split('T')[0],
      max_marks: 100,
      weight: 20,
      term: selectedTerm,
    });
    setColModalOpen(true);
  };

  const handleOpenEditCol = (col: AssessmentColumn) => {
    setEditingCol(col);
    setColFormData({
      name: col.name,
      category: col.category,
      subject_id: col.subject_id || '',
      date: col.date,
      max_marks: col.max_marks,
      weight: col.weight,
      term: col.term,
    });
    setColModalOpen(true);
  };

  const handleSaveCol = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCol ? `/api/assessments/columns/${editingCol.id}` : '/api/assessments/columns';
      const method = editingCol ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...colFormData,
          class_id: selectedClassId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setColModalOpen(false);
      loadGrid();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCol = async (colId: string, colName: string) => {
    if (!confirm(`Are you sure you want to delete assessment column "${colName}"? All entered student marks in this column will be permanently removed.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/assessments/columns/${colId}`, {
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
              {t('navMarklist')} — Assessment Spreadsheet
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
                  <span className="text-red-600 font-medium">Validation/Save Error</span>
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
            Editable mark entry with real-time weighted percentage calculation, grade assignment, and ranking.
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

          {/* Subject Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-xs text-slate-500">Subject:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="all">{t('allSubjects')}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Term Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-xs text-slate-500">Term:</span>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
              <option value="Annual">Annual Final</option>
            </select>
          </div>

          {/* Add Assessment Column */}
          <button
            onClick={handleOpenAddCol}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addAssessment')}</span>
          </button>

          {/* Report Button */}
          <button
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('printReport')}</span>
          </button>
        </div>
      </div>

      {/* Info & Search Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Award className="w-4 h-4 text-indigo-600" />
          <span>
            Total Column Weights: <strong className="font-semibold text-slate-900">{totalWeight}%</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Grading Scale: <strong className="font-semibold text-slate-900">Standard 4.0 GPA (A+, A, B, C, D, F)</strong>
          </span>
        </div>

        {/* Student Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
            placeholder="Search student marks..."
            className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-md focus:outline-hidden focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[68vh]">
          <table className="w-full text-left text-xs border-collapse">
            {/* Header */}
            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-20 shadow-xs border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200 bg-slate-100 sticky left-0 z-30">
                  {t('colNo')}
                </th>
                <th className="py-2.5 px-3 min-w-[190px] border-r border-slate-200 bg-slate-100 sticky left-12 z-30">
                  {t('colStudentName')}
                </th>

                {/* Dynamic Assessment Columns */}
                {columns.length === 0 ? (
                  <th className="py-4 px-6 text-center text-slate-400 border-r border-slate-200">
                    No assessment columns created for {selectedTerm}. Click "+ {t('addAssessment')}" to add tests, exams, or homework.
                  </th>
                ) : (
                  columns.map((col) => (
                    <th
                      key={col.id}
                      className="py-2 px-2 text-center border-r border-slate-200 min-w-[105px] group relative"
                    >
                      <div className="font-semibold text-slate-900 truncate max-w-[120px] mx-auto" title={col.name}>
                        {col.name}
                      </div>
                      <div className="text-[10px] text-indigo-700 font-normal">
                        {col.category}
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        Max: {col.max_marks} · {col.weight}% wt
                      </div>

                      {/* Edit / Delete Column hover controls */}
                      <div className="flex items-center justify-center gap-1 mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCol(col)}
                          title="Edit column settings"
                          className="p-0.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCol(col.id, col.name)}
                          title="Delete column"
                          className="p-0.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  ))
                )}

                {/* Summary Computed Columns */}
                <th className="py-2.5 px-3 w-24 text-center border-r border-slate-200 bg-slate-100 font-bold text-slate-800">
                  {t('totalMarks')}
                </th>
                <th className="py-2.5 px-3 w-24 text-center border-r border-slate-200 bg-indigo-50/50 font-bold text-indigo-900">
                  {t('weightedPct')}
                </th>
                <th className="py-2.5 px-2 w-16 text-center border-r border-slate-200 bg-slate-100 font-bold text-slate-900">
                  {t('grade')}
                </th>
                <th className="py-2.5 px-2 w-16 text-center bg-slate-100 font-bold text-slate-900">
                  {t('colRank')}
                </th>
              </tr>
            </thead>

            {/* Rows */}
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6 + columns.length} className="py-16 text-center text-slate-400">
                    Loading assessment marks...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6 + columns.length} className="py-16 text-center text-slate-400">
                    No students found in {selectedClass?.name || 'this class'}.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.student_id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Index */}
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-mono text-slate-400 sticky left-0 bg-white z-10">
                      {idx + 1}
                    </td>

                    {/* Student Info */}
                    <td className="py-2 px-3 border-r border-slate-200 sticky left-12 bg-white z-10 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{row.student_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{row.student_number}</div>
                    </td>

                    {/* Editable Assessment Mark Cells */}
                    {columns.map((col) => {
                      const markVal = row.marks[col.id];
                      const cellKey = `${row.student_id}_${col.id}`;
                      const hasErr = cellErrors[cellKey];

                      return (
                        <td
                          key={col.id}
                          className={`p-1 text-center border-r border-slate-200 ${
                            hasErr ? 'bg-red-50' : ''
                          }`}
                        >
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              min={0}
                              max={col.max_marks}
                              defaultValue={markVal !== null && markVal !== undefined ? markVal : ''}
                              onBlur={(e) => handleMarkChange(row.student_id, col, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className={`w-full text-center py-1.5 px-1 font-mono text-xs tabular-nums rounded border transition-colors focus:outline-hidden focus:bg-indigo-50/50 ${
                                hasErr
                                  ? 'border-red-500 bg-red-50 text-red-700'
                                  : 'border-transparent hover:border-slate-300 focus:border-indigo-500'
                              }`}
                              placeholder="—"
                            />
                            {hasErr && (
                              <span
                                title={hasErr}
                                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-bold"
                              >
                                !
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Total Marks Earned vs Possible */}
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-mono tabular-nums text-slate-700">
                      {row.hasAnyMarks ? (
                        <>
                          <span className="font-semibold text-slate-900">{row.rawTotalEarned}</span>
                          <span className="text-[10px] text-slate-400"> / {row.rawTotalPossible}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Weighted % */}
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-bold tabular-nums text-indigo-700 bg-indigo-50/20">
                      {row.hasAnyMarks ? `${row.percentage}%` : '—'}
                    </td>

                    {/* Grade */}
                    <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-sm">
                      <span
                        className={
                          row.gradeLetter.startsWith('A')
                            ? 'text-emerald-700'
                            : row.gradeLetter === 'B'
                            ? 'text-blue-700'
                            : row.gradeLetter === 'C'
                            ? 'text-amber-700'
                            : row.gradeLetter === 'F'
                            ? 'text-red-700'
                            : 'text-slate-700'
                        }
                      >
                        {row.gradeLetter}
                      </span>
                    </td>

                    {/* Rank */}
                    <td className="py-2 px-2 text-center font-bold tabular-nums text-slate-800">
                      {row.rank !== '-' ? `#${row.rank}` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Assessment Column Modal */}
      {colModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCol ? 'Edit Assessment Column' : t('addAssessment')}
              </h3>
              <button onClick={() => setColModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCol} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('assessmentName')} *</label>
                <input
                  type="text"
                  required
                  value={colFormData.name}
                  onChange={(e) => setColFormData({ ...colFormData, name: e.target.value })}
                  placeholder="e.g. Midterm Examination, Quiz 2"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t('category')} *</label>
                  <select
                    value={colFormData.category}
                    onChange={(e) => setColFormData({ ...colFormData, category: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white"
                  >
                    <option value="Major Examination">{t('majorExam')}</option>
                    <option value="Class Test">{t('classTest')}</option>
                    <option value="Quiz">{t('quiz')}</option>
                    <option value="Homework">{t('homework')}</option>
                    <option value="Assignment">{t('assignment')}</option>
                    <option value="Practical">{t('practical')}</option>
                    <option value="Custom">{t('custom')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Subject</label>
                  <select
                    value={colFormData.subject_id}
                    onChange={(e) => setColFormData({ ...colFormData, subject_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white"
                  >
                    <option value="">-- General / Multi --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t('maxMarks')} *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={colFormData.max_marks}
                    onChange={(e) => setColFormData({ ...colFormData, max_marks: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t('weight')} *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={colFormData.weight}
                    onChange={(e) => setColFormData({ ...colFormData, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t('date')}</label>
                  <input
                    type="date"
                    value={colFormData.date}
                    onChange={(e) => setColFormData({ ...colFormData, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">{t('term')}</label>
                  <select
                    value={colFormData.term}
                    onChange={(e) => setColFormData({ ...colFormData, term: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setColModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 cursor-pointer"
                >
                  Save Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Marklist Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Official Academic Marklist Sheet — {selectedClass?.name} ({selectedTerm})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('printReport')}</span>
                </button>
                <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-xs print:p-0">
              <div className="border-b border-slate-200 pb-4 text-center">
                <h2 className="text-lg font-bold text-slate-900">BIZAIKIT INTERNATIONAL ACADEMY</h2>
                <p className="text-slate-500 text-xs">Official Assessment Report & Student Grade Ledger</p>
                <div className="mt-2 text-[11px] text-slate-600 flex justify-center gap-4">
                  <span>Class: <strong>{selectedClass?.name}</strong></span>
                  <span>Term: <strong>{selectedTerm}</strong></span>
                  <span>Evaluated Assessments: <strong>{columns.length}</strong></span>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 border border-slate-200 w-10 text-center">#</th>
                    <th className="py-2 px-3 border border-slate-200">Student ID</th>
                    <th className="py-2 px-3 border border-slate-200">Full Name</th>
                    {columns.map((c) => (
                      <th key={c.id} className="py-2 px-2 border border-slate-200 text-center">
                        {c.name} ({c.max_marks})
                      </th>
                    ))}
                    <th className="py-2 px-3 border border-slate-200 text-center font-bold">Weighted %</th>
                    <th className="py-2 px-2 border border-slate-200 text-center font-bold">Grade</th>
                    <th className="py-2 px-2 border border-slate-200 text-center font-bold">Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((r, idx) => (
                    <tr key={r.student_id}>
                      <td className="py-2 px-3 border border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 border border-slate-200 font-mono text-indigo-700">{r.student_number}</td>
                      <td className="py-2 px-3 border border-slate-200 font-semibold text-slate-900">{r.student_name}</td>
                      {columns.map((c) => (
                        <td key={c.id} className="py-2 px-2 border border-slate-200 text-center font-mono">
                          {r.marks[c.id] !== null && r.marks[c.id] !== undefined ? r.marks[c.id] : '—'}
                        </td>
                      ))}
                      <td className="py-2 px-3 border border-slate-200 text-center font-bold text-slate-900 font-mono">
                        {r.hasAnyMarks ? `${r.percentage}%` : '—'}
                      </td>
                      <td className="py-2 px-2 border border-slate-200 text-center font-bold">
                        {r.gradeLetter}
                      </td>
                      <td className="py-2 px-2 border border-slate-200 text-center font-bold font-mono">
                        {r.rank !== '-' ? `#${r.rank}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 flex justify-between text-slate-500 text-[11px]">
                <div>
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span>Subject Teacher Signature</span>
                </div>
                <div>
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span>Head of Department Verification</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
