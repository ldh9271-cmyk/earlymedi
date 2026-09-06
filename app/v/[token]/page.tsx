import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { activeOrgId } from '@/lib/auth/active-org-server';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { loadOrderByToken, orgCanCheckIn, summarize } from '@/lib/voucher/service';
import { resolveMerchantFeeBp, SETTLEMENT_STATUS_KO } from '@/lib/voucher/settlement';
import { checkInAction, settleAction } from './_actions';

export const dynamic = 'force-dynamic';

/**
 * QR 랜딩 (/v/<token>) — 카메라로 QR 을 읽었을 때 열리는 공개 화면.
 *  - 누구나: 주문 상태(결제/방문 확인/취소)만 개인정보 없이 확인
 *  - 소비자 본인: 마이페이지 바우처로 이동
 *  - 사업자(주문의 매장/병원 조직 또는 마스터): 여기서 바로 '방문 확인'
 */
export default async function VoucherLanding({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }): Promise<JSX.Element> {
  const token = decodeURIComponent(params.token);
  const o = await loadOrderByToken(token);
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const isMaster = isMasterEmail(auth.user?.email ?? '');
  // /v 는 미들웨어 공개 경로라 헤더가 없다 — 쿠키에서 활성 조직을 읽는다
  const orgId = activeOrgId() || null;
  let canCheckIn = false;
  if (o && auth.user) {
    if (isMaster) canCheckIn = true;
    else if (orgId) {
      const [m] = await db.select({ id: orgMemberships.id }).from(orgMemberships)
        .where(and(eq(orgMemberships.userId, auth.user.id), eq(orgMemberships.organizationId, orgId), eq(orgMemberships.status, 'active'))).limit(1);
      canCheckIn = Boolean(m) && (await orgCanCheckIn(o, orgId));
    }
  }
  const isOwner = Boolean(o && auth.user && o.userId === auth.user.id);
  const s = o ? summarize(o, { withPII: canCheckIn || isOwner, withFee: canCheckIn }) : null;
  const feeBp = canCheckIn ? (s?.settlement?.feeBp ?? (await resolveMerchantFeeBp(isMaster && !orgId ? null : orgId))) : 0;
  const won = (n: number | null | undefined): string => (n == null ? '—' : `₩${n.toLocaleString('ko-KR')}`);
  const pct = (bp: number): string => `${(bp / 100).toFixed(bp % 100 === 0 ? 0 : 2)}%`;
  const st = s?.settlement ?? null;
  const settleEditable = canCheckIn && Boolean(s?.checkedInAt) && (!st || st.status === 'declared' || st.status === 'disputed' || (isMaster && st.status === 'confirmed'));
  const status = !s ? null : s.status === 'cancelled' ? { t: '취소됨 · Cancelled', c: '#6a6a6a', bg: '#f5f5f5' }
    : s.checkedInAt ? { t: '방문 확인 완료 · Checked in', c: '#047857', bg: '#ecfdf5' }
      : s.status === 'paid' ? { t: '결제 완료 · Paid — 스캔 대기', c: '#1d4ed8', bg: '#eff6ff' }
        : { t: '결제 대기 · Unpaid', c: '#b45309', bg: '#fffbeb' };

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 80px', fontFamily: 'inherit' }}>
      <div style={{ fontSize: 13, color: '#6a6a6a', marginBottom: 8 }}>GlowUpTour · QR Voucher</div>
      {!s || !status ? (
        <div style={{ border: '1px solid #fecdd3', background: '#fffafb', borderRadius: 14, padding: 20 }}>
          <b style={{ color: '#c2143c' }}>유효하지 않은 바우처입니다 · Invalid voucher</b>
          <p style={{ fontSize: 13, color: '#6a6a6a', marginTop: 6 }}>QR 이 손상됐거나 주문이 존재하지 않습니다.</p>
        </div>
      ) : (
        <>
          <div style={{ border: '1px solid #ebebeb', borderRadius: 16, padding: 20 }}>
            <span style={{ display: 'inline-block', background: status.bg, color: status.c, fontWeight: 800, fontSize: 13, borderRadius: 999, padding: '5px 12px' }}>{status.t}</span>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '12px 0 4px' }}>{s.listingTitle}</h1>
            <div style={{ fontSize: 13, color: '#6a6a6a' }}>{s.invoiceNo}{s.hospitalName ? ` · ${s.hospitalName}` : ''}</div>
            <table style={{ width: '100%', fontSize: 14, marginTop: 14, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#6a6a6a', padding: '6px 0' }}>예약 · Booking</td><td style={{ fontWeight: 700, textAlign: 'right' }}>{s.reserveDate} {s.reserveTime} · {s.guests}명</td></tr>
                <tr><td style={{ color: '#6a6a6a', padding: '6px 0' }}>결제 · Paid online</td><td style={{ fontWeight: 700, textAlign: 'right' }}>{won(s.totalWon)}{s.depositWon ? ' (예약금 · deposit)' : ''}</td></tr>
                {s.payOnSiteWon ? <tr><td style={{ color: '#6a6a6a', padding: '6px 0' }}>현장 결제 예정 · Pay on site</td><td style={{ fontWeight: 700, textAlign: 'right', color: '#c2143c' }}>{won(s.payOnSiteWon)}</td></tr> : null}
                {s.guestName ? <tr><td style={{ color: '#6a6a6a', padding: '6px 0' }}>예약자 · Guest</td><td style={{ fontWeight: 700, textAlign: 'right' }}>{s.guestName}{s.guestContact ? ` · ${s.guestContact}` : ''}</td></tr> : null}
                {s.checkedInAt ? <tr><td style={{ color: '#6a6a6a', padding: '6px 0' }}>방문 확인 · Checked in</td><td style={{ fontWeight: 700, textAlign: 'right' }}>{new Date(s.checkedInAt).toLocaleString('ko-KR')}{s.checkedInByName ? ` · ${s.checkedInByName}` : ''}</td></tr> : null}
                {st ? (
                  <tr>
                    <td style={{ color: '#6a6a6a', padding: '6px 0' }}>최종 결제 · Final amount</td>
                    <td style={{ fontWeight: 800, textAlign: 'right' }}>
                      {won(st.finalAmountWon)}
                      <div style={{ fontSize: 12, fontWeight: 600, color: st.status === 'disputed' ? '#c2143c' : st.status === 'declared' ? '#b45309' : '#047857' }}>
                        {SETTLEMENT_STATUS_KO[st.status]}{st.feeWon != null ? ` · 수수료 ${won(st.feeWon)} (${pct(st.feeBp ?? 0)})` : ''}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {searchParams.ok === 'settled' ? <p style={{ color: '#047857', fontSize: 13, marginTop: 12, fontWeight: 700 }}>최종 결제금액이 기록되었습니다. 소비자가 확인하면 수수료가 확정됩니다 (72시간 무응답 시 자동 확정).</p>
            : searchParams.ok ? <p style={{ color: '#047857', fontSize: 13, marginTop: 12, fontWeight: 700 }}>방문 확인이 기록되었습니다. 소비자·플랫폼 화면에 즉시 반영됩니다.</p> : null}
          {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{searchParams.error}</p> : null}

          {settleEditable ? (
            <form action={settleAction} style={{ marginTop: 16, border: '1px solid #d1fae5', background: '#f0fdf9', borderRadius: 14, padding: 16 }}>
              <input type="hidden" name="token" value={token} />
              <div style={{ fontSize: 14, fontWeight: 800, color: '#065f46' }}>💳 최종 결제금액 (3자 검증)</div>
              <p style={{ fontSize: 12, color: '#3f6f5a', margin: '4px 0 10px', lineHeight: 1.55 }}>
                온라인 결제분을 포함해 이 고객에게 실제로 받은 총액입니다. 소비자가 확인하면 플랫폼 수수료 {pct(feeBp)} 가 이 금액 기준으로 확정됩니다.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input name="finalAmountWon" inputMode="numeric" required defaultValue={st ? st.finalAmountWon : s.totalWon + (s.payOnSiteWon ?? 0)}
                  style={{ flex: 1, border: '1px solid #dddddd', borderRadius: 10, padding: '10px 12px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }} />
                <button type="submit" style={{ background: '#047857', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {st ? '금액 정정' : '기록'}
                </button>
              </div>
              <input name="note" placeholder="메모 (선택 — 추가 시술·할인 등)" style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, border: '1px solid #dddddd', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit' }} />
            </form>
          ) : null}

          {canCheckIn && !s.checkedInAt && s.status === 'paid' ? (
            <form action={checkInAction} style={{ marginTop: 16 }}>
              <input type="hidden" name="token" value={token} />
              <button type="submit" style={{ width: '100%', background: '#ff385c', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✅ 방문 확인 (체크인)
              </button>
              <p style={{ fontSize: 12, color: '#6a6a6a', marginTop: 8, textAlign: 'center' }}>소비자·사업자·플랫폼이 같은 예약·결제 정보를 실시간으로 봅니다.</p>
            </form>
          ) : null}
          {isOwner ? <p style={{ marginTop: 16, fontSize: 13 }}><Link href={`/${s.locale}/me/voucher/${encodeURIComponent(s.invoiceNo)}`} style={{ color: '#222' }}>→ 내 바우처 화면에서 크게 보기</Link></p> : null}
          {!auth.user ? <p style={{ marginTop: 16, fontSize: 12, color: '#6a6a6a' }}>사업자이신가요? <Link href={`/login?next=${encodeURIComponent(`/v/${token}`)}`} style={{ color: '#1d4ed8' }}>로그인</Link>하면 이 화면에서 바로 방문 확인을 할 수 있습니다.</p> : null}
        </>
      )}
    </main>
  );
}
