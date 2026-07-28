/**
 * Pricing.tsx — Course showcase.
 *
 * Cinematic per-course showcase modelled on Mix With The Masters. Each course
 * gets a wide hero image, oversized title + instructor, prominent price, a
 * what's-included bullet list (from `courses.includes_*`), and a big "Køb
 * kursus" CTA. Scales naturally as the catalog grows — cards alternate left/
 * right to keep the rhythm visual rather than gridded.
 *
 * Replaces the old subscription pricing page (single LMA Membership plan).
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
  Check,
  Lock,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useAuthModals } from "../hooks/useAuthModals";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";
import BuyCourseModal from "../components/BuyCourseModal";
import { supabase } from "../supabase/client";
import type { Database } from "../types/database.types";
import { getCourseThumbnail } from "../utils/courseImage";
import { getCoursePricing } from "../utils/coursePricing";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type CourseWithLessons = Course & {
  lessons: Pick<Lesson, "mux_playback_id" | "mux_playback_policy" | "thumbnail_url" | "sort_order" | "published">[];
};

export default function Pricing() {
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

  const [courses, setCourses] = useState<CourseWithLessons[]>([]);
  // True while the initial course fetch is in flight; gates the spinner so we
  // never flash the empty state before data has loaded (there is always ≥1 course)
  const [loading, setLoading] = useState(true);
  // Course currently being purchased (drives BuyCourseModal); null = closed
  const [pendingCourse, setPendingCourse] = useState<CourseWithLessons | null>(null);

  // Fetch published courses + slim lesson preview for the thumbnail/poster
  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, lessons(mux_playback_id, mux_playback_policy, thumbnail_url, sort_order, published)")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (data) setCourses(data as CourseWithLessons[]);
      // Clear the loading flag once the request settles (success or empty)
      setLoading(false);
    };
    fetchCourses();
  }, []);

  // Locale-aware price formatting (DA uses comma as decimal separator)
  const isDa = language === "da";
  const formatPrice = useMemo(
    () => (price: number) => {
      const hasDecimals = price % 1 !== 0;
      const formatted = hasDecimals
        ? price.toFixed(2).replace(".", isDa ? "," : ".")
        : price.toString();
      return `${formatted} kr`;
    },
    [isDa],
  );

  const store = t.courseStore;

  // Sign-in gate around the buy flow. If the user is not authenticated, route
  // them to the login modal first — we don't try to resume the purchase
  // post-login (that flow can come later if it matters).
  const handleBuyClick = (course: CourseWithLessons) => {
    if (!user) {
      openLogin();
      return;
    }
    setPendingCourse(course);
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Page Header — slim, sparse. The hero is each course, not this header. */}
          <div className="max-w-3xl mb-12 sm:mb-20">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-4">
              {t.navbar.pricing}
            </p>
            <h1 className="text-4xl sm:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5 uppercase">
              {store.pageTitle}
            </h1>
            <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
              {store.pageSubtitle}
            </p>
          </div>

          {/* Stripe test-mode banner — small, subtle. Remove when the live key
              is swapped in, not before: checkout only accepts test cards. */}
          <div className="mb-12 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] font-semibold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            {store.testModeNotice}
          </div>

          {/* Course Showcase */}
          {loading ? (
            // Loading State — courses always exist, so show a spinner until the fetch resolves
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-24 border border-white/10 rounded-3xl bg-white/[0.02]">
              <p className="text-gray-400 text-lg">{store.empty}</p>
            </div>
          ) : (
            <div className="space-y-16 sm:space-y-24 mb-20">
              {courses.map((course, idx) => {
                const title =
                  language === "da"
                    ? course.title_da
                    : course.title_en || course.title_da;
                const description =
                  language === "da"
                    ? course.description_da
                    : course.description_en || course.description_da;
                const includes =
                  (language === "da" ? course.includes_da : course.includes_en) ??
                  [];
                const level =
                  language === "da"
                    ? course.level_da
                    : course.level_en || course.level_da;
                const owned = purchasedCourseIds.has(course.id);
                const price = course.price_dkk;
                const isFree = price == null || Number(price) <= 0;
                // Apply the 2026 launch promo when the course is for sale
                const pricing = getCoursePricing(price);
                const showDiscount =
                  !isFree && pricing != null && pricing.discountActive;
                // Alternate left/right rhythm so the column doesn't read like a grid
                const flip = idx % 2 === 1;

                return (
                  <article
                    key={course.id}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
                  >
                    {/* Hero image — full-bleed within the column, large, cinematic */}
                    <div className={`lg:col-span-7 ${flip ? "lg:order-last" : ""}`}>
                      <Link
                        to={`/courses/${course.slug}`}
                        className="block relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-2xl group"
                      >
                        <img
                          src={getCourseThumbnail(course)}
                          alt={title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                        />
                        {/* Soft vignette so titles overlaid in future can sit on dark */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                        {/* Status badge — top-right, restrained */}
                        <div className="absolute top-5 right-5">
                          {owned ? (
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white bg-green-500/85 backdrop-blur-sm px-3 py-1.5 rounded-full">
                              <Check className="w-3 h-3" />
                              {store.owned}
                            </span>
                          ) : isFree ? (
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-white bg-primary/85 backdrop-blur-sm px-3 py-1.5 rounded-full">
                              {store.free}
                            </span>
                          ) : null}
                        </div>

                        {/* Level chip — bottom-left, low-key */}
                        <div className="absolute bottom-5 left-5">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
                            {level}
                          </span>
                        </div>
                      </Link>
                    </div>

                    {/* Text column */}
                    <div className="lg:col-span-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80 mb-3">
                        {t.featured.with}{" "}
                        <span className="text-white/90">{course.instructor}</span>
                      </p>

                      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-5">
                        {title}
                      </h2>

                      {description && (
                        <p className="text-base text-gray-400 leading-relaxed mb-7 max-w-md">
                          {description}
                        </p>
                      )}

                      {/* What's included — typographic list, not card-y */}
                      {includes.length > 0 && (
                        <ul className="space-y-2.5 mb-8">
                          {includes.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-sm text-gray-200"
                            >
                              <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Promo badge — only while the 2026 launch discount is live */}
                      {showDiscount && pricing && (
                        <div className="mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/40 text-primary text-[11px] font-bold uppercase tracking-[0.2em]">
                          <span>−{pricing.discountPercent}%</span>
                          <span className="text-primary/80">·</span>
                          <span>{store.promoBadge}</span>
                        </div>
                      )}

                      {/* Price + CTA row */}
                      <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-8">
                        <div>
                          {!isFree && pricing && (
                            <>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-500 mb-1">
                                {store.buyFor}
                              </p>
                              {showDiscount ? (
                                <div className="flex items-baseline gap-3 flex-wrap">
                                  <p className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                                    {formatPrice(pricing.effectivePrice)}
                                  </p>
                                  <p className="text-xl sm:text-2xl font-medium text-gray-500 line-through tracking-tight">
                                    {formatPrice(pricing.basePrice)}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                                  {formatPrice(pricing.basePrice)}
                                </p>
                              )}
                              {showDiscount && (
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/90 mt-2">
                                  {store.promoTagline}
                                </p>
                              )}
                            </>
                          )}
                          {isFree && (
                            <p className="text-3xl font-bold text-white">
                              {store.free}
                            </p>
                          )}
                        </div>

                        <div className="flex-1 flex sm:justify-end">
                          {owned ? (
                            <Link
                              to={`/courses/${course.slug}`}
                              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold tracking-wide bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all"
                            >
                              {t.myPurchases.openCourse}
                            </Link>
                          ) : isFree ? (
                            <Link
                              to={`/courses/${course.slug}`}
                              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold tracking-wide bg-white text-black hover:bg-white/90 transition-all"
                            >
                              {t.myPurchases.openCourse}
                            </Link>
                          ) : (
                            <button
                              onClick={() => handleBuyClick(course)}
                              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold tracking-wide bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              {store.buy}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* In-store member discount banner — kept from the prior pricing page */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  {t.storeDiscount.title}
                </h3>
                <p className="text-sm text-gray-400">
                  {t.storeDiscount.description}
                </p>
              </div>
              <a
                href="https://www.lassenmusik.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold border border-primary/30 transition-colors"
              >
                {t.storeDiscount.cta}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
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
        isOpen={!!pendingCourse}
        onClose={() => setPendingCourse(null)}
        course={
          pendingCourse
            ? {
                id: pendingCourse.id,
                title:
                  language === "da"
                    ? pendingCourse.title_da
                    : pendingCourse.title_en || pendingCourse.title_da,
                price_dkk: pendingCourse.price_dkk,
              }
            : null
        }
      />
    </div>
  );
}
