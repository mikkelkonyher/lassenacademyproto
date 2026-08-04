/**
 * PurchasesSection — grid of one-time-bought courses, with the purchase date
 * and the price actually paid (which can differ from the current price).
 */
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import type { PurchaseRow } from "../../types/profile";

interface PurchasesSectionProps {
  rows: PurchaseRow[];
  loading: boolean;
}

export default function PurchasesSection({ rows, loading }: PurchasesSectionProps) {
  const { t, language } = useLanguage();

  return (
    <div className="glass border border-white/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <ShoppingBag className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-white">{t.myPurchases.title}</h3>
      </div>

      {loading ? (
        // Loading State — show a spinner before deciding whether the user has purchases,
        // so we never flash the "no purchases yet" message while the fetch is in flight
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">{t.myPurchases.empty}</p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-lg shadow-lg shadow-primary/20 transition-all"
          >
            {t.myPurchases.browseCta}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map((row) => {
            const c = row.courses;
            if (!c) return null;
            const title = language === 'da' ? c.title_da : c.title_en || c.title_da;
            // Locale-aware purchase date formatting
            const purchasedLabel = new Date(row.purchased_at).toLocaleDateString(
              language === 'da' ? 'da-DK' : 'en-GB',
              { year: 'numeric', month: 'short', day: 'numeric' }
            );
            // Price snapshot at purchase time (could differ from current price)
            const priceLabel = `${Number(row.price_paid_dkk).toString().replace('.', language === 'da' ? ',' : '.')} kr`;
            return (
              <Link
                key={row.id}
                to={`/courses/${c.slug}`}
                className="relative rounded-xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all group"
              >
                <div className="aspect-video relative">
                  <img
                    src={c.image_url}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold leading-tight line-clamp-2">{title}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-300">
                        {t.myPurchases.purchasedOn} {purchasedLabel}
                      </span>
                      <span className="text-gray-300 font-semibold">{priceLabel}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
