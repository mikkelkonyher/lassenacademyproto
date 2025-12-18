import { PlayCircle, Star, Music2, ArrowRight } from 'lucide-react';

const tutors = [
  {
    name: 'Kristian Lassen',
    role: 'Bass til alle niveauer',
    image: 'https://images.unsplash.com/photo-1602408960011-61d979be537e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Explicit Bass Player Image
    studio: 'Lassen HQ'
  },
  {
    name: 'Ludwig Hamilton-Wittendorff',
    role: 'Guitar og teori',
    image: 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Explicit Guitar Player Image
    studio: 'Akkorder og scalaer'
  },
  {
    name: 'Elena Rossi',
    role: 'Piano & Composition',
    image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    studio: 'Nordic Sound'
  }
];

const courses = [
  {
    title: 'Begynder Guitar: Fra 0 til Helt',
    instructor: 'Ludwig Hamilton-Wittendorff',
    level: 'Begynder',
    duration: '4t 30m',
    image: 'https://images.unsplash.com/photo-1473216508076-2e90e7555883?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    tags: ['Teknik', 'Teori']
  },
  {
    title: 'Slap Bass Fundamentals',
    instructor: 'Kristian Lassen',
    level: 'Mellem',
    duration: '6t 15m',
    image: 'https://images.unsplash.com/photo-1568222622765-abdaacbbde2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    tags: ['Groove', 'Rytme']
  },
  {
    title: 'Jazz Piano og Improvisation',
    instructor: 'Elena Rossi',
    level: 'Avanceret',
    duration: '8t 00m',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    tags: ['Harmoni', 'Impro']
  }
];

export default function FeaturedSection() {
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
        </div>

        {/* Glow Effects */}
        <div className="absolute top-0 right-0 -mr-64 -mt-64 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-64 -mb-64 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        
        {/* Feature Tutors */}
        <div className="mb-32">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
                <div>
                     <span className="text-primary font-bold tracking-wider uppercase text-sm mb-2 block">Eksperterne</span>
                    <h2 className="text-4xl font-extrabold text-white">
                        Mød dine nye mentorer
                    </h2>
                </div>
                 <a href="#" className="flex items-center text-gray-300 hover:text-white transition-colors group font-medium">
                    Mød alle instruktører <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform text-primary" />
                </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {tutors.map((tutor, idx) => (
                    <div key={idx} className="group relative rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden border border-white/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(225,29,72,0.2)]">
                        <div className="aspect-[3/4] overflow-hidden">
                            <img src={tutor.image} alt={tutor.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90"></div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                            <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-primary transition-colors">{tutor.name}</h3>
                            <p className="text-gray-300 font-medium mb-4">{tutor.role}</p>
                            <div className="flex items-center text-xs text-gray-500 uppercase tracking-widest border-t border-white/10 pt-4">
                                <Music2 className="w-3 h-3 mr-2 text-primary" /> {tutor.studio}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Featured Courses */}
        <div>
            <div className="flex justify-between items-end mb-12">
                <div>
                     <span className="text-accent font-bold tracking-wider uppercase text-sm mb-2 block">Biblioteket</span>
                     <h2 className="text-4xl font-extrabold text-white">Nyeste Kurser</h2>
                </div>
                <button className="hidden sm:flex px-8 py-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white text-sm font-bold tracking-wide backdrop-blur-sm">
                    SE ALLE KURSER
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                 {courses.map((course, idx) => (
                    <div key={idx} className="bg-card/50 backdrop-blur-sm rounded-xl border border-white/5 hover:border-accent/50 transition-all group overflow-hidden hover:shadow-lg hover:shadow-accent/10">
                        <div className="relative aspect-video overflow-hidden">
                             <img src={course.image} alt={course.title} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" />
                             <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
                                     <PlayCircle className="w-8 h-8 text-white fill-white/20" />
                                </div>
                             </div>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-2 mb-3">
                                {course.tags.map(tag => (
                                    <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent transition-colors">{course.title}</h3>
                            <p className="text-sm text-gray-400 mb-4">med <span className="text-gray-300">{course.instructor}</span></p>
                            <div className="flex items-center justify-between text-sm text-gray-500 border-t border-white/5 pt-4">
                                <span className="flex items-center"><PlayCircle className="w-4 h-4 mr-1" /> {course.duration}</span>
                                <span className="flex items-center text-gray-300"><Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" /> 4.9</span>
                            </div>
                        </div>
                    </div>
                 ))}
            </div>
             <div className="mt-8 text-center sm:hidden">
                <button className="w-full px-8 py-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white text-sm font-bold tracking-wide">
                    SE ALLE KURSER
                </button>
            </div>
        </div>
      </div>
    </section>
  );
}
