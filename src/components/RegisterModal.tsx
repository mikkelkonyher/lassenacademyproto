import { X, User, Mail, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { FormEvent } from 'react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Placeholder for Supabase integration
    console.log('Register submitted');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-card/90 border border-white/10 rounded-2xl p-8 shadow-[0_0_50px_rgba(225,29,72,0.15)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
          <span className="sr-only">{t.auth.close}</span>
        </button>

        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">{t.auth.registerTitle}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1 block">
              {t.auth.nameLabel}
            </label>
            <div className="relative group">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                placeholder={t.auth.nameLabel}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1 block">
              {t.auth.emailLabel}
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="email" 
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1 block">
              {t.auth.passwordLabel}
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="password" 
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200 mt-2"
          >
            {t.auth.submitButton}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-gray-400 hover:text-primary transition-colors">
            {t.auth.loginLink}
          </a>
        </div>
      </div>
    </div>
  );
}
