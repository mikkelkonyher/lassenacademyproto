/**
 * DangerZone — the entry point to permanent account deletion. Opening the
 * modal is all this does; the confirmation lives in DeleteAccountModal.
 */
import { Trash2, AlertTriangle } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface DangerZoneProps {
  onOpenDeleteModal: () => void;
}

export default function DangerZone({ onOpenDeleteModal }: DangerZoneProps) {
  const { t } = useLanguage();
  const s = t.myProfile.settings;

  return (
    <div className="glass border border-red-500/30 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-bold text-red-400">{s.dangerTitle}</h3>
      </div>
      <p className="text-sm text-gray-400 mb-5">{s.dangerWarning}</p>
      <button
        onClick={onOpenDeleteModal}
        className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/40 text-red-300 font-bold py-3 px-5 rounded-lg hover:bg-red-500/20 transition-all"
      >
        <Trash2 className="w-4 h-4" />
        {s.deleteAccountButton}
      </button>
    </div>
  );
}
