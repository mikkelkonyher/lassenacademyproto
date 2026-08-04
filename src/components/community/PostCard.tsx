/**
 * PostCard — one forum post: the always-visible header, and when expanded the
 * body, owner actions, comment thread and reply box.
 *
 * All editing and draft state is owned by the Community page and passed down.
 * Keeping it there is deliberate: if this component held it, collapsing a post
 * would unmount the card and silently discard whatever the user was typing.
 */
import { MessageSquare, Clock, ChevronRight, Pencil, Trash2, Loader2, Send } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { getInitials, timeAgo } from "../../utils/timeAgo";
import { CATEGORY_ICONS, useCategories } from "./categories";
import CommentItem from "./CommentItem";
import type { ForumPost } from "../../types/forum";

interface PostCardProps {
  post: ForumPost;
  /** id of the signed-in user, or null when logged out */
  currentUserId: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;

  // Post editing (state owned by the page)
  isEditing: boolean;
  editTitle: string;
  editBody: string;
  editCategory: string;
  savingPost: boolean;
  deletingPost: boolean;
  onEditTitleChange: (value: string) => void;
  onEditBodyChange: (value: string) => void;
  onEditCategoryChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDeletePost: () => void;

  // Comment editing
  editingCommentId: string | null;
  editCommentText: string;
  savingComment: boolean;
  deletingCommentId: string | null;
  onEditCommentTextChange: (value: string) => void;
  onStartEditComment: (commentId: string, body: string) => void;
  onCancelEditComment: () => void;
  onSaveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;

  // Reply box
  commentDraft: string;
  submittingComment: boolean;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  onRequireLogin: () => void;
}

export default function PostCard({
  post,
  currentUserId,
  isExpanded,
  onToggleExpand,
  isEditing,
  editTitle,
  editBody,
  editCategory,
  savingPost,
  deletingPost,
  onEditTitleChange,
  onEditBodyChange,
  onEditCategoryChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeletePost,
  editingCommentId,
  editCommentText,
  savingComment,
  deletingCommentId,
  onEditCommentTextChange,
  onStartEditComment,
  onCancelEditComment,
  onSaveComment,
  onDeleteComment,
  commentDraft,
  submittingComment,
  onCommentDraftChange,
  onSubmitComment,
  onRequireLogin,
}: PostCardProps) {
  const { t, language } = useLanguage();
  const ct = t.communityPage;
  const categories = useCategories();
  const isOwner = currentUserId === post.user_id;

  return (
    <div
      id={`post-${post.id}`}
      className="rounded-2xl border border-white/10 hover:border-white/20 transition-all bg-white/[0.02]"
    >
      {/* Post Header */}
      <button onClick={onToggleExpand} className="w-full text-left p-5 sm:p-6">
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
              {categories.find((c) => c.key === post.category)?.label}
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
                <span className="text-gray-600 italic">({ct.edited})</span>
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
              {/* Stacks on mobile, same reason as the create form */}
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={editCategory}
                  onChange={(e) => onEditCategoryChange(e.target.value)}
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
                  onChange={(e) => onEditTitleChange(e.target.value)}
                  maxLength={200}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
              <textarea
                value={editBody}
                onChange={(e) => onEditBodyChange(e.target.value)}
                maxLength={5000}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-all resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={onCancelEdit}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition-colors"
                >
                  {ct.cancelEdit}
                </button>
                <button
                  onClick={onSaveEdit}
                  disabled={savingPost}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {savingPost && <Loader2 className="w-4 h-4 animate-spin" />}
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
                    onClick={onStartEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    {ct.editPost}
                  </button>
                  <button
                    onClick={onDeletePost}
                    disabled={deletingPost}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {deletingPost ? (
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
              {post.forum_comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isOwner={currentUserId === comment.user_id}
                  isEditing={editingCommentId === comment.id}
                  editText={editCommentText}
                  saving={savingComment}
                  deleting={deletingCommentId === comment.id}
                  onEditTextChange={onEditCommentTextChange}
                  onStartEdit={() => onStartEditComment(comment.id, comment.body)}
                  onCancelEdit={onCancelEditComment}
                  onSave={() => onSaveComment(comment.id)}
                  onDelete={() => onDeleteComment(comment.id)}
                />
              ))}
            </div>
          )}

          {/* Reply Input */}
          <div className="mt-4 flex gap-3">
            {currentUserId ? (
              <>
                <input
                  type="text"
                  value={commentDraft}
                  onChange={(e) => onCommentDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSubmitComment();
                    }
                  }}
                  placeholder={ct.replyPlaceholder}
                  maxLength={2000}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/40 transition-colors"
                />
                <button
                  onClick={onSubmitComment}
                  disabled={submittingComment || !commentDraft.trim()}
                  className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submittingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {ct.reply}
                </button>
              </>
            ) : (
              <button
                onClick={onRequireLogin}
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
}
