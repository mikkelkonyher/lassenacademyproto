import { useLanguage } from '../context/LanguageContext';

export default function VideoSection() {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background glow for ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        <div className="mb-12">
            <span className="text-primary font-bold tracking-wider uppercase text-sm mb-3 block">
                {t.videoSection.subtitle}
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-2 tracking-tight">
                {t.videoSection.founderName}
            </h2>
            <p className="text-lg text-gray-400 font-medium mb-8">
                {t.videoSection.role}
            </p>
            <p className="text-sm font-light tracking-widest text-primary/80 uppercase">
                {t.videoSection.context}
            </p>
        </div>
        
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-white/10 group">
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
        
        <p className="mt-8 text-gray-500/80 max-w-2xl mx-auto text-xs sm:text-sm leading-7 font-light tracking-wide">
            {t.videoSection.description}
        </p>
      </div>
    </section>
  );
}
