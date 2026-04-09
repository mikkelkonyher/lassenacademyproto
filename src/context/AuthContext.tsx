/**
 * Authentication context provider and hook.
 * Wraps all Supabase auth operations (sign-up, sign-in, sign-out,
 * password change/reset) and profile management (fetch, update, avatar upload).
 * Listens to Supabase auth state changes so the UI stays in sync across tabs.
 */

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import type { Database } from '../types/database.types';

/** Row type for the public.profiles table, auto-generated from Supabase schema */
type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Database['public']['Tables']['profiles']['Update']) => Promise<{ error: string | null }>;
  uploadAvatar: (file: File) => Promise<{ error: string | null; url: string | null }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  resetPasswordRequest: (email: string) => Promise<{ error: string | null }>;
  resetPassword: (newPassword: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // True until the initial session check completes; prevents flash of unauthenticated UI
  const [loading, setLoading] = useState(true);

  /** Fetch the user's profile row from the profiles table */
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, bio, image_url, notify_email, notify_course_updates, notify_newsletter, created_at')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // On mount: restore any existing session, then subscribe to future auth changes
  useEffect(() => {
    // Check for an existing session (e.g. persisted in localStorage by Supabase)
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      }
      setLoading(false);
    });

    // Listen for sign-in, sign-out, token refresh, and password recovery events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      // Supabase fires PASSWORD_RECOVERY when the user clicks the reset link in their email
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /** Register a new user; full_name is stored in Supabase user metadata */
  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  /**
   * Update profile via a Supabase Edge Function (not the client SDK directly)
   * to allow server-side validation and avoid exposing RLS bypass logic.
   */
  const updateProfile = async (updates: Database['public']['Tables']['profiles']['Update']) => {
    // Get a fresh session to avoid using an expired token
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    if (!freshSession) return { error: 'Not authenticated' };

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-profile`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshSession.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(updates),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error ?? 'Update failed' };
    }

    setProfile(result.profile);
    return { error: null };
  };

  /** Upload an avatar image to Supabase Storage and update the profile with its public URL */
  const uploadAvatar = async (file: File): Promise<{ error: string | null; url: string | null }> => {
    if (!user) return { error: 'Not authenticated', url: null };

    const fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return { error: uploadError.message, url: null };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Add cache-busting param
    const url = `${publicUrl}?t=${Date.now()}`;

    // Update profile with new image URL
    const { error: updateError } = await updateProfile({ image_url: url });
    return { error: updateError, url };
  };

  /** Change password for an already-authenticated user (requires current password verification) */
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) return { error: 'Not authenticated' };

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return { error: verifyError.message };
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error: updateError?.message ?? null };
  };

  /** Send a password reset email with a link that redirects to /reset-password */
  const resetPasswordRequest = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  /** Set a new password after the user has followed the reset link (session comes from the link token) */
  const resetPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, updateProfile, uploadAvatar, changePassword, resetPasswordRequest, resetPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Convenience hook — throws if used outside AuthProvider to catch wiring mistakes early */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
