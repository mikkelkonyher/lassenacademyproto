/**
 * CourseOverview.tsx — Course overview page with a lesson list.
 *
 * Resolves the course from the URL slug (/courses/:slug), fetches its
 * published lessons, and renders the course meta (title, instructor, level,
 * total runtime, description) above a clickable list of lessons. Each lesson
 * links to /courses/:slug/:lessonSlug where the actual video plays.
 */

import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  BarChart3,
  User,
  PlayCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";
import { useLanguage } from "../context/LanguageContext";
import { useAuthModals } from "../hooks/useAuthModals";
import { supabase } from "../supabase/client";
import type { Database } from "../types/database.types";
import {
  getLessonThumbnail,
  totalCourseDuration,
} from "../utils/courseImage";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type CourseWithLessons = Course & { lessons: Lesson[] };

/** Format duration as "Xt YYm" (DA) / "Xh YYm" (EN); null if unknown */
function formatDuration(seconds: number | null, language: "da" | "en"): string | null {
  if (seconds == null || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const hoursLabel = language === "da" ? "t" : "h";
  if (h === 0) return `${m}m`;
  return `${h}${hoursLabel} ${m.toString().padStart(2, "0")}m`;
}

/** Format a short "M:SS" runtime for a single lesson */
function formatLessonRuntime(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CourseOverview() {
  const { slug } = useParams<{ slug: string }>();
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

  // Sort lessons client-side by sort_order (PostgREST embedded resources don't
  // accept an order param at this level without `.order` on the relation).
  const lessons = [...(course.lessons ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

  const title = language === "da" ? course.title_da : course.title_en || course.title_da;
  const level = language === "da" ? course.level_da : course.level_en || course.level_da;
  const description =
    language === "da" ? course.description_da : course.description_en || course.description_da;
  const totalDuration = formatDuration(totalCourseDuration(lessons), language);

  const lessonCountText =
    lessons.length === 1
      ? t.courseDetail.lessonCountOne
      : t.courseDetail.lessonCountMany.replace("{count}", String(lessons.length));

  // URL-safe instructor slug for the teacher page link (same convention as
  // the FeaturedSection tutor cards: lowercase, collapse whitespace + hyphens)
  const instructorSlug = course.instructor.toLowerCase().replace(/[\s-]+/g, "-");

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back to all courses */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Course header */}
          <div className="grid md:grid-cols-3 gap-10 mb-12">
            <div className="md:col-span-2">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
                {title}
              </h1>
              <p className="text-lg text-primary font-semibold mb-6">
                {t.featured.with}{" "}
                <Link
                  to={`/teacher/${instructorSlug}`}
                  className="underline underline-offset-4 decoration-primary/40 hover:decoration-primary hover:text-primary/80 transition-colors"
                >
                  {course.instructor}
                </Link>
              </p>

              {description && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-3">
                    {t.courseDetail.about}
                  </h2>
                  <p className="text-gray-300 leading-relaxed text-base whitespace-pre-line">
                    {description}
                  </p>
                </div>
              )}

              {course.tags && course.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-primary/15 border border-primary/30 rounded-full text-sm text-white/90"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick facts */}
            <aside className="glass-strong border border-white/10 rounded-2xl p-6 h-fit space-y-5">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    {t.courseDetail.instructor}
                  </p>
                  <Link
                    to={`/teacher/${instructorSlug}`}
                    className="text-white font-medium hover:text-primary transition-colors"
                  >
                    {course.instructor}
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    {t.courseDetail.level}
                  </p>
                  <p className="text-white font-medium">{level}</p>
                </div>
              </div>

              {totalDuration && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      {t.courseDetail.duration}
                    </p>
                    <p className="text-white font-medium">{totalDuration}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <PlayCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    {t.courseDetail.lessonsHeading}
                  </p>
                  <p className="text-white font-medium">{lessonCountText}</p>
                </div>
              </div>
            </aside>
          </div>

          {/* Lesson list */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              {t.courseDetail.lessonsHeading}
            </h2>

            {lessons.length === 0 ? (
              <p className="text-gray-400 py-8">{t.courseDetail.noLessonsYet}</p>
            ) : (
              <ul className="space-y-3">
                {lessons.map((lesson, idx) => {
                  const lessonTitle =
                    language === "da" ? lesson.title_da : lesson.title_en || lesson.title_da;
                  const runtime = formatLessonRuntime(lesson.duration_seconds);
                  const thumb = getLessonThumbnail(lesson);

                  return (
                    <li key={lesson.id}>
                      <Link
                        to={`/courses/${course.slug}/${lesson.slug}`}
                        className="flex items-center gap-4 p-4 rounded-xl glass-strong border border-white/10 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/20 transition-all group"
                      >
                        {/* Thumbnail (Mux poster) or placeholder */}
                        <div className="relative w-28 sm:w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={lessonTitle}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-accent/10">
                              <PlayCircle className="w-8 h-8 text-primary/70" />
                            </div>
                          )}
                        </div>

                        {/* Lesson title + runtime */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-white truncate group-hover:text-primary transition-colors">
                            {idx + 1}: {lessonTitle}
                          </h3>
                          {runtime && (
                            <p className="text-xs text-gray-400 mt-1">{runtime}</p>
                          )}
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors flex-shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
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
    </div>
  );
}
