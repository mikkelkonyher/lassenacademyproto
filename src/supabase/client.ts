/**
 * Supabase client singleton.
 * Reads connection credentials from Vite environment variables.
 * Falls back to placeholder values so the app can still render
 * in development without a live Supabase project (auth/db calls will fail gracefully).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Warn early if env vars are missing — helps diagnose blank-screen issues
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Authentication and database features will not work.');
}

// Placeholder values prevent createClient from throwing during import
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
