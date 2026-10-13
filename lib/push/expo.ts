import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { pushTokens, type PushToken } from '@/drizzle/schema/push-tokens';
import { pushTickets } from '@/drizzle/schema/push-tickets';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

/**
 * 앱 푸시 발송 — Expo Push API (https://exp.host/--/api/v2/push/send).
 *
 *  · 회원의 토큰(push_tokens)을 모아 카테고리 스위치(chat/booking)가 켜진 것만 보낸다.
 *  · 제목·본문은 토큰이 알린 사이트 언어(없으면 호출부가 준 언어)의 사전(push.*)으로 만든다 — 기기마다 언어가 다를 수 있어
 *    메시지는 locale → {title, body, url} 함수로 받는다.
 *  · 한 요청에 최대 100개. 티켓이 DeviceNotRegistered 면(앱 삭제·토큰 만료) 그 토큰 행을 지운다.
 *  · ok 티켓은 push_tickets 에 {ticket_id, token} 으로 적어 둔다 — 티켓은 ok 인데 영수증(getReceipts)이
 *    DeviceNotRegistered 로 오는 경우(재설치로 남은 옛 토큰)를 크론(/api/cron/push-receipts)이 정리한다.
 *  · 실패해도 던지지 않는다 — 알림이 채팅·예약 흐름을 막으면 안 된다. 호출부는 .catch(() => 0) 로 한 번 더 감싼다.
 *
 * 환경 변수(선택): EXPO_ACCESS_TOKEN — EAS 대시보드에서 'Enhanced push security' 를 켰을 때만 필요.
 * 'server-only' 는 두지 않는다(admin-alert 와 같은 이유: 서비스 모듈 경유로 vitest 에서도 로드됨). vitest 중에는 발송하지 않는다.
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;
const TIMEOUT_MS = 10_000;

export type PushCategory = 'chat' | 'booking';

export type PushContent = {
  title: string;
  body: string;
  /** 알림을 눌렀을 때 앱이 열 사이트 경로 (/kr/me?chat=…). 절대 URL 이 아니라 경로. */
  url: string;
};

export type PushMessageInput = {
  category: PushCategory;
  /** 기기 언어별 제목·본문·링크 */
  content: (locale: PublicLocale, t: Dictionary['push']) => PushContent;
  /** 토큰에 언어가 없을 때 쓸 언어 (주문·방의 locale) */
  fallbackLocale?: string | null;
  /** 같은 알림이 여러 번 와도 하나로 묶이게(안드로이드) — 방 id 등 */
  collapseId?: string;
  /** data 에 더 실을 값 (4KiB 제한) */
  data?: Record<string, string | number | boolean | null>;
};

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: 'default';
  priority: 'high';
  channelId: string;
  collapseId?: string;
};

type ExpoTicket = { status: 'ok'; id: string } | { status: 'error'; message: string; details?: { error?: string } };

export function isExpoPushToken(s: string): boolean {
  return /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(s);
}

function toLocale(v: string | null | undefined, fallback: string | null | undefined): PublicLocale {
  if (v && isPublicLocale(v)) return v;
  if (fallback && isPublicLocale(fallback)) return fallback;
  return 'kr';
}

/** 티켓을 받아 보내고, 등록 해제된 토큰은 지운다. 보낸(ok) 개수를 돌려준다. */
export async function sendExpoMessages(messages: ExpoMessage[]): Promise<number> {
  if (process.env.VITEST || messages.length === 0) return 0;
  const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) headers.authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  let ok = 0;
  const dead: string[] = [];
  const issued: { ticketId: string; token: string }[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    const chunk = messages.slice(i, i + BATCH);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(chunk), signal: controller.signal });
      if (!res.ok) continue;
      const json = (await res.json()) as { data?: ExpoTicket[] };
      const tickets = json.data ?? [];
      tickets.forEach((tk, idx) => {
        const m = chunk[idx];
        if (tk.status === 'ok') {
          ok += 1;
          if (m && tk.id) issued.push({ ticketId: tk.id, token: m.to });
          return;
        }
        if (tk.details?.error === 'DeviceNotRegistered' && m) dead.push(m.to);
      });
    } catch {
      /* 네트워크·타임아웃 — 다음 묶음 계속 */
    } finally {
      clearTimeout(timer);
    }
  }
  if (dead.length) await db.delete(pushTokens).where(inArray(pushTokens.token, dead)).catch(() => undefined);
  // 영수증 조회용 티켓 기록 — 테이블 미적용(drizzle/sql/push-tickets.sql) 등으로 실패해도 발송 결과엔 영향 없음
  if (issued.length) {
    try {
      await db.insert(pushTickets).values(issued).onConflictDoNothing();
    } catch {
      /* 조용히 */
    }
  }
  return ok;
}

/** 회원 한 명의 모든 기기로. 돌려주는 값은 Expo 가 받아 준(ok) 메시지 수. */
export async function sendPushToUser(userId: string | null | undefined, input: PushMessageInput): Promise<number> {
  if (!userId || process.env.VITEST) return 0;
  let rows: PushToken[] = [];
  try {
    rows = await db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
  } catch {
    return 0; // 테이블 미적용(drizzle/sql/push-tokens.sql) 등 — 조용히
  }
  const targets = rows.filter((r) => (input.category === 'chat' ? r.chatEnabled : r.bookingEnabled));
  if (targets.length === 0) return 0;

  const dicts = new Map<PublicLocale, Dictionary['push']>();
  const messages: ExpoMessage[] = [];
  for (const r of targets) {
    const locale = toLocale(r.locale, input.fallbackLocale);
    let t = dicts.get(locale);
    if (!t) { t = (await getDictionary(locale)).push; dicts.set(locale, t); }
    const c = input.content(locale, t);
    messages.push({
      to: r.token,
      title: c.title.slice(0, 120),
      body: c.body.slice(0, 240),
      data: { url: c.url, category: input.category, ...(input.data ?? {}) },
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      ...(input.collapseId ? { collapseId: input.collapseId } : {}),
    });
  }
  return sendExpoMessages(messages);
}

/** 사전 템플릿 치환 — '{title}' 같은 자리표시자 */
export function fill(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    return v === null || v === undefined ? '' : String(v);
  });
}

/** 원화 표기 — 알림 본문용 (₩1,234,000) */
export function wonLabel(n: number): string {
  return `₩${Math.round(n).toLocaleString('en-US')}`;
}
