/**
 * Shared types for the community forum — posts, comments and notifications
 * as they come back from Supabase with their nested relations.
 */

// Subset of profile fields joined onto posts/comments via Supabase relations
export interface ProfileInfo {
  full_name: string;
  image_url: string | null;
}

// Shape returned by the forum_comments join (includes nested author profile)
export interface ForumComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  profiles: ProfileInfo | null;
}

// Shape returned by the forum_posts query (includes nested comments and author)
export interface ForumPost {
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
export interface ForumNotification {
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
