/**
 * Admin.tsx — Protected admin dashboard for managing news articles.
 *
 * Only accessible to users with the 'admin' role. Shows an access-denied
 * screen for unauthenticated or non-admin users. Provides a form to
 * create/edit news articles (DA + EN) and a list of existing articles
 * with edit/delete actions.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Newspaper,
  ShieldAlert,
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
  Upload,
  ImageIcon,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase/client";
import type { Database } from "../types/database.types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuthModals } from "../hooks/useAuthModals";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";

type NewsRow = Database["public"]["Tables"]["news"]["Row"];

/** Shape of the news form fields */
interface NewsForm {
  title_da: string;
  title_en: string;
  body_da: string;
  body_en: string;
  published: boolean;
}

const emptyForm: NewsForm = {
  title_da: "",
  title_en: "",
  body_da: "",
  body_en: "",
  published: true,
};

export default function Admin() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin } = useAuthModals();

  const at = t.adminPage;

  // News list and form state
  const [news, setNews] = useState<NewsRow[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // Tracks the existing image URL when editing (so we can show it in the preview)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  /** Fetch all news articles (admins can see drafts too) */
  const fetchNews = async () => {
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNews(data as NewsRow[]);
    }
    setLoadingNews(false);
  };

  // Load news on mount when the user is an admin
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (!error && data) setNews(data as NewsRow[]);
        setLoadingNews(false);
      }
    };
    load();

    return () => { cancelled = true; };
  }, [isAdmin]);

  /** Show temporary feedback message */
  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  /** Helper to call a news edge function with auth */
  const callEdgeFunction = async (
    fnName: string,
    body: Record<string, unknown>
  ) => {
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    if (!freshSession) return { error: "Not authenticated", data: null };

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${freshSession.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json();
    if (!response.ok) {
      return { error: result.error ?? "Request failed", data: null };
    }
    return { error: null, data: result };
  };

  /** Upload an image file to the news-images storage bucket */
  const uploadNewsImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("news-images")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error("Image upload error:", uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("news-images")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  /** Handle file selection — generate a local preview */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  /** Remove the selected/existing image */
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
  };

  /** Create or update a news article */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Upload new image if one was selected
    let imageUrl: string | null = existingImageUrl;
    if (imageFile) {
      const uploaded = await uploadNewsImage(imageFile);
      if (uploaded) {
        imageUrl = uploaded;
      }
    }

    const payload = {
      title_da: form.title_da.trim(),
      title_en: form.title_en.trim(),
      body_da: form.body_da.trim(),
      body_en: form.body_en.trim(),
      image_url: imageUrl,
      published: form.published,
    };

    if (editingId) {
      // Update existing article
      const { error } = await callEdgeFunction("update-news", {
        id: editingId,
        ...payload,
      });
      if (!error) {
        showFeedback(at.updated);
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setImageFile(null);
        setImagePreview(null);
        setExistingImageUrl(null);
        fetchNews();
      }
    } else {
      // Create new article
      const { error } = await callEdgeFunction("create-news", payload);
      if (!error) {
        showFeedback(at.created);
        setShowForm(false);
        setForm(emptyForm);
        setImageFile(null);
        setImagePreview(null);
        setExistingImageUrl(null);
        fetchNews();
      }
    }

    setSaving(false);
  };

  /** Open edit form pre-filled with existing article data */
  const handleEdit = (article: NewsRow) => {
    setEditingId(article.id);
    setForm({
      title_da: article.title_da,
      title_en: article.title_en,
      body_da: article.body_da,
      body_en: article.body_en,
      published: article.published,
    });
    // Show the existing image in the preview area
    setExistingImageUrl(article.image_url);
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  /** Delete a news article after confirmation */
  const handleDelete = async (id: string) => {
    if (!window.confirm(at.confirmDelete)) return;

    const { error } = await callEdgeFunction("delete-news", { id });
    if (!error) {
      showFeedback(at.deleted);
      fetchNews();
    }
  };

  /** Cancel form and reset state */
  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
  };

  // Show loading spinner while auth state is resolving
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access denied screen for non-admin users
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
        <div className="pt-24 pb-16 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-12 text-center max-w-md">
            <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-3">{at.accessDenied}</h1>
            <p className="text-gray-400 mb-6">{at.accessDeniedText}</p>
            <button
              onClick={() => navigate("/")}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-all"
            >
              {at.goHome}
            </button>
          </div>
        </div>
        <Footer />
        <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
        <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
      </div>
    );
  }

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
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {at.newsSection}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
              {at.pageTitle}
            </h1>
            <p className="text-lg text-gray-400">{at.pageSubtitle}</p>
          </div>

          {/* Feedback toast */}
          {feedback && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-400">
              <Check className="w-5 h-5" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Create button */}
          {!showForm && (
            <button
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setShowForm(true);
              }}
              className="mb-8 flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              {at.createNews}
            </button>
          )}

          {/* News form (create/edit) */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="mb-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5"
            >
              <h2 className="text-xl font-bold text-white">
                {editingId ? at.editNews : at.createNews}
              </h2>

              {/* Title DA */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {at.titleDa}
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={form.title_da}
                  onChange={(e) => setForm({ ...form, title_da: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              {/* Title EN */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {at.titleEn}
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={form.title_en}
                  onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              {/* Body DA */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {at.bodyDa}
                </label>
                <textarea
                  required
                  maxLength={10000}
                  rows={6}
                  value={form.body_da}
                  onChange={(e) => setForm({ ...form, body_da: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
                />
              </div>

              {/* Body EN */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {at.bodyEn}
                </label>
                <textarea
                  required
                  maxLength={10000}
                  rows={6}
                  value={form.body_en}
                  onChange={(e) => setForm({ ...form, body_en: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {at.imageUrl}
                </label>

                {/* Show preview if there's a new file or an existing image */}
                {(imagePreview || existingImageUrl) ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 mb-3">
                    <img
                      src={imagePreview ?? existingImageUrl!}
                      alt="Preview"
                      className="w-full max-h-64 object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-500/80 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Drop zone / file picker */
                  <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 cursor-pointer hover:border-primary/30 hover:bg-white/[0.04] transition-all">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-medium text-gray-300">
                        {at.imageUrl}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP</p>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Allow replacing an existing image with a new file */}
                {(imagePreview || existingImageUrl) && (
                  <label className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 cursor-pointer transition-colors mt-1">
                    <ImageIcon className="w-4 h-4" />
                    <span>{editingId ? "Replace image" : "Change image"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Published toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50 accent-primary"
                />
                <span className="text-sm font-medium text-gray-300">{at.published}</span>
              </label>

              {/* Form action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {at.saving}
                    </>
                  ) : (
                    at.save
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 border border-white/10 text-gray-300 hover:text-white px-6 py-3 rounded-xl font-medium transition-all hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                  {at.cancel}
                </button>
              </div>
            </form>
          )}

          {/* News list */}
          {loadingNews ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : news.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
              <Newspaper className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">{at.noNewsYet}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {news.map((article) => (
                <div
                  key={article.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {article.title_da}
                        </h3>
                        {/* Published/draft badge */}
                        {article.published ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                            <Eye className="w-3 h-3" />
                            {at.published}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                            <EyeOff className="w-3 h-3" />
                            {at.draft}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(article.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                        {article.body_da.substring(0, 200)}
                        {article.body_da.length > 200 ? "..." : ""}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(article)}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        title={at.editNews}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                        title={at.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
