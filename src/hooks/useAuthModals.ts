/**
 * Shared hook for managing login/register modal visibility.
 * Ensures only one auth modal is open at a time by closing the other
 * before opening. Used by pages that need auth modals outside of App.tsx.
 */

import { useState } from 'react';

export function useAuthModals() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Close the opposite modal first to prevent both from being visible
  const openRegister = () => { setIsLoginOpen(false); setIsRegisterOpen(true); };
  const closeRegister = () => setIsRegisterOpen(false);
  const openLogin = () => { setIsRegisterOpen(false); setIsLoginOpen(true); };
  const closeLogin = () => setIsLoginOpen(false);

  return { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin };
}
