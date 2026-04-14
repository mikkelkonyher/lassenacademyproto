/**
 * News.tsx — Public news page (/nyheder).
 *
 * Fetches published news articles from Supabase and displays them
 * in a card layout. Titles and body text are shown in the active
 * language (DA/EN). Each card supports expand/collapse for long articles.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Newspaper,
  ChevronDown,
  ChevronUp,
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

/** Character limit before a "Read more" toggle is shown */
const BODY_PREVIEW_LENGTH = 400;

export default function News() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin } = useAuthModals();

  const nt = t.newsPage;

  const [articles, setArticles] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Tracks which article IDs have been expanded by the user
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  /** Toggle expand/collapse for a specific article */
  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
                const isLong = body.length > BODY_PREVIEW_LENGTH;
                const isExpanded = expanded.has(article.id);

                return (
                  <article
                    key={article.id}
                    className="mb-12 last:mb-0"
                  >
                    {/* Large hero image */}
                    {article.image_url && (
                      <img
                        src={article.image_url}
                        alt={getTitle(article)}
                        className="w-full aspect-[16/9] object-cover rounded-2xl mb-6"
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
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">
                      {getTitle(article)}
                    </h2>

                    {/* Body */}
                    <div className="text-gray-400 leading-relaxed whitespace-pre-line">
                      {isLong && !isExpanded
                        ? body.substring(0, BODY_PREVIEW_LENGTH) + "..."
                        : body}
                    </div>

                    {/* Read more / less */}
                    {isLong && (
                      <button
                        onClick={() => toggleExpanded(article.id)}
                        className="mt-4 flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            {nt.readLess}
                            <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            {nt.readMore}
                            <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}

                    {/* Divider between posts */}
                    <div className="mt-12 border-b border-white/10" />
                  </article>
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
