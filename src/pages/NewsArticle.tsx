/**
 * NewsArticle.tsx — Single news article page (/nyheder/:newsId).
 *
 * Fetches a single published news article by ID from Supabase and
 * displays the full content. Shareable via its unique URL.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Newspaper,
  Loader2,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuthModals } from "../hooks/useAuthModals";
import { supabase } from "../supabase/client";
import type { Database } from "../types/database.types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";

type NewsRow = Database["public"]["Tables"]["news"]["Row"];

export default function NewsArticle() {
  const { newsId } = useParams<{ newsId: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin } = useAuthModals();

  const nt = t.newsPage;

  const [article, setArticle] = useState<NewsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Fetch the article by ID on mount
  useEffect(() => {
    if (!newsId) return;

    const fetchArticle = async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("id", newsId)
        .eq("published", true)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setArticle(data as NewsRow);
      }
      setLoading(false);
    };

    fetchArticle();
  }, [newsId]);

  /** Get localized title */
  const title = article
    ? language === "da" ? article.title_da : article.title_en
    : "";

  /** Get localized body */
  const body = article
    ? language === "da" ? article.body_da : article.body_en
    : "";

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back to news listing */}
          <Link
            to="/nyheder"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{nt.backToNews}</span>
          </Link>

          {/* Loading state */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : notFound ? (
            /* Not found state */
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-16 text-center">
              <Newspaper className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-6">{nt.articleNotFound}</p>
              <button
                onClick={() => navigate("/nyheder")}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                {nt.backToNews}
              </button>
            </div>
          ) : article && (
            /* Full article */
            <article>
              {/* Hero image */}
              {article.image_url && (
                <img
                  src={article.image_url}
                  alt={title}
                  className="w-full aspect-[16/9] object-cover rounded-2xl mb-8"
                />
              )}

              {/* Date */}
              <p className="text-sm text-gray-500 mb-4">
                {new Date(article.created_at).toLocaleDateString(
                  language === "da" ? "da-DK" : "en-US",
                  { year: "numeric", month: "long", day: "numeric" }
                )}
              </p>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 leading-tight">
                {title}
              </h1>

              {/* Full body */}
              <div className="text-gray-300 leading-relaxed whitespace-pre-line text-lg">
                {body}
              </div>
            </article>
          )}
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
    </div>
  );
}
