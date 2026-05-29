/**
 * Contact.tsx — Contact page with a message form and company info sidebar.
 *
 * Left column: a contact form (name, email, subject, message) — currently
 * client-side only with no backend submission wired up.
 * Right column: email, physical address, and social media links.
 * All labels come from i18n translations.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Send,
  CheckCircle,
  Facebook,
  Instagram,
  Youtube,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuthModals } from "../hooks/useAuthModals";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";

export default function Contact() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin } = useAuthModals();

  const ct = t.contactPage; // shorthand alias for contact page translations

  // Controlled form fields. `company` is a honeypot — hidden from real users;
  // bots that fill it get a fake-success response and no email is sent.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");

  // Submission lifecycle: idle → sending → success | error
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Maps an Edge Function error code to a friendly, translated message
  const messageForCode = (code?: string): string => {
    switch (code) {
      case "INVALID_EMAIL":
        return ct.invalidEmail;
      case "INVALID_INPUT":
        return ct.requiredFields;
      case "SPAM_DETECTED":
        return ct.spamDetected;
      default:
        return ct.errorMessage;
    }
  };

  // Submit the contact form to the public send-contact-message Edge Function.
  // Mirrors the anon-key/no-Authorization pattern used for fetch-podcast-feed.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Light client-side validation before hitting the network
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setStatus("error");
      setErrorMsg(ct.requiredFields);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus("error");
      setErrorMsg(ct.invalidEmail);
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contact-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ name, email, subject, message, company }),
        },
      );
      const result = await res.json();

      if (!res.ok || !result.success) {
        setStatus("error");
        setErrorMsg(messageForCode(result.code));
        return;
      }

      // Success — clear the fields so the form is ready for another message
      setStatus("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setStatus("error");
      setErrorMsg(ct.errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
              {ct.pageTitle}
            </h1>
            <p className="text-lg text-gray-400">{ct.pageSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
              <h2 className="text-lg font-bold text-white mb-6">
                {ct.formTitle}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
                      {ct.nameLabel}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                      placeholder={ct.namePlaceholder}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
                      {ct.emailLabel}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                      placeholder={ct.emailPlaceholder}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    {ct.subjectLabel}
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                    placeholder={ct.subjectPlaceholder}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    {ct.messageLabel}
                  </label>
                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm resize-none"
                    placeholder={ct.messagePlaceholder}
                  />
                </div>

                {/* Honeypot: hidden from humans; only bots fill it. Off-screen
                    rather than display:none so some bots still see it. */}
                <input
                  type="text"
                  name="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] w-px h-px opacity-0"
                />

                {/* Success / error feedback */}
                {status === "success" && (
                  <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{ct.successMessage}</span>
                  </div>
                )}
                {status === "error" && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-primary/30 hover:scale-[1.02]"
                >
                  <Send className="w-4 h-4" />
                  {status === "sending" ? ct.sending : ct.sendButton}
                </button>
              </form>
            </div>

            {/* Contact Info Sidebar */}
            <div className="lg:col-span-2 space-y-4">
              {/* Email */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {ct.info.emailTitle}
                  </h3>
                </div>
                <a
                  href="mailto:info@lassenmusik.com"
                  className="text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  info@lassenmusik.com
                </a>
              </div>

              {/* Address */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {ct.info.addressTitle}
                  </h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Kristian Lassen Musik ApS
                  <br />
                  Møllergade 42A
                  <br />
                  5700 Svendborg
                </p>
              </div>

              {/* Social Links */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="text-sm font-semibold text-white mb-4">
                  {ct.info.socialTitle}
                </h3>
                <div className="flex gap-3">
                  <a
                    href="https://www.facebook.com/lassenmusicacademy"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-primary/20 flex items-center justify-center text-gray-400 hover:text-primary transition-all"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a
                    href="https://www.instagram.com/lassenmusicacademy/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-primary/20 flex items-center justify-center text-gray-400 hover:text-primary transition-all"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a
                    href="https://www.youtube.com/@lassenmusicacademy"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="YouTube"
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-primary/20 flex items-center justify-center text-gray-400 hover:text-primary transition-all"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
    </div>
  );
}
