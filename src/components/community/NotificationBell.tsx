/**
 * NotificationBell — bell button with unread badge and the dropdown listing
 * replies to the user's own posts. Rendered only for signed-in users.
 */
import type { RefObject } from "react";
import { Bell, Check } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { getInitials, timeAgo } from "../../utils/timeAgo";
import type { ForumNotification } from "../../types/forum";

interface NotificationBellProps {
  /** Extra classes on the wrapper — the page uses it to reorder on mobile. */
  className?: string;
  notifications: ForumNotification[];
  unreadCount: number;
  showNotifications: boolean;
  onToggle: () => void;
  onNotificationClick: (notif: ForumNotification) => void;
  onMarkAllRead: () => void;
  /** Wraps the bell + dropdown so the hook's outside-click listener can work. */
  notifRef: RefObject<HTMLDivElement | null>;
}

export default function NotificationBell({
  className = "",
  notifications,
  unreadCount,
  showNotifications,
  onToggle,
  onNotificationClick,
  onMarkAllRead,
  notifRef,
}: NotificationBellProps) {
  const { t, language } = useLanguage();
  const ct = t.communityPage;

  return (
    <div className={`relative ${className}`} ref={notifRef}>
      <button
        onClick={onToggle}
        className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown. Its width is clamped to the viewport (minus
          the page's px-4 gutters) so the panel cannot spill off-screen on
          narrow phones. */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] sm:w-96 rounded-2xl border border-white/10 bg-[#1a2030] shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">
              {ct.notifications}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Check className="w-3 h-3" />
                {ct.markAllRead}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {ct.noNotifications}
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => onNotificationClick(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ${
                    !notif.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    {notif.commenter?.image_url ? (
                      <img
                        src={notif.commenter.image_url}
                        alt={notif.commenter.full_name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {notif.commenter
                          ? getInitials(notif.commenter.full_name)
                          : "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 leading-snug">
                        <span className="font-semibold text-white">
                          {notif.commenter?.full_name}
                        </span>{" "}
                        {ct.commentedOnYourPost}
                      </p>
                      <p className="text-xs text-primary/80 mt-0.5 truncate">
                        {notif.forum_posts?.title}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1">
                        {timeAgo(notif.created_at, language)}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
