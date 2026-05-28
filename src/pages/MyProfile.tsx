/**
 * MyProfile.tsx — Authenticated user's profile settings page.
 * Allows editing display name, bio, avatar, password, notification
 * preferences, and language. All mutations go through AuthContext helpers
 * that call Supabase under the hood.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, Bell, Globe, Camera, ExternalLink, Calendar, Bookmark, ShoppingBag, Play, Trash2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useWatchProgress } from '../context/WatchProgressContext';
import { supabase } from '../supabase/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RegisterModal from '../components/RegisterModal';
import LoginModal from '../components/LoginModal';
import WatchlistButton from '../components/WatchlistButton';

// Shape for "Continue Watching" cards — lesson + parent course info
type ContinueWatchingRow = {
  lessonId: string;
  lessonSlug: string;
  titleDa: string;
  titleEn: string;
  courseSlug: string;
  courseTitleDa: string;
  courseTitleEn: string;
  courseImageUrl: string;
  sortOrder: number;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  muxPlaybackId: string | null;
};

// Shape of the joined query backing the "My purchases" section
type PurchaseRow = {
  id: string;
  purchased_at: string;
  price_paid_dkk: number;
  courses: {
    id: string;
    slug: string;
    title_da: string;
    title_en: string;
    image_url: string;
    instructor: string;
  } | null;
};

// Shape of the joined query that backs the Watchlist section. Watchlist only
// supports courses now — lessons are reached via their parent course.
type WatchlistRow = {
  id: string;
  created_at: string;
  courses: {
    id: string;
    slug: string;
    title_da: string;
    title_en: string;
    image_url: string;
    instructor: string;
  } | null;
};

export default function MyProfile() {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const { user, profile, loading, updateProfile, uploadAvatar, changePassword, deleteAccount } = useAuth();
  // Watchlist Set — used to filter the locally-fetched rows so removed items
  // disappear from the grid immediately on click (driven by the context's
  // optimistic toggle, no second fetch required)
  const { courses: watchlistCourses, loading: watchlistLoading } = useWatchlist();
  const { progressEntries } = useWatchProgress();
  // Joined watchlist rows (with embedded course/lesson info) for rendering the
  // saved-items grids on this page
  const [watchlistRows, setWatchlistRows] = useState<WatchlistRow[]>([]);
  // Continue watching — the single most recently watched in-progress lesson
  const [continueRow, setContinueRow] = useState<ContinueWatchingRow | null>(null);
  // Joined purchase rows for the "My purchases" section
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([]);
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

  // Account deletion (danger zone) — modal visibility, password confirm, feedback
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

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

  // Fetch the user's saved courses with embedded course info. RLS limits the
  // result to this user's rows. Watchlist is courses-only now.
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
        'id, created_at, courses(id, slug, title_da, title_en, image_url, instructor)'
      )
      .eq('item_type', 'course')
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

  // Fetch the user's course purchases with embedded course info, so we can
  // render rich cards. RLS scopes the result to this user's rows.
  /* eslint-disable react-hooks/set-state-in-effect -- syncing fetched data + clearing on logout */
  useEffect(() => {
    if (!user) {
      setPurchaseRows([]);
      return;
    }
    let cancelled = false;
    supabase
      .from('user_course_purchases')
      .select(
        'id, purchased_at, price_paid_dkk, courses(id, slug, title_da, title_en, image_url, instructor)'
      )
      .order('purchased_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setPurchaseRows(data as unknown as PurchaseRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Find the single most recently watched in-progress lesson for "Continue Watching"
  /* eslint-disable react-hooks/set-state-in-effect -- syncing derived data */
  useEffect(() => {
    // Pick the most recent non-completed entry
    const candidate = progressEntries
      .filter((e) => !e.completed && e.positionSeconds > 0)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!user || !candidate) {
      setContinueRow(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('lessons')
      .select('id, slug, title_da, title_en, sort_order, mux_playback_id, courses(slug, title_da, title_en, image_url)')
      .eq('id', candidate.lessonId)
      .maybeSingle()
      .then(({ data: lesson }) => {
        if (cancelled || !lesson) return;
        const c = (lesson as unknown as { courses: { slug: string; title_da: string; title_en: string; image_url: string } }).courses;
        if (!c) return;
        setContinueRow({
          lessonId: candidate.lessonId,
          lessonSlug: lesson.slug,
          titleDa: lesson.title_da,
          titleEn: lesson.title_en,
          courseSlug: c.slug,
          courseTitleDa: c.title_da,
          courseTitleEn: c.title_en,
          courseImageUrl: c.image_url,
          sortOrder: lesson.sort_order ?? 0,
          positionSeconds: candidate.positionSeconds,
          durationSeconds: candidate.durationSeconds,
          completed: candidate.completed,
          muxPlaybackId: lesson.mux_playback_id,
        });
      });
    return () => { cancelled = true; };
  }, [user, progressEntries]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Filter the fetched rows against the context Set so optimistic removes
  // from the WatchlistButton make cards disappear immediately
  const visibleCourseRows = watchlistRows.filter(
    (r) => r.courses && watchlistCourses.has(r.courses.id),
  );
  const watchlistIsEmpty = !watchlistLoading && visibleCourseRows.length === 0;

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

  // Permanently delete the account after password confirmation, then redirect home
  const handleDeleteAccount = async () => {
    setDeleteMessage('');
    setIsDeleting(true);
    const { error } = await deleteAccount(deletePassword);
    setIsDeleting(false);

    if (error) {
      // INVALID_PASSWORD is returned by the edge function for a wrong password
      setDeleteMessage(
        error === 'INVALID_PASSWORD'
          ? t.myProfile.settings.deleteWrongPassword
          : t.myProfile.settings.deleteError,
      );
      return;
    }

    // Success — account and session are gone; send the user to the landing page
    navigate('/');
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
            {/* Continue Watching — single most recently watched in-progress lesson */}
            {continueRow && (() => {
              const moduleLabel = `${t.courseDetail.moduleLabel} ${continueRow.sortOrder + 1}`;
              const title = language === 'da' ? continueRow.titleDa : continueRow.titleEn || continueRow.titleDa;
              const courseTitle = language === 'da' ? continueRow.courseTitleDa : continueRow.courseTitleEn || continueRow.courseTitleDa;
              const fraction = continueRow.durationSeconds > 0
                ? Math.min(continueRow.positionSeconds / continueRow.durationSeconds, 1)
                : 0;
              const pct = Math.round(fraction * 100);
              const thumb = continueRow.muxPlaybackId
                ? `https://image.mux.com/${continueRow.muxPlaybackId}/thumbnail.webp?time=${Math.max(1, Math.floor(continueRow.positionSeconds))}&width=400`
                : continueRow.courseImageUrl;
              return (
                <Link
                  to={`/courses/${continueRow.courseSlug}/${continueRow.lessonSlug}`}
                  className="glass border border-white/20 rounded-2xl p-6 block hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Play className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-white">{t.progress.continueWatching}</h3>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="relative w-40 sm:w-48 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={thumb}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                        <div
                          className="h-full bg-primary rounded-r-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-primary font-bold uppercase tracking-wider">{moduleLabel}</p>
                      <p className="text-white font-bold leading-tight line-clamp-2 mt-0.5">{title}</p>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-1">{courseTitle}</p>
                      <p className="text-xs text-primary mt-2 font-medium">{pct}% · {t.progress.resumeLesson} →</p>
                    </div>
                  </div>
                </Link>
              );
            })()}

            {/* My purchases — one-time-bought courses */}
            <div className="glass border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white">{t.myPurchases.title}</h3>
              </div>

              {purchaseRows.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">{t.myPurchases.empty}</p>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-lg shadow-lg shadow-primary/20 transition-all"
                  >
                    {t.myPurchases.browseCta}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {purchaseRows.map((row) => {
                    const c = row.courses;
                    if (!c) return null;
                    const title = language === 'da' ? c.title_da : c.title_en || c.title_da;
                    // Locale-aware purchase date formatting
                    const purchasedLabel = new Date(row.purchased_at).toLocaleDateString(
                      language === 'da' ? 'da-DK' : 'en-GB',
                      { year: 'numeric', month: 'short', day: 'numeric' }
                    );
                    // Price snapshot at purchase time (could differ from current price)
                    const priceLabel = `${Number(row.price_paid_dkk).toString().replace('.', language === 'da' ? ',' : '.')} kr`;
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
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white font-bold leading-tight line-clamp-2">{title}</p>
                            <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                              <span className="text-gray-300">
                                {t.myPurchases.purchasedOn} {purchasedLabel}
                              </span>
                              <span className="text-gray-300 font-semibold">{priceLabel}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

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

            {/* Danger zone — permanent account deletion */}
            <div className="glass border border-red-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-bold text-red-400">{t.myProfile.settings.dangerTitle}</h3>
              </div>
              <p className="text-sm text-gray-400 mb-5">{t.myProfile.settings.dangerWarning}</p>
              <button
                onClick={() => { setDeletePassword(''); setDeleteMessage(''); setIsDeleteModalOpen(true); }}
                className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/40 text-red-300 font-bold py-3 px-5 rounded-lg hover:bg-red-500/20 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                {t.myProfile.settings.deleteAccountButton}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />

      {/* Delete-account confirmation modal — requires password re-entry */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-strong border border-red-500/30 rounded-2xl p-8 w-full max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-xl font-bold text-white">{t.myProfile.settings.deleteModalTitle}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5">{t.myProfile.settings.deleteModalBody}</p>

            <label className="text-sm font-medium text-gray-300 ml-1 block mb-2">{t.myProfile.settings.deletePasswordLabel}</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-red-400 transition-colors" />
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                maxLength={128}
                placeholder="••••••••"
                autoFocus
                className="w-full glass border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/30 transition-all"
              />
            </div>

            {deleteMessage && (
              <div className="mt-4 p-3 rounded-lg text-sm bg-red-500/20 border border-red-500/30 text-red-300">
                {deleteMessage}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 glass border border-white/20 text-white font-bold py-3 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {t.myProfile.settings.deleteCancelButton}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || !deletePassword}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? '...' : t.myProfile.settings.deleteConfirmButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
