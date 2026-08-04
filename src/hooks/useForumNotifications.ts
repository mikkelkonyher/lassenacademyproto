/**
 * useForumNotifications — the notification bell's data and behaviour.
 *
 * Owns the dropdown's open/closed state plus the outside-click listener that
 * closes it, so the page only has to render the bell.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase/client";
import type { ForumNotification } from "../types/forum";
import type { User } from "@supabase/supabase-js";

export function useForumNotifications(
  user: User | null,
  onOpenPost: (postId: string) => void
) {
  const [notifications, setNotifications] = useState<ForumNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null); // ref for outside-click detection

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
    onOpenPost(notif.post_id);
    setShowNotifications(false);

    // Scroll to the post
    setTimeout(() => {
      const el = document.getElementById(`post-${notif.post_id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Derive unread count for the notification badge
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    showNotifications,
    setShowNotifications,
    notifRef,
    markAllRead,
    handleNotificationClick,
  };
}
