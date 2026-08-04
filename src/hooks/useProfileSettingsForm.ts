/**
 * useProfileSettingsForm — the editable name, bio and notification preferences,
 * plus the single save that persists them together with the chosen language.
 *
 * Also owns the avatar upload, since its only feedback channel is the same
 * `saveMessage` banner.
 */
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

export function useProfileSettingsForm() {
  const { t, language } = useLanguage();
  const { profile, updateProfile, uploadAvatar } = useAuth();

  // Local copies of notification prefs (initialized from profile)
  const [notifications, setNotifications] = useState(() => ({
    email: profile?.notify_email ?? true,
    courseUpdates: profile?.notify_course_updates ?? true,
    newsletter: profile?.notify_newsletter ?? false,
  }));

  // Editable settings fields (initialized from profile)
  const [settingsName, setSettingsName] = useState(() => profile?.full_name ?? "");
  const [settingsBio, setSettingsBio] = useState(() => profile?.bio ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Sync local form state when profile loads asynchronously (e.g. after auth resolves)
  const lastProfileId = useRef(profile?.id);
  /* eslint-disable react-hooks/set-state-in-effect -- syncing form state from async profile load */
  useEffect(() => {
    if (profile && profile.id !== lastProfileId.current) {
      lastProfileId.current = profile.id;
      setSettingsName(profile.full_name);
      setSettingsBio(profile.bio ?? "");
      setNotifications({
        email: profile.notify_email ?? false,
        courseUpdates: profile.notify_course_updates ?? false,
        newsletter: profile.notify_newsletter ?? false,
      });
    }
  }, [profile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist name, bio, notification prefs, and language to Supabase profiles table
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage("");
    const { error } = await updateProfile({
      full_name: settingsName,
      bio: settingsBio,
      notify_email: notifications.email,
      notify_course_updates: notifications.courseUpdates,
      notify_newsletter: notifications.newsletter,
      preferred_language: language,
    });
    setIsSaving(false);
    setSaveMessage(error ?? (language === "da" ? "Gemt!" : "Saved!"));
    if (!error) {
      setTimeout(() => setSaveMessage(""), 2000);
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
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const toggleNotification = (key: keyof typeof notifications) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  return {
    settingsName,
    setSettingsName,
    settingsBio,
    setSettingsBio,
    notifications,
    toggleNotification,
    isSaving,
    saveMessage,
    handleSaveSettings,
    isUploadingPhoto,
    handlePhotoChange,
  };
}
