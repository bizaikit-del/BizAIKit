import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { Lock, User, KeyRound, AlertCircle, ArrowRight, Shield, BookOpen } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const { t } = useLanguage();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await login(username, password);
    setSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const setDemoUser = (userVal: string, passVal: string) => {
    setUsername(userVal);
    setPassword(passVal);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Lock className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wide uppercase">Bizaikit Authentication</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign in to School System</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access students, attendance, marklists, and administration.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t('username')} or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                placeholder="e.g. admin or teacher.ahmed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              {t('password')}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
          >
            {submitting ? t('saving') : t('login')}
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Demo Credentials */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-medium text-slate-500 block mb-2">
              Quick Test Accounts (Click to Fill):
            </span>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setDemoUser('admin', 'Admin@123')}
                className="flex items-center justify-between p-2 rounded-md border border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-200 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-medium text-slate-800">Super Admin (Principal)</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">admin</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('teacher.ahmed', 'Teacher@123')}
                className="flex items-center justify-between p-2 rounded-md border border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-200 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-medium text-slate-800">Teacher (Ahmed - Math)</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">teacher.ahmed</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('teacher.fatima', 'Teacher@123')}
                className="flex items-center justify-between p-2 rounded-md border border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-200 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-medium text-slate-800">Teacher (Fatima - English)</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">teacher.fatima</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
