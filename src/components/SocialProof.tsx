import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

const testimonials = [
  {
    content:
      "Jeg har lært mere på 3 måneder her end jeg gjorde på 3 år med tilfældige videoer. Struktureren gør hele forskellen!",
    author: "Anders Jørgensen",
    role: "Guitarist",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    content:
      "Fællesskabet er fantastisk. At få feedback fra både instruktører og andre elever har virkelig løftet mit spil.",
    author: "Sofie Nielsen",
    role: "Bassist",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    content:
      "Kvaliteten af undervisningen er i top. Det føles som at have en privatlærer i lommen 24/7.",
    author: "Mads Hansen",
    role: "Trommeslager",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    content:
      "Jazz improvisation kurset har åbnet nye døre for mig. Jeg føler mig meget mere selvsikker på scenen nu.",
    author: "Emma Christensen",
    role: "Pianist",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    content:
      "Bass teknikken jeg har lært her har forandret mit spil fuldstændigt. Kristian er en fantastisk lærer!",
    author: "Thomas Andersen",
    role: "Bassist",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    content:
      "Musikteorien er forklaret på en måde, der faktisk giver mening. Endelig forstår jeg harmoni!",
    author: "Lars Mikkelsen",
    role: "Guitarist",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    content:
      "Groove og rytme kurset har taget mit spil til næste niveau. Jeg kan mærke forskellen hver gang jeg spiller.",
    author: "Maria Larsen",
    role: "Trommeslager",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    content:
      "At kunne lære i mit eget tempo og få personlig feedback har været en game-changer for min udvikling.",
    author: "Jonas Pedersen",
    role: "Multi-instrumentalist",
    image:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
];

export default function SocialProof() {
  const { t } = useLanguage();
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [moveDistance, setMoveDistance] = useState("50%"); // Default to 50% (one set out of two)

  // Duplicate testimonials - 2 copies for seamless loop
  const duplicatedTestimonials = [...testimonials, ...testimonials];

  // Calculate exact distance to move by one full set (8 cards)
  useEffect(() => {
    const calculateDistance = () => {
      if (carouselRef.current) {
        const container = carouselRef.current;
        const cards = container.querySelectorAll('.testimonial-card') as NodeListOf<HTMLElement>;
        
        if (cards.length >= testimonials.length * 2 && cards[0]) {
          // Get the computed width of the first card (includes padding)
          const firstCardRect = cards[0].getBoundingClientRect();
          const cardWidth = firstCardRect.width;
          
          // One set = 8 cards
          const oneSetWidth = cardWidth * testimonials.length;
          
          // Total width = all cards (16 cards)
          const totalWidth = cardWidth * cards.length;
          
          // Calculate exact percentage: one set / total
          // This should be exactly 50% since we have 2 copies
          const percentage = (oneSetWidth / totalWidth) * 100;
          
          // Ensure it's close to 50% (within 1% tolerance) to avoid calculation errors
          if (Math.abs(percentage - 50) < 1) {
            setMoveDistance("50%");
          } else {
            setMoveDistance(`${percentage}%`);
          }
        }
      }
    };

    // Calculate after layout
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(calculateDistance);
    }, 100);
    
    window.addEventListener('resize', calculateDistance);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateDistance);
    };
  }, []);

  return (
    <section className="py-24 border-y border-white/10 relative overflow-hidden">
      {/* Enhanced colorful background gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/10 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-transparent to-accent/8"></div>

      {/* Colorful glow effects */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            {t.socialProof.headline}
          </h2>
          <p className="mt-4 text-xl text-gray-300">
            {t.socialProof.subheadline}
          </p>
        </div>

          {/* Carousel Container */}
          <div className="relative overflow-hidden pt-4">
            <div
              ref={carouselRef}
              className="flex animate-scroll"
              style={{ 
                animationPlayState: isPaused ? "paused" : "running",
                '--move-distance': moveDistance
              } as React.CSSProperties & { '--move-distance': string }}
            >
            {duplicatedTestimonials.map((testimonial, index) => (
              <div key={index} className="flex-shrink-0 w-full md:w-1/3 px-4 testimonial-card">
                <div
                  className="glass-strong p-8 rounded-2xl border border-white/10 relative hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 h-full"
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                >
                  {/* Quote icon decoration - more colorful */}
                  <div className="absolute top-2 right-6 text-7xl text-primary/25 font-serif leading-none">
                    "
                  </div>

                  <div className="relative">
                    <p className="text-gray-300 text-lg mb-6 italic">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center">
                      <img
                        className="h-10 w-10 rounded-full ring-2 ring-primary/30"
                        src={testimonial.image}
                        alt={testimonial.author}
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-white">
                          {testimonial.author}
                        </p>
                        <p className="text-sm text-gray-400">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
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
