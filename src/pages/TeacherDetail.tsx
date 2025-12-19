import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Music2, Award, BookOpen, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RegisterModal from '../components/RegisterModal';

// Teacher data - should match FeaturedSection
const teachers = [
  {
    name: "Kristian Lassen",
    image: "https://storage.buzzsprout.com/n42rc747h78xv4w7z7kjf5uv52oy?.jpg",
    studio: "Lassen HQ",
  },
  {
    name: "Ludwig Hamilton-Wittendorff",
    image: "https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    studio: "Akkorder og scalaer",
  },
  {
    name: "Elena Rossi",
    image: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    studio: "Nordic Sound",
  },
];

export default function TeacherDetail() {
  const { teacherSlug } = useParams<{ teacherSlug: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const openRegister = () => setIsRegisterOpen(true);
  const closeRegister = () => setIsRegisterOpen(false);

  // Find teacher by slug (name converted to URL-friendly format)
  const teacher = teachers.find(
    (t) => t.name.toLowerCase().replace(/[\s-]+/g, '-') === teacherSlug
  );

  if (!teacher) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar onOpenRegister={() => {}} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Teacher not found</h1>
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:text-primary/80"
            >
              {t.auth.goBackHome}
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Get teacher role from translations
  const teacherKey = teacher.name.toLowerCase().replace(/[\s-]+/g, '') as keyof typeof t.teachers;
  const roleKey = teacherKey === 'kristianlassen' ? 'kristian' : 
                  teacherKey === 'ludwighamiltonwittendorff' ? 'ludwig' : 'elena';
  const role = t.featured.instructorRoles[roleKey as keyof typeof t.featured.instructorRoles];

  // Get teacher details from translations
  const teacherDetails = (t.teachers[teacherKey] as any) || {
    bio: '',
    specialties: [],
    experience: '',
    achievements: [],
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} />
      
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Teacher Content */}
          <div className="grid md:grid-cols-2 gap-12">
            {/* Left Side - Image */}
            <div className="relative">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                <img
                  src={teacher.image}
                  alt={teacher.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-6 flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 text-white/80">
                  <Music2 className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{teacher.studio}</span>
                </div>
              </div>
            </div>

            {/* Right Side - Content */}
            <div className="flex flex-col">
              <div className="mb-8">
                <h1 className="text-5xl font-bold text-white mb-3">{teacher.name}</h1>
                <p className="text-2xl text-primary font-semibold mb-6">{role}</p>
                {teacherDetails.bio && (
                  <p className="text-gray-300 leading-relaxed text-lg mb-8">{teacherDetails.bio}</p>
                )}
              </div>

              {/* Specialties */}
              {teacherDetails.specialties && teacherDetails.specialties.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold text-white">{t.teachers.specialties}</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {teacherDetails.specialties.map((specialty: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-5 py-2.5 bg-primary/20 border border-primary/40 rounded-full text-base text-white font-medium hover:bg-primary/30 transition-colors"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {teacherDetails.experience && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold text-white">{t.teachers.experience}</h2>
                  </div>
                  <p className="text-gray-300 leading-relaxed text-lg">{teacherDetails.experience}</p>
                </div>
              )}

              {/* Achievements */}
              {teacherDetails.achievements && teacherDetails.achievements.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold text-white">{t.teachers.achievements}</h2>
                  </div>
                  <ul className="space-y-3">
                    {teacherDetails.achievements.map((achievement: string, idx: number) => (
                      <li key={idx} className="text-gray-300 flex items-start gap-3 text-lg">
                        <span className="text-primary mt-1.5 text-xl">•</span>
                        <span>{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} />
    </div>
  );
}

