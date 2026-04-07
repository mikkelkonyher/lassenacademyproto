/**
 * Navbar.tsx
 * Fixed top navigation bar for the site. Handles desktop and mobile layouts,
 * DA/EN language toggle, and auth-aware rendering (login/register vs profile/logout).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Globe, User, LogOut, Music } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
}

export default function Navbar({ onOpenRegister, onOpenLogin }: NavbarProps) {
  // Controls the mobile hamburger menu open/close state
  const [isOpen, setIsOpen] = useState(false);
  const { t, language, toggleLanguage } = useLanguage();
  // Auth state determines which action buttons to show (login/register vs profile/logout)
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-white/10" style={{ position: 'fixed' }}>
      {/* Subtle colorful accent at top */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left: Logo with eighth-note icons and orange divider */}
          <div className="flex-shrink-0">
            <Link to="/" className="group flex items-center gap-0 leading-none hover:opacity-90 transition-opacity">
              {/* Eighth-note icon */}
              <Music className="w-8 h-8 text-primary" />
              {/* Orange vertical divider */}
              <div className="w-0.5 h-10 bg-primary mx-3 rounded-full" />
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-[0.2em] uppercase text-white leading-none">
                  Lassen
                </span>
                <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-primary leading-none mt-1.5">
                  Music Academy ApS
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Navigation Links */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="flex items-baseline space-x-1 lg:space-x-3">
              <Link to="/courses" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.courses}</Link>
              <Link to="/podcast" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.podcast}</Link>
              <Link to="/community" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.community}</Link>
              <Link to="/pricing" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.pricing}</Link>
              <Link to="/about" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.about}</Link>
              <Link to="/contact" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.contact}</Link>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                title={t.navbar.switchLanguageTooltip}
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                {language === 'da' ? 'EN' : 'DA'}
              </button>

              {/* Conditionally render profile/logout for authenticated users, or login/register for guests */}
              {user ? (
                <>
                  <Link
                    to="/profile"
                    title={t.navbar.profileTooltip}
                    className="text-gray-300 hover:text-white p-2 rounded-full transition-colors hover:bg-white/10"
                  >
                    <User className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={signOut}
                    title={t.navbar.logoutTooltip}
                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    {t.auth.logOut}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onOpenLogin}
                    title={t.navbar.loginTooltip}
                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                  >
                    {t.navbar.login}
                  </button>
                  <button
                    onClick={onOpenRegister}
                    title={t.navbar.freeTrialTooltip}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/30 hover:scale-105 cursor-pointer"
                  >
                    {t.navbar.freeTrial}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex md:hidden gap-2">
            <button
                onClick={toggleLanguage}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
              >
                <span className="text-xs font-bold">{language === 'da' ? 'EN' : 'DA'}</span>
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu — only rendered when hamburger is toggled open */}
      {isOpen && (
        <div className="md:hidden bg-background border-b border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/courses" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.courses}</Link>
            <Link to="/podcast" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.podcast}</Link>
            <Link to="/community" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.community}</Link>
            <Link to="/pricing" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.pricing}</Link>
            <Link to="/about" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.about}</Link>
            <Link to="/contact" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.contact}</Link>
            <div className="pt-4 border-t border-gray-700">
              {user ? (
                <>
                  <Link to="/profile" className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">
                    <User className="w-5 h-5" />
                    {t.myProfile.pageTitle}
                  </Link>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 w-full text-left text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium"
                  >
                    <LogOut className="w-5 h-5" />
                    {t.auth.logOut}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onOpenLogin}
                    className="w-full text-left text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                  >
                    {t.navbar.login}
                  </button>
                  <button
                    onClick={onOpenRegister}
                    className="w-full mt-2 bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
                  >
                    {t.navbar.freeTrial}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
