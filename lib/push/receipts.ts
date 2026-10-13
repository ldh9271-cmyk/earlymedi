import { and, gt, inArray, lt, lte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { pushTokens } from '@/drizzle/schema/push-tokens';
import { pushTickets } from '@/drizzle/schema/push-tickets';

/**
 * Expo 푸시 영수증(receipt) 확인 — 죽은 토큰 정리. 크론 /api/cron/push-receipts(15분) 이 부른다.
 *
 *  1. 만든 지 1분 이상·24시간 이내인 티켓을 오래된 것부터 최대 1000개 모아 getReceipts 로 조회한다.
 *     (1분 미만은 Expo 가 아직 영수증을 못 만들었을 수 있고, 24시간이 지나면 Expo 가 영수증을 버린다.)
 *  2. 영수증이 DeviceNotRegistered 면 그 토큰을 push_tokens 에서 지운다 — 티켓은 ok 였지만 기기에 닿지 못한 경우
 *     (앱 재설치로 옛 설치본 토큰이 남은 때). 다른 오류(MessageTooBig 등)는 개수만 보고한다.
 *  3. 영수증이 돌아온 티켓은 삭제한다. 영수증이 아직 없는 티켓은 다음 회차에 다시 본다.
 *  4. 24시간이 지난 티켓은 일괄 삭제, 90일 넘게 안 보인(last_seen_at) 토큰도 삭제.
 *
 * 영수증 API: https://exp.host/--/api/v2/push/getReceipts — ids 최대 1000, 응답 data 는 { [ticketId]: receipt }.
 */
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const MAX_IDS = 1000;
const TIMEOUT_MS = 15_000;

export const RECEIPT_MIN_AGE_MS = 60_000;
export const RECEIPT_MAX_AGE_MS = 24 * 3_600_000;
export const TOKEN_STALE_DAYS = 90;

type ExpoReceipt =
  | { status: 'ok' }
  | { status: 'error'; message?: string; details?: { error?: string } };

export type PushReceiptsResult = {
  /** 조회 대상 티켓 수 */
  pending: number;
  /** 영수증이 돌아온 티켓 수 (삭제됨) */
  receipted: number;
  /** DeviceNotRegistered 로 지운 토큰 수 */
  deadTokens: number;
  /** DeviceNotRegistered 외 오류 영수증 수 (종류별) */
  otherErrors: Record<string, number>;
  /** 24시간이 지나 지운 티켓 수 */
  expiredTickets: number;
  /** 90일 넘게 안 보여 지운 토큰 수 */
  staleTokens: number;
  /** 영수증 API 를 못 불렀을 때 (네트워크·비정상 응답) */
  fetchError?: string;
};

async function fetchReceipts(ids: string[]): Promise<Record<string, ExpoReceipt>> {
  const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) headers.authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(EXPO_RECEIPTS_URL, { method: 'POST', headers, body: JSON.stringify({ ids }), signal: controller.signal });
    if (!res.ok) throw new Error(`receipts_http_${res.status}`);
    const json = (await res.json()) as { data?: Record<string, ExpoReceipt> };
    return json.data ?? {};
  } finally {
    clearTimeout(timer);
  }
}

export async function checkPushReceipts(now: Date = new Date()): Promise<PushReceiptsResult> {
  const result: PushReceiptsResult = { pending: 0, receipted: 0, deadTokens: 0, otherErrors: {}, expiredTickets: 0, staleTokens: 0 };
  const minCreated = new Date(now.getTime() - RECEIPT_MAX_AGE_MS); // 24시간 전
  const maxCreated = new Date(now.getTime() - RECEIPT_MIN_AGE_MS); // 1분 전

  const tickets = await db
    .select({ ticketId: pushTickets.ticketId, token: pushTickets.token })
    .from(pushTickets)
    .where(and(gt(pushTickets.createdAt, minCreated), lte(pushTickets.createdAt, maxCreated)))
    .orderBy(pushTickets.createdAt)
    .limit(MAX_IDS);
  result.pending = tickets.length;

  if (tickets.length) {
    let receipts: Record<string, ExpoReceipt> | null = null;
    try {
      receipts = await fetchReceipts(tickets.map((t) => t.ticketId));
    } catch (e) {
      result.fetchError = e instanceof Error ? e.message : 'receipts_failed';
    }
    if (receipts) {
      const checked: string[] = [];
      const dead = new Set<string>();
      for (const t of tickets) {
        const r = receipts[t.ticketId];
        if (!r) continue; // 영수증 아직 없음 — 다음 회차
        checked.push(t.ticketId);
        if (r.status === 'error') {
          const code = r.details?.error ?? 'unknown';
          if (code === 'DeviceNotRegistered') dead.add(t.token);
          else result.otherErrors[code] = (result.otherErrors[code] ?? 0) + 1;
        }
      }
      result.receipted = checked.length;
      if (dead.size) {
        const tokens = [...dead];
        const deleted = await db.delete(pushTokens).where(inArray(pushTokens.token, tokens)).returning({ id: pushTokens.id });
        result.deadTokens = deleted.length;
        // 같은 토큰의 다른 티켓도 더 볼 필요 없음
        await db.delete(pushTickets).where(inArray(pushTickets.token, tokens));
      }
      if (checked.length) await db.delete(pushTickets).where(inArray(pushTickets.ticketId, checked));
    }
  }

  // 24시간 지난 티켓 — Expo 가 영수증을 버렸으니 우리도 버린다
  const expired = await db.delete(pushTickets).where(lte(pushTickets.createdAt, minCreated)).returning({ id: pushTickets.id });
  result.expiredTickets = expired.length;

  // 90일 넘게 등록·갱신 호출이 없던 토큰 (앱이 열리면 last_seen_at 이 갱신된다)
  const staleBefore = new Date(now.getTime() - TOKEN_STALE_DAYS * 86_400_000);
  const stale = await db.delete(pushTokens).where(lt(pushTokens.lastSeenAt, staleBefore)).returning({ id: pushTokens.id });
  result.staleTokens = stale.length;

  return result;
}
