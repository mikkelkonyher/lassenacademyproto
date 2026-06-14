/**
 * Terms.tsx — Terms and Conditions page for Lassen Music Academy.
 * Renders all sections from i18n translations with a back button to navigate home.
 */

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";
import { useAuthModals } from "../hooks/useAuthModals";

export default function Terms() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin } = useAuthModals();

  const tp = t.termsPage;

  return (
    <>
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={() => { closeRegister(); openLogin(); }} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={() => { closeLogin(); openRegister(); }} />

      <div className="min-h-screen pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
            className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.auth.goBack}
          </button>

          {/* Page title and last updated */}
          <h1 className="text-4xl font-bold text-white mb-2 uppercase">{tp.title}</h1>
          <p className="text-gray-400 text-sm mb-10">{tp.lastUpdated}</p>

          {/* Terms sections */}
          <div className="space-y-8">
            {tp.sections.map((section, idx) => (
              <div key={idx}>
                <h2 className="text-xl font-semibold text-white mb-3">{section.heading}</h2>
                <p className="text-gray-300 leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
