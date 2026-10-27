import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { SupportedLanguage } from '../../types/index.js';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  GraduationCap,
  Settings,
  LogOut,
  Globe,
  ChevronDown,
  Shield,
  UserCheck
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'students' | 'attendance' | 'marklist';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenLogin,
}) => {
  const { user, logout, isSuperAdmin } = useAuth();
  const { language, setLanguage, t, languageNames } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { id: 'students', label: t('navStudents'), icon: Users },
    { id: 'attendance', label: t('navAttendance'), icon: CalendarCheck },
    { id: 'marklist', label: t('navMarklist'), icon: GraduationCap },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              B
            </div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-left cursor-pointer group"
            >
              <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block">
                Bizaikit SMS
              </span>
            </button>
          </div>

          {/* Zone 2: The 4 Main Navigation Modules */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-slate-100 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Cluster (Language Selector + Settings + Profile/Logout) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                aria-label="Select Language"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">{languageNames[language].nativeName}</span>
                <span className="sm:hidden">{language.toUpperCase()}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {langMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setLangMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs">
                    {(Object.keys(languageNames) as SupportedLanguage[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setLanguage(key);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          language === key ? 'text-indigo-600 font-semibold bg-indigo-50/50' : 'text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{languageNames[key].flag}</span>
                          <span>{languageNames[key].nativeName}</span>
                        </span>
                        {language === key && <span className="text-indigo-600 text-xs font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Compact Settings / Administration Button */}
            {user && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                title={t('settingsTitle')}
              >
                <Settings className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">{t('settingsTitle')}</span>
              </button>
            )}

            {/* User Profile / Logout */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden xl:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {user.full_name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {user.role === 'super_admin' ? t('roleSuperAdmin') : t('roleTeacher')}
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title={t('logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
              >
                {t('login')}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-between border-t border-slate-100 py-2 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-100 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
