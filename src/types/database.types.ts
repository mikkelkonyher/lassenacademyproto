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
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          bio: string | null
          image_url: string | null
          instrument: string | null
          skill_level: 'beginner' | 'intermediate' | 'advanced'
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
