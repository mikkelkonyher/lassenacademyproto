/**
 * LearningPath.tsx — Tier-scoped course browse page.
 *
 * Renders a "learning path" (beginner / intermediate / advanced) as an
 * instrument-first hub: a header banner, a row of instrument tiles derived
 * from the courses in scope, and a course grid that updates when the user
 * picks an instrument. The tier comes from the :tier route param and drives
 * the level filter sent to Supabase plus the page's accent color + icon, so
 * a single component powers all three paths.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  PlayCircle,
  GraduationCap,
  TrendingUp,
  Award,
  Guitar,
  Music2,
  Music3,
  Mic,
  Drum,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuthModals } from "../hooks/useAuthModals";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";
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
  lessons: Pick<Lesson, "mux_playback_id" | "mux_playback_policy" | "thumbnail_url" | "duration_seconds" | "sort_order" | "published">[];
};

type Tier = "beginner" | "intermediate" | "advanced";

// Per-tier visual + filter configuration. Keeps the page reusable for all
// three tiers without prop-drilling — change here to add a new tier.
type TierConfig = {
  levelDa: string;
  levelEn: string;
  Icon: LucideIcon;
  accent: "primary" | "accent";
};
const TIER_CONFIG: Record<Tier, TierConfig> = {
  beginner:     { levelDa: "Begynder",  levelEn: "Beginner",     Icon: GraduationCap, accent: "primary" },
  intermediate: { levelDa: "Mellem",    levelEn: "Intermediate", Icon: TrendingUp,    accent: "accent"  },
  advanced:     { levelDa: "Avanceret", levelEn: "Advanced",     Icon: Award,         accent: "primary" },
};

// Tags we treat as "instruments" for the tile selector. Tiles only render
// when at least one course in scope has the tag, so unsupported instruments
// stay hidden until content exists.
const INSTRUMENT_TAGS = ["guitar", "bass", "piano", "vocals", "drums"] as const;
type InstrumentTag = (typeof INSTRUMENT_TAGS)[number];

// Lucide icon per instrument tag — keeps the tile visual language consistent.
const INSTRUMENT_ICON: Record<InstrumentTag, LucideIcon> = {
  guitar: Guitar,
  bass:   Music2,
  piano:  Music3,
  vocals: Mic,
  drums:  Drum,
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

// Type guard so the :tier param can be safely narrowed before lookup.
function isTier(value: string | undefined): value is Tier {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

export default function LearningPath() {
  const navigate = useNavigate();
  const { tier } = useParams<{ tier: string }>();
  const { t, language } = useLanguage();
  const {
    isRegisterOpen,
    isLoginOpen,
    openRegister,
    closeRegister,
    openLogin,
    closeLogin,
  } = useAuthModals();

  const validTier = isTier(tier) ? tier : null;
  const cfg = validTier ? TIER_CONFIG[validTier] : null;

  const [courses, setCourses] = useState<CourseWithLessons[]>([]);
  // null = "All instruments"; otherwise an instrument tag from INSTRUMENT_TAGS
  const [activeInstrument, setActiveInstrument] = useState<InstrumentTag | null>(null);
  // Reset the instrument filter on tier changes via the "store prev props"
  // pattern (https://react.dev/reference/react/useState#storing-information-from-previous-renders)
  // so users don't carry "Guitar" from /beginner into /advanced and see a
  // confusing empty grid. Done during render — not an effect — to avoid the
  // cascading-render lint and keep the reset synchronous with the route change.
  const [prevTier, setPrevTier] = useState(validTier);
  if (prevTier !== validTier) {
    setPrevTier(validTier);
    setActiveInstrument(null);
  }

  // Fetch published courses matching this tier's level (DA or EN, since
  // admin may have entered either). Lessons feed the card thumbnail + runtime.
  useEffect(() => {
    if (!cfg) return;
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("courses")
        .select(
          "*, lessons(mux_playback_id, mux_playback_policy, thumbnail_url, duration_seconds, sort_order, published)",
        )
        .eq("published", true)
        .eq("lessons.published", true)
        .or(`level_da.eq.${cfg.levelDa},level_en.eq.${cfg.levelEn}`)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (data) setCourses(data as CourseWithLessons[]);
    };
    fetchCourses();
  }, [cfg]);

  // Only show instrument tiles for instruments that actually have a course
  // at this tier — keeps the UI honest as content grows.
  const instrumentsInScope = useMemo<InstrumentTag[]>(
    () => INSTRUMENT_TAGS.filter((tag) =>
      courses.some((c) => (c.tags ?? []).includes(tag))
    ),
    [courses],
  );

  // No instrument selected = show all; otherwise narrow to courses tagged with it.
  const filteredCourses = useMemo(
    () => activeInstrument
      ? courses.filter((c) => (c.tags ?? []).includes(activeInstrument))
      : courses,
    [courses, activeInstrument],
  );

  // Rotating gradient backgrounds for visual variety across course cards
  // (matches AllCourses for consistency).
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

  // Bail out early with a friendly "not found" page for unknown tier slugs
  // (e.g. /learning-paths/foo). Keeps the route resilient to typos.
  if (!validTier || !cfg) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
        <div className="pt-32 pb-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 uppercase">
            {t.learningPath.notFoundTitle}
          </h1>
          <p className="text-gray-400 mb-8">{t.learningPath.notFoundDescription}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/40 bg-primary/10 hover:bg-primary/20 text-white font-medium transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.learningPath.backHome}
          </Link>
        </div>
        <Footer />
        <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
        <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
      </div>
    );
  }

  const TierIcon = cfg.Icon;
  const tierCopy = t.learningPaths[validTier];

  // Build "Showing N courses" string using existing AllCourses translation
  // keys to keep wording consistent across catalogue surfaces.
  const resultCount = filteredCourses.length;
  const resultText =
    resultCount === 1
      ? t.allCourses.showingOne
      : t.allCourses.showingResults.replace("{count}", String(resultCount));

  // Empty-state copy: pick the more specific message when an instrument is
  // active, otherwise the tier-wide "no courses yet" line.
  const emptyText = activeInstrument
    ? t.learningPath.noCoursesForInstrument
    : t.learningPath.noCoursesYet;

  // Accent color classes derived once from the tier config so the icon halo,
  // active tile chrome, and back-link hover all stay in sync.
  const accentText = cfg.accent === "accent" ? "text-accent" : "text-primary";
  const accentBgSoft = cfg.accent === "accent" ? "bg-accent/20" : "bg-primary/20";
  const accentBorderActive = cfg.accent === "accent" ? "border-accent/60" : "border-primary/60";
  const accentGlow = cfg.accent === "accent" ? "bg-accent/25" : "bg-primary/25";

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      {/* Hero header — visually echoes the LearningPaths section card the
          user clicked from, so the transition feels continuous. */}
      <section className="relative overflow-hidden pt-24 pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/25 via-secondary/15 to-transparent" />
        <div className={`absolute top-0 right-0 -mr-48 -mt-48 w-[600px] h-[600px] ${accentGlow} rounded-full blur-3xl pointer-events-none`} />
        <div className="absolute bottom-0 left-0 -ml-48 -mb-48 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-4">
            {/* Tier icon halo */}
            <div className={`w-20 h-20 rounded-2xl ${accentBgSoft} flex items-center justify-center shadow-lg shadow-black/40 shrink-0`}>
              <TierIcon className={`w-10 h-10 ${accentText}`} />
            </div>
            <div className="flex-1">
              <div className={`inline-flex items-center gap-2 font-bold tracking-wider uppercase text-xs mb-2 ${accentText}`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.learningPaths.subtitle}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 uppercase">
                {tierCopy.title}
              </h1>
              <p className="text-lg text-gray-300 max-w-3xl leading-relaxed">
                {tierCopy.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24">
        {/* Instrument selector — only shows when there's at least one instrument
            with courses, so the empty-tier page stays clean. */}
        {instrumentsInScope.length > 0 && (
          <div className="mb-12">
            <p className="text-sm text-gray-400 mb-4 font-medium uppercase tracking-wider">
              {t.learningPath.pickInstrument}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {/* "All instruments" tile is always first so users can clear the filter */}
              <InstrumentTile
                Icon={Sparkles}
                label={t.learningPath.allInstruments}
                active={activeInstrument === null}
                onClick={() => setActiveInstrument(null)}
                accentBorderActive={accentBorderActive}
                accentText={accentText}
                accentBgSoft={accentBgSoft}
              />
              {instrumentsInScope.map((tag) => (
                <InstrumentTile
                  key={tag}
                  Icon={INSTRUMENT_ICON[tag]}
                  label={getTagLabel(tag, t)}
                  active={activeInstrument === tag}
                  onClick={() => setActiveInstrument(tag)}
                  accentBorderActive={accentBorderActive}
                  accentText={accentText}
                  accentBgSoft={accentBgSoft}
                />
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500 mb-6">{resultText}</p>

        {/* Course grid — same card markup as AllCourses so look-and-feel
            stays uniform across the catalogue. */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-20 glass-strong rounded-2xl border border-white/10">
            <p className="text-gray-400 text-lg">{emptyText}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, idx) => {
              const title = language === "da" ? course.title_da : course.title_en || course.title_da;
              const duration = formatDuration(totalCourseDuration(course.lessons), language);
              const gradient = gradients[idx % gradients.length];
              return (
                <Link
                  key={course.id}
                  to={`/courses/${course.slug}`}
                  className="rounded-2xl border border-white/20 hover:border-primary/60 transition-all duration-500 group overflow-hidden hover:shadow-2xl hover:shadow-primary/50 hover:-translate-y-2 relative cursor-pointer"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 group-hover:translate-x-full" />

                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={getCourseThumbnail(course)}
                      alt={title}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-primary/20 to-transparent group-hover:from-black/80 transition-all" />
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
                  </div>
                  <div className="relative p-6">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors leading-tight drop-shadow-lg">
                      {title}
                    </h3>
                    <p className="text-sm text-white/90 mb-5 font-medium">
                      {t.featured.with}{" "}
                      <span className="text-white font-semibold">{course.instructor}</span>
                    </p>
                    <div className="flex items-center text-sm pt-4 border-t border-white/20">
                      <span className="flex items-center text-white font-medium">
                        <PlayCircle className="w-4 h-4 mr-2 text-primary drop-shadow-lg" />
                        {duration ?? "—"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
    </div>
  );
}

// Single instrument tile in the selector row. Extracted to keep the parent
// render readable since the same markup is reused for the "All" tile and
// each instrument.
type InstrumentTileProps = {
  Icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  accentBorderActive: string;
  accentText: string;
  accentBgSoft: string;
};
function InstrumentTile({
  Icon,
  label,
  active,
  onClick,
  accentBorderActive,
  accentText,
  accentBgSoft,
}: InstrumentTileProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative aspect-square rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 p-4 overflow-hidden ${
        active
          ? `glass-strong ${accentBorderActive} ${accentBgSoft} shadow-lg scale-[1.02]`
          : "glass border-white/10 hover:border-white/40 hover:scale-[1.02]"
      }`}
    >
      <Icon
        className={`w-8 h-8 transition-colors ${
          active ? accentText : "text-gray-300 group-hover:text-white"
        }`}
      />
      <span
        className={`text-xs sm:text-sm font-semibold text-center leading-tight transition-colors ${
          active ? "text-white" : "text-gray-300 group-hover:text-white"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
