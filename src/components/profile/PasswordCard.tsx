/**
 * PasswordCard — current/new/confirm password fields with inline feedback.
 * Validation and the Supabase call live in usePasswordChange.
 */
import { Lock } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface PasswordCardProps {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  isChangingPassword: boolean;
  message: string;
  isError: boolean;
  onCurrentChange: (value: string) => void;
  onNewChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  onSubmit: () => void;
}

export default function PasswordCard({
  currentPassword,
  newPassword,
  confirmNewPassword,
  isChangingPassword,
  message,
  isError,
  onCurrentChange,
  onNewChange,
  onConfirmChange,
  onSubmit,
}: PasswordCardProps) {
  const { t } = useLanguage();
  const s = t.myProfile.settings;

  return (
    <div className="glass border border-white/20 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-5">{s.passwordTitle}</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1 block">{s.currentPassword}</label>
          <div className="relative group">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => onCurrentChange(e.target.value)}
              maxLength={128}
              placeholder="••••••••"
              className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1 block">{s.newPassword}</label>
          <div className="relative group">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => onNewChange(e.target.value)}
              maxLength={128}
              placeholder="••••••••"
              className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1 block">{s.confirmPassword}</label>
          <div className="relative group">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => onConfirmChange(e.target.value)}
              maxLength={128}
              placeholder="••••••••"
              className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>
      </div>
      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          isError ? 'bg-red-500/20 border border-red-500/30 text-red-300' : 'bg-green-500/20 border border-green-500/30 text-green-300'
        }`}>
          {message}
        </div>
      )}
      <button
        onClick={onSubmit}
        disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
        className="mt-4 w-full glass border border-white/20 text-white font-bold py-3 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isChangingPassword ? '...' : s.changePasswordButton}
      </button>
    </div>
  );
}
