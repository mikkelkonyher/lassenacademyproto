import { useState } from 'react';

export function useAuthModals() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const openRegister = () => { setIsLoginOpen(false); setIsRegisterOpen(true); };
  const closeRegister = () => setIsRegisterOpen(false);
  const openLogin = () => { setIsRegisterOpen(false); setIsLoginOpen(true); };
  const closeLogin = () => setIsLoginOpen(false);

  return { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin };
}
