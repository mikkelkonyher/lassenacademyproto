/**
 * LessonPlayer.tsx — Single-lesson page with the Mux video player.
 *
 * Resolves both the course and the specific lesson from the URL
 * (/courses/:slug/:lessonSlug). Renders the MuxPlayer along with the
 * lesson title, description, a back-to-course link, and prev/next
 * navigation across sibling lessons. When the lesson has no uploaded
 * video yet, a "Coming Soon" placeholder takes the player's spot.
 */

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import MuxPlayer from "@mux/mux-player-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";
import { useLanguage } from "../context/LanguageContext";
import { useAuthModals } from "../hooks/useAuthModals";
import { supabase } from "../supabase/client";
import type { Database } from "../types/database.types";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type CourseWithLessons = Course & { lessons: Lesson[] };

export default function LessonPlayer() {
  const { slug, lessonSlug } = useParams<{ slug: string; lessonSlug: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
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

  // Fetch the parent course with all published lessons in one round-trip.
  // The current lesson is found client-side from the embedded array — that
  // also gives us cheap prev/next siblings without a second query.
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

  // Sort siblings, then locate the current lesson
  const sortedLessons = [...(course.lessons ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const currentIdx = sortedLessons.findIndex((l) => l.slug === lessonSlug);
  const lesson = currentIdx >= 0 ? sortedLessons[currentIdx] : null;

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

  const prevLesson = currentIdx > 0 ? sortedLessons[currentIdx - 1] : null;
  const nextLesson =
    currentIdx < sortedLessons.length - 1 ? sortedLessons[currentIdx + 1] : null;

  const courseTitle =
    language === "da" ? course.title_da : course.title_en || course.title_da;
  const lessonTitle =
    language === "da" ? lesson.title_da : lesson.title_en || lesson.title_da;
  const lessonDescription =
    language === "da" ? lesson.description_da : lesson.description_en || lesson.description_da;
  const videoTitle = `${course.title_en || course.title_da} — ${lesson.title_en || lesson.title_da}`;

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back to course overview */}
          <Link
            to={`/courses/${course.slug}`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.courseDetail.backToCourse}</span>
          </Link>

          {/* Crumb: course title */}
          <p className="text-sm text-gray-500 mb-6">{courseTitle}</p>

          {/* Player block — Mux when ready, placeholder otherwise */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(251,146,60,0.4)] border border-primary/30 mb-8">
            {lesson.mux_playback_id ? (
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
            )}
          </div>

          {/* Lesson title + description */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
            {lessonTitle}
          </h1>

          {lessonDescription && (
            <p className="text-gray-300 leading-relaxed text-base whitespace-pre-line mb-10">
              {lessonDescription}
            </p>
          )}

          {/* Prev / Next nav */}
          {(prevLesson || nextLesson) && (
            <div className="flex items-center justify-between gap-4 pt-8 border-t border-white/10">
              {prevLesson ? (
                <Link
                  to={`/courses/${course.slug}/${prevLesson.slug}`}
                  className="flex items-center gap-2 px-5 py-3 rounded-full glass border border-white/10 hover:border-primary/60 transition-all text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {t.courseDetail.previousLesson}
                  </span>
                </Link>
              ) : (
                <div />
              )}

              {nextLesson ? (
                <Link
                  to={`/courses/${course.slug}/${nextLesson.slug}`}
                  className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary hover:bg-primary/90 transition-all text-white shadow-lg shadow-primary/30"
                >
                  <span className="text-sm font-medium">
                    {t.courseDetail.nextLesson}
                  </span>
                  <ChevronRight className="w-5 h-5" />
                </Link>
              ) : (
                <div />
              )}
            </div>
          )}
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
    </div>
  );
}
