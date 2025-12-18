import { Play, ArrowRight, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onOpenRegister: () => void;
}

export default function Hero({ onOpenRegister }: HeroProps) {
  const { t } = useLanguage();

  return (
    <div className="relative pt-40 pb-20 sm:pt-48 sm:pb-32 overflow-hidden min-h-[90vh] flex flex-col justify-center">
        {/* Full Color Background Image - Logic Fixed */}
        <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-black/60 z-10" /> {/* Overlay for text readability - ON TOP of image */}
            <img 
                src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80" 
                alt="Music Studio" 
                className="w-full h-full object-cover grayscale"
            />
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-black/50 px-4 py-1.5 text-sm font-medium text-primary-foreground mb-8 backdrop-blur-md shadow-lg">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 shadow-[0_0_10px_currentColor]"></span>
                <span className="text-white">{t.hero.newMasterclass}</span>
            </div>
          
          <h1 className="text-5xl tracking-tight font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-primary to-accent sm:text-6xl md:text-7xl mb-8 drop-shadow-2xl animate-gradient-x bg-300%">
            {t.hero.headline}<br />
            {t.hero.subheadline}
          </h1>
          
          <p className="mt-4 text-xl sm:text-2xl text-white mb-10 leading-relaxed max-w-3xl drop-shadow-md font-medium">
            {t.hero.description}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={onOpenRegister}
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-bold rounded-full text-white bg-primary hover:bg-primary/90 transition-all hover:scale-105 shadow-[0_0_20px_rgba(225,29,72,0.4)] tracking-wide min-w-[200px]"
            >
              {t.hero.ctaMain}
              <ArrowRight className="ml-2 -mr-1 w-5 h-5" />
            </button>
            <a
              href="#"
              className="inline-flex items-center justify-center px-8 py-4 border border-white/20 text-base font-medium rounded-full text-white bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all min-w-[200px]"
            >
              <Play className="w-5 h-5 mr-2 text-white" />
              {t.hero.ctaSecondary}
            </a>
          </div>
          
          <div className="mt-16 flex flex-wrap justify-center gap-6 sm:gap-8">
             {t.hero.benefits.map((benefit, idx) => (
               <div key={idx} className="flex items-center gap-2 text-gray-200 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span className="font-medium">{benefit}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
