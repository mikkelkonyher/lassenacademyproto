/**
 * News.tsx — Public news listing page (/nyheder).
 *
 * Fetches published news articles from Supabase and displays them
 * in a blog-style card layout. Each card links to the full article
 * at /nyheder/:newsId for reading and sharing.
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Newspaper,
  ArrowRight,
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

/** Character limit for the body preview on the listing page */
const BODY_PREVIEW_LENGTH = 250;

export default function News() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin } = useAuthModals();

  const nt = t.newsPage;

  const [articles, setArticles] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch published news on mount
  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setArticles(data as NewsRow[]);
      }
      setLoading(false);
    };

    fetchNews();
  }, []);

  /** Get the localized title for an article */
  const getTitle = (article: NewsRow) =>
    language === "da" ? article.title_da : article.title_en;

  /** Get the localized body for an article */
  const getBody = (article: NewsRow) =>
    language === "da" ? article.body_da : article.body_en;

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Page header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {nt.pageTitle}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
              {nt.pageTitle}
            </h1>
            <p className="text-lg text-gray-400">{nt.pageSubtitle}</p>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : articles.length === 0 ? (
            /* Empty state */
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-16 text-center">
              <Newspaper className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">{nt.noNews}</p>
            </div>
          ) : (
            /* News article cards */
            <div className="space-y-6">
              {articles.map((article) => {
                const body = getBody(article);
                const preview =
                  body.length > BODY_PREVIEW_LENGTH
                    ? body.substring(0, BODY_PREVIEW_LENGTH) + "..."
                    : body;

                return (
                  <Link
                    key={article.id}
                    to={`/nyheder/${article.id}`}
                    className="block group"
                  >
                    <article className="mb-12 last:mb-0">
                      {/* Hero image */}
                      {article.image_url && (
                        <img
                          src={article.image_url}
                          alt={getTitle(article)}
                          className="w-[28rem] max-w-full mx-auto aspect-square object-cover rounded-2xl mb-6 group-hover:opacity-90 transition-opacity block"
                        />
                      )}

                      {/* Date */}
                      <p className="text-sm text-gray-500 mb-3">
                        {new Date(article.created_at).toLocaleDateString(
                          language === "da" ? "da-DK" : "en-US",
                          { year: "numeric", month: "long", day: "numeric" }
                        )}
                      </p>

                      {/* Title */}
                      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight group-hover:text-primary transition-colors">
                        {getTitle(article)}
                      </h2>

                      {/* Body preview */}
                      <p className="text-gray-400 leading-relaxed">
                        {preview}
                      </p>

                      {/* Go to article link */}
                      <span className="mt-4 inline-flex items-center gap-1.5 text-primary group-hover:text-primary/80 text-sm font-medium transition-colors">
                        {nt.goToArticle}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>

                      {/* Divider between posts */}
                      <div className="mt-12 border-b border-white/10" />
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
    </div>
  );
}
