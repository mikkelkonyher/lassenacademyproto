import { BookOpen, ArrowRight, CheckCircle, Sparkles, GraduationCap, TrendingUp, Award } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function LearningPaths() {
  const { t } = useLanguage();

  const learningPaths = [
    {
      title: t.learningPaths.beginner.title,
      description: t.learningPaths.beginner.description,
      duration: t.learningPaths.beginner.duration,
      courses: t.learningPaths.beginner.courses,
      Icon: GraduationCap,
      gradientClass: "from-primary/20",
      bgClass: "bg-primary/20",
      hoverBgClass: "group-hover:bg-primary/30",
      textClass: "text-primary",
    },
    {
      title: t.learningPaths.intermediate.title,
      description: t.learningPaths.intermediate.description,
      duration: t.learningPaths.intermediate.duration,
      courses: t.learningPaths.intermediate.courses,
      Icon: TrendingUp,
      gradientClass: "from-accent/20",
      bgClass: "bg-accent/20",
      hoverBgClass: "group-hover:bg-accent/30",
      textClass: "text-accent",
    },
    {
      title: t.learningPaths.advanced.title,
      description: t.learningPaths.advanced.description,
      duration: t.learningPaths.advanced.duration,
      courses: t.learningPaths.advanced.courses,
      Icon: Award,
      gradientClass: "from-primary/20",
      bgClass: "bg-primary/20",
      hoverBgClass: "group-hover:bg-primary/30",
      textClass: "text-primary",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Brighter background - lighter than other sections */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/25 via-secondary/20 to-secondary/25">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?q=80&w=2070&auto=format&fit=crop')] opacity-[0.08] blur-sm"></div>
        {/* Enhanced colorful gradient overlays - brighter */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/12 via-transparent to-accent/12"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/8 to-transparent"></div>
      </div>

      {/* Enhanced Glow Effects - More Prominent for Brightness */}
      <div className="absolute top-0 right-0 -mr-64 -mt-64 w-[700px] h-[700px] bg-primary/25 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-0 left-0 -ml-64 -mb-64 w-[700px] h-[700px] bg-accent/25 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-primary font-bold tracking-wider uppercase text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            <span>{t.learningPaths.subtitle}</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            {t.learningPaths.headline}
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            {t.learningPaths.description}
          </p>
        </div>

        {/* Learning Paths Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {learningPaths.map((path, idx) => (
            <div
              key={idx}
              className="group relative glass-strong rounded-2xl overflow-hidden border border-white/20 hover:border-primary/60 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_70px_-10px_rgba(251,146,60,0.4)] hover:shadow-primary/50 bg-white/10 backdrop-blur-xl"
            >
              {/* Decorative gradient overlay */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${path.gradientClass} to-transparent rounded-bl-full opacity-60 group-hover:opacity-100 transition-opacity`}></div>
              
              <div className="p-8 relative z-10">
                {/* Icon */}
                <div className="mb-6 flex items-center justify-between">
                  <div className={`w-16 h-16 rounded-2xl ${path.bgClass} flex items-center justify-center ${path.hoverBgClass} transition-colors shadow-lg`}>
                    <path.Icon className={`w-8 h-8 ${path.textClass}`} />
                  </div>
                  <div className={`w-12 h-12 rounded-full ${path.bgClass} flex items-center justify-center ${path.hoverBgClass} transition-colors`}>
                    <BookOpen className={`w-6 h-6 ${path.textClass}`} />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-primary transition-colors">
                  {path.title}
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {path.description}
                </p>

                {/* Stats */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    <span className="font-medium">{path.duration}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    <span className="font-medium">{path.courses}</span>
                  </div>
                </div>

                {/* CTA */}
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-primary/40 bg-primary/10 hover:bg-primary/20 text-white font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/30 group-hover:border-primary/60">
                  {t.learningPaths.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Hover glow effect */}
              {idx === 1 ? (
                <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <button className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/30 glass hover:glass-strong text-white font-bold transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/30">
            {t.learningPaths.viewAll}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

