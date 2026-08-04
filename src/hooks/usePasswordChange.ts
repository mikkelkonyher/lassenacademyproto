/**
 * usePasswordChange — the three password fields, their client-side validation
 * and the Supabase Auth call (which re-checks the current password server-side).
 */
import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

export function usePasswordChange() {
  const { t } = useLanguage();
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // Validate and change password via Supabase Auth (requires current password)
  const handleChangePassword = async () => {
    setPasswordMessage("");
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
      const translatedError = error.includes("Invalid login credentials")
        ? t.myProfile.settings.wrongCurrentPassword
        : t.myProfile.settings.passwordChangeError;
      setPasswordMessage(translatedError);
      setPasswordError(true);
    } else {
      setPasswordMessage(t.myProfile.settings.passwordChanged);
      setPasswordError(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setPasswordMessage(""), 3000);
    }
  };

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    isChangingPassword,
    passwordMessage,
    passwordError,
    handleChangePassword,
  };
}
