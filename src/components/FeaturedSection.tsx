import { PlayCircle, Star, Music2, ArrowRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function FeaturedSection() {
  const { t } = useLanguage();

  const tutors = [
    {
      name: "Kristian Lassen",
      role: t.featured.instructorRoles.kristian,
      image: "https://storage.buzzsprout.com/n42rc747h78xv4w7z7kjf5uv52oy?.jpg", // Explicit Bass Player Image
      studio: "Lassen HQ",
    },
    {
      name: "Ludwig Hamilton-Wittendorff",
      role: t.featured.instructorRoles.ludwig,
      image:
        "https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", // Explicit Guitar Player Image
      studio: "Akkorder og scalaer",
    },
    {
      name: "Elena Rossi",
      role: t.featured.instructorRoles.elena,
      image:
        "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      studio: "Nordic Sound",
    },
  ];

  const courses = [
    {
      title: t.featured.courseData.guitarTitle,
      instructor: "Ludwig Hamilton-Wittendorff",
      level: t.featured.courseData.guitarLevel,
      duration: "4t 30m",
      image:
        "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.teknik, t.featured.tags.teori],
    },
    {
      title: t.featured.courseData.bassTitle,
      instructor: "Kristian Lassen",
      level: t.featured.courseData.bassLevel,
      duration: "6t 15m",
      image:
        "https://images.unsplash.com/photo-1525898181636-29b30c26f6e1?q=80&w=2324&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.groove, t.featured.tags.rytme],
    },
    {
      title: t.featured.courseData.pianoTitle,
      instructor: "Elena Rossi",
      level: t.featured.courseData.pianoLevel,
      duration: "8t 00m",
      image:
        "https://images.unsplash.com/photo-1552422535-c45813c61732?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      tags: [t.featured.tags.harmoni, t.featured.tags.impro],
    },
    {
      title: "Slap Bass Fundamentals",
      instructor: "Kristian Lassen",
      level: t.featured.courseData.bassLevel,
      duration: "5t 45m",
      image:
        "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?q=80&w=2274&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.teknik, t.featured.tags.groove],
    },
    {
      title: "Jazz Harmony & Voicings",
      instructor: "Elena Rossi",
      level: t.featured.courseData.pianoLevel,
      duration: "7t 20m",
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.harmoni, t.featured.tags.teori],
    },
    {
      title: "Fingerstyle Guitar Mastery",
      instructor: "Ludwig Hamilton-Wittendorff",
      level: t.featured.courseData.bassLevel,
      duration: "6t 00m",
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.teknik, t.featured.tags.teori],
    },
    {
      title: "Walking Bass Lines",
      instructor: "Kristian Lassen",
      level: t.featured.courseData.pianoLevel,
      duration: "5t 15m",
      image:
        "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.groove, t.featured.tags.harmoni],
    },
    {
      title: "Music Theory Essentials",
      instructor: "Ludwig Hamilton-Wittendorff",
      level: t.featured.courseData.guitarLevel,
      duration: "4t 00m",
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.teori, t.featured.tags.harmoni],
    },
    {
      title: "Advanced Improvisation",
      instructor: "Elena Rossi",
      level: t.featured.courseData.pianoLevel,
      duration: "9t 30m",
      image:
        "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?q=80&w=2274&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      tags: [t.featured.tags.impro, t.featured.tags.harmoni],
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Image Texture */}
      <div className="absolute inset-0 -z-10 bg-background">
        <img
          src="https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?q=80&w=2070&auto=format&fit=crop"
          alt="Background Texture"
          className="w-full h-full object-cover opacity-10 blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"></div>
        {/* Colorful gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5"></div>
      </div>

      {/* Enhanced Glow Effects - More Dominant Colors */}
      <div className="absolute top-0 right-0 -mr-64 -mt-64 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-0 left-0 -ml-64 -mb-64 w-[600px] h-[600px] bg-accent/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Featured Courses */}
        <div className="mb-32">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="text-accent font-bold tracking-wider uppercase text-sm mb-2 block">
                {t.featured.libraryTitle}
              </span>
              <h2 className="text-4xl font-extrabold text-white">
                {t.featured.libraryHeadline}
              </h2>
            </div>
            <button className="hidden sm:flex px-8 py-3 glass rounded-full hover:glass-strong transition-all text-white text-sm font-bold tracking-wide border border-accent/40 hover:border-accent/60 hover:shadow-lg hover:shadow-accent/30 hover:scale-105">
              {t.featured.viewAllCourses}
            </button>
          </div>

          {/* Scrollable Courses Container */}
          <div className="relative">
            {/* Scrollable Courses */}
            <div className="overflow-x-auto scrollbar-thumb-only pb-4 -mx-4 px-4">
              <div className="flex gap-8 min-w-max">
                {courses.map((course, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 glass-strong rounded-2xl border border-white/15 hover:border-primary/60 transition-all duration-500 group overflow-hidden hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-2"
                    style={{
                      width: "min(calc(100vw - 4rem), 400px)",
                    }}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/70 transition-all"></div>
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
                    <div className="p-6 bg-gradient-to-b from-transparent to-background/50">
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors leading-tight">
                        {course.title}
                      </h3>
                      <p className="text-sm text-white/70 mb-5 font-medium">
                        {t.featured.with}{" "}
                        <span className="text-white/90">
                          {course.instructor}
                        </span>
                      </p>
                      <div className="flex items-center justify-between text-sm pt-4 border-t border-white/10">
                        <span className="flex items-center text-white/80 font-medium">
                          <PlayCircle className="w-4 h-4 mr-2 text-primary" />
                          {course.duration}
                        </span>
                        <span className="flex items-center text-white/90 font-semibold">
                          <Star className="w-4 h-4 mr-1.5 text-yellow-400 fill-yellow-400" />
                          4.9
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 text-center sm:hidden">
            <button className="w-full px-8 py-3 glass rounded-full hover:glass-strong transition-all text-white text-sm font-bold tracking-wide border border-accent/40 hover:border-accent/60 hover:shadow-lg hover:shadow-accent/30">
              {t.featured.viewAllCourses}
            </button>
          </div>
        </div>

        {/* Feature Tutors */}
        <div>
          <div className="flex justify-between items-end mb-16">
            <div>
              <span className="text-primary font-bold tracking-wider uppercase text-sm mb-2 block">
                {t.featured.expertsTitle}
              </span>
              <h2 className="text-4xl font-extrabold text-white">
                {t.featured.expertsHeadline}
              </h2>
            </div>
            <a
              href="#"
              className="hidden md:flex items-center text-gray-300 hover:text-white transition-colors group font-medium"
            >
              {t.featured.viewInstructors}{" "}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform text-primary" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tutors.map((tutor, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl glass-strong overflow-hidden border border-white/10 hover:border-primary/60 transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_20px_60px_-10px_rgba(251,146,60,0.5)] hover:shadow-primary/40"
              >
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img
                    src={tutor.image}
                    alt={tutor.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
                  <div className="mb-6">
                    <h3 className="text-3xl font-bold text-primary mb-2 leading-tight">
                      {tutor.name}
                    </h3>
                    <p className="text-white/80 text-lg font-medium mb-1">
                      {tutor.role}
                    </p>
                  </div>
                  <div className="flex items-center text-xs text-white/60 uppercase tracking-[0.15em] font-medium">
                    <Music2 className="w-3.5 h-3.5 mr-2 text-primary" />{" "}
                    {tutor.studio}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
