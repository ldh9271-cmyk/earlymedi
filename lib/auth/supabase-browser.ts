'use client';

import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns the Supabase browser client, or `null` if env is not configured.
 * Callers must handle the null case and show a friendly "demo mode" message
 * instead of crashing the page.
 */
export function createSupabaseBrowserClient(): ReturnType<typeof createBrowserClient> | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes('placeholder') || anonKey.includes('dummy')) {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        '[supabase] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY missing or placeholder. Auth is disabled — demo mode.',
      );
    }
    return null;
  }
  _client = createBrowserClient(url, anonKey, {
    auth: {
      // Use implicit flow (hash tokens) instead of PKCE for magic links so
      // that Gmail/Outlook link-preview scanners can't invalidate the OTP
      // by pre-fetching it, and the link works across browsers/devices.
      // Trade-off: slightly less secure than PKCE, but standard for magic
      // links and acceptable for our use case.
      flowType: 'implicit',
    },
  });
  return _client;
}

/** True when Supabase auth is actually wired up (env present + not placeholder). */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && anonKey && !url.includes('placeholder') && !anonKey.includes('dummy'));
}
