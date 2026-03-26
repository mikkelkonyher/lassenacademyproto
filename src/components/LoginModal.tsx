/**
 * LoginModal.tsx
 * Full-screen overlay modal with two views: the standard email/password login form,
 * and a "forgot password" sub-view that sends a reset link via Supabase.
 * The `showForgot` flag toggles between the two views without unmounting.
 */

import { useState } from 'react';
import { X, Mail, Lock, Sparkles, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import type { FormEvent } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const { t } = useLanguage();
  const { signIn, resetPasswordRequest } = useAuth();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot-password sub-view state — toggled by `showForgot`
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  if (!isOpen) return null;

  // Authenticate via Supabase; on success, clear fields and close the modal
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { error: signInError } = await signIn(email, password);
    setIsLoading(false);

    if (signInError) {
      setError(signInError);
    } else {
      setEmail('');
      setPassword('');
      onClose();
    }
  };

  // Request a password-reset email from Supabase
  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    const { error: resetError } = await resetPasswordRequest(forgotEmail);
    setForgotLoading(false);

    if (resetError) {
      setForgotError(resetError);
    } else {
      setForgotSent(true);
    }
  };

  // Return to the login view and reset all forgot-password state
  const handleBackToLogin = () => {
    setShowForgot(false);
    setForgotEmail('');
    setForgotSent(false);
    setForgotError('');
  };

  // Full cleanup so the modal opens fresh next time
  const handleClose = () => {
    handleBackToLogin();
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      ></div>

      <div className="relative w-full max-w-md glass-strong border border-white/20 rounded-2xl p-8 shadow-[0_0_60px_rgba(251,146,60,0.3)]">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
          <span className="sr-only">{t.auth.close}</span>
        </button>

        {showForgot ? (
          <>
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/20 border border-primary/30">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">{t.auth.forgotPasswordTitle}</h2>
              <p className="text-gray-300 text-base leading-relaxed max-w-sm mx-auto">{t.auth.forgotPasswordSubtitle}</p>
            </div>

            {forgotSent ? (
              <div className="text-center space-y-4">
                <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300">
                  {t.auth.forgotPasswordSent}
                </div>
                <button
                  onClick={handleBackToLogin}
                  className="text-sm text-gray-400 hover:text-primary transition-colors cursor-pointer"
                >
                  {t.auth.backToLogin}
                </button>
              </div>
            ) : (
              <>
                {forgotError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                    {forgotError}
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1 block">
                      {t.auth.emailLabel}
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        maxLength={255}
                        className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {forgotLoading ? '...' : t.auth.sendResetLink}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={handleBackToLogin}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {t.auth.backToLogin}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/20 border border-primary/30">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">{t.auth.loginTitle}</h2>
              <p className="text-gray-300 text-base leading-relaxed max-w-sm mx-auto">{t.auth.loginSubtitle}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1 block">
                  {t.auth.emailLabel}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300 ml-1 block">
                    {t.auth.passwordLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-gray-400 hover:text-primary transition-colors cursor-pointer"
                  >
                    {t.auth.forgotPassword}
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={128}
                    className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? '...' : t.auth.loginButton}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={onSwitchToRegister}
                className="text-sm text-gray-400 hover:text-primary transition-colors cursor-pointer"
              >
                {t.auth.registerLink}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
