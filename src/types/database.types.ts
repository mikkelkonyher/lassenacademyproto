/**
 * database.types.ts — Auto-generated Supabase TypeScript types.
 * DO NOT edit manually. Regenerate via the Supabase MCP
 * (mcp__supabase__generate_typescript_types) or `supabase gen types typescript`
 * whenever the schema changes.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      courses: {
        Row: {
          access_tier: string | null
          created_at: string | null
          description_da: string | null
          description_en: string | null
          id: string
          image_url: string
          includes_da: string[] | null
          includes_en: string[] | null
          instructor: string
          level_da: string
          level_en: string
          pdf_path: string | null
          price_dkk: number | null
          published: boolean | null
          slug: string
          sort_order: number | null
          tags: string[] | null
          title_da: string
          title_en: string
          updated_at: string | null
        }
        Insert: {
          access_tier?: string | null
          created_at?: string | null
          description_da?: string | null
          description_en?: string | null
          id?: string
          image_url: string
          includes_da?: string[] | null
          includes_en?: string[] | null
          instructor: string
          level_da: string
          level_en: string
          pdf_path?: string | null
          price_dkk?: number | null
          published?: boolean | null
          slug: string
          sort_order?: number | null
          tags?: string[] | null
          title_da: string
          title_en: string
          updated_at?: string | null
        }
        Update: {
          access_tier?: string | null
          created_at?: string | null
          description_da?: string | null
          description_en?: string | null
          id?: string
          image_url?: string
          includes_da?: string[] | null
          includes_en?: string[] | null
          instructor?: string
          level_da?: string
          level_en?: string
          pdf_path?: string | null
          price_dkk?: number | null
          published?: boolean | null
          slug?: string
          sort_order?: number | null
          tags?: string[] | null
          title_da?: string
          title_en?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_notifications: {
        Row: {
          comment_id: string
          commenter_id: string
          created_at: string
          id: string
          is_read: boolean
          post_id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          commenter_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          post_id: string
          user_id: string
        }
        Update: {
          comment_id?: string
          commenter_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_notifications_commenter_id_fkey"
            columns: ["commenter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_rate_limits: {
        Row: {
          action_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          aspect_ratio: string | null
          course_id: string
          created_at: string | null
          description_da: string | null
          description_en: string | null
          duration_seconds: number | null
          id: string
          is_free_preview: boolean
          mux_asset_id: string | null
          mux_playback_id: string | null
          mux_playback_policy: string | null
          published: boolean | null
          slug: string
          sort_order: number | null
          thumbnail_url: string | null
          title_da: string
          title_en: string
          updated_at: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          course_id: string
          created_at?: string | null
          description_da?: string | null
          description_en?: string | null
          duration_seconds?: number | null
          id?: string
          is_free_preview?: boolean
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_playback_policy?: string | null
          published?: boolean | null
          slug: string
          sort_order?: number | null
          thumbnail_url?: string | null
          title_da: string
          title_en: string
          updated_at?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          course_id?: string
          created_at?: string | null
          description_da?: string | null
          description_en?: string | null
          duration_seconds?: number | null
          id?: string
          is_free_preview?: boolean
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_playback_policy?: string | null
          published?: boolean | null
          slug?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          title_da?: string
          title_en?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_id: string
          body_da: string
          body_en: string
          created_at: string
          id: string
          image_url: string | null
          published: boolean
          title_da: string
          title_en: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body_da: string
          body_en: string
          created_at?: string
          id?: string
          image_url?: string | null
          published?: boolean
          title_da: string
          title_en: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body_da?: string
          body_en?: string
          created_at?: string
          id?: string
          image_url?: string | null
          published?: boolean
          title_da?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          image_url: string | null
          instrument: string | null
          notify_course_updates: boolean | null
          notify_email: boolean | null
          notify_newsletter: boolean | null
          preferred_language: string | null
          role: string
          skill_level: string | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id: string
          image_url?: string | null
          instrument?: string | null
          notify_course_updates?: boolean | null
          notify_email?: boolean | null
          notify_newsletter?: boolean | null
          preferred_language?: string | null
          role?: string
          skill_level?: string | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          image_url?: string | null
          instrument?: string | null
          notify_course_updates?: boolean | null
          notify_email?: boolean | null
          notify_newsletter?: boolean | null
          preferred_language?: string | null
          role?: string
          skill_level?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_course_purchases: {
        Row: {
          course_id: string
          id: string
          payment_provider: string
          payment_reference: string | null
          price_paid_dkk: number
          purchased_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          payment_provider: string
          payment_reference?: string | null
          price_paid_dkk: number
          purchased_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          payment_provider?: string
          payment_reference?: string | null
          price_paid_dkk?: number
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lesson_progress: {
        Row: {
          completed: boolean
          course_id: string
          created_at: string
          duration_seconds: number
          id: string
          lesson_id: string
          position_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          course_id: string
          created_at?: string
          duration_seconds?: number
          id?: string
          lesson_id: string
          position_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          course_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          lesson_id?: string
          position_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_watchlist: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          item_type: string
          lesson_id: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          item_type: string
          lesson_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          item_type?: string
          lesson_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watchlist_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watchlist_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
