/**
 * useProfilePurchases — the user's bought courses with embedded course info,
 * so the profile can render rich cards. RLS scopes the result to this user.
 */
import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import type { PurchaseRow } from "../types/profile";
import type { User } from "@supabase/supabase-js";

export function useProfilePurchases(user: User | null) {
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([]);
  // True until the fetch settles; gates the spinner so we don't flash the
  // "no purchases yet" empty state before the user's courses have loaded
  const [purchasesLoading, setPurchasesLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect -- syncing fetched data + clearing on logout */
  useEffect(() => {
    if (!user) {
      setPurchaseRows([]);
      setPurchasesLoading(false);
      return;
    }
    let cancelled = false;
    setPurchasesLoading(true);
    supabase
      .from("user_course_purchases")
      .select(
        "id, purchased_at, price_paid_dkk, courses(id, slug, title_da, title_en, image_url, instructor)"
      )
      .order("purchased_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setPurchaseRows(data as unknown as PurchaseRow[]);
        // Clear the loading flag once the request settles (success or empty)
        setPurchasesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { purchaseRows, purchasesLoading };
}
