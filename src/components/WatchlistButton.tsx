/**
 * WatchlistButton — drop-in toggle for saving a course.
 *
 * Two visual variants:
 *  - 'icon': a small circular bookmark overlay (used on course cards)
 *  - 'pill': a bordered button with label + icon (used in the lesson player)
 *
 * When the user is logged out, clicking the button calls `onRequireLogin` so
 * the parent page can open its login modal. The actual save/remove is
 * delegated to the WatchlistContext for optimistic updates.
 */

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useLanguage } from '../context/LanguageContext';

interface WatchlistButtonProps {
  /** Only courses can be saved — lessons are derived from their parent course */
  itemType: 'course';
  itemId: string;
  /** 'icon' is compact (card overlay); 'pill' is wide with label */
  variant?: 'icon' | 'pill';
  /** Called when an unauthenticated user clicks the button */
  onRequireLogin: () => void;
  className?: string;
}

export default function WatchlistButton({
  itemId,
  variant = 'icon',
  onRequireLogin,
  className = '',
}: WatchlistButtonProps) {
  const { user } = useAuth();
  const { isSaved, toggle } = useWatchlist();
  const { t } = useLanguage();

  const saved = isSaved(itemId);

  const tooltip = saved
    ? t.watchlist.tooltipRemoveCourse
    : t.watchlist.tooltipAddCourse;
  const pillLabel = saved ? t.watchlist.removeCourse : t.watchlist.saveCourse;

  // Single click handler for both variants: gate on auth, then toggle
  const handleClick = (e: React.MouseEvent) => {
    // Stop the surrounding <Link> (course card) from navigating
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      onRequireLogin();
      return;
    }
    void toggle(itemId);
  };

  const Icon = saved ? BookmarkCheck : Bookmark;

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={tooltip}
        aria-pressed={saved}
        title={tooltip}
        className={`flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-md border transition-all ${
          saved
            ? 'bg-primary/90 border-primary text-white shadow-lg shadow-primary/40'
            : 'bg-black/60 border-white/30 text-white hover:bg-black/80 hover:border-primary/60'
        } ${className}`}
      >
        <Icon className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
      </button>
    );
  }

  // Pill variant
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      title={tooltip}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
        saved
          ? 'bg-primary/20 border-primary/60 text-primary hover:bg-primary/30'
          : 'glass border-white/20 text-white hover:border-primary/50 hover:bg-white/5'
      } ${className}`}
    >
      <Icon className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
      <span>{pillLabel}</span>
    </button>
  );
}
