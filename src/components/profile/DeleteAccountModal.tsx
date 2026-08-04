/**
 * DeleteAccountModal — password re-entry before permanent account deletion.
 * The password is verified server-side by the delete-account edge function.
 */
import { Lock, AlertTriangle } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface DeleteAccountModalProps {
  password: string;
  isDeleting: boolean;
  message: string;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteAccountModal({
  password,
  isDeleting,
  message,
  onPasswordChange,
  onCancel,
  onConfirm,
}: DeleteAccountModalProps) {
  const { t } = useLanguage();
  const s = t.myProfile.settings;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-strong border border-red-500/30 rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <h3 className="text-xl font-bold text-white">{s.deleteModalTitle}</h3>
        </div>
        <p className="text-sm text-gray-400 mb-5">{s.deleteModalBody}</p>

        <label className="text-sm font-medium text-gray-300 ml-1 block mb-2">{s.deletePasswordLabel}</label>
        <div className="relative group">
          <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-red-400 transition-colors" />
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            maxLength={128}
            placeholder="••••••••"
            autoFocus
            className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/30 transition-all"
          />
        </div>

        {message && (
          <div className="mt-4 p-3 rounded-lg text-sm bg-red-500/20 border border-red-500/30 text-red-300">
            {message}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 glass border border-white/20 text-white font-bold py-3 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {s.deleteCancelButton}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting || !password}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '...' : s.deleteConfirmButton}
          </button>
        </div>
      </div>
    </div>
  );
}
