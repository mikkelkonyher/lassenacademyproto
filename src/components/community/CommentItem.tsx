/**
 * CommentItem — a single reply inside an expanded post, with inline edit and
 * delete for the comment's own author.
 *
 * Edit state lives in the page, not here, so a half-typed edit is not lost when
 * the parent post is collapsed.
 */
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { getInitials, timeAgo } from "../../utils/timeAgo";
import type { ForumComment } from "../../types/forum";

interface CommentItemProps {
  comment: ForumComment;
  isOwner: boolean;
  isEditing: boolean;
  editText: string;
  saving: boolean;
  deleting: boolean;
  onEditTextChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export default function CommentItem({
  comment,
  isOwner,
  isEditing,
  editText,
  saving,
  deleting,
  onEditTextChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: CommentItemProps) {
  const { t, language } = useLanguage();
  const ct = t.communityPage;

  return (
    <div className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
      {comment.profiles?.image_url ? (
        <img
          src={comment.profiles.image_url}
          alt={comment.profiles?.full_name ?? ""}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
          {getInitials(comment.profiles?.full_name ?? "?")}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-white">
            {comment.profiles?.full_name ?? "?"}
          </span>
          <span className="text-[10px] text-gray-600">
            {timeAgo(comment.created_at, language)}
          </span>
          {comment.updated_at !== comment.created_at && (
            <span className="text-[10px] text-gray-600 italic">
              ({ct.edited})
            </span>
          )}
        </div>

        {/* The edit row wraps so the two buttons drop below the field on
            narrow screens instead of squeezing it out of the card */}
        {isEditing ? (
          <div className="flex flex-wrap gap-2 mt-1">
            <input
              type="text"
              value={editText}
              onChange={(e) => onEditTextChange(e.target.value)}
              maxLength={2000}
              className="flex-1 min-w-0 basis-full sm:basis-auto px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors"
            />
            <button
              onClick={onCancelEdit}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 transition-colors"
            >
              {ct.cancelEdit}
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {ct.saveComment}
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 leading-relaxed">
              {comment.body}
            </p>
            {isOwner && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onStartEdit}
                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-white transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  {ct.editComment}
                </button>
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 text-[11px] text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {deleting ? (
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
}
