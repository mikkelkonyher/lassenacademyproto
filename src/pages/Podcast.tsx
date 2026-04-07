/**
 * Podcast.tsx — Podcast episodes listing page.
 *
 * Displays a grid of podcast episodes with hardcoded content that switches
 * between Danish and English based on the active language. Each card shows
 * a thumbnail, guest name, duration, formatted date, and a play button.
 */

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Clock, Mic } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuthModals } from "../hooks/useAuthModals";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";

// Shape of a single podcast episode entry
interface Episode {
  title: string;
  description: string;
  guest: string;
  date: string;
  duration: number; // minutes
  image: string;
}

export default function Podcast() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin } = useAuthModals();

  // Hardcoded episode data — title and description switch on language
  const episodes: Episode[] = [
    {
      title:
        language === "da"
          ? "Groove, Bas & Livet som Musiker"
          : "Groove, Bass & Life as a Musician",
      description:
        language === "da"
          ? "Kristian deler sin rejse fra konservatoriet til at drive sit eget musikakademi, og hvad groove virkelig betyder."
          : "Kristian shares his journey from the conservatory to running his own music academy, and what groove really means.",
      guest: "Kristian Lassen",
      date: "2025-12-01",
      duration: 47,
      image:
        "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2070&auto=format&fit=crop",
    },
    {
      title:
        language === "da"
          ? "Guitarens Rolle i Moderne Musik"
          : "The Role of Guitar in Modern Music",
      description:
        language === "da"
          ? "Ludwig fortæller om sin tilgang til undervisning og hvordan teori kan gøre dig til en bedre musiker."
          : "Ludwig talks about his teaching approach and how theory can make you a better musician.",
      guest: "Ludwig Hamilton-Wittendorff",
      date: "2025-11-15",
      duration: 38,
      image:
        "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?q=80&w=2338&auto=format&fit=crop",
    },
    {
      title:
        language === "da"
          ? "Jazz, Improvisation & Kreativitet"
          : "Jazz, Improvisation & Creativity",
      description:
        language === "da"
          ? "Elena dykker ned i jazzens verden og deler tips til at blive en mere kreativ musiker gennem improvisation."
          : "Elena dives into the world of jazz and shares tips on becoming a more creative musician through improvisation.",
      guest: "Elena Rossi",
      date: "2025-11-01",
      duration: 52,
      image:
        "https://images.unsplash.com/photo-1552422535-c45813c61732?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    },
    {
      title:
        language === "da"
          ? "Fra Øvelokalet til Scenen"
          : "From the Practice Room to the Stage",
      description:
        language === "da"
          ? "En samtale om performance-angst, forberedelse og hvad det kræver at levere en god live-optræden."
          : "A conversation about performance anxiety, preparation, and what it takes to deliver a great live show.",
      guest: "Sidsel Marie Søholm",
      date: "2025-10-15",
      duration: 41,
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=2070&auto=format&fit=crop",
    },
    {
      title:
        language === "da"
          ? "Musikteori Uden Kedsomhed"
          : "Music Theory Without Boredom",
      description:
        language === "da"
          ? "Hvordan gør man musikteori sjovt og relevant? Vi udforsker nye måder at lære og undervise på."
          : "How do you make music theory fun and relevant? We explore new ways to learn and teach.",
      guest: "Hans Mydtskov",
      date: "2025-10-01",
      duration: 35,
      image:
        "https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=2070&auto=format&fit=crop",
    },
    {
      title:
        language === "da"
          ? "At Finde Sin Egen Lyd"
          : "Finding Your Own Sound",
      description:
        language === "da"
          ? "En dybdegående snak om identitet i musik — hvordan finder man sit eget udtryk som musiker?"
          : "An in-depth talk about identity in music — how do you find your own expression as a musician?",
      guest: "Adam Winberg",
      date: "2025-09-15",
      duration: 44,
      image:
        "https://images.unsplash.com/photo-1525898181636-29b30c26f6e1?q=80&w=2324&auto=format&fit=crop",
    },
  ];

  // Format ISO date string to locale-aware long date (e.g. "1. december 2025")
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "da" ? "da-DK" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Rotating gradient backgrounds applied to episode cards by index
  const gradients = [
    "from-primary/20 via-accent/15 to-primary/10",
    "from-accent/20 via-primary/15 to-accent/10",
    "from-primary/25 via-accent/20 to-primary/15",
    "from-accent/25 via-primary/20 to-accent/15",
    "from-primary/20 via-accent/20 to-primary/15",
    "from-accent/20 via-primary/20 to-accent/15",
  ];

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
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
              {t.podcastPage.pageTitle}
            </h1>
            <p className="text-lg text-gray-400 mb-4">
              {t.podcastPage.pageSubtitle}
            </p>
          </div>

          {/* Episode Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {episodes.map((episode, idx) => {
              const gradient = gradients[idx % gradients.length];
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/20 hover:border-primary/60 transition-all duration-500 group overflow-hidden hover:shadow-2xl hover:shadow-primary/50 hover:-translate-y-2 relative"
                >
                  {/* Colorful gradient background */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`}
                  ></div>

                  {/* Animated glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 group-hover:translate-x-full"></div>

                  <div className="relative flex flex-col sm:flex-row">
                    {/* Thumbnail */}
                    <div className="sm:w-48 sm:flex-shrink-0 aspect-video sm:aspect-square overflow-hidden">
                      <img
                        src={episode.image}
                        alt={episode.title}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 sm:w-48 bg-gradient-to-r from-transparent to-black/40"></div>
                    </div>

                    {/* Content */}
                    <div className="relative p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/15 px-3 py-1 rounded-full border border-primary/30">
                          <Clock className="w-3 h-3" />
                          {episode.duration} {t.podcastPage.minutes}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(episode.date)}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors leading-tight">
                        {episode.title}
                      </h3>

                      <p className="text-sm text-white/70 mb-2 flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-accent" />
                        {t.podcastPage.with}{" "}
                        <span className="font-semibold text-white/90">
                          {episode.guest}
                        </span>
                      </p>

                      <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">
                        {episode.description}
                      </p>

                      <button className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-white transition-colors self-start bg-primary/10 hover:bg-primary/30 px-4 py-2 rounded-full border border-primary/30">
                        <Play className="w-4 h-4 fill-current" />
                        {t.podcastPage.listen}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
    </div>
  );
}
