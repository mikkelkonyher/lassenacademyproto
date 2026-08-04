/**
 * LanguageCard — DA/EN switch. Flips the UI immediately via the language
 * context; the choice is persisted with the page's "Save changes" button.
 */
import { Globe } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function LanguageCard() {
  const { t, language, toggleLanguage } = useLanguage();

  return (
    <div className="glass border border-white/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Globe className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-white">{t.myProfile.settings.languageTitle}</h3>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => { if (language !== 'da') toggleLanguage(); }}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            language === 'da'
              ? 'bg-primary/20 border border-primary/50 text-primary'
              : 'glass border border-white/10 text-gray-400 hover:text-white'
          }`}
        >
          Dansk
        </button>
        <button
          onClick={() => { if (language !== 'en') toggleLanguage(); }}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            language === 'en'
              ? 'bg-primary/20 border border-primary/50 text-primary'
              : 'glass border border-white/10 text-gray-400 hover:text-white'
          }`}
        >
          English
        </button>
      </div>
    </div>
  );
}
