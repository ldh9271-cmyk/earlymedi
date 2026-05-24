'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';

export const dynamic = 'force-dynamic';

/**
 * Client-side landing page for Supabase implicit-flow magic links.
 *
 * Implicit flow returns access/refresh tokens as a URL hash fragment
 * (#access_token=...&refresh_token=...). The fragment is browser-only
 * (never sent to the server), so we must process it client-side:
 *
 * 1. supabase-js auto-detects the hash on first call and writes session
 *    cookies via the @supabase/ssr cookie adapter.
 * 2. We wait for `getSession()` to resolve, then router.push to /select-org
 *    (or wherever `?next=` says).
 * 3. The destination is server-rendered, so by then the cookies are set
 *    and the server-side supabase client can read the user.
 *
 * The inner component uses useSearchParams(), which Next.js requires to be
 * inside a Suspense boundary during prerender — hence the outer wrapper.
 */
export default function AuthLandingPage(): JSX.Element {
  return (
    <Suspense fallback={<LoadingState message="로그인 처리 중…" />}>
      <AuthLandingInner />
    </Suspense>
  );
}

function AuthLandingInner(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>('로그인 처리 중…');

  useEffect(() => {
    const next = searchParams.get('next') ?? '/select-org';

    // If we somehow landed here with a PKCE ?code= (legacy email links still
    // pointing at /auth/landing), forward to the Route Handler so cookies
    // get written. Don't try to exchange client-side.
    const code = searchParams.get('code');
    if (code) {
      const cb = new URL('/api/auth/callback', window.location.origin);
      cb.searchParams.set('code', code);
      cb.searchParams.set('next', next);
      window.location.replace(cb.toString());
      return;
    }

    // If the URL hash carries an error from Supabase, show it and bail to /login.
    if (typeof window !== 'undefined' && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const hashError = params.get('error_description') ?? params.get('error');
      if (hashError) {
        const loginUrl = new URL('/login', window.location.origin);
        loginUrl.searchParams.set('error', hashError);
        router.replace(loginUrl.toString());
        return;
      }
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      // Demo mode — no Supabase env. Go home.
      router.replace('/');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 25; // ~5s @ 200ms

    async function poll(): Promise<void> {
      if (cancelled) return;
      attempts += 1;
      if (!supabase) {
        router.replace('/');
        return;
      }
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setStatus(`오류: ${error.message}`);
        const loginUrl = new URL('/login', window.location.origin);
        loginUrl.searchParams.set('error', error.message);
        router.replace(loginUrl.toString());
        return;
      }
      if (data.session) {
        // Session cookies are now written. Clear the hash so a refresh
        // doesn't re-process it, then navigate to the destination.
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname);
        }
        router.replace(next);
        return;
      }
      if (attempts >= maxAttempts) {
        setStatus('세션을 확인할 수 없습니다. 다시 시도해 주세요.');
        const loginUrl = new URL('/login', window.location.origin);
        loginUrl.searchParams.set('error', 'session_not_found');
        router.replace(loginUrl.toString());
        return;
      }
      setTimeout(poll, 200);
    }

    void poll();

    return (): void => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return <LoadingState message={status} />;
}

function LoadingState({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
