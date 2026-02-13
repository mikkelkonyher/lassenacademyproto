import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Star,
  ShoppingBag,
  Zap,
  Crown,
  Music,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";

export default function Pricing() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const openRegister = () => setIsRegisterOpen(true);
  const closeRegister = () => setIsRegisterOpen(false);

  const pt = t.pricingPage;

  const isDa = language === "da";
  const currency = isDa ? "kr" : "$";

  const subMonthly = isDa ? 149 : 20;
  const subYearly = isDa ? 119 : 16;
  const proMonthly = isDa ? 289 : 39;
  const proYearly = isDa ? 229 : 32;

  const plans = [
    {
      key: "free",
      name: pt.plans.free.name,
      price: 0,
      period: "",
      description: pt.plans.free.description,
      features: pt.plans.free.features,
      cta: pt.plans.free.cta,
      icon: <Music className="w-6 h-6" />,
      highlight: false,
      gradient: "from-white/5 to-white/[0.02]",
      border: "border-white/10",
    },
    {
      key: "monthly",
      name: pt.plans.monthly.name,
      price: billing === "monthly" ? subMonthly : subYearly,
      period: pt.perMonth,
      description: pt.plans.monthly.description,
      features: pt.plans.monthly.features,
      cta: pt.plans.monthly.cta,
      icon: <Zap className="w-6 h-6" />,
      highlight: true,
      gradient: "from-primary/15 via-accent/10 to-primary/5",
      border: "border-primary/40",
    },
    {
      key: "pro",
      name: pt.plans.pro.name,
      price: billing === "monthly" ? proMonthly : proYearly,
      period: pt.perMonth,
      description: pt.plans.pro.description,
      features: pt.plans.pro.features,
      cta: pt.plans.pro.cta,
      icon: <Crown className="w-6 h-6" />,
      highlight: false,
      gradient: "from-accent/10 via-primary/5 to-accent/[0.02]",
      border: "border-accent/30",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} />

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

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <span
                className={`text-sm font-medium ${
                  billing === "monthly" ? "text-white" : "text-gray-500"
                }`}
              >
                {pt.monthly}
              </span>
              <button
                onClick={() =>
                  setBilling(billing === "monthly" ? "yearly" : "monthly")
                }
                className="relative w-14 h-7 rounded-full bg-white/10 border border-white/20 transition-colors"
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-primary shadow-lg transition-all ${
                    billing === "yearly" ? "left-7" : "left-0.5"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium ${
                  billing === "yearly" ? "text-white" : "text-gray-500"
                }`}
              >
                {pt.yearly}
              </span>
              {billing === "yearly" && (
                <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full border border-green-400/20">
                  {pt.savePercent}
                </span>
              )}
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={`relative rounded-2xl border ${plan.border} bg-gradient-to-b ${plan.gradient} p-6 sm:p-8 flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl ${
                  plan.highlight ? "hover:shadow-primary/20" : "hover:shadow-white/5"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 text-xs font-bold text-white bg-primary px-4 py-1.5 rounded-full shadow-lg shadow-primary/30">
                      <Star className="w-3 h-3 fill-current" />
                      {pt.popular}
                    </span>
                  </div>
                )}

                {/* Plan Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.highlight
                        ? "bg-primary/20 text-primary"
                        : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {plan.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="mb-4">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-white">
                      {pt.free}
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">
                        {isDa
                          ? `${plan.price} ${currency}`
                          : `${currency}${plan.price}`}
                      </span>
                      <span className="text-sm text-gray-500">
                        {plan.period}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-400 mb-6">
                  {plan.description}
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          plan.highlight ? "text-primary" : "text-gray-500"
                        }`}
                      />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={openRegister}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 hover:scale-[1.02]"
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  }`}
                >
                  {plan.cta}
                </button>

                {/* Free trial note */}
                {plan.price > 0 && (
                  <p className="text-[11px] text-gray-600 text-center mt-3">
                    {pt.trialNote}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Store Discount Banner */}
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
                className="flex-shrink-0 px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold border border-primary/30 transition-colors"
              >
                {pt.storeDiscount.cta}
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
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} />
    </div>
  );
}
