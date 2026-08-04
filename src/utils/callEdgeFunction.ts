/**
 * callEdgeFunction — POST to a Supabase Edge Function with the caller's JWT.
 *
 * Forum and news mutations deliberately do not go through
 * `supabase.from().insert()`: the Edge Functions sanitize input, detect spam and
 * enforce rate limits, and RLS alone cannot do that. This helper is the single
 * place that attaches the session token and normalises the response.
 *
 * The returned `code` matters — callers map it to translated validation messages
 * (see `getValidationError` in `useForumMutations`), so it must not be dropped.
 */
import { supabase } from "../supabase/client";

export type EdgeFunctionResult = {
  success: boolean;
  error?: string;
  code?: string;
  data?: Record<string, unknown>;
};

export async function callEdgeFunction(
  fnName: string,
  payload: Record<string, unknown>
): Promise<EdgeFunctionResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    return { success: false, error: result.error, code: result.code };
  }
  return { success: true, data: result };
}
