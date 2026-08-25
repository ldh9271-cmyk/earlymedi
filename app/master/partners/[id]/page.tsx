import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { and, desc, eq, inArray } from 'drizzle-orm';
import QRCode from 'qrcode';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { commissionLedger, DEFAULT_DISTRIBUTOR_CONFIG } from '@/drizzle/schema/referral-program';
import { getPartnerById, getRegionAdmin, listReferrers } from '@/lib/referral/service';
import {
  confirmDueAction, createReferrerAction, createResultAction, linkPartnerUserAction,
  reverseOrderAction, saveConfigAction, settleAction, togglePartnerAction,
} from '../_actions';
import { FeeShareField } from '../fee-share-field';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://glowuptour.com';
const BENEFICIARY_KO: Record<string, string> = {
  platform: '운영비', patient_points: '환자 포인트', referrer_l1: '1단계', referrer_l2: '2단계', distributor: '총판',
};
const STATUS_KO: Record<string, { t: string; c: string }> = {
  pending: { t: '대기', c: '#b45309' }, confirmed: { t: '확정', c: '#1d4ed8' }, paid: { t: '지급', c: '#047857' }, reversed: { t: '취소', c: '#6a6a6a' },
};
const input: React.CSSProperties = { border: '1px solid #dddddd', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', width: '100%' };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#6a6a6a', display: 'block', marginBottom: 4 };
const btn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' });
const card: React.CSSProperties = { border: '1px solid #ebebeb', borderRadius: 12, padding: 18, background: '#fff' };

export default async function DistributorDetailPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { error?: string; ok?: string; created?: string } }): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const email = (auth.user.email ?? '').toLowerCase();
  if (!isMasterEmail(email)) {
    // 지역 마스터는 자기 국가 총판만 열 수 있다
    const region = await getRegionAdmin(email);
    if (!region) redirect('/select-org');
    const scoped = await getPartnerById(params.id);
    if (!scoped || scoped.countryCode !== region) redirect('/master/partners?error=scope');
  }

  const d = await getPartnerById(params.id);
  if (!d || d.role !== 'distributor') notFound();
  const cfg = { ...DEFAULT_DISTRIBUTOR_CONFIG, ...(d.config ?? {}) };
  const feeSharePct = cfg.feeShare?.distributorPct ?? 70;
  const referrers = await listReferrers(d.id);
  const byId = new Map(referrers.map((r) => [r.id, r]));
  const orders = await db.select().from(checkoutOrders)
    .where(and(eq(checkoutOrders.distributorId, d.id), inArray(checkoutOrders.kind, ['procedure', 'travel', 'listing'])))
    .orderBy(desc(checkoutOrders.createdAt)).limit(100);
  const ledger = await db.select().from(commissionLedger).where(eq(commissionLedger.distributorId, d.id))
    .orderBy(desc(commissionLedger.createdAt)).limit(300);
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const qr = await QRCode.toString(`${SITE}/r/${d.code}`, { type: 'svg', margin: 1, width: 160 });
  const now = Date.now();
  const dueCount = ledger.filter((l) => l.status === 'pending' && l.confirmAt.getTime() <= now).length;
  const confirmedPayable = ledger.filter((l) => l.status === 'confirmed' && ['referrer_l1', 'referrer_l2', 'distributor'].includes(l.beneficiary))
    .reduce((a, l) => a + l.amountWon, 0);
  const partnerName = (id: string | null): string => (id === d.id ? `${d.name} (총판)` : (id && byId.get(id)?.name) || '—');

  return (
    <div style={{ padding: '28px 32px 100px', maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link href="/master/partners" style={{ fontSize: 12, color: '#6a6a6a' }}>← 총판 목록</Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 0' }}>{d.name}</h1>
          <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 4 }}>
            코드 <b style={{ fontFamily: 'monospace', color: '#222' }}>{d.code}</b> · {d.countryCode} · 랜딩 /{d.landingLocale}
            {d.userEmail ? ` · 계정 ${d.userEmail}${d.userId ? ' (연결됨)' : ' (미연결)'}` : ''}
          </div>
          <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 4 }}>QR 링크 <code>{SITE}/r/{d.code}</code> · 추천인 초대 링크 <code>{SITE}/r/{d.code}?join=1</code></div>
        </div>
        <div dangerouslySetInnerHTML={{ __html: qr }} style={{ width: 120, height: 120 }} />
      </div>

      {searchParams.created ? <p style={{ color: '#047857', fontSize: 13, margin: 0 }}>총판이 생성됐습니다. QR 을 총판에 전달하고, 대시보드 계정 이메일을 연결하세요.</p> : null}

      {/* ── 총판 본인 계정 연결 — 연결돼야 /me/referral 대시보드가 열린다 ── */}
      {!d.userId ? (
        <form action={linkPartnerUserAction} style={{ ...card, borderColor: '#1d4ed8', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <input type="hidden" name="distributorId" value={d.id} />
          <input type="hidden" name="partnerId" value={d.id} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>총판 대시보드 계정 연결</h3>
            <p style={{ fontSize: 12, color: '#6a6a6a', margin: '0 0 8px' }}>총판 담당자가 사이트에 가입한 이메일을 입력하세요. 연결되면 그 계정으로 로그인해 QR·수당·정산서를 봅니다.</p>
            <input name="email" type="email" required defaultValue={d.userEmail ?? ''} placeholder="partner@example.jp" style={{ ...input, maxWidth: 360 }} />
          </div>
          <button type="submit" style={btn('#1d4ed8')}>계정 연결</button>
        </form>
      ) : null}
      {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{searchParams.error}</p> : null}
      {searchParams.ok ? <p style={{ color: '#047857', fontSize: 13, margin: 0 }}>{searchParams.ok}</p> : null}

      {/* ── 실적 등록 ─────────────────────────────────────────── */}
      <form action={createResultAction} style={{ ...card, borderColor: '#ff385c' }}>
        <input type="hidden" name="distributorId" value={d.id} />
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>실적 등록 — 시술 완료 · 투어 출발</h2>
        <p style={{ fontSize: 12, color: '#6a6a6a', margin: '0 0 14px' }}>
          병원이 시술 완료를 알려오면 여기에 입력합니다. 수당 원장이 자동 생성되고, 완료일 + {cfg.holdDays}일 뒤 확정됩니다. 정산 비율에 따라 수수료의 {feeSharePct}%가 총판 몫입니다.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div><span style={label}>종류</span>
            <select name="kind" style={input} defaultValue="procedure"><option value="procedure">시술</option><option value="travel">여행상품 (10% 마진 + 포함 시술)</option></select></div>
          <div><span style={label}>추천인 코드 (비우면 총판 직접)</span><input name="partnerCode" style={input} placeholder="JP7K2M9Q" /></div>
          <div><span style={label}>시술 분류</span>
            <select name="category" style={input} defaultValue="plastic_surgery">
              <option value="plastic_surgery">성형외과 ({cfg.feePctByCategory.plastic_surgery}%)</option>
              <option value="dermatology">피부과 ({cfg.feePctByCategory.dermatology}%)</option>
              <option value="dental">치과 ({cfg.feePctByCategory.default}%)</option>
              <option value="hair">모발 ({cfg.feePctByCategory.default}%)</option>
              <option value="checkup">건강검진 ({cfg.feePctByCategory.default}%)</option>
              <option value="oriental">한방 ({cfg.feePctByCategory.default}%)</option>
              <option value="">없음 (여행만)</option>
            </select></div>
          <div><span style={label}>병원 수수료율 % (비우면 분류 기본)</span><input name="feePct" style={input} placeholder="30" inputMode="decimal" /></div>
          <div><span style={label}>시술비 (₩)</span><input name="procedureAmountWon" style={input} placeholder="3,000,000" inputMode="numeric" /></div>
          <div><span style={label}>패키지 판매가 (₩, 여행상품만)</span><input name="saleAmountWon" style={input} placeholder="3,000,000" inputMode="numeric" /></div>
          <div><span style={label}>완료일</span><input name="completedAt" type="date" style={input} defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div><span style={label}>병원명</span><input name="hospitalName" style={input} placeholder="셀러블153강남의원" /></div>
          <div><span style={label}>환자 계정 이메일 (포인트 적립용)</span><input name="patientEmail" type="email" style={input} /></div>
          <div><span style={label}>환자 표시 이름</span><input name="patientLabel" style={input} placeholder="계정이 없을 때" /></div>
          <div><span style={label}>제목</span><input name="title" style={input} placeholder="코성형 / K-뷰티 투어 4박5일" /></div>
          <div><span style={label}>메모</span><input name="note" style={input} /></div>
        </div>
        <button type="submit" style={{ ...btn('#ff385c'), marginTop: 14 }}>실적 등록 + 수당 생성</button>
      </form>

      {/* ── 정산 처리 ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <form action={confirmDueAction} style={card}>
          <input type="hidden" name="distributorId" value={d.id} />
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>확정 처리</h3>
          <p style={{ fontSize: 12, color: '#6a6a6a', margin: '0 0 12px' }}>보류 기간이 지난 대기 행 <b>{dueCount}건</b>을 확정으로 바꿉니다.</p>
          <button type="submit" style={btn('#1d4ed8')} disabled={dueCount === 0}>{dueCount}건 확정</button>
        </form>
        <form action={settleAction} style={card}>
          <input type="hidden" name="distributorId" value={d.id} />
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>월 정산 — 지급 완료 처리</h3>
          <p style={{ fontSize: 12, color: '#6a6a6a', margin: '0 0 12px' }}>확정된 총판·추천인 몫 <b>₩{confirmedPayable.toLocaleString('ko-KR')}</b>을 총판 법인에 송금한 뒤 누릅니다 (운영비·환자 포인트 제외).</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input name="period" type="month" defaultValue={new Date().toISOString().slice(0, 7)} style={{ ...input, width: 160 }} />
            <button type="submit" style={btn('#047857')} disabled={confirmedPayable === 0}>지급 완료</button>
          </div>
        </form>
      </div>

      {/* ── 추천인 ────────────────────────────────────────────── */}
      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>추천인 ({referrers.length}명)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#fafafa', textAlign: 'left' }}>
              {['이름', '코드', '상위', '계정', '클릭 / 가입', '상태', ''].map((h) => <th key={h} style={{ padding: '8px 10px', fontSize: 12, color: '#6a6a6a' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {referrers.length === 0 ? <tr><td colSpan={7} style={{ padding: 18, color: '#6a6a6a', textAlign: 'center' }}>아직 추천인이 없습니다. 초대 링크를 공유하거나 아래에서 직접 등록하세요.</td></tr>
                : referrers.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #ebebeb' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.name}<div style={{ fontSize: 11, color: '#9c9c9c', fontWeight: 400 }}>{r.contact ?? ''}</div></td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{r.code}</td>
                    <td style={{ padding: '8px 10px' }}>{partnerName(r.parentId)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {r.userId ? <span style={{ color: '#047857' }}>{r.userEmail}</span> : (
                        <form action={linkPartnerUserAction} style={{ display: 'flex', gap: 6 }}>
                          <input type="hidden" name="distributorId" value={d.id} /><input type="hidden" name="partnerId" value={r.id} />
                          <input name="email" type="email" placeholder="계정 이메일" defaultValue={r.userEmail ?? ''} style={{ ...input, width: 180, padding: '4px 8px' }} />
                          <button type="submit" style={{ ...btn('#222'), padding: '4px 10px', fontSize: 12 }}>연결</button>
                        </form>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px' }}>{r.clicks} / {r.signups}</td>
                    <td style={{ padding: '8px 10px' }}>{r.isActive ? '활성' : <span style={{ color: '#dc2626' }}>비활성</span>}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <form action={togglePartnerAction}>
                        <input type="hidden" name="distributorId" value={d.id} /><input type="hidden" name="partnerId" value={r.id} /><input type="hidden" name="active" value={r.isActive ? '0' : '1'} />
                        <button type="submit" style={{ border: '1px solid #dddddd', background: '#fff', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>{r.isActive ? '비활성화' : '활성화'}</button>
                      </form>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <form action={createReferrerAction} style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
          <input type="hidden" name="distributorId" value={d.id} />
          <div><span style={label}>추천인 이름 *</span><input name="name" required style={input} /></div>
          <div><span style={label}>상위 코드 (비우면 총판 직속)</span><input name="parentCode" style={input} placeholder={d.code} /></div>
          <div><span style={label}>연락처</span><input name="contact" style={input} /></div>
          <div><span style={label}>계정 이메일</span><input name="userEmail" type="email" style={input} /></div>
          <button type="submit" style={btn('#222')}>추천인 등록</button>
        </form>
      </div>

      {/* ── 수당 원장 ─────────────────────────────────────────── */}
      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>수당 원장 (최근 {ledger.length}행)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
            <thead><tr style={{ background: '#fafafa', textAlign: 'left' }}>
              {['주문', '환자', '받는 사람', '기준', '율', '기준액', '금액', '상태', '확정일', '정산월'].map((h) => <th key={h} style={{ padding: '8px 10px', fontSize: 11, color: '#6a6a6a', whiteSpace: 'nowrap' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {ledger.length === 0 ? <tr><td colSpan={10} style={{ padding: 18, color: '#6a6a6a', textAlign: 'center' }}>실적을 등록하면 여기에 배분 행이 생깁니다.</td></tr>
                : ledger.map((l) => {
                  const o = orderById.get(l.orderId);
                  // 여행 마진은 '예비/확정 적립'으로 표기 (여행 시작 전/후)
                  const s = l.basis === 'travel_margin' && (l.status === 'pending' || l.status === 'confirmed')
                    ? (l.status === 'pending' ? { t: '예비 적립', c: '#b45309' } : { t: '확정 적립', c: '#1d4ed8' })
                    : (STATUS_KO[l.status] ?? { t: l.status, c: '#6a6a6a' });
                  return (
                    <tr key={l.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}><b>{o?.invoiceNo ?? '—'}</b><div style={{ color: '#9c9c9c' }}>{o?.listingTitle}</div></td>
                      <td style={{ padding: '6px 10px' }}>{o?.patientLabel ?? o?.userEmail ?? '—'}</td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{BENEFICIARY_KO[l.beneficiary]}{l.beneficiaryPartnerId ? ` · ${partnerName(l.beneficiaryPartnerId)}` : ''}</td>
                      <td style={{ padding: '6px 10px' }}>{l.basis === 'travel_margin' ? '여행 마진' : '병원 수수료'}</td>
                      <td style={{ padding: '6px 10px' }}>{(l.rateBp / 100).toFixed(2)}%</td>
                      <td style={{ padding: '6px 10px' }}>₩{l.baseAmountWon.toLocaleString('ko-KR')}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 700, color: l.amountWon < 0 ? '#dc2626' : '#222' }}>₩{l.amountWon.toLocaleString('ko-KR')}</td>
                      <td style={{ padding: '6px 10px', color: s.c, fontWeight: 700 }}>{s.t}</td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{l.confirmAt.toLocaleDateString('ko-KR')}</td>
                      <td style={{ padding: '6px 10px' }}>{l.settlementPeriod ?? ''}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 주문 ─────────────────────────────────────────────── */}
      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>이 총판에 귀속된 주문 ({orders.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#fafafa', textAlign: 'left' }}>
              {['인보이스', '종류', '제목', '환자', '소개', '금액', '상태', '완료일', ''].map((h) => <th key={h} style={{ padding: '8px 10px', fontSize: 11, color: '#6a6a6a' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 700 }}>{o.invoiceNo}</td>
                  <td style={{ padding: '6px 10px' }}>{o.kind === 'travel' ? '여행' : o.kind === 'procedure' ? '시술' : '사이트 예약'}</td>
                  <td style={{ padding: '6px 10px' }}>{o.listingTitle}{o.hospitalName ? ` · ${o.hospitalName}` : ''}</td>
                  <td style={{ padding: '6px 10px' }}>{o.patientLabel ?? o.userEmail ?? '—'}</td>
                  <td style={{ padding: '6px 10px' }}>{partnerName(o.partnerId)}</td>
                  <td style={{ padding: '6px 10px' }}>₩{o.totalWon.toLocaleString('ko-KR')}</td>
                  <td style={{ padding: '6px 10px' }}>{o.status}</td>
                  <td style={{ padding: '6px 10px' }}>{o.completedAt ? o.completedAt.toLocaleDateString('ko-KR') : ''}</td>
                  <td style={{ padding: '6px 10px' }}>
                    {o.status !== 'cancelled' && o.kind !== 'listing' ? (
                      <form action={reverseOrderAction}>
                        <input type="hidden" name="distributorId" value={d.id} /><input type="hidden" name="orderId" value={o.id} />
                        <button type="submit" style={{ border: '1px solid #dc2626', color: '#dc2626', background: '#fff', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>취소·환수</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 수당 설정 ─────────────────────────────────────────── */}
      <form action={saveConfigAction} style={card}>
        <input type="hidden" name="distributorId" value={d.id} />
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>수당 설정 (계약 조건)</h2>
        <p style={{ fontSize: 12, color: '#6a6a6a', margin: '0 0 14px' }}>
          이 총판의 <b>정산 비율</b>을 정합니다 — 배당 이익(병원 유치 수수료)을 100%로 보고 총판/회사로 나눕니다. 총판마다 다르게 설정할 수 있습니다.
        </p>

        <FeeShareField defaultPct={feeSharePct} />

        <div style={{ fontSize: 12, fontWeight: 700, color: '#222', margin: '4px 0 8px' }}>병원 유치 수수료율 (배당 이익이 얼마나 들어오는지)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div><span style={label}>성형외과 %</span><input name="fee_ps" defaultValue={cfg.feePctByCategory.plastic_surgery} style={input} /></div>
          <div><span style={label}>피부과 %</span><input name="fee_derm" defaultValue={cfg.feePctByCategory.dermatology} style={input} /></div>
          <div><span style={label}>기타 %</span><input name="fee_default" defaultValue={cfg.feePctByCategory.default} style={input} /></div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: '#222', margin: '16px 0 8px' }}>여행상품 · 지급 확정</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div><span style={label}>여행상품 마진 %</span><input name="travelMarginPct" defaultValue={cfg.travelMarginPct} style={input} /></div>
          <div><span style={label}>확정 보류일 (시술 완료 후)</span><input name="holdDays" defaultValue={cfg.holdDays} style={input} /></div>
        </div>

        <button type="submit" style={{ ...btn('#222'), marginTop: 16 }}>설정 저장</button>
      </form>
    </div>
  );
}
