/**
 * Pricing.tsx — Subscription pricing page.
 *
 * Displays a single membership plan with launch introductory offer
 * (50% off the monthly price) and a 12-month commitment. Includes a
 * starter-pack banner and FAQ section. All copy is sourced from i18n
 * translations. /Trigger
 */

import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Star,
  ShoppingBag,
  Zap,
  ExternalLink,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuthModals } from "../hooks/useAuthModals";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";

export default function Pricing() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const {
    isRegisterOpen,
    isLoginOpen,
    openRegister,
    closeRegister,
    openLogin,
    closeLogin,
  } = useAuthModals();

  const pt = t.pricingPage;
  const plan = pt.plan;

  // Locale-aware price formatting — Danish uses comma as decimal separator
  const isDa = language === "da";
  const currency = "kr";

  // Format a numeric price with the right decimal separator and "kr" suffix.
  // Whole numbers display without decimals; fractional values keep two digits.
  const fmtPrice = (price: number) => {
    const hasDecimals = price % 1 !== 0;
    const formatted = hasDecimals
      ? price.toFixed(2).replace(".", isDa ? "," : ".")
      : price.toString();
    return `${formatted} ${currency}`;
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
              {pt.pageTitle}
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {pt.pageSubtitle}
            </p>
          </div>

          {/* Single Plan Card — centered */}
          <div className="flex justify-center mb-16">
            <div className="relative w-full max-w-md rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/15 via-accent/10 to-primary/5 p-6 sm:p-8 flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20">
              {/* Launch offer badge at top of card */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="flex items-center gap-1 text-xs font-bold text-white bg-primary px-4 py-1.5 rounded-full shadow-lg shadow-primary/30">
                  <Star className="w-3 h-3 fill-current" />
                  {pt.popular}
                </span>
              </div>

              {/* Plan Icon & Name */}
              <div className="flex items-center gap-3 mb-2 mt-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/20 text-primary">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              </div>

              {/* Tagline */}
              <p className="text-xs text-primary/80 font-medium italic mb-4">
                {plan.tagline}
              </p>

              {/* Price — show introductory price prominently with regular price struck through */}
              <div className="mb-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-4xl font-bold text-white">
                    {fmtPrice(plan.introMonthlyPrice)}
                  </span>
                  <span className="text-sm text-gray-500">{pt.perMonth}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600 line-through">
                    {fmtPrice(plan.monthlyPrice)} {pt.perMonth}
                  </span>
                  <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                    -50%
                  </span>
                </div>
              </div>

              {/* Plan description */}
              <p className="text-sm text-gray-400 mb-6 mt-4">
                {plan.description}
              </p>

              {/* Feature list */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Intro offer banner inside card */}
              <div className="mb-4 px-3 py-2 rounded-lg bg-green-400/10 border border-green-400/20 text-center">
                <span className="text-xs font-semibold text-green-400">
                  {pt.introOffer}
                </span>
              </div>

              {/* Primary CTA — opens the registration modal */}
              <button
                onClick={openRegister}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 hover:scale-[1.02]"
              >
                {plan.cta}
              </button>

              {/* Free trial reminder under CTA */}
              <p className="text-[11px] text-gray-600 text-center mt-3">
                {pt.trialNote}
              </p>
            </div>
          </div>

          {/* In-store member discount banner — 20% off selected items in Svendborg */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-6 sm:p-8 mb-12">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  {pt.storeDiscount.title}
                </h3>
                <p className="text-sm text-gray-400">
                  {pt.storeDiscount.description}
                </p>
              </div>
              <a
                href="https://www.lassenmusik.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold border border-primary/30 transition-colors"
              >
                {pt.storeDiscount.cta}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              {pt.faq.title}
            </h2>
            <div className="space-y-4">
              {pt.faq.items.map(
                (item: { q: string; a: string }, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
                  >
                    <h4 className="text-sm font-semibold text-white mb-2">
                      {item.q}
                    </h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={closeRegister}
        onSwitchToLogin={openLogin}
      />
      <LoginModal
        isOpen={isLoginOpen}
        onClose={closeLogin}
        onSwitchToRegister={openRegister}
      />
    </div>
  );
}
