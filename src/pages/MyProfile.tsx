/**
 * MyProfile.tsx — Authenticated user's profile settings page.
 * Allows editing display name, bio, avatar, password, notification
 * preferences, and language. All mutations go through AuthContext helpers
 * that call Supabase under the hood.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, Bell, Globe, Camera, ExternalLink, Calendar, Bookmark, PlayCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { supabase } from '../supabase/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RegisterModal from '../components/RegisterModal';
import LoginModal from '../components/LoginModal';
import WatchlistButton from '../components/WatchlistButton';

// Shape of the joined query that backs the Watchlist section. Supabase returns
// nested objects for embedded relations; we narrow them here so the JSX is typed.
type WatchlistRow = {
  id: string;
  item_type: string;
  created_at: string;
  courses: {
    id: string;
    slug: string;
    title_da: string;
    title_en: string;
    image_url: string;
    instructor: string;
  } | null;
  lessons: {
    id: string;
    slug: string;
    title_da: string;
    title_en: string;
    duration_seconds: number | null;
    courses: {
      slug: string;
      title_da: string;
      title_en: string;
      image_url: string;
    } | null;
  } | null;
};

/** Format a lesson runtime as "M:SS"; null if unknown */
function formatLessonRuntime(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MyProfile() {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const { user, profile, loading, updateProfile, uploadAvatar, changePassword } = useAuth();
  // Watchlist Sets — used to filter the locally-fetched rows so removed items
  // disappear from the grid immediately on click (driven by the context's
  // optimistic toggle, no second fetch required)
  const { courses: watchlistCourses, lessons: watchlistLessons, loading: watchlistLoading } = useWatchlist();
  // Joined watchlist rows (with embedded course/lesson info) for rendering the
  // saved-items grids on this page
  const [watchlistRows, setWatchlistRows] = useState<WatchlistRow[]>([]);
  // Auth modal state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Local copies of notification prefs (initialized from profile)
  const [notifications, setNotifications] = useState(() => ({
    email: profile?.notify_email ?? true,
    courseUpdates: profile?.notify_course_updates ?? true,
    newsletter: profile?.notify_newsletter ?? false,
  }));

  // Editable settings fields (initialized from profile)
  const [settingsName, setSettingsName] = useState(() => profile?.full_name ?? '');
  const [settingsBio, setSettingsBio] = useState(() => profile?.bio ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Avatar upload
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Password change fields and feedback
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Hidden file input triggered by the avatar overlay button
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local form state when profile loads asynchronously (e.g. after auth resolves)
  const lastProfileId = useRef(profile?.id);
  /* eslint-disable react-hooks/set-state-in-effect -- syncing form state from async profile load */
  useEffect(() => {
    if (profile && profile.id !== lastProfileId.current) {
      lastProfileId.current = profile.id;
      setSettingsName(profile.full_name);
      setSettingsBio(profile.bio ?? '');
      setNotifications({
        email: profile.notify_email ?? false,
        courseUpdates: profile.notify_course_updates ?? false,
        newsletter: profile.notify_newsletter ?? false,
      });
    }
  }, [profile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openRegister = () => { setIsLoginOpen(false); setIsRegisterOpen(true); };
  const closeRegister = () => setIsRegisterOpen(false);
  const openLogin = () => { setIsRegisterOpen(false); setIsLoginOpen(true); };
  const closeLogin = () => setIsLoginOpen(false);

  // Fetch the user's watchlist with embedded course / lesson info so we can
  // render rich cards. RLS limits the result to this user's rows.
  /* eslint-disable react-hooks/set-state-in-effect -- syncing fetched data + clearing on logout */
  useEffect(() => {
    if (!user) {
      setWatchlistRows([]);
      return;
    }
    let cancelled = false;
    supabase
      .from('user_watchlist')
      .select(
        'id, item_type, created_at, courses(id, slug, title_da, title_en, image_url, instructor), lessons(id, slug, title_da, title_en, duration_seconds, courses(slug, title_da, title_en, image_url))'
      )
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setWatchlistRows(data as unknown as WatchlistRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Filter the fetched rows against the context Sets so optimistic removes
  // from the WatchlistButton make cards disappear immediately
  const visibleCourseRows = watchlistRows.filter(
    (r) => r.item_type === 'course' && r.courses && watchlistCourses.has(r.courses.id),
  );
  const visibleLessonRows = watchlistRows.filter(
    (r) => r.item_type === 'lesson' && r.lessons && watchlistLessons.has(r.lessons.id),
  );
  const watchlistIsEmpty =
    !watchlistLoading && visibleCourseRows.length === 0 && visibleLessonRows.length === 0;

  // Persist name, bio, notification prefs, and language to Supabase profiles table
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage('');
    const { error } = await updateProfile({
      full_name: settingsName,
      bio: settingsBio,
      notify_email: notifications.email,
      notify_course_updates: notifications.courseUpdates,
      notify_newsletter: notifications.newsletter,
      preferred_language: language,
    });
    setIsSaving(false);
    setSaveMessage(error ?? (language === 'da' ? 'Gemt!' : 'Saved!'));
    if (!error) {
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

  // Upload selected image file to Supabase Storage and update the profile avatar URL
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    const { error } = await uploadAvatar(file);
    setIsUploadingPhoto(false);

    if (error) {
      setSaveMessage(t.myProfile.photoError);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Validate and change password via Supabase Auth (requires current password)
  const handleChangePassword = async () => {
    setPasswordMessage('');
    setPasswordError(false);

    if (newPassword.length < 8) {
      setPasswordMessage(t.myProfile.settings.passwordTooShort);
      setPasswordError(true);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordMessage(t.myProfile.settings.passwordsMismatch);
      setPasswordError(true);
      return;
    }

    setIsChangingPassword(true);
    const { error } = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);

    if (error) {
      // Map Supabase auth error to a user-friendly translated message
      const translatedError = error.includes('Invalid login credentials')
        ? t.myProfile.settings.wrongCurrentPassword
        : t.myProfile.settings.passwordChangeError;
      setPasswordMessage(translatedError);
      setPasswordError(true);
    } else {
      setPasswordMessage(t.myProfile.settings.passwordChanged);
      setPasswordError(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordMessage(''), 3000);
    }
  };

  // Redirect to login if not authenticated
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
        <div className="pt-24 pb-16 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="glass border border-white/20 rounded-2xl p-12 text-center max-w-md">
            <User className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-3">{t.auth.loginTitle}</h2>
            <p className="text-gray-400 mb-6">{t.auth.loginSubtitle}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={openLogin}
                className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-primary/20 transition-all"
              >
                {t.auth.loginButton}
              </button>
              <button
                onClick={openRegister}
                className="glass border border-white/20 text-white font-bold py-3 px-6 rounded-lg hover:bg-white/10 transition-all"
              >
                {t.auth.submitButton}
              </button>
            </div>
          </div>
        </div>
        <Footer />
        <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
        <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <div className="relative group">
                <img
                  src={profile?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&size=200&background=f97316&color=fff&bold=true`}
                  alt={profile?.full_name ?? ''}
                  className="w-28 h-28 rounded-full object-cover border-2 border-primary/50 shadow-lg shadow-primary/20"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploadingPhoto ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-3xl font-bold text-white mb-1">{profile?.full_name}</h1>
                <p className="text-gray-400 mb-1">{profile?.email}</p>
                {profile?.created_at && (
                  <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{t.myProfile.memberSince} {new Date(profile.created_at).toLocaleDateString(language === 'da' ? 'da-DK' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                )}
                {profile?.bio && (
                  <p className="text-gray-300 leading-relaxed max-w-xl mb-3">{profile.bio}</p>
                )}
                <Link
                  to={`/profile/${user?.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t.myProfile.viewPublicProfile}
                </Link>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-6">
            {/* Watchlist — saved courses and lessons */}
            <div className="glass border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Bookmark className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white">{t.myProfile.watchlist.title}</h3>
              </div>

              {watchlistIsEmpty ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">{t.myProfile.watchlist.empty}</p>
                  <Link
                    to="/courses"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-lg shadow-lg shadow-primary/20 transition-all"
                  >
                    {t.myProfile.watchlist.browseCourses}
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {visibleCourseRows.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">
                        {t.myProfile.watchlist.coursesHeading}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {visibleCourseRows.map((row) => {
                          const c = row.courses!;
                          const title = language === 'da' ? c.title_da : c.title_en || c.title_da;
                          return (
                            <Link
                              key={row.id}
                              to={`/courses/${c.slug}`}
                              className="relative rounded-xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all group"
                            >
                              <div className="aspect-video relative">
                                <img
                                  src={c.image_url}
                                  alt={title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                                <div className="absolute top-2 right-2 z-10">
                                  <WatchlistButton
                                    itemType="course"
                                    itemId={c.id}
                                    variant="icon"
                                    onRequireLogin={openLogin}
                                  />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                  <p className="text-white font-bold leading-tight line-clamp-2">{title}</p>
                                  <p className="text-xs text-gray-300 mt-0.5">{c.instructor}</p>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {visibleLessonRows.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">
                        {t.myProfile.watchlist.lessonsHeading}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {visibleLessonRows.map((row) => {
                          const l = row.lessons!;
                          const parent = l.courses;
                          const lessonTitle = language === 'da' ? l.title_da : l.title_en || l.title_da;
                          const parentTitle = parent
                            ? language === 'da'
                              ? parent.title_da
                              : parent.title_en || parent.title_da
                            : '';
                          const runtime = formatLessonRuntime(l.duration_seconds);
                          // Lesson links require BOTH parent course slug and lesson slug;
                          // if the parent is missing (orphan row) fall back to courses index
                          const href = parent
                            ? `/courses/${parent.slug}/${l.slug}`
                            : '/courses';
                          return (
                            <Link
                              key={row.id}
                              to={href}
                              className="relative rounded-xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all group flex gap-3 p-3"
                            >
                              <div className="relative w-24 sm:w-28 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-black/40">
                                {parent?.image_url ? (
                                  <img
                                    src={parent.image_url}
                                    alt={lessonTitle}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-accent/10">
                                    <PlayCircle className="w-6 h-6 text-primary/70" />
                                  </div>
                                )}
                                {runtime && (
                                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white tracking-wider">
                                    {runtime}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 py-1">
                                <p className="text-sm font-bold text-white line-clamp-2 leading-snug">{lessonTitle}</p>
                                {parentTitle && (
                                  <p className="text-xs text-primary mt-1 line-clamp-1">{parentTitle}</p>
                                )}
                              </div>
                              <div className="flex-shrink-0 self-start">
                                <WatchlistButton
                                  itemType="lesson"
                                  itemId={l.id}
                                  variant="icon"
                                  onRequireLogin={openLogin}
                                />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      maxLength={100}
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
                      value={profile?.email ?? ''}
                      className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white/60 placeholder:text-gray-400 focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 ml-1 block">Bio</label>
                  <textarea
                    value={settingsBio}
                    onChange={(e) => setSettingsBio(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full glass border border-white/20 rounded-lg py-3 px-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                  />
                  <p className="text-xs text-gray-500 text-right mt-1">{settingsBio.length}/500</p>
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="glass border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-5">{t.myProfile.settings.passwordTitle}</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 ml-1 block">{t.myProfile.settings.currentPassword}</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      maxLength={128}
                      placeholder="••••••••"
                      className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 ml-1 block">{t.myProfile.settings.newPassword}</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      maxLength={128}
                      placeholder="••••••••"
                      className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 ml-1 block">{t.myProfile.settings.confirmPassword}</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      maxLength={128}
                      placeholder="••••••••"
                      className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                </div>
              </div>
              {passwordMessage && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${
                  passwordError ? 'bg-red-500/20 border border-red-500/30 text-red-300' : 'bg-green-500/20 border border-green-500/30 text-green-300'
                }`}>
                  {passwordMessage}
                </div>
              )}
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                className="mt-4 w-full glass border border-white/20 text-white font-bold py-3 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? '...' : t.myProfile.settings.changePasswordButton}
              </button>
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
            {saveMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                saveMessage.includes('!') ? 'bg-green-500/20 border border-green-500/30 text-green-300' : 'bg-red-500/20 border border-red-500/30 text-red-300'
              }`}>
                {saveMessage}
              </div>
            )}
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '...' : t.myProfile.settings.saveChanges}
            </button>
          </div>
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
    </div>
  );
}
