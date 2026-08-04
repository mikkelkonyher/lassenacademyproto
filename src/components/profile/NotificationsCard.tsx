/**
 * NotificationsCard — the three notification toggles. Values are saved by the
 * page's single "Save changes" button, not on toggle.
 */
import { Bell } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export type NotificationPrefs = {
  email: boolean;
  courseUpdates: boolean;
  newsletter: boolean;
};

interface NotificationsCardProps {
  notifications: NotificationPrefs;
  onToggle: (key: keyof NotificationPrefs) => void;
}

export default function NotificationsCard({
  notifications,
  onToggle,
}: NotificationsCardProps) {
  const { t } = useLanguage();
  const s = t.myProfile.settings;

  const items = [
    { key: 'email' as const, label: s.emailNotifications },
    { key: 'courseUpdates' as const, label: s.courseUpdates },
    { key: 'newsletter' as const, label: s.newsletter },
  ];

  return (
    <div className="glass border border-white/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Bell className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-white">{s.notificationsTitle}</h3>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-sm text-gray-300">{item.label}</span>
            <button
              onClick={() => onToggle(item.key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                notifications[item.key] ? 'bg-primary' : 'bg-white/20'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  notifications[item.key] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
