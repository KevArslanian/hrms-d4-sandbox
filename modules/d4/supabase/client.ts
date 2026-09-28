"use client";

import { createBrowserClient } from "@supabase/ssr";

export function hasSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && publishableKey);
}

// Both values are public browser configuration. Access to records is enforced by RLS.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ufjbbwqaztgkqmpdmcyv.supabase.co";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_0GFbshHOM6k80Wxde_iZVQ_v6DpVj1D";

export function createD4BrowserClient() {
  return createBrowserClient(supabaseUrl, publishableKey);
}
