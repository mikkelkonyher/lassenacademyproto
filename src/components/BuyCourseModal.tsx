/**
 * BuyCourseModal.tsx
 *
 * One-time-purchase checkout modal. Today it runs in MOCK mode: clicking
 * "Pay" hits the `create-course-purchase` edge function, which simulates a
 * successful payment and writes a row to `user_course_purchases`. When
 * Stripe lands, only the edge function changes — this component stays.
 *
 * Behavior:
 *  - Idle → form state (price + benefits + Pay button)
 *  - Submitting → loading state on the button
 *  - Success → confirmation panel (close-only)
 *  - Error → inline error, retryable
 */

import { useState, useEffect } from 'react';
import { X, Check, ShieldAlert, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/client';
import { getCoursePricing } from '../utils/coursePricing';

interface BuyCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Minimal course shape — keeps callers free to pass whichever course type they have
  course: {
    id: string;
    title: string;
    price_dkk: number | null;
  } | null;
}

export default function BuyCourseModal({ isOpen, onClose, course }: BuyCourseModalProps) {
  const { t, language } = useLanguage();
  const { refreshPurchases } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state whenever the modal closes/reopens so it always
  // opens fresh (no stale success or error from a previous course).
  /* eslint-disable react-hooks/set-state-in-effect -- syncing local UI state to the open/closed prop */
  useEffect(() => {
    if (!isOpen) {
      setSubmitting(false);
      setSuccess(false);
      setError(null);
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOpen || !course) return null;

  const bm = t.buyCourseModal;
  // Apply the 2026 launch promo to the displayed price
  const pricing = getCoursePricing(course.price_dkk);
  const store = t.courseStore;

  // Locale-aware price formatting — Danish uses comma as decimal separator
  const isDa = language === 'da';
  const formatPrice = (price: number) => {
    const hasDecimals = price % 1 !== 0;
    const formatted = hasDecimals
      ? price.toFixed(2).replace('.', isDa ? ',' : '.')
      : price.toString();
    return `${formatted} kr`;
  };

  const handlePay = async () => {
    if (!course || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      // Pull a fresh session so we never send an expired token to the edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(bm.genericError);
        setSubmitting(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-course-purchase`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ course_id: course.id }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error ?? bm.genericError);
        setSubmitting(false);
        return;
      }

      // Refresh the user's purchase set so gating UI flips immediately
      await refreshPurchases();
      setSuccess(true);
      setSubmitting(false);
    } catch {
      setError(bm.genericError);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-md glass-strong border border-white/20 rounded-2xl p-8 shadow-[0_0_60px_rgba(251,146,60,0.3)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
          aria-label={bm.close}
        >
          <X className="w-6 h-6" />
        </button>

        {success ? (
          // --- Success state ---
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-green-500/20 border border-green-500/30">
                <Check className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{bm.successTitle}</h2>
            <p className="text-gray-300 text-base leading-relaxed mb-6">{bm.successBody}</p>
            <button
              onClick={onClose}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 transition-all cursor-pointer"
            >
              {bm.close}
            </button>
          </div>
        ) : (
          // --- Purchase form state ---
          <>
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/20 border border-primary/30">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{bm.title}</h2>
              <p className="text-gray-400 text-sm">{course.title}</p>
            </div>

            {/* Price — shows discounted total + struck-through original during the 2026 promo */}
            <div className="text-center mb-6">
              {pricing && pricing.discountActive ? (
                <>
                  <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
                    −{pricing.discountPercent}% · {store.promoBadge}
                  </div>
                  <div className="flex items-baseline justify-center gap-2.5">
                    <div className="text-4xl font-bold text-white">
                      {formatPrice(pricing.effectivePrice)}
                    </div>
                    <div className="text-lg font-medium text-gray-500 line-through">
                      {formatPrice(pricing.basePrice)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-4xl font-bold text-white">
                  {pricing ? formatPrice(pricing.basePrice) : '—'}
                </div>
              )}
            </div>

            {/* Benefits */}
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                {bm.youGet}
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{bm.benefit1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{bm.benefit2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{bm.benefit3}</span>
                </li>
              </ul>
            </div>

            {/* TEST mode notice — remove once Stripe is wired up */}
            <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">{bm.testModeNotice}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={submitting || course.price_dkk == null}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
            >
              {submitting ? bm.paying : bm.payButton}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
