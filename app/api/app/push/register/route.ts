export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { pushTokens } from '@/drizzle/schema/push-tokens';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isExpoPushToken } from '@/lib/push/expo';
import { isPublicLocale } from '@/lib/i18n/locales';

/**
 * 앱 푸시 토큰 등록·설정·해제 — glowuptour-app 의 src/push.ts 가 부른다.
 *
 *  POST   { token, platform, appVersion?, locale?, chatEnabled?, bookingEnabled? }
 *         회원 세션(쿠키) 필수 — 앱은 WebView 안에서 fetch 하므로 로그인 쿠키가 같이 간다.
 *         토큰 기준 upsert: 같은 기기에서 다른 계정으로 로그인하면 user_id 가 옮겨 간다.
 *         chatEnabled/bookingEnabled 를 안 보내면 저장된 값을 유지하고, 응답에 현재 값을 돌려준다(앱 설정 동기화).
 *  DELETE { token }
 *         세션 없이도 된다 — 로그아웃 뒤(쿠키가 이미 지워진 뒤) 앱이 네이티브 fetch 로 부른다.
 *         토큰 문자열을 아는 쪽만 지울 수 있고, 지워져도 다음 로그인 때 다시 등록된다.
 */
const Body = z.object({
  token: z.string().min(10).max(200).refine(isExpoPushToken, 'expo_token'),
  platform: z.enum(['android', 'ios']),
  appVersion: z.string().max(20).nullable().optional(),
  locale: z.string().max(5).nullable().optional(),
  chatEnabled: z.boolean().optional(),
  bookingEnabled: z.boolean().optional(),
});

async function sessionUserId(): Promise<string | null> {
  try {
    const { data } = await createSupabaseServerClient().auth.getUser();
    return data.user?.id ?? null;
  } catch { return null; }
}

export async function POST(req: Request): Promise<NextResponse> {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  let input: z.infer<typeof Body>;
  try { input = Body.parse(await req.json()); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }

  const now = new Date();
  const locale = input.locale && isPublicLocale(input.locale) ? input.locale : null;
  const base = { userId, platform: input.platform, appVersion: input.appVersion ?? null, locale, updatedAt: now, lastSeenAt: now };
  const flags = {
    ...(input.chatEnabled === undefined ? {} : { chatEnabled: input.chatEnabled }),
    ...(input.bookingEnabled === undefined ? {} : { bookingEnabled: input.bookingEnabled }),
  };
  try {
    const [row] = await db.insert(pushTokens)
      .values({ token: input.token, ...base, chatEnabled: input.chatEnabled ?? true, bookingEnabled: input.bookingEnabled ?? true })
      .onConflictDoUpdate({ target: pushTokens.token, set: { ...base, ...flags } })
      .returning({ chatEnabled: pushTokens.chatEnabled, bookingEnabled: pushTokens.bookingEnabled });
    return NextResponse.json({ ok: true, chatEnabled: row?.chatEnabled ?? true, bookingEnabled: row?.bookingEnabled ?? true });
  } catch (e) {
    // 테이블 미적용(drizzle/sql/push-tokens.sql) 등 — 앱은 다음 실행 때 다시 시도한다
    const msg = e instanceof Error ? e.message : 'db_error';
    return NextResponse.json({ error: 'db_error', message: msg.slice(0, 200) }, { status: 503 });
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  let token = '';
  try { token = String(((await req.json()) as { token?: unknown }).token ?? ''); } catch { /* 빈 본문 */ }
  if (!isExpoPushToken(token)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const userId = await sessionUserId();
  try {
    // 세션이 있으면 내 토큰만, 없으면(로그아웃 직후) 토큰 문자열 기준
    await db.delete(pushTokens).where(userId ? and(eq(pushTokens.token, token), eq(pushTokens.userId, userId)) : eq(pushTokens.token, token));
  } catch { /* 테이블 미적용 등 */ }
  return NextResponse.json({ ok: true });
}

/** 현재 기기 설정 조회 — ?token= (회원 세션 필수) */
export async function GET(req: Request): Promise<NextResponse> {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!isExpoPushToken(token)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  try {
    const [row] = await db.select({ chatEnabled: pushTokens.chatEnabled, bookingEnabled: pushTokens.bookingEnabled })
      .from(pushTokens).where(and(eq(pushTokens.token, token), eq(pushTokens.userId, userId))).limit(1);
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    await db.update(pushTokens).set({ lastSeenAt: sql`now()` }).where(eq(pushTokens.token, token)).catch(() => undefined);
    return NextResponse.json({ ok: true, ...row });
  } catch { return NextResponse.json({ error: 'db_error' }, { status: 503 }); }
}
