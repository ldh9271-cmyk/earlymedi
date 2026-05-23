import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { expectEnv } from '@/lib/utils/assert';

/**
 * Server-side Supabase client for Server Components, Server Actions, and
 * Route Handlers. Cookies are read/written via Next's `cookies()` helper.
 */
export function createSupabaseServerClient() {
  const url = expectEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = expectEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string): string | undefined {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions): void {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component — silently ignore; middleware refreshes.
        }
      },
      remove(name: string, options: CookieOptions): void {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Called from a Server Component — silently ignore.
        }
      },
    },
  });
}

/**
 * Privileged service-role client. Use ONLY for server-side operations that
 * MUST bypass RLS (signup wizard org bootstrap, billing webhooks, audit log
 * inserts). Never expose to the browser.
 */
export function createSupabaseServiceClient() {
  const url = expectEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = expectEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createServerClient(url, serviceKey, {
    cookies: { get: () => undefined, set: () => {}, remove: () => {} },
  });
}
