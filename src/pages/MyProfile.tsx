/**
 * MyProfile.tsx — Authenticated user's profile settings page.
 * Allows editing display name, bio, avatar, password, notification
 * preferences, and language. All mutations go through AuthContext helpers
 * that call Supabase under the hood.
 *
 * Data fetching and form logic live in the `useProfile*` / `usePasswordChange`
 * / `useDeleteAccount` hooks; each section renders from
 * `src/components/profile/`. What stays here is page layout and composition.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useAuthModals } from '../hooks/useAuthModals';
import { useProfilePurchases } from '../hooks/useProfilePurchases';
import { useProfileWatchlist } from '../hooks/useProfileWatchlist';
import { useContinueWatching } from '../hooks/useContinueWatching';
import { useProfileSettingsForm } from '../hooks/useProfileSettingsForm';
import { usePasswordChange } from '../hooks/usePasswordChange';
import { useDeleteAccount } from '../hooks/useDeleteAccount';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RegisterModal from '../components/RegisterModal';
import LoginModal from '../components/LoginModal';
import ProfileHeader from '../components/profile/ProfileHeader';
import ContinueWatchingCard from '../components/profile/ContinueWatchingCard';
import PurchasesSection from '../components/profile/PurchasesSection';
import WatchlistSection from '../components/profile/WatchlistSection';
import AccountSettingsCard from '../components/profile/AccountSettingsCard';
import PasswordCard from '../components/profile/PasswordCard';
import NotificationsCard from '../components/profile/NotificationsCard';
import LanguageCard from '../components/profile/LanguageCard';
import DangerZone from '../components/profile/DangerZone';
import DeleteAccountModal from '../components/profile/DeleteAccountModal';
import LoginRequired from '../components/profile/LoginRequired';

export default function MyProfile() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile, loading } = useAuth();
  const {
    isRegisterOpen,
    isLoginOpen,
    openRegister,
    closeRegister,
    openLogin,
    closeLogin,
  } = useAuthModals();

  // Page data
  const { purchaseRows, purchasesLoading } = useProfilePurchases(user);
  const { visibleCourseRows, watchlistIsEmpty } = useProfileWatchlist(user);
  const continueRow = useContinueWatching(user);

  // Forms
  const settings = useProfileSettingsForm();
  const password = usePasswordChange();
  const deletion = useDeleteAccount();

  // Redirect to login if not authenticated
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
        <LoginRequired onOpenLogin={openLogin} onOpenRegister={openRegister} />
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

          <ProfileHeader
            userId={user?.id}
            email={user?.email}
            fullName={profile?.full_name}
            bio={profile?.bio}
            imageUrl={profile?.image_url}
            createdAt={profile?.created_at}
            isUploadingPhoto={settings.isUploadingPhoto}
            onPhotoChange={settings.handlePhotoChange}
          />

          {/* Settings */}
          <div className="space-y-6">
            {/* Continue Watching — single most recently watched in-progress lesson */}
            {continueRow && <ContinueWatchingCard row={continueRow} />}

            <PurchasesSection rows={purchaseRows} loading={purchasesLoading} />

            <WatchlistSection
              rows={visibleCourseRows}
              isEmpty={watchlistIsEmpty}
              onRequireLogin={openLogin}
            />

            <AccountSettingsCard
              name={settings.settingsName}
              bio={settings.settingsBio}
              email={user?.email ?? ''}
              onNameChange={settings.setSettingsName}
              onBioChange={settings.setSettingsBio}
            />

            <PasswordCard
              currentPassword={password.currentPassword}
              newPassword={password.newPassword}
              confirmNewPassword={password.confirmNewPassword}
              isChangingPassword={password.isChangingPassword}
              message={password.passwordMessage}
              isError={password.passwordError}
              onCurrentChange={password.setCurrentPassword}
              onNewChange={password.setNewPassword}
              onConfirmChange={password.setConfirmNewPassword}
              onSubmit={password.handleChangePassword}
            />

            <NotificationsCard
              notifications={settings.notifications}
              onToggle={settings.toggleNotification}
            />

            <LanguageCard />

            {/* Save Button */}
            {settings.saveMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                settings.saveMessage.includes('!') ? 'bg-green-500/20 border border-green-500/30 text-green-300' : 'bg-red-500/20 border border-red-500/30 text-red-300'
              }`}>
                {settings.saveMessage}
              </div>
            )}
            <button
              onClick={settings.handleSaveSettings}
              disabled={settings.isSaving}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {settings.isSaving ? '...' : t.myProfile.settings.saveChanges}
            </button>

            <DangerZone onOpenDeleteModal={deletion.openDeleteModal} />
          </div>
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />

      {/* Delete-account confirmation modal — requires password re-entry */}
      {deletion.isDeleteModalOpen && (
        <DeleteAccountModal
          password={deletion.deletePassword}
          isDeleting={deletion.isDeleting}
          message={deletion.deleteMessage}
          onPasswordChange={deletion.setDeletePassword}
          onCancel={deletion.closeDeleteModal}
          onConfirm={deletion.handleDeleteAccount}
        />
      )}
    </div>
  );
}
