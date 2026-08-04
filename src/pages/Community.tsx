/**
 * Community.tsx — Forum page for the music academy community.
 * Supports browsing, filtering, searching posts by category; creating,
 * editing, and deleting posts and comments via Supabase edge functions;
 * and a notification bell for comment replies on the user's posts.
 *
 * Data and mutations live in `useForumPosts` / `useForumNotifications` /
 * `useForumMutations`; the sections render from `src/components/community/`.
 * What stays here is layout, filtering, and the form/draft state that has to
 * outlive a collapsed post (see PostCard for why).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Search, Plus, X, Loader2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useAuthModals } from "../hooks/useAuthModals";
import { useForumPosts } from "../hooks/useForumPosts";
import { useForumNotifications } from "../hooks/useForumNotifications";
import { useForumMutations } from "../hooks/useForumMutations";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";
import NotificationBell from "../components/community/NotificationBell";
import CreatePostForm from "../components/community/CreatePostForm";
import CategoryFilter from "../components/community/CategoryFilter";
import PostCard from "../components/community/PostCard";

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

  const ct = t.communityPage;

  // Posts, pagination and loading state (see useForumPosts for the paging rules)
  const {
    posts,
    loading,
    error,
    setError,
    page,
    hasMore,
    loadingMore,
    fetchPosts,
  } = useForumPosts(ct.errorLoading);

  // New post form state. Held here rather than inside CreatePostForm so a draft
  // survives closing and reopening the form.
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  // Inline edit post state. Kept at page level for the same reason: collapsing a
  // post must not throw away what the user was typing.
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCategory, setEditCategory] = useState("general");

  // Comment draft per post (keyed by post id)
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  // Inline edit comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  // Mutations + their in-flight flags. `reload` refetches the pages already on
  // screen so the user keeps their place after a create/edit/delete.
  const {
    creating,
    savingPost,
    deletingPostId,
    submittingComment,
    savingComment,
    deletingCommentId,
    createPost,
    updatePost,
    deletePost,
    createComment,
    updateComment,
    deleteComment,
  } = useForumMutations({
    ct,
    reload: () => fetchPosts("reload", page),
    setError,
  });

  // Notification bell — data, dropdown state and outside-click handling
  const {
    notifications,
    unreadCount,
    showNotifications,
    setShowNotifications,
    notifRef,
    markAllRead,
    handleNotificationClick,
  } = useForumNotifications(user, setExpandedPost);

  // Form submit wrappers — the hooks own the request and its in-flight flag;
  // these guard on empty input and clear the local form fields on success.
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim() || !newBody.trim()) return;

    if (await createPost(newTitle, newBody, newCategory)) {
      setNewTitle("");
      setNewBody("");
      setNewCategory("general");
      setShowCreateForm(false);
    }
  };

  const handleUpdatePost = async (postId: string) => {
    if (!editTitle.trim() || !editBody.trim()) return;
    if (await updatePost(postId, editTitle, editBody, editCategory)) {
      setEditingPostId(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (await deletePost(postId)) setExpandedPost(null);
  };

  const handleCreateComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!user || !text) return;
    if (await createComment(postId, text)) {
      setCommentText((prev) => ({ ...prev, [postId]: "" }));
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    if (await updateComment(commentId, editCommentText)) {
      setEditingCommentId(null);
    }
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

          {/* Page Header — stacks on mobile so the action buttons never get
              pushed off the right edge by the large uppercase title. */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 uppercase">
                {ct.pageTitle}
              </h1>
              <p className="text-lg text-gray-400">{ct.pageSubtitle}</p>
            </div>
            {/* On mobile the bell is ordered last so it sits flush against the
                right edge — its dropdown is anchored right-0 and would spill off
                the left of the screen from any other position. */}
            <div className="flex items-center justify-end gap-3 sm:flex-shrink-0">
              {/* Notifications Bell */}
              {user && (
                <NotificationBell
                  className="order-2 sm:order-1"
                  notifications={notifications}
                  unreadCount={unreadCount}
                  showNotifications={showNotifications}
                  onToggle={() => setShowNotifications(!showNotifications)}
                  onNotificationClick={handleNotificationClick}
                  onMarkAllRead={markAllRead}
                  notifRef={notifRef}
                />
              )}

              {/* New Post Button */}
              {user ? (
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="order-1 sm:order-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors"
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
                  className="order-1 sm:order-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {ct.loginToPost}
                </button>
              )}
            </div>
          </div>

          {/* Create Post Form */}
          {showCreateForm && user && (
            <CreatePostForm
              title={newTitle}
              body={newBody}
              category={newCategory}
              creating={creating}
              onTitleChange={setNewTitle}
              onBodyChange={setNewBody}
              onCategoryChange={setNewCategory}
              onSubmit={handleCreatePost}
            />
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
          <CategoryFilter
            activeCategory={activeCategory}
            showMyPosts={showMyPosts}
            isLoggedIn={!!user}
            onSelectCategory={(key) => {
              setActiveCategory(key);
              setShowMyPosts(false);
            }}
            onToggleMyPosts={() => {
              setShowMyPosts(!showMyPosts);
              if (!showMyPosts) setActiveCategory("all");
            }}
          />

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
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id ?? null}
                    isExpanded={expandedPost === post.id}
                    onToggleExpand={() =>
                      setExpandedPost(expandedPost === post.id ? null : post.id)
                    }
                    isEditing={editingPostId === post.id}
                    editTitle={editTitle}
                    editBody={editBody}
                    editCategory={editCategory}
                    savingPost={savingPost}
                    deletingPost={deletingPostId === post.id}
                    onEditTitleChange={setEditTitle}
                    onEditBodyChange={setEditBody}
                    onEditCategoryChange={setEditCategory}
                    onStartEdit={() => {
                      setEditingPostId(post.id);
                      setEditTitle(post.title);
                      setEditBody(post.body);
                      setEditCategory(post.category);
                    }}
                    onCancelEdit={() => setEditingPostId(null)}
                    onSaveEdit={() => handleUpdatePost(post.id)}
                    onDeletePost={() => handleDeletePost(post.id)}
                    editingCommentId={editingCommentId}
                    editCommentText={editCommentText}
                    savingComment={savingComment}
                    deletingCommentId={deletingCommentId}
                    onEditCommentTextChange={setEditCommentText}
                    onStartEditComment={(commentId, body) => {
                      setEditingCommentId(commentId);
                      setEditCommentText(body);
                    }}
                    onCancelEditComment={() => setEditingCommentId(null)}
                    onSaveComment={handleUpdateComment}
                    onDeleteComment={deleteComment}
                    commentDraft={commentText[post.id] || ""}
                    submittingComment={submittingComment === post.id}
                    onCommentDraftChange={(value) =>
                      setCommentText((prev) => ({ ...prev, [post.id]: value }))
                    }
                    onSubmitComment={() => handleCreateComment(post.id)}
                    onRequireLogin={openLogin}
                  />
                ))}
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
