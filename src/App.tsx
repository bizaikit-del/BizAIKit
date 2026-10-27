import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { LanguageProvider, useLanguage } from './context/LanguageContext.js';
import { Header, ActiveTab } from './components/layout/Header.js';
import { GeneralDashboard } from './components/dashboard/GeneralDashboard.js';
import { StudentManagement } from './components/students/StudentManagement.js';
import { AttendanceManagement } from './components/attendance/AttendanceManagement.js';
import { MarklistManagement } from './components/assessments/MarklistManagement.js';
import { SettingsModal } from './components/layout/SettingsModal.js';
import { LoginModal } from './components/auth/LoginModal.js';
import { Lock, Shield, UserCheck, ArrowRight } from 'lucide-react';

function MainAppContent() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-600">Initializing School System...</span>
        </div>
      </div>
    );
  }

  // If not logged in, show an authorized sign-in gate with quick start
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSettings={() => setLoginOpen(true)}
          onOpenLogin={() => setLoginOpen(true)}
        />

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
              <Shield className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Bizaikit School Management System
              </h1>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
                Secure, multilingual portal for school administration, student records, daily attendance tracking, and academic marklists.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-2">
              <span className="font-semibold text-slate-800 block">Available Test Accounts:</span>
              <div className="flex items-center justify-between text-slate-600">
                <span>• Super Admin (Principal):</span>
                <span className="font-mono text-indigo-700 font-semibold">admin / Admin@123</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>• Teacher (Math - Gr 9A/10A):</span>
                <span className="font-mono text-indigo-700 font-semibold">teacher.ahmed / Teacher@123</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>• Teacher (English - Gr 9A/9B):</span>
                <span className="font-mono text-indigo-700 font-semibold">teacher.fatima / Teacher@123</span>
              </div>
            </div>

            <button
              onClick={() => setLoginOpen(true)}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('login')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Strict Top Bar Contract with the 4 modules */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenLogin={() => setLoginOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'dashboard' && <GeneralDashboard onNavigateTab={setActiveTab} />}
        {activeTab === 'students' && <StudentManagement />}
        {activeTab === 'attendance' && <AttendanceManagement />}
        {activeTab === 'marklist' && <MarklistManagement />}
      </main>

      {/* Compact Administration / Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Sign In Modal */}
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
