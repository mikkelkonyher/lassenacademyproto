import { Play, ArrowRight, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onOpenRegister: () => void;
}

export default function Hero({ onOpenRegister }: HeroProps) {
  const { t } = useLanguage();

  return (
    <div className="relative pt-24 pb-20 sm:pt-28 sm:pb-32 overflow-hidden min-h-[90vh] flex flex-col justify-center">
        {/* Full Color Background Image */}
        <div className="absolute inset-0 z-0">
            <img 
                src="https://images.unsplash.com/photo-1602900326340-4445b41cdd4e?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                alt="Music Studio" 
                className="w-full h-full object-cover"
            />
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center rounded-full border border-primary/40 glass-strong px-5 py-2 text-sm font-medium text-white mb-8 shadow-lg animate-pulse-glow">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 shadow-[0_0_10px_currentColor] animate-pulse"></span>
                <span className="text-white">{t.hero.newMasterclass}</span>
            </div>
          
          {/* Artistic Headline Layout */}
          <div className="mb-12 space-y-8">
            {/* Main Headline - Large and Bold */}
            <div className="relative">
              {/* Decorative accent line */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-6 w-px h-10 bg-gradient-to-b from-transparent via-primary/60 to-transparent"></div>
              
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-[-0.02em] font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-50 via-orange-300 to-orange-50 drop-shadow-2xl animate-gradient-x bg-300% [text-shadow:0_0_50px_rgba(251,146,60,0.7)] animate-shimmer leading-[0.95]">
                {t.hero.headline}
              </h1>
            </div>
            
            {/* Subheadline - Elegant and Connected */}
            <div className="relative flex items-center justify-center gap-6 mt-6">
              <div className="h-px w-20 sm:w-24 bg-gradient-to-r from-transparent via-primary/70 to-primary/40"></div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-[0.15em] uppercase drop-shadow-lg whitespace-nowrap">
                {t.hero.subheadline}
              </h2>
              <div className="h-px w-20 sm:w-24 bg-gradient-to-l from-transparent via-primary/70 to-primary/40"></div>
            </div>
          </div>
          
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
              className="inline-flex items-center justify-center px-8 py-4 border border-white/30 text-base font-medium rounded-full text-white glass hover:glass-strong transition-all min-w-[200px] hover:scale-105"
            >
              <Play className="w-5 h-5 mr-2 text-white" />
              {t.hero.ctaSecondary}
            </a>
          </div>
          
          <div className="mt-16 flex flex-wrap justify-center gap-6 sm:gap-8">
             {t.hero.benefits.map((benefit, idx) => (
               <div key={idx} className="flex items-center gap-2 text-gray-100 glass px-5 py-2.5 rounded-full border border-white/20 hover:border-primary/50 transition-all hover:scale-105">
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
