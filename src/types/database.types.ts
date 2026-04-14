/**
 * database.types.ts — Auto-generated Supabase TypeScript types.
 * DO NOT edit manually. Regenerate with `supabase gen types typescript`
 * whenever the database schema changes. These types are used across the
 * app for type-safe queries against the profiles, forum_posts,
 * forum_comments, and forum_notifications tables.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      forum_posts: {
        Row: {
          id: string
          user_id: string
          category: 'general' | 'guitar' | 'bass' | 'piano' | 'vocals' | 'theory'
          title: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: 'general' | 'guitar' | 'bass' | 'piano' | 'vocals' | 'theory'
          title: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          category?: 'general' | 'guitar' | 'bass' | 'piano' | 'vocals' | 'theory'
          title?: string
          body?: string
        }
      }
      forum_notifications: {
        Row: {
          id: string
          user_id: string
          post_id: string
          comment_id: string
          commenter_id: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          comment_id: string
          commenter_id: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
      forum_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          body?: string
        }
      }
      news: {
        Row: {
          id: string
          author_id: string
          title_da: string
          title_en: string
          body_da: string
          body_en: string
          image_url: string | null
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          title_da: string
          title_en: string
          body_da: string
          body_en: string
          image_url?: string | null
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          title_da?: string
          title_en?: string
          body_da?: string
          body_en?: string
          image_url?: string | null
          published?: boolean
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          bio: string | null
          image_url: string | null
          instrument: string | null
          skill_level: 'beginner' | 'intermediate' | 'advanced'
          role: 'user' | 'admin'
          notify_email: boolean
          notify_course_updates: boolean
          notify_newsletter: boolean
          preferred_language: 'da' | 'en'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          email?: string
          bio?: string | null
          image_url?: string | null
          instrument?: string | null
          skill_level?: 'beginner' | 'intermediate' | 'advanced'
          role?: 'user' | 'admin'
          notify_email?: boolean
          notify_course_updates?: boolean
          notify_newsletter?: boolean
          preferred_language?: 'da' | 'en'
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          bio?: string | null
          image_url?: string | null
          instrument?: string | null
          skill_level?: 'beginner' | 'intermediate' | 'advanced'
          notify_email?: boolean
          notify_course_updates?: boolean
          notify_newsletter?: boolean
          preferred_language?: 'da' | 'en'
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
