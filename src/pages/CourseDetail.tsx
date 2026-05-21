/**
 * CourseDetail.tsx — Individual course page with embedded Mux video player.
 *
 * Resolves the course from the URL slug (/courses/:slug), fetches the row
 * from Supabase, and renders the player together with title, instructor,
 * level, duration, tags, and description in the user's language. When the
 * Mux columns haven't been populated yet (upload in flight or no asset
 * uploaded), it shows a "Coming Soon" placeholder where the player would be.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, BarChart3, User, Sparkles } from "lucide-react";
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

/**
 * Format duration in seconds as a localized "Xt Ym" / "Xh Ym" string.
 * Returns null when the duration is unknown so the caller can hide the field.
 */
function formatDuration(seconds: number | null, language: "da" | "en"): string | null {
  if (seconds == null || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const hoursLabel = language === "da" ? "t" : "h";
  if (h === 0) return `${m}m`;
  return `${h}${hoursLabel} ${m.toString().padStart(2, "0")}m`;
}

export default function CourseDetail() {
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

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Fetch the course by slug. RLS restricts to published rows, so an unpublished
  // (or non-existent) slug naturally returns null and we treat that as 404.
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
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setCourse(data as Course);
      }
      setLoading(false);
    };
    fetchCourse();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Loading skeleton — short, so we keep it minimal
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-gray-400">…</div>
        </div>
        <Footer />
      </div>
    );
  }

  // Course not found / not published — link back to the all-courses page
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

  // Resolve language-specific fields (fall back to DA if EN is empty)
  const title = language === "da" ? course.title_da : course.title_en || course.title_da;
  const level = language === "da" ? course.level_da : course.level_en || course.level_da;
  const description =
    language === "da" ? course.description_da : course.description_en || course.description_da;
  const duration = formatDuration(course.duration_seconds, language);
  const videoTitle = course.title_en || course.title_da;

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

          {/* Player block — Mux when ready, placeholder otherwise */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(251,146,60,0.4)] border border-primary/30 mb-10">
            {course.mux_playback_id ? (
              <MuxPlayer
                playbackId={course.mux_playback_id}
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

          {/* Meta + description */}
          <div className="grid md:grid-cols-3 gap-10">
            <div className="md:col-span-2">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
                {title}
              </h1>
              <p className="text-lg text-primary font-semibold mb-6">
                {t.featured.with} {course.instructor}
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

            {/* Right column — quick facts */}
            <aside className="glass-strong border border-white/10 rounded-2xl p-6 h-fit space-y-5">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400">
                    {t.courseDetail.instructor}
                  </p>
                  <p className="text-white font-medium">{course.instructor}</p>
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

              {duration && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400">
                      {t.courseDetail.duration}
                    </p>
                    <p className="text-white font-medium">{duration}</p>
                  </div>
                </div>
              )}
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
    </div>
  );
}
