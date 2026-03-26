/**
 * AllCourses.tsx — Full course catalogue with tag-based filtering.
 *
 * Renders all available courses in a responsive grid. Users can filter
 * by one or more tags (instrument, skill area). When no tags are selected,
 * all courses are shown. Course metadata is hardcoded; translatable fields
 * (titles, levels, tag labels) come from the i18n translations object.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PlayCircle, Star } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuthModals } from "../hooks/useAuthModals";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";

export default function AllCourses() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin } = useAuthModals();
  // Tracks which filter tags the user has toggled on; empty means "show all"
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // All available filter tags, pulled from translations so they match the active language
  const allTags = [
    t.featured.tags.guitar,
    t.featured.tags.bas,
    t.featured.tags.klaver,
    t.featured.tags.teknik,
    t.featured.tags.teori,
    t.featured.tags.groove,
    t.featured.tags.rytme,
    t.featured.tags.harmoni,
    t.featured.tags.impro,
  ];

  // Hardcoded course catalogue — each course has tags used for client-side filtering
  const courses = [
    {
      title: t.featured.courseData.guitarTitle,
      instructor: "Ludwig Hamilton-Wittendorff",
      level: t.featured.courseData.guitarLevel,
      duration: "4t 30m",
      image:
        "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.guitar, t.featured.tags.teknik, t.featured.tags.teori],
    },
    {
      title: t.featured.courseData.bassTitle,
      instructor: "Kristian Lassen",
      level: t.featured.courseData.bassLevel,
      duration: "6t 15m",
      image:
        "https://images.unsplash.com/photo-1525898181636-29b30c26f6e1?q=80&w=2324&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.bas, t.featured.tags.groove, t.featured.tags.rytme],
    },
    {
      title: t.featured.courseData.pianoTitle,
      instructor: "Elena Rossi",
      level: t.featured.courseData.pianoLevel,
      duration: "8t 00m",
      image:
        "https://images.unsplash.com/photo-1552422535-c45813c61732?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      tags: [t.featured.tags.klaver, t.featured.tags.harmoni, t.featured.tags.impro],
    },
    {
      title: "Slap Bass Fundamentals",
      instructor: "Kristian Lassen",
      level: t.featured.courseData.bassLevel,
      duration: "5t 45m",
      image:
        "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?q=80&w=2274&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.bas, t.featured.tags.teknik, t.featured.tags.groove],
    },
    {
      title: "Jazz Harmony & Voicings",
      instructor: "Elena Rossi",
      level: t.featured.courseData.pianoLevel,
      duration: "7t 20m",
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.klaver, t.featured.tags.harmoni, t.featured.tags.teori],
    },
    {
      title: "Fingerstyle Guitar Mastery",
      instructor: "Ludwig Hamilton-Wittendorff",
      level: t.featured.courseData.bassLevel,
      duration: "6t 00m",
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.guitar, t.featured.tags.teknik, t.featured.tags.teori],
    },
    {
      title: "Walking Bass Lines",
      instructor: "Kristian Lassen",
      level: t.featured.courseData.pianoLevel,
      duration: "5t 15m",
      image:
        "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.bas, t.featured.tags.groove, t.featured.tags.harmoni],
    },
    {
      title: "Music Theory Essentials",
      instructor: "Ludwig Hamilton-Wittendorff",
      level: t.featured.courseData.guitarLevel,
      duration: "4t 00m",
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.guitar, t.featured.tags.teori, t.featured.tags.harmoni],
    },
    {
      title: "Advanced Improvisation",
      instructor: "Elena Rossi",
      level: t.featured.courseData.pianoLevel,
      duration: "9t 30m",
      image:
        "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?q=80&w=2274&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.klaver, t.featured.tags.impro, t.featured.tags.harmoni],
    },
  ];

  // Toggle a tag on/off in the active filter set
  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Show all courses when no tags selected; otherwise keep courses matching ANY active tag
  const filteredCourses =
    activeTags.length === 0
      ? courses
      : courses.filter((course) =>
          course.tags.some((tag) => activeTags.includes(tag))
        );

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
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
              {t.allCourses.pageTitle}
            </h1>
            <p className="text-lg text-gray-400">
              {t.allCourses.pageSubtitle}
            </p>
          </div>

          {/* Tag Filter Bar */}
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
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Result Count */}
          <p className="text-sm text-gray-500 mb-6">{resultText}</p>

          {/* Course Grid */}
          {filteredCourses.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">{t.allCourses.noCourses}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course, idx) => {
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

                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      />
                      {/* Vibrant gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-primary/20 to-transparent group-hover:from-black/80 transition-all"></div>
                      {/* Tags overlay on image */}
                      <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                        {course.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-bold uppercase tracking-wider text-white bg-primary/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-primary/50 shadow-lg shadow-primary/40"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="relative p-6">
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors leading-tight drop-shadow-lg">
                        {course.title}
                      </h3>
                      <p className="text-sm text-white/90 mb-5 font-medium">
                        {t.featured.with}{" "}
                        <span className="text-white font-semibold">
                          {course.instructor}
                        </span>
                      </p>
                      <div className="flex items-center justify-between text-sm pt-4 border-t border-white/20">
                        <span className="flex items-center text-white font-medium">
                          <PlayCircle className="w-4 h-4 mr-2 text-primary drop-shadow-lg" />
                          {course.duration}
                        </span>
                        <span className="flex items-center text-white font-semibold">
                          <Star className="w-4 h-4 mr-1.5 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
                          4.9
                        </span>
                      </div>
                    </div>
                  </div>
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
