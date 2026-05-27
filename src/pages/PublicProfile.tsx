/**
 * PublicProfile.tsx — Read-only public profile page for any user.
 * Fetches the profile by userId from the URL param via Supabase.
 * Shows avatar, name, join date, and bio. If the viewer is looking
 * at their own profile, a link back to the editable settings is shown.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RegisterModal from '../components/RegisterModal';
import LoginModal from '../components/LoginModal';
import type { Database } from '../types/database.types';

// Re-use the auto-generated Supabase row type for type safety
type Profile = Database['public']['Tables']['profiles']['Row'];

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false); // true when userId doesn't match any profile

  // Auth modal state (needed by Navbar)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const openRegister = () => { setIsLoginOpen(false); setIsRegisterOpen(true); };
  const closeRegister = () => setIsRegisterOpen(false);
  const openLogin = () => { setIsRegisterOpen(false); setIsLoginOpen(true); };
  const closeLogin = () => setIsLoginOpen(false);

  // Fetch the profile row from Supabase on mount or when userId changes
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, image_url, bio, created_at')
        .eq('id', userId)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProfile(data as Profile);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  // Detect if the logged-in user is viewing their own public profile
  const isOwnProfile = user?.id === userId;

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
        <div className="pt-24 pb-16 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="glass border border-white/20 rounded-2xl p-12 text-center max-w-md">
            <User className="w-16 h-16 text-gray-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-3">
              {language === 'da' ? 'Profil ikke fundet' : 'Profile not found'}
            </h2>
            <p className="text-gray-400 mb-6">
              {language === 'da' ? 'Denne bruger findes ikke.' : 'This user does not exist.'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              {language === 'da' ? 'Gå til forsiden' : 'Go to homepage'}
            </button>
          </div>
        </div>
        <Footer />
        <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
        <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{isOwnProfile ? t.myProfile.publicProfile.backToSettings : t.auth.goBack}</span>
          </button>

          <div className="glass border border-white/20 rounded-2xl p-8 sm:p-12">
            <div className="flex flex-col items-center text-center">
              <img loading="lazy"
                src={profile?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&size=200&background=f97316&color=fff&bold=true`}
                alt={profile?.full_name ?? ''}
                className="w-32 h-32 rounded-full object-cover border-2 border-primary/50 shadow-lg shadow-primary/20 mb-6"
              />

              <h1 className="text-3xl font-bold text-white mb-2">{profile?.full_name}</h1>

              {profile?.created_at && (
                <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-6">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {t.myProfile.publicProfile.memberSince}{' '}
                    {new Date(profile.created_at).toLocaleDateString(
                      language === 'da' ? 'da-DK' : 'en-US',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </span>
                </div>
              )}

              <div className="w-full max-w-md">
                {profile?.bio ? (
                  <div className="glass border border-white/10 rounded-xl p-6">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">{t.myProfile.publicProfile.noBio}</p>
                )}
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => navigate('/profile')}
                  className="mt-8 glass border border-white/20 text-gray-300 hover:text-white font-medium py-2.5 px-6 rounded-lg hover:bg-white/10 transition-all text-sm"
                >
                  {t.myProfile.publicProfile.backToSettings}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
    </div>
  );
}
