import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Middleware-scope Supabase client. Required so that the Supabase session
 * cookie is refreshed on every request before the 5-step middleware reads it.
 *
 * Falls back to placeholders when Supabase env is missing so the page doesn't
 * 500 in demo deployments. `supabase.auth.getUser()` will simply return null.
 */
export function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'demo-placeholder-key';

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string): string | undefined {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions): void {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions): void {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  return { supabase, response: () => response };
}
