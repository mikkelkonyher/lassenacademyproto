import { useState } from 'react';
import { Menu, X, Music, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  onOpenRegister: () => void;
}

export default function Navbar({ onOpenRegister }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, language, toggleLanguage } = useLanguage();

  return (
    <nav className="fixed w-full z-50 bg-black/70 backdrop-blur-md border-b border-white/20 relative">
      {/* Subtle colorful accent at top */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex-shrink-0 flex flex-col">
            <a href="#" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white leading-none hover:opacity-90 transition-opacity">
              <Music className="h-6 w-6 text-primary" />
              <span className="text-white/20 font-light mx-1">|</span>
              <span>Lassen Music Academy</span>
            </a>
            <a href="https://www.lassenmusik.com/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:text-primary/80 transition-colors mt-0.5 ml-[3.5rem] font-medium tracking-wide">
              {t.navbar.subtitle}
            </a>
          </div>
          
          {/* Center: Navigation Links */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-baseline space-x-4">
              <a href="#courses" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.courses}</a>
              <a href="#podcast" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.podcast}</a>
              <a href="#community" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.community}</a>
              <a href="#pricing" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.pricing}</a>
              <a href="#about" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.about}</a>
              <a href="#contact" className="text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5">{t.navbar.contact}</a>
            </div>
          </div>
          
          {/* Right: Action Buttons */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleLanguage}
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
              >
                <Globe className="w-4 h-4" />
                {language === 'da' ? 'EN' : 'DA'}
              </button>
              <button className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                {t.navbar.login}
              </button>
              <button 
                onClick={onOpenRegister}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/30 hover:scale-105"
              >
                {t.navbar.freeTrial}
              </button>
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

      {isOpen && (
        <div className="md:hidden bg-background border-b border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="#courses" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.courses}</a>
            <a href="#podcast" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.podcast}</a>
            <a href="#community" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.community}</a>
            <a href="#pricing" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.pricing}</a>
            <a href="#about" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.about}</a>
            <a href="#contact" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">{t.navbar.contact}</a>
            <div className="pt-4 border-t border-gray-700">
               <button className="w-full text-left text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                {t.navbar.login}
              </button>
              <button 
                onClick={onOpenRegister}
                className="w-full mt-2 bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
              >
                {t.navbar.freeTrial}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
