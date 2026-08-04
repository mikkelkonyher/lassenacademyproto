/**
 * LoginRequired — what an anonymous visitor sees instead of the profile.
 */
import { User } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface LoginRequiredProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export default function LoginRequired({
  onOpenLogin,
  onOpenRegister,
}: LoginRequiredProps) {
  const { t } = useLanguage();

  return (
    <div className="pt-24 pb-16 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="glass border border-white/20 rounded-2xl p-12 text-center max-w-md">
        <User className="w-16 h-16 text-primary mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-3">{t.auth.loginTitle}</h2>
        <p className="text-gray-400 mb-6">{t.auth.loginSubtitle}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onOpenLogin}
            className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-primary/20 transition-all"
          >
            {t.auth.loginButton}
          </button>
          <button
            onClick={onOpenRegister}
            className="glass border border-white/20 text-white font-bold py-3 px-6 rounded-lg hover:bg-white/10 transition-all"
          >
            {t.auth.submitButton}
          </button>
        </div>
      </div>
    </div>
  );
}
