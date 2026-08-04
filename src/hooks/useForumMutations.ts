/**
 * useForumMutations — create/update/delete for forum posts and comments.
 *
 * Every mutation goes through an Edge Function rather than
 * `supabase.from().insert()`, because the functions sanitize input, detect spam
 * and enforce rate limits. Each handler returns `true` on success so the caller
 * can clear its own form fields; the shared reload is triggered here.
 */
import { useState } from "react";
import { callEdgeFunction } from "../utils/callEdgeFunction";
import type { translations } from "../translations";

type CommunityText = (typeof translations)["da"]["communityPage"];

type UseForumMutationsArgs = {
  ct: CommunityText;
  /** Refetch the posts currently on screen (keeps the user's scroll position). */
  reload: () => Promise<void>;
  setError: (message: string) => void;
};

export function useForumMutations({ ct, reload, setError }: UseForumMutationsArgs) {
  // In-flight flags — drive the spinners in the UI
  const [creating, setCreating] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [savingComment, setSavingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

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

  // Creates a new post via edge function (validates, sanitizes, rate-limits server-side)
  const createPost = async (title: string, body: string, category: string) => {
    setCreating(true);
    setError("");
    const result = await callEdgeFunction("create-forum-post", { title, body, category });

    if (result.success) {
      await reload();
    } else {
      setError(getValidationError(result.code, result.error));
    }
    setCreating(false);
    return result.success;
  };

  // Updates an existing post via edge function (ownership verified server-side)
  const updatePost = async (
    postId: string,
    title: string,
    body: string,
    category: string
  ) => {
    setSavingPost(true);
    setError("");
    const result = await callEdgeFunction("update-forum-post", {
      post_id: postId,
      title,
      body,
      category,
    });

    if (result.success) {
      await reload();
    } else {
      setError(getValidationError(result.code, result.error));
    }
    setSavingPost(false);
    return result.success;
  };

  // Delete post via edge function (ownership verified server-side)
  const deletePost = async (postId: string) => {
    if (!confirm(ct.confirmDeletePost)) return false;

    setDeletingPostId(postId);
    const result = await callEdgeFunction("delete-forum-post", { post_id: postId });

    if (result.success) {
      await reload();
    }
    setDeletingPostId(null);
    return result.success;
  };

  // Creates a comment via edge function (also triggers notification for post author)
  const createComment = async (postId: string, body: string) => {
    setSubmittingComment(postId);
    setError("");
    const result = await callEdgeFunction("create-forum-comment", {
      post_id: postId,
      body,
    });

    if (result.success) {
      await reload();
    } else {
      setError(getValidationError(result.code, result.error));
    }
    setSubmittingComment(null);
    return result.success;
  };

  // Updates an existing comment via edge function (ownership verified server-side)
  const updateComment = async (commentId: string, body: string) => {
    setSavingComment(true);
    setError("");
    const result = await callEdgeFunction("update-forum-comment", {
      comment_id: commentId,
      body,
    });

    if (result.success) {
      await reload();
    } else {
      setError(getValidationError(result.code, result.error));
    }
    setSavingComment(false);
    return result.success;
  };

  // Delete comment via edge function (ownership verified server-side)
  const deleteComment = async (commentId: string) => {
    if (!confirm(ct.confirmDeleteComment)) return false;

    setDeletingCommentId(commentId);
    const result = await callEdgeFunction("delete-forum-comment", { comment_id: commentId });

    if (result.success) {
      await reload();
    }
    setDeletingCommentId(null);
    return result.success;
  };

  return {
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
  };
}
