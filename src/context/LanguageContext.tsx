/**
 * Language (i18n) context provider and hook.
 * Manages the active language (Danish / English) and exposes
 * a `t` object containing all translated UI strings for the current language.
 * Components access translations via: const { t } = useLanguage();
 */

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { translations, type Language } from '../translations';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  /** Pre-resolved translation strings for the active language */
  t: typeof translations.da;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to Danish since the academy is based in Denmark
  const [language, setLanguage] = useState<Language>('da');

  // Simple toggle — only two languages are supported
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'da' ? 'en' : 'da');
  };

  // Derive the translation object once per render so consumers don't need to look it up
  const value = {
    language,
    toggleLanguage,
    t: translations[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Convenience hook — throws if used outside LanguageProvider to catch wiring mistakes early */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
