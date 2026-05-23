import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { expectEnv } from '@/lib/utils/assert';

/**
 * Middleware-scope Supabase client. Required so that the Supabase session
 * cookie is refreshed on every request before the 5-step middleware reads it.
 */
export function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const url = expectEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = expectEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

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
