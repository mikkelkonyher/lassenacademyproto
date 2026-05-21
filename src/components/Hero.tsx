/**
 * Hero.tsx
 * Full-viewport landing hero section with background image, animated headline,
 * two CTA buttons (register or browse courses depending on auth), benefit pills,
 * and a scroll-down indicator.
 */

import { useState, useEffect } from "react";
import { Play, ArrowRight, CheckCircle, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase/client";
import type { Database } from "../types/database.types";
import heroBackground from "../assets/IMG_0005.webp";

type NewsRow = Database["public"]["Tables"]["news"]["Row"];

interface HeroProps {
  onOpenRegister: () => void;
  onOpenVideo: () => void;
}

export default function Hero({ onOpenRegister, onOpenVideo }: HeroProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [latestNews, setLatestNews] = useState<NewsRow | null>(null);

  // Fetch the most recent published news article for the banner
  useEffect(() => {
    const fetchLatest = async () => {
      const { data } = await supabase
        .from("news")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setLatestNews(data[0] as NewsRow);
      }
    };
    fetchLatest();
  }, []);

  /** Get the localized title for the latest news */
  const latestNewsTitle = latestNews
    ? language === "da" ? latestNews.title_da : latestNews.title_en
    : null;

  // Smooth-scroll one full viewport height to reveal the next section
  const scrollToNext = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative pt-28 pb-24 sm:pt-28 sm:pb-32 overflow-hidden min-h-screen flex flex-col justify-center">
      {/* Darkened, near-monochrome background image for readability */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBackground}
          alt="Music Studio"
          className="w-full h-full object-cover object-center md:object-[65%_25%] grayscale-[55%] brightness-[0.55] contrast-105"
        />
        {/* Left-side blur to hide the Svendborg Jazzfestival poster on wider screens; mask fades the blur out smoothly */}
        <div
          className="absolute inset-y-0 left-0 w-1/5 backdrop-blur-md hidden md:block"
          style={{
            maskImage: "linear-gradient(to right, black 40%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, black 40%, transparent 100%)",
          }}
        ></div>
        {/* Dark base overlay to deepen blacks and boost text contrast */}
        <div className="absolute inset-0 bg-black/40"></div>
        {/* Subtle colorful tint to retain warmth and creativity */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/15"></div>
      </div>

      {/* Enhanced colorful glow effects */}
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] pointer-events-none z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Dynamic news banner — shows latest published article, links to /nyheder */}
          <button
            onClick={() => navigate(latestNews ? `/nyheder/${latestNews.id}` : "/nyheder")}
            className="inline-flex items-center rounded-full border border-primary/60 glass-strong px-4 py-2 text-xs sm:text-sm font-medium text-white mb-6 sm:mb-8 shadow-lg shadow-primary/30 animate-pulse-glow hover:scale-105 transition-transform cursor-pointer max-w-[90vw]"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 shadow-[0_0_10px_currentColor] animate-pulse"></span>
            <span className="text-white line-clamp-1">
              {latestNewsTitle
                ? `${t.newsPage.navLabel}: ${latestNewsTitle}`
                : t.hero.newMasterclass}
            </span>
          </button>

          {/* Artistic Headline Layout */}
          <div className="mb-8 sm:mb-12 space-y-4 sm:space-y-8">
            {/* Main Headline - Large and Bold */}
            <div className="relative">
              {/* Decorative accent line */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-6 w-px h-10 bg-gradient-to-b from-transparent via-primary/60 to-transparent hidden sm:block"></div>

              <h1 className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl tracking-[-0.02em] font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-50 via-orange-300 to-orange-50 drop-shadow-2xl animate-gradient-x bg-300% [text-shadow:0_0_50px_rgba(251,146,60,0.7)] animate-shimmer leading-[0.95]">
                {t.hero.headline}
              </h1>
            </div>

            {/* Subheadline - Elegant and Connected */}
            <div className="relative flex items-center justify-center gap-3 sm:gap-6 mt-4 sm:mt-6">
              <div className="h-px w-12 sm:w-24 bg-gradient-to-r from-transparent via-primary/80 to-primary/60"></div>
              <h2 className="text-lg sm:text-3xl md:text-4xl font-light text-white tracking-[0.1em] sm:tracking-[0.15em] uppercase drop-shadow-lg whitespace-nowrap">
                {t.hero.subheadline}
              </h2>
              <div className="h-px w-12 sm:w-24 bg-gradient-to-l from-transparent via-primary/80 to-primary/60"></div>
            </div>
          </div>

          {/* CTA buttons: logged-in users go to courses, guests open the register modal */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={user ? () => navigate('/courses') : onOpenRegister}
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-bold rounded-full text-white bg-primary hover:bg-primary/90 transition-all hover:scale-105 shadow-[0_0_20px_rgba(225,29,72,0.4)] tracking-wide min-w-[200px] cursor-pointer"
            >
              {user ? t.hero.ctaMainLoggedIn : t.hero.ctaMain}
              <ArrowRight className="ml-2 -mr-1 w-5 h-5" />
            </button>
            <button
              onClick={onOpenVideo}
              className="inline-flex items-center justify-center px-8 py-4 border border-white/30 text-base font-medium rounded-full text-white glass hover:glass-strong transition-all min-w-[200px] hover:scale-105"
            >
              <Play className="w-5 h-5 mr-2 text-white" />
              {t.hero.ctaSecondary}
            </button>
          </div>

          {/* Benefit pills rendered from translated strings */}
          <div className="mt-8 sm:mt-16 flex flex-wrap justify-center gap-3 sm:gap-6 mb-8 sm:mb-0">
            {t.hero.benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-gray-100 glass px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-white/20 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-105 text-sm sm:text-base"
              >
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator Arrow */}
      <button
        onClick={scrollToNext}
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center text-white/80 hover:text-white transition-all hover:scale-110 cursor-pointer"
        aria-label="Scroll down"
      >
        <div className="relative">
          <ChevronDown className="w-8 h-8 animate-bounce text-primary drop-shadow-lg" />
          <div className="absolute inset-0 w-8 h-8 bg-primary/20 rounded-full blur-md animate-pulse"></div>
        </div>
      </button>
    </div>
  );
}
