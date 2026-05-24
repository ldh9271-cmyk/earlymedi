export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { tryAccess } from '@/lib/auth/route-guards';

/**
 * Debug endpoint — reports which AI-related env vars Vercel actually
 * sees, without leaking the values. Useful when "AI 번역 서비스가 응답
 * 하지 않습니다" toast won't go away and we need to confirm whether
 * the env var landed.
 *
 * Returns booleans + the FIRST 4 chars of each key (just enough to
 * tell if the right key was pasted; not enough to be useful to an
 * attacker who somehow got the response).
 */
export async function GET(): Promise<Response> {
  // Auth check so this isn't a public env-var probe.
  const access = await tryAccess({ allowedAccountTypes: ['agency'] });
  if (!access.ok) return NextResponse.json({ error: access.reason }, { status: access.status });

  const mask = (v: string | undefined): { present: boolean; preview?: string; length?: number } => {
    if (!v) return { present: false };
    return {
      present: true,
      preview: v.slice(0, 4) + '…' + v.slice(-2),
      length: v.length,
    };
  };

  return NextResponse.json({
    runtime: 'nodejs',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    ai: {
      GOOGLE_GENERATIVE_AI_API_KEY: mask(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      GOOGLE_API_KEY: mask(process.env.GOOGLE_API_KEY),
      GEMINI_API_KEY: mask(process.env.GEMINI_API_KEY),
      ANTHROPIC_API_KEY: mask(process.env.ANTHROPIC_API_KEY),
      OPENAI_API_KEY: mask(process.env.OPENAI_API_KEY),
    },
    models: {
      AI_PRIMARY_MODEL: process.env.AI_PRIMARY_MODEL ?? '(default: gemini-2.5-pro)',
      AI_FALLBACK_MODEL: process.env.AI_FALLBACK_MODEL ?? '(default: claude-opus-4-7)',
    },
  });
}
