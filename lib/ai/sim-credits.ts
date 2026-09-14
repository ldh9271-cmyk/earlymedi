import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { aiSimCredits, aiSimulations } from '@/drizzle/schema/ai-sim';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { sendAdminTelegram } from '@/lib/notify/admin-alert';

/**
 * 시뮬레이션 크레딧(포인트) — 가격표와 원장 조작.
 *
 * 가격 근거(2026-09): 구글 Gemini 이미지 편집 1장 원가가 약 ₩55 (공시 $0.039).
 * 1회 1,000P 면 원가·PG 수수료(약 3%)·거부/재시도를 빼고도 넉넉하다.
 * 충전은 만원 단위(사용자 결정) — "장당 얼마"가 아니라 "만원이면 스타일 10가지"로
 * 읽히게 한다. 큰 팩일수록 보너스. 숫자는 env 로 바꿀 수 있다.
 */
export const SIM_RUN_COST = Math.max(100, Math.round(Number(process.env.AI_SIM_RUN_COST_POINTS ?? 1000)));
export const SIM_FREE_RUNS = Math.max(0, Math.round(Number(process.env.AI_SIM_FREE_RUNS ?? 1)));
export const SIM_KIND = 'ai_sim_credits';
/** 첫 충전 보너스(%) — 무료 1회를 쓴 직후 "지금 충전하면 +10%" 로 전환을 유도한다. */
export const SIM_FIRST_BONUS_PCT = Math.max(0, Math.round(Number(process.env.AI_SIM_FIRST_BONUS_PCT ?? 10)));

export type SimPack = { key: string; priceWon: number; points: number };
// 만원 단위 충전(사용자 결정) — 1회 1,000P 기준 10회·22회·35회. 큰 팩일수록 보너스.
export const SIM_PACKS: SimPack[] = [
  { key: 'w10', priceWon: 10_000, points: 10_000 },
  { key: 'w20', priceWon: 20_000, points: 22_000 }, // +10%
  { key: 'w30', priceWon: 30_000, points: 34_500 }, // +15%
];

export type SimWallet = { balance: number; freeLeft: number; runCost: number; packs: SimPack[]; firstBonusPct: number };

export async function simWallet(userId: string): Promise<SimWallet> {
  const [bal] = await db
    .select({ n: sql<number>`coalesce(sum(${aiSimCredits.delta}), 0)::int` })
    .from(aiSimCredits)
    .where(eq(aiSimCredits.userId, userId));
  const [free] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiSimCredits)
    .where(and(eq(aiSimCredits.userId, userId), eq(aiSimCredits.reason, 'free')));
  const [bought] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiSimCredits)
    .where(and(eq(aiSimCredits.userId, userId), eq(aiSimCredits.reason, 'purchase')));
  return {
    balance: bal?.n ?? 0, freeLeft: Math.max(0, SIM_FREE_RUNS - (free?.n ?? 0)), runCost: SIM_RUN_COST, packs: SIM_PACKS,
    firstBonusPct: (bought?.n ?? 0) === 0 ? SIM_FIRST_BONUS_PCT : 0,
  };
}

/**
 * 실행 1회 비용을 잡는다. 무료 횟수가 남았으면 0P('free'), 아니면 SIM_RUN_COST 차감('run').
 * 잔액 부족이면 null. 실패하면 호출부가 refundRun 으로 되돌린다.
 */
export async function reserveRun(userId: string): Promise<{ ledgerId: string; cost: number } | null> {
  // 같은 사용자의 동시 요청(더블클릭·탭 두 개)을 직렬화한다 — 잔액 확인과 차감 사이에
  // 다른 요청이 끼어들면 잔액보다 많이 쓰거나 무료 1회를 두 번 쓸 수 있다.
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const [bal] = await tx.select({ n: sql<number>`coalesce(sum(${aiSimCredits.delta}), 0)::int` }).from(aiSimCredits).where(eq(aiSimCredits.userId, userId));
    const [free] = await tx.select({ n: sql<number>`count(*)::int` }).from(aiSimCredits).where(and(eq(aiSimCredits.userId, userId), eq(aiSimCredits.reason, 'free')));
    if ((free?.n ?? 0) < SIM_FREE_RUNS) {
      const [row] = await tx.insert(aiSimCredits).values({ userId, delta: 0, reason: 'free' }).returning({ id: aiSimCredits.id });
      return row ? { ledgerId: row.id, cost: 0 } : null;
    }
    if ((bal?.n ?? 0) < SIM_RUN_COST) return null;
    const [row] = await tx.insert(aiSimCredits).values({ userId, delta: -SIM_RUN_COST, reason: 'run' }).returning({ id: aiSimCredits.id });
    return row ? { ledgerId: row.id, cost: SIM_RUN_COST } : null;
  });
}

/** 모델이 거부했거나 실패했으면 잡아둔 비용을 되돌린다 (무료 1회도 되살린다). */
export async function refundRun(ledgerId: string): Promise<void> {
  await db.delete(aiSimCredits).where(eq(aiSimCredits.id, ledgerId));
}

export async function logSimulation(input: {
  userId: string; locale: string; preset: string; status: 'ok' | 'refused' | 'failed'; costPoints: number; durationMs: number; meta?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(aiSimulations).values({ ...input, meta: input.meta ?? {} }).catch(() => undefined);
}

function makeInvoiceNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `GU-${ymd}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

/** 충전 팩 인보이스 발행 — 토스 결제창은 클라이언트가 연다. */
export async function createSimCreditOrder(input: { packKey: string; userId: string; userEmail: string; locale: string }): Promise<{ invoiceNo: string; orderId: string; amountWon: number; points: number } | null> {
  const pack0 = SIM_PACKS.find((p) => p.key === input.packKey);
  if (!pack0) return null;
  // 첫 충전이면 보너스를 얹는다 — 지갑 API 가 보여준 숫자와 같은 규칙
  const { firstBonusPct } = await simWallet(input.userId);
  const pack = firstBonusPct > 0 ? { ...pack0, points: Math.round(pack0.points * (1 + firstBonusPct / 100)) } : pack0;
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10);
  for (let i = 0; i < 5; i += 1) {
    try {
      const [r] = await db.insert(checkoutOrders).values({
        invoiceNo: makeInvoiceNo(), locale: input.locale, listingSlug: null,
        listingTitle: `AI 시뮬레이션 포인트 ${pack.points.toLocaleString('ko-KR')}P`, interestKey: SIM_KIND,
        reserveDate: today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), reserveYmd: ymd, reserveTime: '00:00', guests: 1,
        unitPriceWon: pack.priceWon, subtotalWon: pack.priceWon, serviceFeeWon: 0, totalWon: pack.priceWon,
        userId: input.userId, userEmail: input.userEmail, kind: SIM_KIND,
        meta: { simPack: pack.key, simPoints: pack.points, firstBonusPct },
      }).returning({ id: checkoutOrders.id, invoiceNo: checkoutOrders.invoiceNo });
      if (r) return { invoiceNo: r.invoiceNo, orderId: r.id, amountWon: pack.priceWon, points: pack.points };
    } catch (e) {
      if (!/unique|duplicate/i.test(String(e))) throw e;
    }
  }
  return null;
}

/** 토스 결제 확정 후 — 포인트 적립 (멱등: 같은 주문으로 두 번 적립하지 않는다). */
export async function onSimCreditsPaid(orderId: string): Promise<boolean> {
  const [o] = await db
    .select({ id: checkoutOrders.id, kind: checkoutOrders.kind, meta: checkoutOrders.meta, userId: checkoutOrders.userId, invoiceNo: checkoutOrders.invoiceNo, totalWon: checkoutOrders.totalWon, userEmail: checkoutOrders.userEmail })
    .from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  if (!o || o.kind !== SIM_KIND || !o.userId) return false;
  const points = Number((o.meta as { simPoints?: number })?.simPoints ?? 0);
  if (points <= 0) return false;
  const [dup] = await db.select({ id: aiSimCredits.id }).from(aiSimCredits)
    .where(and(eq(aiSimCredits.orderId, o.id), eq(aiSimCredits.reason, 'purchase'))).limit(1);
  if (dup) return true;
  await db.insert(aiSimCredits).values({ userId: o.userId, delta: points, reason: 'purchase', orderId: o.id, note: o.invoiceNo });
  await sendAdminTelegram(`<b>✨ AI 시뮬레이션 포인트 충전</b>\n${points.toLocaleString('ko-KR')}P · ₩${o.totalWon.toLocaleString('ko-KR')} · <code>${o.invoiceNo}</code>\n${(o.userEmail ?? '').replace(/[<>&]/g, '')}`).catch(() => false);
  return true;
}

/** 마이페이지용 최근 원장 */
export async function simLedger(userId: string, limit = 20): Promise<Array<{ delta: number; reason: string; note: string | null; createdAt: Date }>> {
  return db.select({ delta: aiSimCredits.delta, reason: aiSimCredits.reason, note: aiSimCredits.note, createdAt: aiSimCredits.createdAt })
    .from(aiSimCredits).where(eq(aiSimCredits.userId, userId)).orderBy(desc(aiSimCredits.createdAt)).limit(limit);
}
