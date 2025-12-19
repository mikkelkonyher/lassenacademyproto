import { X, User, Mail, Lock, Sparkles } from 'lucide-react';
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
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-md glass-strong border border-white/20 rounded-2xl p-8 shadow-[0_0_60px_rgba(251,146,60,0.3)] animate-in fade-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
          <span className="sr-only">{t.auth.close}</span>
        </button>

        <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/20 border border-primary/30">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">{t.auth.registerTitle}</h2>
            <p className="text-gray-300 text-base leading-relaxed max-w-sm mx-auto">{t.auth.registerSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1 block">
              {t.auth.nameLabel}
            </label>
            <div className="relative group">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                required
                className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder={t.auth.nameLabel}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1 block">
              {t.auth.emailLabel}
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="email" 
                required
                className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1 block">
              {t.auth.passwordLabel}
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="password" 
                required
                className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
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
