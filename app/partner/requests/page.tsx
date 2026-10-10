import { requireAccess } from '@/lib/auth/route-guards';
import { listStayRequestsForOrg, type StayRequestMeta } from '@/lib/stay/request';
import { proposePriceAction } from './_actions';

export const metadata = { title: '예약 문의 · 견적' };
export const dynamic = 'force-dynamic';

/**
 * 호텔 파트너 콘솔 — 내 호텔(글로우업 상품, category=hotel)로 들어온 예약 문의.
 * 고객 정보·체크인·박수·인원·요청을 보고 가격을 제안하면 플랫폼이 그 금액으로 결제 인보이스를 보낸다.
 * 결제·환불은 플랫폼이 처리하므로 여기서는 금액 제안까지만.
 */
export default async function PartnerRequestsPage({ searchParams }: { searchParams: { ok?: string; error?: string } }): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  let rows: Awaited<ReturnType<typeof listStayRequestsForOrg>> = [];
  let dbError: string | null = null;
  try { rows = await listStayRequestsForOrg(ctx.orgId); } catch (e) { dbError = e instanceof Error ? e.message : 'load_failed'; }

  const badge = (r: (typeof rows)[number]): { text: string; bg: string; fg: string } => {
    if (r.status === 'cancelled') return { text: '취소됨', bg: '#f5f5f5', fg: '#6a6a6a' };
    if (r.status === 'paid') return { text: '결제 완료 · 예약 확정', bg: '#ecfdf5', fg: '#047857' };
    if (r.kind === 'quote') return { text: `견적 발행 · 결제 대기 ₩${r.totalWon.toLocaleString('ko-KR')}`, bg: '#fff5f7', fg: '#c81e42' };
    const pq = (r.meta as Partial<StayRequestMeta> | null)?.partnerQuote;
    if (pq) return { text: `가격 제안 완료 ₩${pq.won.toLocaleString('ko-KR')} · 플랫폼 발행 대기`, bg: '#eff6ff', fg: '#1d4ed8' };
    return { text: '새 문의 · 가격 제안 필요', bg: '#fffbeb', fg: '#b45309' };
  };
  const input: React.CSSProperties = { border: '1px solid #dddddd', borderRadius: 8, padding: '6px 9px', fontSize: 13, fontFamily: 'inherit' };

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>예약 문의 · 견적</h1>
      <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0', lineHeight: 1.6 }}>
        고객이 호텔 상세에서 보낸 예약 문의입니다. 객실·기간을 확인하고 <b>총 금액(세금 포함, 원)</b>을 제안해 주세요. 플랫폼이 그 금액으로 고객에게 결제 인보이스를 보내고, 결제되면 여기에 &lsquo;결제 완료&rsquo;로 표시됩니다.
      </p>
      {searchParams.ok ? <p style={{ color: '#047857', fontSize: 13, marginTop: 14, fontWeight: 700 }}>✅ 가격 제안을 보냈습니다. 플랫폼 확인 후 고객에게 인보이스가 발송됩니다.</p> : null}
      {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 14 }}>처리에 실패했습니다: {searchParams.error}</p> : null}
      {dbError ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 14 }}>불러오지 못했습니다: {dbError}</p> : null}

      {rows.length === 0 && !dbError ? (
        <p style={{ marginTop: 24, fontSize: 14, color: '#6a6a6a' }}>아직 들어온 예약 문의가 없습니다. 호텔 상품이 &lsquo;내 글로우업 상품&rsquo;에 승인 상태로 등록되어 있어야 문의가 연결됩니다.</p>
      ) : null}

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((r) => {
          const meta = (r.meta ?? {}) as Partial<StayRequestMeta>;
          const s = meta.stay;
          const b = badge(r);
          const canPropose = r.kind === 'stay_request' && r.status === 'issued';
          return (
            <article key={r.id} style={{ border: '1px solid #ebebeb', borderRadius: 14, padding: 18, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: b.bg, color: b.fg, borderRadius: 9999, padding: '4px 11px', fontSize: 11, fontWeight: 700 }}>{b.text}</span>
                <span style={{ fontSize: 12, color: '#6a6a6a' }}>{r.invoiceNo}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9c9c9c' }}>{new Date(r.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>{r.listingTitle}</div>
              <div style={{ fontSize: 13, color: '#3f3f3f', marginTop: 6, lineHeight: 1.7 }}>
                체크인 <b>{r.reserveYmd ?? r.reserveDate}</b> · {s ? `${s.nights}박` : r.reserveTime}{s?.arrival ? ` · 도착 ${s.arrival}` : ''} · {r.guests}명<br />
                {s ? (<>
                  {s.name} · {s.contact}{s.countryCode ? ` (${s.countryCode})` : ''}{s.messengerId ? ` · ${s.messengerKind ?? ''} ${s.messengerId}` : ''}
                  {s.note ? <><br /><span style={{ color: '#6a6a6a' }}>요청: {s.note}</span></> : null}
                </>) : null}
              </div>
              {meta.partnerQuote ? (
                <div style={{ fontSize: 12, color: '#1d4ed8', marginTop: 8 }}>내 제안: ₩{meta.partnerQuote.won.toLocaleString('ko-KR')}{meta.partnerQuote.note ? ` · ${meta.partnerQuote.note}` : ''} ({new Date(meta.partnerQuote.at).toLocaleDateString('ko-KR')})</div>
              ) : null}
              {canPropose ? (
                <form action={proposePriceAction} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
                  <input type="hidden" name="id" value={r.id} />
                  <input name="won" inputMode="numeric" required placeholder="총 금액(원)" defaultValue={meta.partnerQuote?.won ?? ''} style={{ ...input, width: 140 }} />
                  <input name="note" maxLength={300} placeholder="객실 타입·포함 사항·조건 (고객에게 전달)" defaultValue={meta.partnerQuote?.note ?? ''} style={{ ...input, flex: 1, minWidth: 220 }} />
                  <button type="submit" style={{ background: '#ff385c', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    {meta.partnerQuote ? '제안 수정' : '가격 제안 보내기'}
                  </button>
                </form>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
