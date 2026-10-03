import { NextResponse } from 'next/server';
import { z } from 'zod';
import { issueTempPassword } from '@/lib/auth/temp-password';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';

export const dynamic = 'force-dynamic';

/**
 * 비밀번호 찾기 — 임시 비밀번호를 회원 언어로 메일 발송 (lib/auth/temp-password.ts).
 * 가입 여부를 드러내지 않도록 항상 { ok: true } 를 돌려준다.
 * 같은 이메일·IP 는 60초에 1번만 처리 (인스턴스 메모리 기준의 가벼운 제한).
 */
const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  locale: z.string().optional(),
});

const recent = new Map<string, number>();
const WINDOW_MS = 60_000;

function limited(key: string): boolean {
  const now = Date.now();
  for (const [k, t] of recent) if (now - t > WINDOW_MS) recent.delete(k);
  const last = recent.get(key);
  if (last && now - last < WINDOW_MS) return true;
  recent.set(key, now);
  return false;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const locale: PublicLocale = isPublicLocale(body.locale ?? '') ? (body.locale as PublicLocale) : 'en';
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
  if (limited(`e:${body.email}`) || limited(`ip:${ip}`)) {
    return NextResponse.json({ error: 'too_many' }, { status: 429 });
  }
  try {
    const result = await issueTempPassword(body.email, locale);
    if (result === 'update_failed' || result === 'mail_failed') {
      console.error('[forgot-password]', result);
      return NextResponse.json({ error: 'send_failed' }, { status: 502 });
    }
  } catch (e) {
    console.error('[forgot-password]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
