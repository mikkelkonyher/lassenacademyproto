import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Heart, User, Mail, Lock, Bell, Globe, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RegisterModal from '../components/RegisterModal';

const purchasedVideos = [
  {
    title: 'Groove & Rhythmic Understanding',
    instructor: 'Kristian Lassen',
    duration: '6t 15m',
    image: 'https://images.unsplash.com/photo-1525898181636-29b30c26f6e1?q=80&w=2324&auto=format&fit=crop',
    progress: 72,
  },
  {
    title: 'Beginner Guitar: From 0 to Hero',
    instructor: 'Ludwig Hamilton-Wittendorff',
    duration: '4t 30m',
    image: 'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?q=80&w=2338&auto=format&fit=crop',
    progress: 35,
  },
  {
    title: 'Jazz Piano and Improvisation',
    instructor: 'Elena Rossi',
    duration: '8t 00m',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    progress: 10,
  },
  {
    title: 'Slap Bass Fundamentals',
    instructor: 'Kristian Lassen',
    duration: '5t 45m',
    image: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?q=80&w=2274&auto=format&fit=crop',
    progress: 100,
  },
];

const favoriteCourses = [
  {
    title: 'Walking Bass Lines',
    instructor: 'Kristian Lassen',
    duration: '5t 15m',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2070&auto=format&fit=crop',
    rating: 4.9,
  },
  {
    title: 'Jazz Harmony & Voicings',
    instructor: 'Elena Rossi',
    duration: '7t 20m',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=2070&auto=format&fit=crop',
    rating: 4.8,
  },
  {
    title: 'Fingerstyle Guitar Mastery',
    instructor: 'Ludwig Hamilton-Wittendorff',
    duration: '6t 00m',
    image: 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
  },
];

type Tab = 'videos' | 'favorites' | 'settings';

export default function MyProfile() {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('videos');
  const [notifications, setNotifications] = useState({
    email: true,
    courseUpdates: true,
    newsletter: false,
  });

  const openRegister = () => setIsRegisterOpen(true);
  const closeRegister = () => setIsRegisterOpen(false);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'videos', label: t.myProfile.tabs.videos },
    { key: 'favorites', label: t.myProfile.tabs.favorites },
    { key: 'settings', label: t.myProfile.tabs.settings },
  ];

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

          {/* Profile Header */}
          <div className="glass border border-white/20 rounded-2xl p-8 mb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80"
                alt={t.myProfile.userName}
                className="w-28 h-28 rounded-full object-cover border-2 border-primary/50 shadow-lg shadow-primary/20"
              />
              <div className="text-center sm:text-left">
                <h1 className="text-3xl font-bold text-white mb-1">{t.myProfile.userName}</h1>
                <p className="text-gray-400 mb-3">{t.myProfile.userEmail}</p>
                <p className="text-gray-300 leading-relaxed max-w-xl">{t.myProfile.bio}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-primary/20 border border-primary/50 text-primary'
                    : 'glass border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'videos' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">{t.myProfile.videos.purchased}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {purchasedVideos.map((video, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/20 hover:border-primary/60 transition-all duration-300 group overflow-hidden hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={video.image}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="w-12 h-12 text-primary drop-shadow-lg" />
                      </div>
                    </div>
                    <div className="p-4 glass">
                      <h3 className="text-sm font-bold text-white mb-1 group-hover:text-primary transition-colors leading-tight">
                        {video.title}
                      </h3>
                      <p className="text-xs text-gray-400 mb-3">{video.instructor} · {video.duration}</p>
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{video.progress}% {t.myProfile.videos.progress}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${video.progress}%` }}
                          />
                        </div>
                      </div>
                      <button className="w-full text-center text-xs font-medium py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors">
                        {t.myProfile.videos.continueWatching}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">{t.myProfile.favorites.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteCourses.map((course, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/20 hover:border-primary/60 transition-all duration-300 group overflow-hidden hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <Heart className="w-5 h-5 text-red-400 fill-red-400 drop-shadow-lg" />
                      </div>
                    </div>
                    <div className="p-5 glass">
                      <h3 className="text-base font-bold text-white mb-1 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-400 mb-3">{course.instructor}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center text-gray-300">
                          <PlayCircle className="w-4 h-4 mr-1.5 text-primary" />
                          {course.duration}
                        </span>
                        <span className="flex items-center text-white font-medium">
                          <Star className="w-4 h-4 mr-1 text-yellow-400 fill-yellow-400" />
                          {course.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              {/* Account Settings */}
              <div className="glass border border-white/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-5">{t.myProfile.settings.accountTitle}</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1 block">{t.myProfile.settings.nameLabel}</label>
                    <div className="relative group">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        readOnly
                        defaultValue={t.myProfile.userName}
                        className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1 block">{t.myProfile.settings.emailLabel}</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="email"
                        readOnly
                        defaultValue={t.myProfile.userEmail}
                        className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="glass border border-white/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-5">{t.myProfile.settings.passwordTitle}</h3>
                <div className="space-y-4">
                  {[
                    { label: t.myProfile.settings.currentPassword, placeholder: '••••••••' },
                    { label: t.myProfile.settings.newPassword, placeholder: '••••••••' },
                    { label: t.myProfile.settings.confirmPassword, placeholder: '••••••••' },
                  ].map((field) => (
                    <div key={field.label} className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 ml-1 block">{field.label}</label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                          type="password"
                          placeholder={field.placeholder}
                          className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="glass border border-white/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Bell className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-white">{t.myProfile.settings.notificationsTitle}</h3>
                </div>
                <div className="space-y-4">
                  {([
                    { key: 'email' as const, label: t.myProfile.settings.emailNotifications },
                    { key: 'courseUpdates' as const, label: t.myProfile.settings.courseUpdates },
                    { key: 'newsletter' as const, label: t.myProfile.settings.newsletter },
                  ]).map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{item.label}</span>
                      <button
                        onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          notifications[item.key] ? 'bg-primary' : 'bg-white/20'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                            notifications[item.key] ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="glass border border-white/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Globe className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-white">{t.myProfile.settings.languageTitle}</h3>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { if (language !== 'da') toggleLanguage(); }}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      language === 'da'
                        ? 'bg-primary/20 border border-primary/50 text-primary'
                        : 'glass border border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    Dansk
                  </button>
                  <button
                    onClick={() => { if (language !== 'en') toggleLanguage(); }}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      language === 'en'
                        ? 'bg-primary/20 border border-primary/50 text-primary'
                        : 'glass border border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200">
                {t.myProfile.settings.saveChanges}
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} />
    </div>
  );
}
