import { useLanguage } from '../context/LanguageContext';

export default function VideoSection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Background glow for ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-12 tracking-tight">
          {t.videoSection.headline}
        </h2>
        
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-white/10 group">
          {/* Overlay removed per user request */}
          <iframe 
            src="https://www.youtube.com/embed/WXmv63UQ5og?si=aC5sCjv_u4B7U_a2" 
            title="Lassen Music Academy Introduction" 
            className="absolute top-0 left-0 w-full h-full"
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            referrerPolicy="strict-origin-when-cross-origin" 
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </section>
  );
}
