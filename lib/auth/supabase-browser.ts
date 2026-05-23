'use client';

import { createBrowserClient } from '@supabase/ssr';
import { expectEnv } from '@/lib/utils/assert';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (_client) return _client;
  const url = expectEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = expectEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  _client = createBrowserClient(url, anonKey);
  return _client;
}
