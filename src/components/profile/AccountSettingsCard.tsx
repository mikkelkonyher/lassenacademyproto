/**
 * AccountSettingsCard — editable display name and bio. Email is shown but
 * read-only: it is the auth identity and cannot be changed here.
 */
import { User, Mail } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface AccountSettingsCardProps {
  name: string;
  bio: string;
  email: string;
  onNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
}

export default function AccountSettingsCard({
  name,
  bio,
  email,
  onNameChange,
  onBioChange,
}: AccountSettingsCardProps) {
  const { t } = useLanguage();

  return (
    <div className="glass border border-white/20 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-5">{t.myProfile.settings.accountTitle}</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1 block">{t.myProfile.settings.nameLabel}</label>
          <div className="relative group">
            <User className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              maxLength={100}
              className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1 block">{t.myProfile.settings.emailLabel}</label>
          <div className="relative group">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="email"
              readOnly
              value={email}
              className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white/60 placeholder:text-gray-400 focus:outline-none cursor-not-allowed"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1 block">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full glass border border-white/20 rounded-lg py-3 px-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all resize-none"
          />
          <p className="text-xs text-gray-500 text-right mt-1">{bio.length}/500</p>
        </div>
      </div>
    </div>
  );
}
