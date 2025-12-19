import { useLanguage } from '../context/LanguageContext';

const testimonials = [
  {
    content: "Jeg har lært mere på 3 måneder her end jeg gjorde på 3 år med tilfældige videoer. Struktureren gør hele forskellen!",
    author: "Anders Jørgensen",
    role: "Guitarist",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    content: "Fællesskabet er fantastisk. At få feedback fra både instruktører og andre elever har virkelig løftet mit spil.",
    author: "Sofie Nielsen",
    role: "Bassist",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    content: "Kvaliteten af undervisningen er i top. Det føles som at have en privatlærer i lommen 24/7.",
    author: "Mads Hansen",
    role: "Trommeslager",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
];

export default function SocialProof() {
  const { t } = useLanguage();

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
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="glass-strong p-8 rounded-2xl border border-white/10 relative hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20">
              {/* Quote icon decoration - more colorful */}
              <div className="absolute top-4 right-6 text-7xl text-primary/25 font-serif leading-none">"</div>
              
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
                    <p className="text-sm font-medium text-white">{testimonial.author}</p>
                    <p className="text-sm text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
