/**
 * WatchlistSection — grid of saved courses. Each card carries a WatchlistButton
 * so an item can be removed straight from here.
 */
import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import WatchlistButton from "../WatchlistButton";
import type { WatchlistRow } from "../../types/profile";

interface WatchlistSectionProps {
  rows: WatchlistRow[];
  isEmpty: boolean;
  onRequireLogin: () => void;
}

export default function WatchlistSection({
  rows,
  isEmpty,
  onRequireLogin,
}: WatchlistSectionProps) {
  const { t, language } = useLanguage();

  return (
    <div className="glass border border-white/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Bookmark className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-white">{t.myProfile.watchlist.title}</h3>
      </div>

      {isEmpty ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">{t.myProfile.watchlist.empty}</p>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-lg shadow-lg shadow-primary/20 transition-all"
          >
            {t.myProfile.watchlist.browseCourses}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map((row) => {
            const c = row.courses!;
            const title = language === 'da' ? c.title_da : c.title_en || c.title_da;
            return (
              <Link
                key={row.id}
                to={`/courses/${c.slug}`}
                className="relative rounded-xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all group"
              >
                <div className="aspect-video relative">
                  <img
                    src={c.image_url}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                  <div className="absolute top-2 right-2 z-10">
                    <WatchlistButton
                      itemType="course"
                      itemId={c.id}
                      variant="icon"
                      onRequireLogin={onRequireLogin}
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold leading-tight line-clamp-2">{title}</p>
                    <p className="text-xs text-gray-300 mt-0.5">{c.instructor}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
