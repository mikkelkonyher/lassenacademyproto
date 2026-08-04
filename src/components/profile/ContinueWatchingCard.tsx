/**
 * ContinueWatchingCard — the single most recently watched in-progress lesson,
 * with a progress bar and a link straight back into the player.
 */
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import type { ContinueWatchingRow } from "../../types/profile";

interface ContinueWatchingCardProps {
  row: ContinueWatchingRow;
}

export default function ContinueWatchingCard({ row }: ContinueWatchingCardProps) {
  const { t, language } = useLanguage();

  const moduleLabel = `${t.courseDetail.moduleLabel} ${row.sortOrder + 1}`;
  const title = language === 'da' ? row.titleDa : row.titleEn || row.titleDa;
  const courseTitle = language === 'da' ? row.courseTitleDa : row.courseTitleEn || row.courseTitleDa;
  const fraction = row.durationSeconds > 0
    ? Math.min(row.positionSeconds / row.durationSeconds, 1)
    : 0;
  const pct = Math.round(fraction * 100);
  // The lesson's stored poster, falling back to the course cover.
  // This used to pull a frame at the viewer's exact playback position, but that
  // needs a per-position Mux token once the asset is signed — the progress bar
  // below already conveys "where you left off".
  const thumb = row.lessonThumbnailUrl ?? row.courseImageUrl;

  return (
    <Link
      to={`/courses/${row.courseSlug}/${row.lessonSlug}`}
      className="glass border border-white/20 rounded-2xl p-6 block hover:border-primary/50 transition-all group"
    >
      <div className="flex items-center gap-2 mb-4">
        <Play className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-white">{t.progress.continueWatching}</h3>
      </div>
      <div className="flex gap-4 items-center">
        <div className="relative w-40 sm:w-48 aspect-video rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={thumb}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-primary rounded-r-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-primary font-bold uppercase tracking-wider">{moduleLabel}</p>
          <p className="text-white font-bold leading-tight line-clamp-2 mt-0.5">{title}</p>
          <p className="text-sm text-gray-400 mt-1 line-clamp-1">{courseTitle}</p>
          <p className="text-xs text-primary mt-2 font-medium">{pct}% · {t.progress.resumeLesson} →</p>
        </div>
      </div>
    </Link>
  );
}
