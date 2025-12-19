import { Music, Facebook, Instagram, Youtube, Mail } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-background border-t border-white/10 pt-12 pb-8 relative">
      {/* Enhanced colorful gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
      
      {/* Subtle colorful glows */}
      <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-1">
             <span className="flex items-center gap-2 font-bold text-xl tracking-tight text-white mb-4">
                <Music className="h-6 w-6 text-primary" />
                Lassen Music Academy
              </span>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                {t.footer.description}
              </p>
              <div className="text-xs text-gray-400 border-t border-white/15 pt-4">
                  {t.footer.partOf} <a href="https://www.lassenmusik.com/" target="_blank" rel="noreferrer" className="text-primary hover:text-white transition-colors">KRISTIAN LASSEN MUSIK APS</a>
              </div>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.explore}</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li><a href="#" className="hover:text-primary transition-all hover:translate-x-1 inline-block">{t.footer.links.startHere}</a></li>
              <li><a href="#" className="hover:text-primary transition-all hover:translate-x-1 inline-block">{t.footer.links.allCourses}</a></li>
              <li><a href="#" className="hover:text-primary transition-all hover:translate-x-1 inline-block">{t.footer.links.learningPaths}</a></li>
              <li><a href="#" className="hover:text-primary transition-all hover:translate-x-1 inline-block">{t.footer.links.prices}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.community}</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li><a href="#" className="hover:text-primary transition-all hover:translate-x-1 inline-block">{t.footer.links.forum}</a></li>
              <li><a href="#" className="hover:text-primary transition-all hover:translate-x-1 inline-block">{t.footer.links.events}</a></li>
              <li><a href="#" className="hover:text-primary transition-all hover:translate-x-1 inline-block">{t.footer.links.showcase}</a></li>
              <li><a href="#" className="hover:text-primary transition-all hover:translate-x-1 inline-block">{t.footer.links.support}</a></li>
            </ul>
          </div>
          <div>
             <h3 className="text-white font-semibold mb-4">{t.footer.contact}</h3>
             <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary/70" /> kontakt@lassenacademy.dk</li>
                <li className="flex gap-4 mt-4">
                  <a href="#" className="text-gray-400 hover:text-primary transition-all hover:scale-110"><Facebook className="h-5 w-5" /></a>
                  <a href="#" className="text-gray-400 hover:text-primary transition-all hover:scale-110"><Instagram className="h-5 w-5" /></a>
                  <a href="#" className="text-gray-400 hover:text-primary transition-all hover:scale-110"><Youtube className="h-5 w-5" /></a>
                </li>
             </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Lassen Music Academy. {t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
