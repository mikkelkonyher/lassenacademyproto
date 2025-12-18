import { Music, Facebook, Instagram, Youtube, Mail } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-background border-t border-white/5 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-1">
             <span className="flex items-center gap-2 font-bold text-xl tracking-tight text-white mb-4">
                <Music className="h-6 w-6 text-primary" />
                Lassen Music Academy
              </span>
              <p className="text-gray-400 text-sm mb-4">
                {t.footer.description}
              </p>
              <div className="text-xs text-gray-500 border-t border-white/10 pt-4">
                  {t.footer.partOf} <a href="https://www.lassenmusik.com/" target="_blank" rel="noreferrer" className="text-primary hover:text-white transition-colors">KRISTIAN LASSEN MUSIK APS</a>
              </div>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.explore}</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.links.startHere}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.links.allCourses}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.links.learningPaths}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.links.prices}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.community}</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.links.forum}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.links.events}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.links.showcase}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.links.support}</a></li>
            </ul>
          </div>
          <div>
             <h3 className="text-white font-semibold mb-4">{t.footer.contact}</h3>
             <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> kontakt@lassenacademy.dk</li>
                <li className="flex gap-4 mt-4">
                  <a href="#" className="text-gray-400 hover:text-white transition-colors"><Facebook className="h-5 w-5" /></a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors"><Instagram className="h-5 w-5" /></a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors"><Youtube className="h-5 w-5" /></a>
                </li>
             </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Lassen Music Academy. {t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
