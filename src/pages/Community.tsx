/**
 * Community.tsx — Forum page for the music academy community.
 * Supports browsing, filtering, searching posts by category; creating,
 * editing, and deleting posts and comments via Supabase edge functions;
 * and a notification bell for comment replies on the user's posts.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  ChevronRight,
  Search,
  Music,
  Guitar,
  Piano,
  Mic2,
  BookOpen,
  Users,
  Plus,
  X,
  Pencil,
  Trash2,
  Loader2,
  Send,
  Bell,
  User,
  Check,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useAuthModals } from "../hooks/useAuthModals";
import { supabase } from "../supabase/client";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";

// Subset of profile fields joined onto posts/comments via Supabase relations
interface ProfileInfo {
  full_name: string;
  image_url: string | null;
}

// Shape returned by the forum_comments join (includes nested author profile)
interface ForumComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  profiles: ProfileInfo | null;
}

// Shape returned by the forum_posts query (includes nested comments and author)
interface ForumPost {
  id: string;
  user_id: string;
  category: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  profiles: ProfileInfo | null;
  forum_comments: ForumComment[];
}

// Shape for the notification dropdown; includes commenter info and post title
interface ForumNotification {
  id: string;
  user_id: string;
  post_id: string;
  comment_id: string;
  commenter_id: string;
  is_read: boolean;
  created_at: string;
  commenter: ProfileInfo | null;
  forum_posts: { title: string } | null;
}

// Number of posts fetched per page (keeps the forum query bounded as it grows)
const PAGE_SIZE = 20;

// Map each forum category to its Lucide icon for use in tags and filters
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  general: <Users className="w-4 h-4" />,
  guitar: <Guitar className="w-4 h-4" />,
  bass: <Music className="w-4 h-4" />,
  piano: <Piano className="w-4 h-4" />,
  vocals: <Mic2 className="w-4 h-4" />,
  theory: <BookOpen className="w-4 h-4" />,
};

// Extract up to 2 initials from a full name for avatar fallbacks
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Format a timestamp as a human-readable relative string (supports DA/EN)
function timeAgo(dateStr: string, language: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (language === "da") {
    if (minutes < 1) return "lige nu";
    if (minutes < 60) return `${minutes} min siden`;
    if (hours < 24) return `${hours} ${hours === 1 ? "time" : "timer"} siden`;
    return `${days} ${days === 1 ? "dag" : "dage"} siden`;
  }
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export default function Community() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const {
    isRegisterOpen,
    isLoginOpen,
    openRegister,
    closeRegister,
    openLogin,
    closeLogin,
  } = useAuthModals();

  // Filter and UI state
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedPost, setExpandedPost] = useState<string | null>(null); // which post is open
  const [searchQuery, setSearchQuery] = useState("");
  const [showMyPosts, setShowMyPosts] = useState(false); // "My Posts" filter toggle

  // Posts fetched from Supabase
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination: load posts in pages instead of fetching the entire forum at once.
  // This keeps the query bounded as the forum grows (avoids loading thousands of
  // posts + comments on every visit).
  const [page, setPage] = useState(0); // highest page index currently loaded
  const [hasMore, setHasMore] = useState(false); // true when more pages remain
  const [loadingMore, setLoadingMore] = useState(false); // spinner for "Load more"

  // New post form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [creating, setCreating] = useState(false);

  // Inline edit post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [savingPost, setSavingPost] = useState(false);

  // Comment input per post (keyed by post id) and submission tracking
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(
    null
  );

  // Inline edit comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // Tracks which post/comment is currently being deleted (shows spinner)
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null
  );

  // Notification bell dropdown state
  const [notifications, setNotifications] = useState<ForumNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null); // ref for outside-click detection

  const ct = t.communityPage;

  const categories = [
    { key: "all", label: ct.categories.all },
    { key: "general", label: ct.categories.general },
    { key: "guitar", label: ct.categories.guitar },
    { key: "bass", label: ct.categories.bass },
    { key: "piano", label: ct.categories.piano },
    { key: "vocals", label: ct.categories.vocals },
    { key: "theory", label: ct.categories.theory },
  ];

  // Fetch posts with nested comments and author profiles from Supabase, one page
  // at a time. Page argument is passed explicitly (not read from state) so this
  // callback stays stable and the mount effect doesn't loop on page changes.
  //   - "first":  load page 0 (initial load / refresh)
  //   - "more":   append the next page (Load more button)
  //   - "reload": refetch every page currently loaded (after a create/edit/delete,
  //               so the user keeps their place instead of snapping back to the top)
  // Comments are sorted oldest-first so each conversation reads chronologically.
  const fetchPosts = useCallback(
    async (mode: "first" | "more" | "reload", currentPage: number) => {
      if (mode === "more") setLoadingMore(true);

      // Compute the row range for this fetch based on the mode.
      let from: number;
      let to: number;
      let targetPage: number;
      if (mode === "more") {
        targetPage = currentPage + 1;
        from = targetPage * PAGE_SIZE;
        to = from + PAGE_SIZE - 1;
      } else if (mode === "reload") {
        targetPage = currentPage;
        from = 0;
        to = (currentPage + 1) * PAGE_SIZE - 1;
      } else {
        targetPage = 0;
        from = 0;
        to = PAGE_SIZE - 1;
      }

      const { data, error: fetchError } = await supabase
        .from("forum_posts")
        .select(
          "*, profiles(full_name, image_url), forum_comments(*, profiles(full_name, image_url))"
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (fetchError) {
        setError(ct.errorLoading);
      } else {
        const sorted = (data as unknown as ForumPost[]).map((post) => ({
          ...post,
          forum_comments: [...post.forum_comments].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          ),
        }));
        // Append for "more", replace for "first"/"reload".
        setPosts((prev) => (mode === "more" ? [...prev, ...sorted] : sorted));
        setPage(targetPage);
        // More pages remain only if this fetch filled the window it requested.
        const expected =
          mode === "reload" ? (currentPage + 1) * PAGE_SIZE : PAGE_SIZE;
        setHasMore(sorted.length === expected);
        setError("");
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [ct.errorLoading]
  );

  // Fetch the 20 most recent notifications for the current user.
  // Joins commenter profile and post title for display in the dropdown.
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("forum_notifications")
      .select(
        "*, commenter:profiles!forum_notifications_commenter_id_fkey(full_name, image_url), forum_posts(title)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data as unknown as ForumNotification[]);
    }
  }, [user]);

  /* eslint-disable react-hooks/set-state-in-effect -- data fetching on mount is a valid effect pattern */
  useEffect(() => {
    fetchPosts("first", 0);
  }, [fetchPosts]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Batch-update all unread notifications to read in Supabase
  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("forum_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // Mark a single notification as read, expand its post, and scroll into view
  const handleNotificationClick = async (notif: ForumNotification) => {
    // Mark as read
    if (!notif.is_read) {
      await supabase
        .from("forum_notifications")
        .update({ is_read: true })
        .eq("id", notif.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }

    // Expand the post
    setExpandedPost(notif.post_id);
    setShowNotifications(false);

    // Scroll to the post
    setTimeout(() => {
      const el = document.getElementById(`post-${notif.post_id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Derive unread count for the notification badge
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Maps error codes from edge functions to user-facing translated messages
  const getValidationError = (code?: string, fallback?: string): string => {
    switch (code) {
      case "TITLE_LENGTH": return ct.validationTitleLength;
      case "BODY_LENGTH": return ct.validationBodyLength;
      case "SPAM_DETECTED": return ct.validationSpam;
      case "RATE_LIMITED": return ct.validationRateLimited;
      default: return fallback || ct.errorLoading;
    }
  };

  // Calls a Supabase edge function with JWT auth and returns parsed result
  const callEdgeFunction = async (
    fnName: string,
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string; code?: string; data?: Record<string, unknown> }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      return { success: false, error: result.error, code: result.code };
    }
    return { success: true, data: result };
  };

  // Creates a new post via edge function (validates, sanitizes, rate-limits server-side)
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim() || !newBody.trim()) return;

    setCreating(true);
    setError("");
    const result = await callEdgeFunction("create-forum-post", {
      title: newTitle,
      body: newBody,
      category: newCategory,
    });

    if (result.success) {
      setNewTitle("");
      setNewBody("");
      setNewCategory("general");
      setShowCreateForm(false);
      await fetchPosts("reload", page);
    } else {
      setError(getValidationError(result.code, result.error));
    }
    setCreating(false);
  };

  // Updates an existing post via edge function (ownership verified server-side)
  const handleUpdatePost = async (postId: string) => {
    if (!editTitle.trim() || !editBody.trim()) return;

    setSavingPost(true);
    setError("");
    const result = await callEdgeFunction("update-forum-post", {
      post_id: postId,
      title: editTitle,
      body: editBody,
      category: editCategory,
    });

    if (result.success) {
      setEditingPostId(null);
      await fetchPosts("reload", page);
    } else {
      setError(getValidationError(result.code, result.error));
    }
    setSavingPost(false);
  };

  // Delete post via edge function (ownership verified server-side)
  const handleDeletePost = async (postId: string) => {
    if (!confirm(ct.confirmDeletePost)) return;

    setDeletingPostId(postId);
    const result = await callEdgeFunction("delete-forum-post", { post_id: postId });

    if (result.success) {
      setExpandedPost(null);
      await fetchPosts("reload", page);
    }
    setDeletingPostId(null);
  };

  // Creates a comment via edge function (also triggers notification for post author)
  const handleCreateComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!user || !text) return;

    setSubmittingComment(postId);
    setError("");
    const result = await callEdgeFunction("create-forum-comment", {
      post_id: postId,
      body: text,
    });

    if (result.success) {
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
      await fetchPosts("reload", page);
    } else {
      setError(getValidationError(result.code, result.error));
    }
    setSubmittingComment(null);
  };

  // Updates an existing comment via edge function (ownership verified server-side)
  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;

    setSavingComment(true);
    setError("");
    const result = await callEdgeFunction("update-forum-comment", {
      comment_id: commentId,
      body: editCommentText,
    });

    if (result.success) {
      setEditingCommentId(null);
      await fetchPosts("reload", page);
    } else {
      setError(getValidationError(result.code, result.error));
    }
    setSavingComment(false);
  };

  // Delete comment via edge function (ownership verified server-side)
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm(ct.confirmDeleteComment)) return;

    setDeletingCommentId(commentId);
    const result = await callEdgeFunction("delete-forum-comment", { comment_id: commentId });

    if (result.success) {
      await fetchPosts("reload", page);
    }
    setDeletingCommentId(null);
  };

  // Client-side filtering: combines "My Posts" toggle, category, and search query
  const filteredPosts = posts.filter((post) => {
    if (showMyPosts && user) {
      if (post.user_id !== user.id) return false;
    }
    const matchesCategory =
      activeCategory === "all" || post.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Page Header */}
          <div className="flex items-start justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 uppercase">
                {ct.pageTitle}
              </h1>
              <p className="text-lg text-gray-400">{ct.pageSubtitle}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Notifications Bell */}
              {user && (
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#1a2030] shadow-2xl z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <h3 className="text-sm font-semibold text-white">
                          {ct.notifications}
                        </h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            {ct.markAllRead}
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                              {ct.noNotifications}
                            </p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ${
                                !notif.is_read ? "bg-primary/5" : ""
                              }`}
                            >
                              <div className="flex gap-3">
                                {notif.commenter?.image_url ? (
                                  <img
                                    src={notif.commenter.image_url}
                                    alt={notif.commenter.full_name}
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                    {notif.commenter
                                      ? getInitials(notif.commenter.full_name)
                                      : "?"}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-300 leading-snug">
                                    <span className="font-semibold text-white">
                                      {notif.commenter?.full_name}
                                    </span>{" "}
                                    {ct.commentedOnYourPost}
                                  </p>
                                  <p className="text-xs text-primary/80 mt-0.5 truncate">
                                    {notif.forum_posts?.title}
                                  </p>
                                  <p className="text-[10px] text-gray-600 mt-1">
                                    {timeAgo(notif.created_at, language)}
                                  </p>
                                </div>
                                {!notif.is_read && (
                                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* New Post Button */}
              {user ? (
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors"
                >
                  {showCreateForm ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {showCreateForm ? ct.cancelEdit : ct.newPost}
                </button>
              ) : (
                <button
                  onClick={openLogin}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {ct.loginToPost}
                </button>
              )}
            </div>
          </div>

          {/* Create Post Form */}
          {showCreateForm && user && (
            <form
              onSubmit={handleCreatePost}
              className="mb-8 p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4"
            >
              <div className="flex gap-3">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                >
                  {categories
                    .filter((c) => c.key !== "all")
                    .map((cat) => (
                      <option
                        key={cat.key}
                        value={cat.key}
                        className="bg-[#1a2030]"
                      >
                        {cat.label}
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={ct.titlePlaceholder}
                  maxLength={200}
                  required
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder={ct.bodyPlaceholder}
                maxLength={5000}
                required
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim() || !newBody.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? ct.posting : ct.createPost}
                </button>
              </div>
            </form>
          )}

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ct.searchPlaceholder}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Categories + My Posts Toggle */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setShowMyPosts(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.key && !showMyPosts
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {cat.key !== "all" && CATEGORY_ICONS[cat.key]}
                {cat.label}
              </button>
            ))}

            {/* My Posts filter */}
            {user && (
              <button
                onClick={() => {
                  setShowMyPosts(!showMyPosts);
                  if (!showMyPosts) setActiveCategory("all");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  showMyPosts
                    ? "bg-accent text-white shadow-lg shadow-accent/30"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                <User className="w-4 h-4" />
                {ct.myPosts}
              </button>
            )}
          </div>

          {/* Loading / Error */}
          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">{ct.loadingPosts}</p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-16">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Post Count */}
              <p className="text-sm text-gray-500 mb-4">
                {filteredPosts.length === 1
                  ? ct.showingOne
                  : ct.showingResults.replace(
                      "{count}",
                      String(filteredPosts.length)
                    )}
              </p>

              {/* Posts */}
              <div className="space-y-4">
                {filteredPosts.map((post) => {
                  const isExpanded = expandedPost === post.id;
                  const isOwner = user?.id === post.user_id;
                  const isEditing = editingPostId === post.id;

                  return (
                    <div
                      key={post.id}
                      id={`post-${post.id}`}
                      className="rounded-2xl border border-white/10 hover:border-white/20 transition-all bg-white/[0.02]"
                    >
                      {/* Post Header */}
                      <button
                        onClick={() =>
                          setExpandedPost(isExpanded ? null : post.id)
                        }
                        className="w-full text-left p-5 sm:p-6"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          {post.profiles?.image_url ? (
                            <img
                              src={post.profiles.image_url}
                              alt={post.profiles?.full_name ?? ""}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {getInitials(post.profiles?.full_name ?? "?")}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {/* Category Tag */}
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 mb-2">
                              {CATEGORY_ICONS[post.category]}
                              {
                                categories.find(
                                  (c) => c.key === post.category
                                )?.label
                              }
                            </span>

                            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 leading-tight">
                              {post.title}
                            </h3>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span className="font-medium text-gray-400">
                                {post.profiles?.full_name ?? "?"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(post.created_at, language)}
                              </span>
                              {post.updated_at !== post.created_at && (
                                <span className="text-gray-600 italic">
                                  ({ct.edited})
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {post.forum_comments.length}
                              </span>
                              <ChevronRight
                                className={`w-4 h-4 ml-auto transition-transform ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-white/5">
                          {/* Edit Post Form */}
                          {isEditing ? (
                            <div className="mt-4 space-y-3">
                              <div className="flex gap-3">
                                <select
                                  value={editCategory}
                                  onChange={(e) =>
                                    setEditCategory(e.target.value)
                                  }
                                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-all"
                                >
                                  {categories
                                    .filter((c) => c.key !== "all")
                                    .map((cat) => (
                                      <option
                                        key={cat.key}
                                        value={cat.key}
                                        className="bg-[#1a2030]"
                                      >
                                        {cat.label}
                                      </option>
                                    ))}
                                </select>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  maxLength={200}
                                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-all"
                                />
                              </div>
                              <textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                maxLength={5000}
                                rows={4}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-all resize-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditingPostId(null)}
                                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition-colors"
                                >
                                  {ct.cancelEdit}
                                </button>
                                <button
                                  onClick={() => handleUpdatePost(post.id)}
                                  disabled={savingPost}
                                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                  {savingPost && (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  )}
                                  {savingPost ? ct.saving : ct.saveChanges}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Post Body */}
                              <p className="text-sm text-gray-300 mt-4 mb-4 leading-relaxed whitespace-pre-wrap">
                                {post.body}
                              </p>

                              {/* Owner Actions */}
                              {isOwner && (
                                <div className="flex gap-2 mb-6">
                                  <button
                                    onClick={() => {
                                      setEditingPostId(post.id);
                                      setEditTitle(post.title);
                                      setEditBody(post.body);
                                      setEditCategory(post.category);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    {ct.editPost}
                                  </button>
                                  <button
                                    onClick={() => handleDeletePost(post.id)}
                                    disabled={deletingPostId === post.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                  >
                                    {deletingPostId === post.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                    {ct.deletePost}
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {/* Comments */}
                          {post.forum_comments.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {ct.replies} ({post.forum_comments.length})
                              </h4>
                              {post.forum_comments.map((comment) => {
                                const isCommentOwner =
                                  user?.id === comment.user_id;
                                const isEditingComment =
                                  editingCommentId === comment.id;

                                return (
                                  <div
                                    key={comment.id}
                                    className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                                  >
                                    {comment.profiles?.image_url ? (
                                      <img
                                        src={comment.profiles.image_url}
                                        alt={comment.profiles?.full_name ?? ""}
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                        {getInitials(
                                          comment.profiles?.full_name ?? "?"
                                        )}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-white">
                                          {comment.profiles?.full_name ?? "?"}
                                        </span>
                                        <span className="text-[10px] text-gray-600">
                                          {timeAgo(
                                            comment.created_at,
                                            language
                                          )}
                                        </span>
                                        {comment.updated_at !==
                                          comment.created_at && (
                                          <span className="text-[10px] text-gray-600 italic">
                                            ({ct.edited})
                                          </span>
                                        )}
                                      </div>

                                      {isEditingComment ? (
                                        <div className="flex gap-2 mt-1">
                                          <input
                                            type="text"
                                            value={editCommentText}
                                            onChange={(e) =>
                                              setEditCommentText(e.target.value)
                                            }
                                            maxLength={2000}
                                            className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors"
                                          />
                                          <button
                                            onClick={() =>
                                              setEditingCommentId(null)
                                            }
                                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 transition-colors"
                                          >
                                            {ct.cancelEdit}
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleUpdateComment(comment.id)
                                            }
                                            disabled={savingComment}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium transition-colors disabled:opacity-50"
                                          >
                                            {savingComment && (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            )}
                                            {ct.saveComment}
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <p className="text-sm text-gray-400 leading-relaxed">
                                            {comment.body}
                                          </p>
                                          {isCommentOwner && (
                                            <div className="flex gap-2 mt-2">
                                              <button
                                                onClick={() => {
                                                  setEditingCommentId(
                                                    comment.id
                                                  );
                                                  setEditCommentText(
                                                    comment.body
                                                  );
                                                }}
                                                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-white transition-colors"
                                              >
                                                <Pencil className="w-3 h-3" />
                                                {ct.editComment}
                                              </button>
                                              <button
                                                onClick={() =>
                                                  handleDeleteComment(
                                                    comment.id
                                                  )
                                                }
                                                disabled={
                                                  deletingCommentId ===
                                                  comment.id
                                                }
                                                className="flex items-center gap-1 text-[11px] text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-50"
                                              >
                                                {deletingCommentId ===
                                                comment.id ? (
                                                  <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                  <Trash2 className="w-3 h-3" />
                                                )}
                                                {ct.deleteComment}
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Reply Input */}
                          <div className="mt-4 flex gap-3">
                            {user ? (
                              <>
                                <input
                                  type="text"
                                  value={commentText[post.id] || ""}
                                  onChange={(e) =>
                                    setCommentText((prev) => ({
                                      ...prev,
                                      [post.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleCreateComment(post.id);
                                    }
                                  }}
                                  placeholder={ct.replyPlaceholder}
                                  maxLength={2000}
                                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/40 transition-colors"
                                />
                                <button
                                  onClick={() => handleCreateComment(post.id)}
                                  disabled={
                                    submittingComment === post.id ||
                                    !commentText[post.id]?.trim()
                                  }
                                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  {submittingComment === post.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                  {ct.reply}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={openLogin}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-500 hover:text-white hover:bg-white/10 transition-colors text-center"
                              >
                                {ct.loginToComment}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Load more: fetches the next page of posts and appends them.
                  Shown whenever more pages remain on the server. */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => fetchPosts("more", page)}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loadingMore
                      ? ct.loadingPosts
                      : language === "da"
                        ? "Indlæs flere"
                        : "Load more"}
                  </button>
                </div>
              )}

              {filteredPosts.length === 0 && (
                <div className="text-center py-16">
                  <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500">{ct.noPosts}</p>
                </div>
              )}
            </>
          )}
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
