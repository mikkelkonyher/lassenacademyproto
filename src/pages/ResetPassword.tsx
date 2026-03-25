import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import type { FormEvent } from 'react';

export default function ResetPassword() {
  const { t } = useLanguage();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError(t.auth.passwordTooShort);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.auth.passwordsMismatch);
      return;
    }

    setIsLoading(true);
    const { error: resetError } = await resetPassword(newPassword);
    setIsLoading(false);

    if (resetError) {
      setError(t.auth.resetPasswordError);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-strong border border-white/20 rounded-2xl p-8 shadow-[0_0_60px_rgba(251,146,60,0.3)]">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/20 border border-primary/30">
              {success ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <Sparkles className="w-6 h-6 text-primary" />
              )}
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">{t.auth.resetPasswordTitle}</h2>
          {!success && (
            <p className="text-gray-300 text-base leading-relaxed max-w-sm mx-auto">{t.auth.resetPasswordSubtitle}</p>
          )}
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300">
              {t.auth.resetPasswordSuccess}
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 transition-all cursor-pointer"
            >
              {t.auth.goBackHome}
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1 block">
                  {t.auth.newPasswordLabel}
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    maxLength={128}
                    className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1 block">
                  {t.auth.confirmNewPasswordLabel}
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    maxLength={128}
                    className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? '...' : t.auth.resetPasswordButton}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
