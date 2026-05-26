/**
 * LessonPlayer.tsx — Single-lesson page with the Mux video player and a
 * playlist-style sidebar listing sibling lessons.
 *
 *
 * On smaller screens the playlist stacks below the player.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PlayCircle, Sparkles, Loader2, User, Lock, LockOpen, Check } from "lucide-react";
import MuxPlayer from "@mux/mux-player-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";
import WatchlistButton from "../components/WatchlistButton";
import BuyCourseModal from "../components/BuyCourseModal";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useAuthModals } from "../hooks/useAuthModals";
import { supabase } from "../supabase/client";
import type { Database } from "../types/database.types";
import { getLessonThumbnail } from "../utils/courseImage";
import { getTagLabel } from "../utils/tagLabel";
import { getCoursePricing } from "../utils/coursePricing";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type CourseWithLessons = Course & { lessons: Lesson[] };

/** Format a lesson runtime as "M:SS" for the sidebar overlay */
function formatLessonRuntime(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LessonPlayer() {
  const { slug, lessonSlug } = useParams<{ slug: string; lessonSlug: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, purchasedCourseIds } = useAuth();
  const {
    isRegisterOpen,
    isLoginOpen,
    openRegister,
    closeRegister,
    openLogin,
    closeLogin,
  } = useAuthModals();

  const [course, setCourse] = useState<CourseWithLessons | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // Buy modal visibility — opened from the locked-lesson panel
  const [buyModalOpen, setBuyModalOpen] = useState(false);

  // Auto-scroll the active item into view when switching lessons on long lists
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  // Fetch the parent course with all published lessons in one round-trip.
  // The current lesson is found client-side from the embedded array — that
  // also gives us cheap sibling links without a second query.
  useEffect(() => {
    let cancelled = false;
    const fetchCourse = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("courses")
        .select("*, lessons(*)")
        .eq("slug", slug)
        .eq("published", true)
        .eq("lessons.published", true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setCourse(data as CourseWithLessons);
      }
      setLoading(false);
    };
    fetchCourse();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Scroll the highlighted sidebar item into view once it's mounted
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lessonSlug, course]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t.courseDetail.notFound}</h1>
            <button
              onClick={() => navigate("/courses")}
              className="text-primary hover:text-primary/80"
            >
              {t.featured.viewAllCourses}
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Sort siblings, then locate the current lesson.
  // When :lessonSlug is omitted from the URL (cards link to /courses/:slug),
  // default to the first lesson so users land directly on the player.
  const sortedLessons = [...(course.lessons ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const currentIdx = lessonSlug
    ? sortedLessons.findIndex((l) => l.slug === lessonSlug)
    : 0;
  const lesson = currentIdx >= 0 ? sortedLessons[currentIdx] : null;

  // Course exists but has no lessons yet
  if (!lessonSlug && sortedLessons.length === 0) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              {t.courseDetail.noLessonsYet}
            </h1>
            <button
              onClick={() => navigate("/courses")}
              className="text-primary hover:text-primary/80"
            >
              {t.featured.viewAllCourses}
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Explicit lessonSlug provided but it didn't match any published lesson
  if (!lesson) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              {t.courseDetail.lessonNotFound}
            </h1>
            <Link
              to={`/courses/${course.slug}`}
              className="text-primary hover:text-primary/80"
            >
              {t.courseDetail.backToCourse}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Ownership-based gating. Non-preview lessons require either ownership
  // of the parent course OR the lesson being explicitly marked as a free
  // preview. Today the gate is UI-only (Mux playback is still public) — when
  // signed-playback lands, the same `canPlay` check will guard the token fetch.
  const ownsCourse = purchasedCourseIds.has(course.id);
  const canPlay = lesson.is_free_preview || ownsCourse;

  const courseTitle =
    language === "da" ? course.title_da : course.title_en || course.title_da;
  const lessonTitle =
    language === "da" ? lesson.title_da : lesson.title_en || lesson.title_da;
  const lessonDescription =
    language === "da" ? lesson.description_da : lesson.description_en || lesson.description_da;
  const courseDescription =
    language === "da" ? course.description_da : course.description_en || course.description_da;
  // Lesson copy wins when present; otherwise fall back to the parent course's blurb
  const descriptionText = lessonDescription ?? courseDescription;
  const level = language === "da" ? course.level_da : course.level_en || course.level_da;
  const lessonRuntime = formatLessonRuntime(lesson.duration_seconds);
  // URL-safe instructor slug for the teacher page link (same convention as
  // FeaturedSection: lowercase, collapse whitespace + hyphens)
  const instructorSlug = course.instructor.toLowerCase().replace(/[\s-]+/g, "-");
  const videoTitle = `${course.title_en || course.title_da} — ${lesson.title_en || lesson.title_da}`;

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Two-column layout: wider player on the left, slimmer playlist on the right */}
          <div className="grid lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Main column — player + title + description (3/4 width on lg+) */}
            <div className="lg:col-span-3 min-w-0">
              {/* Player block:
                  - canPlay (free preview OR user owns the course): Mux player, falling back to a "coming soon" panel if Mux isn't set up.
                  - Otherwise: locked panel that prompts the user to buy the course (or log in first). */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(251,146,60,0.4)] border border-primary/30">
                {canPlay ? (
                  lesson.mux_playback_id ? (
                    <MuxPlayer
                      playbackId={lesson.mux_playback_id}
                      streamType="on-demand"
                      accentColor="#fb923c"
                      metadata={{ video_title: videoTitle }}
                      className="absolute inset-0 w-full h-full"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
                      <Sparkles className="w-12 h-12 text-primary mb-4" />
                      <p className="text-xl font-semibold text-white">
                        {t.courseDetail.comingSoon}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
                    <div className="p-4 rounded-full bg-primary/15 border border-primary/30 mb-4">
                      <Lock className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      {t.lessonGate.lockedTitle}
                    </h3>
                    <p className="text-sm text-gray-300 max-w-md mb-5 leading-relaxed">
                      {t.lessonGate.lockedBody}
                    </p>
                    {/* Lesson-gate CTA — reflects the active 2026 launch promo so
                        the price on the button matches the pricing page exactly. */}
                    {(() => {
                      const gatePricing = getCoursePricing(course.price_dkk);
                      const fmt = (n: number) =>
                        language === "da"
                          ? `${n.toString().replace(".", ",")} kr`
                          : `${n} kr`;
                      return (
                        <button
                          onClick={() => {
                            if (!user) {
                              openLogin();
                              return;
                            }
                            setBuyModalOpen(true);
                          }}
                          className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/30 transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Lock className="w-4 h-4" />
                          {t.lessonGate.buyCta}
                          {gatePricing && (
                            <span className="opacity-90 flex items-baseline gap-1.5">
                              · {fmt(gatePricing.effectivePrice)}
                              {gatePricing.discountActive && (
                                <span className="text-xs line-through opacity-70">
                                  {fmt(gatePricing.basePrice)}
                                </span>
                              )}
                            </span>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Title block — lesson name in white, course name in primary below */}
              <div className="mt-8 mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {lessonTitle}
                </h1>
                <p className="text-lg text-primary font-semibold mt-1">
                  {courseTitle}
                </p>
              </div>

              {/* Watchlist — save the parent course (lessons aren't savable on their own) */}
              <div className="flex flex-wrap gap-3 mb-6">
                <WatchlistButton
                  itemType="course"
                  itemId={course.id}
                  variant="pill"
                  onRequireLogin={openLogin}
                />
              </div>

              {/* Instructor row */}
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <Link
                  to={`/teacher/${instructorSlug}`}
                  className="text-sm font-bold uppercase tracking-wider text-white hover:text-primary transition-colors"
                >
                  {course.instructor}
                </Link>
              </div>

              {/* Inline meta — duration + level */}
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-6">
                {lessonRuntime && (
                  <div>
                    <span className="text-gray-500">
                      {t.courseDetail.duration}:{" "}
                    </span>
                    <span className="font-semibold text-white">{lessonRuntime}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">{t.courseDetail.level}: </span>
                  <span className="font-semibold text-white">{level}</span>
                </div>
              </div>

              {/* Course-level tags */}
              {course.tags && course.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {course.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-primary/15 border border-primary/30 rounded-full text-sm text-white/90"
                    >
                      {getTagLabel(tag, t)}
                    </span>
                  ))}
                </div>
              )}

              {/* Description box — bordered block with a small heading */}
              {descriptionText && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                    {t.courseDetail.about}
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">
                    {descriptionText}
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar — playlist (1/4 width on lg+) */}
            <aside className="lg:col-span-1 min-w-0">
              <ul className="space-y-3 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-2">
                {sortedLessons.map((l, idx) => {
                  const isCurrent = l.slug === lesson.slug;
                  // Sidebar shows a generic module label (e.g. "Modul 1") to
                  // avoid duplicating the lesson's full title with the player
                  // header. The actual title appears below the video.
                  const moduleLabel = `${t.courseDetail.moduleLabel} ${idx + 1}`;
                  const itemTitle =
                    language === "da" ? l.title_da : l.title_en || l.title_da;
                  const itemRuntime = formatLessonRuntime(l.duration_seconds);
                  const thumb = getLessonThumbnail(l);
                  // Locked = non-preview lesson the user doesn't own. We still
                  // navigate to it on click so the locked panel can pitch the
                  // purchase in context.
                  const itemLocked = !l.is_free_preview && !ownsCourse;

                  return (
                    <li key={l.id}>
                      <Link
                        ref={isCurrent ? activeItemRef : undefined}
                        to={`/courses/${course.slug}/${l.slug}`}
                        aria-current={isCurrent ? "true" : undefined}
                        className={`flex gap-3 p-2 rounded-xl border transition-all group ${
                          isCurrent
                            ? "border-primary/60 bg-primary/10 shadow-lg shadow-primary/20"
                            : "border-white/10 glass hover:border-primary/50 hover:bg-white/[0.03]"
                        }`}
                      >
                        {/* Thumbnail with runtime overlay */}
                        <div className="relative w-24 sm:w-28 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={itemTitle}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-accent/10">
                              <PlayCircle className="w-6 h-6 text-primary/70" />
                            </div>
                          )}
                          {itemRuntime && (
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white tracking-wider">
                              {itemRuntime}
                            </span>
                          )}
                        </div>

                        {/* Module label + the lesson's actual title underneath */}
                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-center gap-1.5">
                            <p
                              className={`text-sm font-bold uppercase tracking-wider break-words ${
                                isCurrent ? "text-primary" : "text-white"
                              }`}
                            >
                              {moduleLabel}
                            </p>
                            {/* Per-item ownership marker:
                                - locked icon for paid + unowned
                                - check for owned (any lesson)
                                - open-lock icon for free preview lessons when not owned */}
                            {itemLocked ? (
                              <Lock
                                className="w-3 h-3 text-gray-400 flex-shrink-0"
                                aria-label={t.lessonGate.lockedTitle}
                              />
                            ) : ownsCourse ? (
                              <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                            ) : l.is_free_preview ? (
                              <LockOpen
                                className="w-3 h-3 text-green-400 flex-shrink-0"
                                aria-label={t.lessonGate.freePreviewBadge}
                              />
                            ) : null}
                          </div>
                          <p className="text-xs text-gray-400 line-clamp-2 leading-snug break-words mt-0.5">
                            {itemTitle}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={closeRegister}
        onSwitchToLogin={openLogin}
      />
      <LoginModal
        isOpen={isLoginOpen}
        onClose={closeLogin}
        onSwitchToRegister={openRegister}
      />
      <BuyCourseModal
        isOpen={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
        course={{
          id: course.id,
          title: courseTitle,
          price_dkk: course.price_dkk,
        }}
      />
    </div>
  );
}
