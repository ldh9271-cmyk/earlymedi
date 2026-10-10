import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { sendEmail } from '@/lib/email/send';
import { notifyOrderEvent } from '@/lib/notify/admin-alert';
import { getAttribution } from '@/lib/referral/service';
import { SITE_URL } from '@/lib/seo/brand';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import type { PublicLocale } from '@/lib/i18n/locales';

/**
 * 견적 인보이스 — 가격을 미리 보여주지 않는 상품(호텔 등)의 결제 흐름.
 *
 *   고객이 '예약 문의하기' → 컨시어지가 답변하며 금액 확정 → 마스터가 여기서
 *   회원 앞으로 인보이스(kind='quote', 토스)를 발행 → 회원 언어로 이메일 →
 *   회원은 마이페이지에서 '결제하기'(토스) → /api/payments/toss/confirm 이 paid 로.
 *
 * AI 여행 견적(lib/ai/trip-workflow issueTripQuote)과 같은 모양이되 일정(plan)
 * 없이 회원 이메일만으로 발행한다. 금액은 운영자가 입력한 값 그대로(수수료 0).
 */

type AuthUserRow = { id: string; email: string };

/** GU-20260727-4821 — 날짜 + 4자리 난수 (app/api/checkout/order 와 같은 규칙). */
function makeInvoiceNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `GU-${ymd}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
const won = (n: number): string => `₩${n.toLocaleString('ko-KR')}`;

export type IssueQuoteInput = {
  email: string;
  locale: PublicLocale;
  /** 인보이스 제목 — 호텔명·객실·기간 등 고객이 알아볼 이름 */
  title: string;
  amountWon: number;
  /** 고객에게 보이는 메모 (조건·포함 사항·취소 규정 등) */
  note: string | null;
  /** 체크인·이용일 (YYYY-MM-DD) */
  dateYmd: string | null;
  /** 박수 등 표시용 보조 문구 ("2박", "3 nights") */
  periodLabel: string | null;
  guests: number;
  listingSlug: string | null;
  /** hotel · beauty · travel … — 통계·수수료 분류 */
  interestKey: string;
};

export async function issueQuoteInvoice(input: IssueQuoteInput): Promise<{ ok: true; invoiceNo: string; emailSent: boolean } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, error: '회원 이메일을 입력해 주세요' };
  if (!Number.isFinite(input.amountWon) || input.amountWon <= 0) return { ok: false, error: '금액은 1원 이상이어야 합니다' };
  const title = input.title.trim();
  if (!title) return { ok: false, error: '상품명을 입력해 주세요' };

  // 마이페이지에서 결제하려면 회원이어야 한다 — 비회원이면 먼저 가입을 안내.
  const rows = await db.execute<AuthUserRow>(sql`
    select id::text as id, email from auth.users where lower(email) = ${email} and deleted_at is null limit 1`);
  const user = rows[0];
  if (!user) return { ok: false, error: `회원이 아닙니다: ${email} — 먼저 가입을 안내해 주세요` };

  // 추천 QR 로 가입한 회원이면 주문에 파트너를 남긴다 (수당 원장은 결제·실적 확정 때)
  let partnerId: string | null = null; let distributorId: string | null = null;
  try { const att = await getAttribution(user.id); if (att) { partnerId = att.partnerId; distributorId = att.distributorId; } } catch { /* 귀속 없음 */ }

  const dateLabel = input.dateYmd ?? '-';
  let invoiceNo = '';
  for (let attempt = 0; attempt < 5 && !invoiceNo; attempt += 1) {
    const no = makeInvoiceNo();
    try {
      const [row] = await db.insert(checkoutOrders).values({
        invoiceNo: no, locale: input.locale,
        listingSlug: input.listingSlug, listingTitle: title, interestKey: input.interestKey,
        reserveDate: dateLabel, reserveYmd: input.dateYmd, reserveTime: input.periodLabel ?? '-', guests: Math.max(1, input.guests),
        unitPriceWon: input.amountWon, subtotalWon: input.amountWon, serviceFeeWon: 0, totalWon: input.amountWon,
        paymentMethod: 'toss', userId: user.id, userEmail: user.email, kind: 'quote', partnerId, distributorId,
        meta: { quoteNote: input.note, quotedAt: new Date().toISOString(), quotedBy: 'master' },
      }).returning({ invoiceNo: checkoutOrders.invoiceNo });
      if (row) invoiceNo = row.invoiceNo;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (!/unique|duplicate/i.test(msg)) return { ok: false, error: msg || 'insert_failed' };
    }
  }
  if (!invoiceNo) return { ok: false, error: '인보이스 번호 생성에 실패했습니다. 다시 시도해 주세요' };

  // 회원 언어 이메일 — 마이페이지 결제 링크
  let emailSent = false;
  try {
    const dict = await getDictionary(input.locale);
    const t = dict.myPage.quote;
    const link = `${SITE_URL}/${input.locale}/me?invoice=${encodeURIComponent(invoiceNo)}`;
    const html = `
<div style="font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px 20px;color:#141414;">
  <div style="font-size:20px;font-weight:800;letter-spacing:-0.3px;">Glow<span style="color:#ff385c">Up</span>Tour</div>
  <h1 style="font-size:22px;font-weight:800;margin:22px 0 10px;">${esc(t.emailTitle)}</h1>
  <p style="font-size:15px;line-height:1.7;color:#3f3f3f;margin:0 0 18px;">${esc(t.emailIntro.replace('{title}', title))}</p>
  <div style="background:#fff5f7;border:1px solid #fecdd3;border-radius:14px;padding:18px 20px;">
    <div style="font-size:15px;font-weight:700;">${esc(title)}</div>
    ${input.dateYmd || input.periodLabel ? `<div style="font-size:13px;color:#6a6a6a;margin-top:4px;">${esc([input.dateYmd, input.periodLabel].filter(Boolean).join(' · '))}${input.guests > 1 ? ` · ${input.guests}` : ''}</div>` : ''}
    <div style="font-size:13px;color:#6a6a6a;margin-top:12px;">${esc(t.emailAmount)}</div>
    <div style="font-size:26px;font-weight:800;color:#c81e42;margin-top:2px;">${won(input.amountWon)}</div>
    ${input.note ? `<div style="font-size:13px;color:#3f3f3f;margin-top:12px;line-height:1.6;"><b>${esc(t.noteLabel)}</b><br/>${esc(input.note).replace(/\n/g, '<br/>')}</div>` : ''}
    <div style="font-size:12px;color:#9c9c9c;margin-top:10px;">${esc(dict.myPage.invoiceLabel)} ${invoiceNo}</div>
  </div>
  <a href="${link}" style="display:block;text-align:center;background:#ff385c;color:#fff;text-decoration:none;font-weight:700;font-size:15px;border-radius:999px;padding:14px 20px;margin:22px 0 14px;">${esc(t.emailCta)}</a>
  <p style="font-size:12px;line-height:1.6;color:#9c9c9c;margin:0;">${esc(t.emailFoot.replace('{email}', user.email))}</p>
</div>`;
    emailSent = await sendEmail(user.email, t.emailSubject.replace('{title}', title), html);
  } catch { emailSent = false; }

  await notifyOrderEvent('issued', {
    invoiceNo, listingTitle: `[견적] ${title}`, totalWon: input.amountWon, guests: input.guests,
    reserveDate: dateLabel, reserveTime: input.periodLabel ?? '-', userEmail: user.email,
  }).catch(() => false);

  return { ok: true, invoiceNo, emailSent };
}
