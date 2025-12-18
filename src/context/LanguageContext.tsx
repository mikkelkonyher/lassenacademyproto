import { createContext, useContext, useState, type ReactNode } from 'react';
import { translations, type Language } from '../translations';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: typeof translations.da;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('da');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'da' ? 'en' : 'da');
  };

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

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
