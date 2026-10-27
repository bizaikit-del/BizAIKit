import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage } from '../types/index.js';
import { translations, TranslationDictionary } from '../i18n/translations.js';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: keyof TranslationDictionary) => string;
  languageNames: Record<SupportedLanguage, { name: string; nativeName: string; flag: string }>;
}

const LANGUAGE_STORAGE_KEY = 'bizaikit_sms_language';

const languageNames: Record<SupportedLanguage, { name: string; nativeName: string; flag: string }> = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  so: { name: 'Somali', nativeName: 'Af-Soomaali', flag: '🇸🇴' },
  om: { name: 'Oromo', nativeName: 'Afaan Oromoo', flag: '🇪🇹' },
  am: { name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage;
    if (saved && ['en', 'so', 'om', 'am'].includes(saved)) {
      return saved;
    }
    return 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  const t = (key: keyof TranslationDictionary): string => {
    const dict = translations[language] || translations.en;
    return dict[key] || translations.en[key] || (key as string);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languageNames }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
