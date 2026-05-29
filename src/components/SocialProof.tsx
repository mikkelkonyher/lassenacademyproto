/**
 * SocialProof — Auto-scrolling testimonials carousel.
 * Testimonials are hardcoded in Danish. The carousel duplicates the array
 * to create a seamless infinite-scroll loop using CSS animation.
 * Hovering over a card pauses the animation so the user can read it.
 */
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

// Student testimonials shown in the carousel.
// Intentionally empty until we have real testimonials to display — the
// previous entries were fabricated placeholders and have been removed.
type Testimonial = {
  content: string;
  author: string;
  role: string;
  image: string;
};
const testimonials: Testimonial[] = [];

export default function SocialProof() {
  const { t } = useLanguage();
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  // moveDistance is a CSS custom property that tells the scroll animation how far to translate
  const [moveDistance, setMoveDistance] = useState("50%");

  // Two copies placed side by side allow the CSS animation to loop seamlessly
  const duplicatedTestimonials = [...testimonials, ...testimonials];

  // Measure actual card widths after render to compute the exact scroll distance.
  // Recalculates on window resize to stay accurate across breakpoints.
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
            {/* Flex row animated via CSS @keyframes scroll; pauses on hover */}
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
