import { NextResponse } from 'next/server';
import { z } from 'zod';
import { issueTempPassword } from '@/lib/auth/temp-password';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';

export const dynamic = 'force-dynamic';

/**
 * 비밀번호 찾기 — 임시 비밀번호를 회원 언어로 메일 발송 (lib/auth/temp-password.ts).
 * 가입되지 않은 이메일은 404 no_account 로 알려 준다 (2026-10-03: 소셜 가입자가 다른 이메일로
 * 시도하고 "보냈다"는 안내만 보는 혼란이 있어, 가입 여부 노출보다 안내를 택함).
 * 같은 이메일은 60초에 1번, 같은 IP 는 60초에 5번까지 (공용 IP 를 생각한 가벼운 제한, 인스턴스 메모리 기준).
 */
const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  locale: z.string().optional(),
});

const recent = new Map<string, number[]>();
const WINDOW_MS = 60_000;

/** key 별로 최근 60초 안의 호출 시각을 세어 max 를 넘으면 true */
function limited(key: string, max: number): boolean {
  const now = Date.now();
  for (const [k, ts] of recent) { const keep = ts.filter((t) => now - t < WINDOW_MS); if (keep.length) recent.set(k, keep); else recent.delete(k); }
  const ts = recent.get(key) ?? [];
  if (ts.length >= max) return true;
  ts.push(now); recent.set(key, ts);
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
  if (limited(`e:${body.email}`, 1) || limited(`ip:${ip}`, 5)) {
    return NextResponse.json({ error: 'too_many' }, { status: 429 });
  }
  try {
    const result = await issueTempPassword(body.email, locale);
    if (result === 'no_user') return NextResponse.json({ error: 'no_account' }, { status: 404 });
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
