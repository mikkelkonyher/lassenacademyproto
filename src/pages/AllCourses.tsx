/**
 * AllCourses.tsx — Full course catalogue with tag-based filtering.
 *
 * Fetches every published course from Supabase, renders them in a responsive
 * grid, and provides a tag filter bar. Each card links to /courses/:slug.
 * Tags are sourced from the actual courses (de-duplicated) so the filter UI
 * always matches what's in the database.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, PlayCircle, Check, Loader2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useWatchProgress } from "../context/WatchProgressContext";
import { useAuthModals } from "../hooks/useAuthModals";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";
import WatchlistButton from "../components/WatchlistButton";
import { supabase } from "../supabase/client";
import type { Database } from "../types/database.types";
import {
  getCourseThumbnail,
  totalCourseDuration,
} from "../utils/courseImage";
import { getTagLabel } from "../utils/tagLabel";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type CourseWithLessons = Course & {
  lessons: Pick<Lesson, "mux_playback_id" | "duration_seconds" | "sort_order" | "published">[];
};

/** Format duration in seconds as "Xt YYm" (DA) / "Xh YYm" (EN); null if unknown */
function formatDuration(seconds: number | null, language: "da" | "en"): string | null {
  if (seconds == null || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const hoursLabel = language === "da" ? "t" : "h";
  if (h === 0) return `${m}m`;
  return `${h}${hoursLabel} ${m.toString().padStart(2, "0")}m`;
}

export default function AllCourses() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { purchasedCourseIds } = useAuth();
  const { completedCountForCourse } = useWatchProgress();
  const {
    isRegisterOpen,
    isLoginOpen,
    openRegister,
    closeRegister,
    openLogin,
    closeLogin,
  } = useAuthModals();

  // Locale-aware price formatter for the price badge (DA uses ",")
  const isDa = language === "da";
  const formatPrice = (price: number) => {
    const hasDecimals = price % 1 !== 0;
    const formatted = hasDecimals
      ? price.toFixed(2).replace(".", isDa ? "," : ".")
      : price.toString();
    return `${formatted} kr`;
  };

  const [courses, setCourses] = useState<CourseWithLessons[]>([]);
  // True while the initial course fetch is in flight; gates the spinner so we
  // never flash "Viser 0 kurser" before data has loaded (there is always ≥1 course)
  const [loading, setLoading] = useState(true);
  // Tracks which filter tags the user has toggled on; empty means "show all"
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // Fetch all published courses with their published lessons embedded;
  // lessons feed the card thumbnail (first lesson's Mux poster) and total runtime.
  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("courses")
        .select(
          "*, lessons(id, mux_playback_id, duration_seconds, sort_order, published)",
        )
        .eq("published", true)
        .eq("lessons.published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (data) setCourses(data as CourseWithLessons[]);
      // Clear the loading flag once the request settles (success or empty)
      setLoading(false);
    };
    fetchCourses();
  }, []);

  // Distinct tags pulled from the fetched courses themselves so the filter UI
  // always reflects what's actually in the database
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      for (const tag of c.tags ?? []) set.add(tag);
    }
    return [...set].sort();
  }, [courses]);

  // Toggle a tag on/off in the active filter set
  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Show all courses when no tags selected; otherwise keep courses matching ANY active tag
  const filteredCourses = useMemo(() => {
    if (activeTags.length === 0) return courses;
    return courses.filter((course) =>
      (course.tags ?? []).some((tag) => activeTags.includes(tag))
    );
  }, [courses, activeTags]);

  // Rotating gradient backgrounds for visual variety across course cards
  const gradients = [
    "from-primary/20 via-accent/15 to-primary/10",
    "from-accent/20 via-primary/15 to-accent/10",
    "from-primary/25 via-accent/20 to-primary/15",
    "from-accent/25 via-primary/20 to-accent/15",
    "from-primary/20 via-accent/20 to-primary/15",
    "from-accent/20 via-primary/20 to-accent/15",
    "from-primary/25 via-accent/25 to-primary/20",
    "from-accent/25 via-primary/25 to-accent/20",
    "from-primary/20 via-accent/25 to-primary/20",
  ];

  // Build a human-readable result count string, handling singular vs plural
  const resultCount = filteredCourses.length;
  const resultText =
    resultCount === 1
      ? t.allCourses.showingOne
      : t.allCourses.showingResults.replace("{count}", String(resultCount));

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Page Header */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 uppercase">
              {t.allCourses.pageTitle}
            </h1>
            <p className="text-lg text-gray-400">
              {t.allCourses.pageSubtitle}
            </p>
          </div>

          {/* Tag Filter Bar — only render when we have tags to offer (and not loading) */}
          {!loading && allTags.length > 0 && (
            <div className="mb-8">
              <p className="text-sm text-gray-400 mb-3 font-medium">
                {t.allCourses.filterLabel}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTags([])}
                  className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all ${
                    activeTags.length === 0
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "glass border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  {t.allCourses.filterAll}
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all ${
                      activeTags.includes(tag)
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "glass border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    {getTagLabel(tag, t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result Count — hidden during the initial load so we never flash "Viser 0 kurser" */}
          {!loading && <p className="text-sm text-gray-500 mb-6">{resultText}</p>}

          {/* Loading State — courses always exist, so show a spinner until the fetch resolves */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          ) : /* Course Grid */
          filteredCourses.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">{t.allCourses.noCourses}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course, idx) => {
                const title = language === "da" ? course.title_da : course.title_en || course.title_da;
                const duration = formatDuration(totalCourseDuration(course.lessons), language);
                const gradient = gradients[idx % gradients.length];
                // Per-card purchase state for the badge: owned > priced > free
                const owned = purchasedCourseIds.has(course.id);
                const price = course.price_dkk;
                const isFree = price == null || Number(price) <= 0;
                return (
                  <Link
                    key={course.id}
                    to={`/courses/${course.slug}`}
                    className="rounded-2xl border border-white/20 hover:border-primary/60 transition-all duration-500 group overflow-hidden hover:shadow-2xl hover:shadow-primary/50 hover:-translate-y-2 relative cursor-pointer"
                  >
                    {/* Colorful gradient background */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`}
                    ></div>

                    {/* Animated glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 group-hover:translate-x-full"></div>

                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={getCourseThumbnail(course)}
                        alt={title}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      />
                      {/* Vibrant gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-primary/20 to-transparent group-hover:from-black/80 transition-all"></div>
                      {/* Tags overlay on image */}
                      {course.tags && course.tags.length > 0 && (
                        <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                          {course.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-bold uppercase tracking-wider text-white bg-primary/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-primary/50 shadow-lg shadow-primary/40"
                            >
                              {getTagLabel(tag, t)}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Price / Owned / Free badge in the bottom-right corner of the image */}
                      <div className="absolute bottom-3 right-3 z-10">
                        {owned ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-white bg-green-500/90 px-2.5 py-1 rounded-full shadow-lg">
                            <Check className="w-3 h-3" />
                            {t.courseStore.owned}
                          </span>
                        ) : isFree ? (
                          <span className="text-[11px] font-bold text-white bg-primary/90 px-2.5 py-1 rounded-full shadow-lg">
                            {t.courseStore.free}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-white bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-lg border border-white/20">
                            {formatPrice(Number(price))}
                          </span>
                        )}
                      </div>

                      {/* Watchlist toggle in the top-right corner of the card image.
                          The button stops propagation so the surrounding Link doesn't navigate. */}
                      <div className="absolute top-4 right-4 z-10">
                        <WatchlistButton
                          itemType="course"
                          itemId={course.id}
                          variant="icon"
                          onRequireLogin={openLogin}
                        />
                      </div>
                    </div>
                    <div className="relative p-6">
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors leading-tight drop-shadow-lg">
                        {title}
                      </h3>
                      <p className="text-sm text-white/90 mb-5 font-medium">
                        {t.featured.with}{" "}
                        <span className="text-white font-semibold">
                          {course.instructor}
                        </span>
                      </p>
                      <div className="flex items-center text-sm pt-4 border-t border-white/20">
                        <span className="flex items-center text-white font-medium">
                          <PlayCircle className="w-4 h-4 mr-2 text-primary drop-shadow-lg" />
                          {duration ?? "—"}
                        </span>
                        {owned && course.lessons.length > 0 && (
                          <span className="ml-auto text-xs text-white/70 font-medium">
                            {completedCountForCourse(course.id)}/{course.lessons.length} {t.progress.lessonsCompleted}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
    </div>
  );
}
