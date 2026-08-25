import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { cookies } from 'next/headers';
import { attributeUser, getAttribution, REF_COOKIE } from '@/lib/referral/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * 예약 팝업 인보이스 발행 / 입금 신고.
 *
 * POST  — '결제하기' 시점에 인보이스를 발행하고 번호를 돌려준다.
 *         status=issued (아직 입금 전, 알리페이 QR 노출 단계).
 * PATCH — '결제를 완료했어요' 시점에 status=reported 로 올린다.
 *         이는 게스트의 자기신고이므로 실제 입금 확인은 관리자가
 *         알리페이 정산과 대조해 paid 로 올린다.
 *
 * 금액은 클라이언트 값을 믿지 않고 단가 × 인원 + 10% 수수료로 서버에서
 * 다시 계산한다.
 */

const CreateSchema = z.object({
  locale: z.string().max(5),
  listingSlug: z.string().max(200).nullable().optional(),
  listingTitle: z.string().min(1).max(300),
  interestKey: z.string().max(80).nullable().optional(),
  reserveDate: z.string().min(1).max(120),
  reserveYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  reserveTime: z.string().min(1).max(60),
  guests: z.number().int().min(1).max(20),
  unitPriceWon: z.number().int().min(0).max(2_000_000_000),
});

const PatchSchema = z.object({
  invoiceNo: z.string().min(3).max(40),
});

/** GU-20260727-4821 — 날짜 + 4자리 난수. */
function makeInvoiceNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `GU-${ymd}-${rand}`;
}

export async function POST(req: Request): Promise<NextResponse> {
  let input: z.infer<typeof CreateSchema>;
  try {
    input = CreateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // 로그인 상태면 인보이스를 계정에 묶어 마이페이지에서 조회 가능하게 한다.
  // 클라이언트가 보낸 id 를 믿지 않고 쿠키 세션에서 직접 읽는다.
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    userEmail = data.user?.email ?? null;
  } catch {
    /* 비로그인 예약도 허용 */
  }

  // 추천 QR 로 들어온 계정이면 귀속을 기록하고 주문에 파트너를 남긴다.
  // 수당 원장은 여기서 만들지 않는다 — 운영자가 시술·투어 완료를 확인한
  // 뒤 /master/partners 에서 실적으로 확정한다.
  let partnerId: string | null = null;
  let distributorId: string | null = null;
  if (userId) {
    try {
      const refCode = cookies().get(REF_COOKIE)?.value;
      if (refCode) await attributeUser(userId, refCode, 'checkout');
      const att = await getAttribution(userId);
      if (att) { partnerId = att.partnerId; distributorId = att.distributorId; }
    } catch {
      /* 귀속 실패가 인보이스 발행을 막지 않는다 */
    }
  }

  const subtotal = input.unitPriceWon * input.guests;
  const serviceFee = Math.round((subtotal * 0.1) / 1000) * 1000;
  const total = subtotal + serviceFee;

  // 번호 충돌 시 재시도 (같은 날 4자리 난수라 드물게 겹칠 수 있음)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const invoiceNo = makeInvoiceNo();
    try {
      const [row] = await db
        .insert(checkoutOrders)
        .values({
          invoiceNo,
          locale: input.locale,
          listingSlug: input.listingSlug ?? null,
          listingTitle: input.listingTitle,
          interestKey: input.interestKey ?? null,
          reserveDate: input.reserveDate,
          reserveYmd: input.reserveYmd ?? null,
          reserveTime: input.reserveTime,
          guests: input.guests,
          unitPriceWon: input.unitPriceWon,
          subtotalWon: subtotal,
          serviceFeeWon: serviceFee,
          totalWon: total,
          userId,
          userEmail,
          partnerId,
          distributorId,
          meta: { ua: req.headers.get('user-agent') ?? '' },
        })
        .returning({ id: checkoutOrders.id, invoiceNo: checkoutOrders.invoiceNo });
      if (!row) return NextResponse.json({ error: 'insert_failed' }, { status: 502 });
      return NextResponse.json({
        ok: true,
        invoiceNo: row.invoiceNo,
        subtotal,
        serviceFee,
        total,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('duplicate') && !msg.includes('unique')) {
        return NextResponse.json({ error: 'insert_failed' }, { status: 502 });
      }
    }
  }
  return NextResponse.json({ error: 'invoice_no_collision' }, { status: 503 });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  let input: z.infer<typeof PatchSchema>;
  try {
    input = PatchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  try {
    const [order] = await db
      .select({ id: checkoutOrders.id, userId: checkoutOrders.userId })
      .from(checkoutOrders)
      .where(eq(checkoutOrders.invoiceNo, input.invoiceNo))
      .limit(1);
    if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    // 계정에 묶인 인보이스는 본인만 상태를 바꿀 수 있다
    if (order.userId) {
      const supabase = createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      if (data.user?.id !== order.userId) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }
    await db
      .update(checkoutOrders)
      .set({ status: 'reported', reportedAt: new Date(), updatedAt: new Date() })
      .where(eq(checkoutOrders.id, order.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'update_failed' }, { status: 502 });
  }
}
