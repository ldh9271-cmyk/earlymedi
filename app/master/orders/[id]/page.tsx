import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { eq, inArray } from 'drizzle-orm';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { hospitals } from '@/drizzle/schema/hospitals';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { organizations } from '@/drizzle/schema/organizations';
import { referralPartners } from '@/drizzle/schema/referral-program';
import { chatRooms } from '@/drizzle/schema/chat';
import { orderEstimate, resolveRefundCategory } from '@/lib/refund/service';
import type { RefundCategory } from '@/lib/refund/policy';
import { payLinkFor } from '@/lib/quote/service';
import { SETTLEMENT_STATUS_KO } from '@/lib/voucher/settlement';
import { LEAD_CATEGORY_LABEL_KO } from '@/lib/leads/pricing';
import { decryptPii } from '@/lib/encryption/pgcrypto';
import { OrderActions } from '../_components/order-actions';
import {
  customerOf, fmtDateTime, GENDER_KO, kindLabel, metaOf, PAYMENT_METHOD_KO, statusOf, won, type OrderRow,
} from '../_lib/order-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: '예약 인보이스 상세 — 마스터 관리자' };

/**
 * 예약 인보이스 상세 — 한 건의 고객 정보 · 예약 내용 · 결제 · 진행 이력 · 처리 버튼을 한 화면에.
 *
 *  - 경로 [id] 는 주문 uuid 또는 인보이스 번호(GU-YYYYMMDD-NNNN) 둘 다 받는다 (텔레그램 알림 링크는 인보이스 번호).
 *  - 연관 데이터(회원 계정 메타 · 병원 · 리스팅/파트너 조직 · 추천 파트너 · 채팅방 · 환불 규정)는 각각 실패해도 상세는 뜬다.
 *  - 처리 버튼은 목록과 같은 OrderActions — 눌린 뒤 ReturnTo 숨은 필드로 이 페이지로 돌아온다.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REFUND_CATEGORY_KO: Record<RefundCategory, string> = { travel: '여행', medical: '의료', stay: '숙박', food: '맛집', beauty: '뷰티' };

type AuthProfile = {
  fullName: string | null; username: string | null; phone: string | null; countryCode: string | null; messenger: string | null;
  birthDate: string | null; gender: string | null; signupSource: string | null; signupLocale: string | null;
  createdAt: string | null; lastSignInAt: string | null; provider: string | null;
};

/** 회원 계정(auth.users) 메타 — 가입 폼에 적은 이름·전화·메신저. service role 이 없는 로컬에서는 null. */
async function loadAuthProfile(userId: string): Promise<{ profile: AuthProfile | null; error: string | null }> {
  try {
    const svc = createSupabaseServiceClient();
    const { data, error } = await (svc as unknown as {
      auth: { admin: { getUserById: (id: string) => Promise<{ data?: { user?: Record<string, unknown> | null }; error?: { message: string } | null }> } };
    }).auth.admin.getUserById(userId);
    if (error) return { profile: null, error: error.message };
    const u = data?.user;
    if (!u) return { profile: null, error: null };
    const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
    const um = (u.user_metadata ?? {}) as Record<string, unknown>;
    const am = (u.app_metadata ?? {}) as { provider?: string };
    const mk = str(um.messenger_kind); const mid = str(um.messenger_id);
    return {
      profile: {
        fullName: str(um.full_name) ?? str(um.name), username: str(um.username), phone: str(um.phone), countryCode: str(um.country_code),
        messenger: mid ? `${mk ?? ''} ${mid}`.trim() : null, birthDate: str(um.birth_date), gender: str(um.gender),
        signupSource: str(um.signup_source), signupLocale: str(um.signup_locale),
        createdAt: str(u.created_at), lastSignInAt: str(u.last_sign_in_at), provider: am.provider ?? null,
      },
      error: null,
    };
  } catch (e) {
    return { profile: null, error: e instanceof Error ? e.message : 'auth_lookup_failed' };
  }
}

type Ev = { at: string | Date; title: string; detail?: string | null; tone?: string };

export default async function MasterOrderDetailPage({
  params, searchParams,
}: {
  params: { id: string };
  searchParams: { ok?: string; error?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');

  const key = decodeURIComponent(params.id).trim();
  const [order] = await db
    .select().from(checkoutOrders)
    .where(UUID_RE.test(key) ? eq(checkoutOrders.id, key) : eq(checkoutOrders.invoiceNo, key))
    .limit(1);
  if (!order) notFound();
  const r: OrderRow = order;
  const m = metaOf(r);
  const c = customerOf(r);
  const s = statusOf(r);
  const isRequest = r.kind === 'stay_request' || r.kind === 'booking_request';
  const isHotel = r.kind === 'stay_request' || m.category === 'hotel' || (m.category === 'travel_package' && m.subType === 'free');

  // ── 연관 데이터 (각각 실패 허용) ──
  const [profileRes, hospital, listing, partners, room, category] = await Promise.all([
    r.userId ? loadAuthProfile(r.userId) : Promise.resolve({ profile: null, error: null }),
    m.hospitalId
      ? db.select({ id: hospitals.id, name: hospitals.name, slug: hospitals.slug }).from(hospitals).where(eq(hospitals.id, m.hospitalId)).limit(1).then((x) => x[0] ?? null).catch(() => null)
      : Promise.resolve(null),
    r.listingSlug
      ? db.select({ slug: partnerListings.slug, title: partnerListings.title, category: partnerListings.category, ownerOrgId: partnerListings.ownerOrgId, priceWon: partnerListings.priceWon, orgName: organizations.name })
        .from(partnerListings).leftJoin(organizations, eq(organizations.id, partnerListings.ownerOrgId))
        .where(eq(partnerListings.slug, r.listingSlug)).limit(1).then((x) => x[0] ?? null).catch(() => null)
      : Promise.resolve(null),
    (async (): Promise<Array<{ id: string; code: string; name: string; role: string }>> => {
      const ids = [r.partnerId, r.distributorId].filter((x): x is string => !!x);
      if (ids.length === 0) return [];
      return db.select({ id: referralPartners.id, code: referralPartners.code, name: referralPartners.name, role: referralPartners.role })
        .from(referralPartners).where(inArray(referralPartners.id, ids)).catch(() => []);
    })(),
    db.select({ id: chatRooms.id, lastMessageAt: chatRooms.lastMessageAt, preview: chatRooms.lastMessagePreviewKo, previewRaw: chatRooms.lastMessagePreview, platformUnread: chatRooms.platformUnread, status: chatRooms.status })
      .from(chatRooms).where(eq(chatRooms.orderId, r.id)).limit(1).then((x) => x[0] ?? null).catch(() => null),
    resolveRefundCategory(r).catch((): RefundCategory => 'travel'),
  ]);
  const profile = profileRes.profile;
  // 외국인 환자 여권번호 — 암호화 저장분을 운영자 화면에서만 복호화 (실패하면 마스킹만)
  const passportNo = m.passportEnc ? await decryptPii(m.passportEnc).catch(() => null) : null;
  const partnerById = new Map(partners.map((p) => [p.id, p]));
  const est = r.status === 'paid' ? orderEstimate(r, category) : null;
  const st = m.voucher?.settlement;

  // ── 진행 이력 ──
  const events: Ev[] = [];
  events.push({
    at: r.createdAt,
    title: r.kind === 'hospital_visit' ? '진료 예약 요청 접수' : isRequest ? (isHotel ? '호텔 예약 문의 접수' : '예약 요청 접수') : r.kind === 'quote' && !m.stay ? '견적 인보이스 발행' : '인보이스 발행',
    detail: `${PAYMENT_METHOD_KO(r.paymentMethod)} · ${r.locale}${m.ua ? ` · ${m.ua.slice(0, 80)}` : ''}`,
  });
  if (m.partnerQuote) events.push({ at: m.partnerQuote.at, title: `파트너(호텔) 가격 제안 ${won(m.partnerQuote.won)}`, detail: m.partnerQuote.note });
  if (m.quotedAt) events.push({ at: m.quotedAt, title: `견적 발행 ${won(r.totalWon)} — 회원 메일 · 결제 링크`, detail: [m.quotedBy ? `발행: ${m.quotedBy}` : null, m.quoteNote].filter(Boolean).join(' · ') });
  if (r.reportedAt) events.push({ at: r.reportedAt, title: '고객 입금 신고 (자기신고)', tone: '#1d4ed8' });
  if (r.paidAt) {
    events.push({
      at: r.paidAt,
      title: r.kind === 'hospital_visit' ? '진료 예약 확정 처리' : r.totalWon > 0 ? `결제 · 입금 확인 ${won(r.totalWon)}` : '확정 처리',
      detail: [PAYMENT_METHOD_KO(r.paymentMethod), m.tossApprovedAt ? `토스 승인 ${fmtDateTime(m.tossApprovedAt)}` : null].filter(Boolean).join(' · '),
      tone: '#047857',
    });
  }
  if (m.reserveConfirmedAt) {
    events.push({
      at: m.reserveConfirmedAt,
      title: r.kind === 'hospital_visit' ? `진료 예약 확정 — ${m.visitYmd || r.reserveYmd || ''} ${m.visitTime || r.reserveTime}`.trim() : '예약 확정 (파트너와 일정 확인)',
      tone: '#047857',
    });
  }
  const checkins = m.voucher?.checkins?.length
    ? m.voucher.checkins
    : m.voucher?.checkedInAt ? [{ at: m.voucher.checkedInAt, orgId: m.voucher.checkedInByOrgId ?? '', orgName: m.voucher.checkedInByName ?? '' }] : [];
  for (const ck of checkins) events.push({ at: ck.at, title: `QR 방문 확인${ck.orgName ? ` · ${ck.orgName}` : ''}`, tone: '#1d4ed8' });
  if (st) {
    events.push({ at: st.declaredAt, title: `가맹점 최종 결제금액 입력 ${won(st.finalAmountWon)}`, detail: `수수료 ${won(st.feeWon)} (${(st.feeBp / 100).toFixed(st.feeBp % 100 === 0 ? 0 : 2)}%)${st.declaredBy ? ` · 입력 ${st.declaredBy}` : ''}` });
    if (st.consumerConfirmedAt) events.push({ at: st.consumerConfirmedAt, title: '소비자 금액 확인' });
    if (st.disputedAt) events.push({ at: st.disputedAt, title: '소비자 이의 제기', detail: st.disputeNote, tone: '#c2143c' });
    if (st.confirmedAt) events.push({ at: st.confirmedAt, title: `정산 금액 확정 (${st.confirmedBy === 'consumer' ? '소비자 확인' : st.confirmedBy === 'auto' ? '72시간 자동' : '운영 확정'})` });
  }
  if (m.hospitalFeeSettledAt) events.push({ at: m.hospitalFeeSettledAt, title: `병원 실결제액 정산 ${won(m.hospitalActualAmountWon)}`, detail: m.hospitalProcedureYmd ? `시술일 ${m.hospitalProcedureYmd}` : null });
  if (m.cancelRequest) events.push({ at: m.cancelRequest.at, title: `고객 취소 요청 · 규정 ${m.cancelRequest.pct}% → ${won(m.cancelRequest.refundWon)}`, detail: m.cancelRequest.reason, tone: '#c2143c' });
  if (m.cancel) {
    events.push({
      at: m.cancel.at,
      title: `취소 (${m.cancel.by === 'consumer' ? '고객' : '운영자'}) · 환불 ${won(m.cancel.refundWon)}`,
      detail: [m.cancel.method === 'toss' ? '토스 취소 API 로 원결제수단 환불' : m.cancel.method === 'alipay_manual' ? '알리페이 수동 송금 필요' : '환불 없음', m.cancel.note].filter(Boolean).join(' · '),
      tone: '#c2143c',
    });
  }
  if (r.completedAt) events.push({ at: r.completedAt, title: '완료 처리' });
  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  // ── 표시용 값 ──
  const name = c.name ?? profile?.fullName ?? null;
  const phone = c.phone ?? profile?.phone ?? null;
  const messenger = c.messenger ?? profile?.messenger ?? null;
  const country = c.country ?? profile?.countryCode ?? null;
  const gender = c.gender ?? profile?.gender ?? null;
  const birthDate = c.birthDate ?? profile?.birthDate ?? null;
  const note = m.stay?.note ?? m.memo ?? null;
  const interests = Array.isArray(m.interests) ? m.interests : [];
  const categoryKey = listing?.category ?? m.category ?? r.interestKey ?? null;
  const publicListingHref = r.listingSlug ? `/${r.locale || 'kr'}/listings/${r.listingSlug}` : null;
  const publicClinicHref = hospital?.slug ? `/kr/clinics/${hospital.slug}` : null;

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1240, margin: '0 auto' }}>
      <Link href="/master/orders" style={{ fontSize: 13, color: '#6a6a6a', textDecoration: 'none' }}>← 예약 인보이스 목록</Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.invoiceNo}</h1>
            <span style={{ background: s.bg, color: s.fg, borderRadius: 9999, padding: '4px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.text}</span>
            <span style={{ fontSize: 13, color: '#6a6a6a' }}>{kindLabel(r)}</span>
          </div>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}>
            {r.listingTitle}{r.hospitalName && r.hospitalName !== r.listingTitle ? ` · 🏥 ${r.hospitalName}` : ''} · {r.reserveDate} {r.reserveTime} · {r.guests}명
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {room ? (
            <Link href={`/master/chats?room=${room.id}`} style={pillLink('#222')}>
              💬 예약 채팅 열기{room.platformUnread > 0 ? ` · 안 읽음 ${room.platformUnread}` : ''}
            </Link>
          ) : (
            <span style={{ ...pillLink('#9c9c9c'), cursor: 'default' }}>💬 채팅 없음</span>
          )}
          {publicListingHref ? <Link href={publicListingHref} target="_blank" style={pillLink('#222')}>상품 페이지 ↗</Link> : null}
          {publicClinicHref ? <Link href={publicClinicHref} target="_blank" style={pillLink('#1d4ed8')}>병원 페이지 ↗</Link> : null}
          {hospital ? <Link href={`/master/hospitals/${hospital.id}/edit`} style={pillLink('#1d4ed8')}>병원 관리</Link> : null}
        </div>
      </div>

      {searchParams.ok ? <p style={{ color: '#047857', fontSize: 13, marginTop: 14, fontWeight: 700 }}>✅ {searchParams.ok}</p> : null}
      {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 14 }}>처리에 실패했습니다: {searchParams.error}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginTop: 20 }}>
        {/* ── 고객 ── */}
        <Card title="👤 고객 정보" sub={c.member ? '회원 계정에 묶인 예약' : '비회원 예약 (폼 입력 정보만)'}>
          <Row label="이름" value={name ? <b>{name}</b> : <Muted>입력 없음</Muted>} />
          {profile?.fullName && name && profile.fullName !== name ? <Row label="계정 이름" value={profile.fullName} /> : null}
          {profile?.username ? <Row label="아이디" value={profile.username} /> : null}
          <Row label="이메일" value={c.email ? <span style={{ wordBreak: 'break-all' }}>{c.email}</span> : <Muted>없음</Muted>} />
          <Row label="전화" value={phone ? <Copyable text={phone} /> : <Muted>없음</Muted>} />
          <Row label="메신저" value={messenger ?? <Muted>없음</Muted>} />
          {c.rawContact && c.rawContact !== phone && c.rawContact !== messenger ? <Row label="연락처 원문" value={c.rawContact} /> : null}
          <Row label="국가" value={country ?? <Muted>-</Muted>} />
          {gender ? <Row label="성별" value={GENDER_KO[gender] ?? gender} /> : null}
          {birthDate ? <Row label="생년월일" value={birthDate} /> : null}
          {passportNo || m.passportMasked ? (
            <Row
              label="여권번호"
              value={passportNo
                ? <span><b style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: 1 }}>{passportNo}</b><span style={{ fontSize: 11, color: '#9c9c9c' }}> · 암호화 저장 · 병원 접수용</span></span>
                : <span>{m.passportMasked} <span style={{ fontSize: 11, color: '#9c9c9c' }}>(복호화 실패 — 마스킹만 표시)</span></span>}
            />
          ) : null}
          <Row label="언어" value={`${r.locale}${m.portalLocale && m.portalLocale !== r.locale ? ` (포털 ${m.portalLocale})` : ''}`} />
          {c.member ? (
            <>
              <Row label="회원 ID" value={<code style={{ fontSize: 11 }}>{r.userId}</code>} />
              {profile ? (
                <Row
                  label="계정"
                  value={`가입 ${fmtDateTime(profile.createdAt)}${profile.lastSignInAt ? ` · 마지막 로그인 ${fmtDateTime(profile.lastSignInAt)}` : ''}${profile.provider ? ` · ${profile.provider}` : ''}${profile.signupSource ? ` · ${profile.signupSource}` : ''}`}
                />
              ) : profileRes.error ? (
                <Row label="계정" value={<Muted>계정 메타를 읽지 못했습니다 ({profileRes.error})</Muted>} />
              ) : null}
            </>
          ) : null}
          {m.ua ? <Row label="접속 환경" value={<span style={{ fontSize: 11, color: '#9c9c9c', wordBreak: 'break-all' }}>{m.ua}</span>} /> : null}
        </Card>

        {/* ── 예약 내용 ── */}
        <Card title="📅 예약 내용" sub={kindLabel(r)}>
          <Row label="상품" value={<span>{publicListingHref ? <Link href={publicListingHref} target="_blank" style={{ color: '#222' }}>{r.listingTitle}</Link> : <b>{r.listingTitle}</b>}{r.listingSlug ? <span style={{ fontSize: 11, color: '#9c9c9c' }}> · {r.listingSlug}</span> : null}</span>} />
          {r.hospitalName || hospital ? <Row label="병원" value={<span>🏥 {hospital?.name ?? r.hospitalName}{hospital && r.hospitalName && hospital.name !== r.hospitalName ? ` (주문 기록: ${r.hospitalName})` : ''}</span>} /> : null}
          {listing?.orgName ? <Row label="업체(파트너)" value={listing.orgName} /> : null}
          {categoryKey ? <Row label="카테고리" value={`${LEAD_CATEGORY_LABEL_KO[categoryKey] ?? categoryKey}${m.subType ? ` · ${m.subType}` : ''}${r.procedureCategory && r.procedureCategory !== categoryKey ? ` · 진료과 ${LEAD_CATEGORY_LABEL_KO[r.procedureCategory] ?? r.procedureCategory}` : ''}`} /> : r.procedureCategory ? <Row label="진료과" value={LEAD_CATEGORY_LABEL_KO[r.procedureCategory] ?? r.procedureCategory} /> : null}
          {m.stay ? (
            <>
              <Row label={isHotel ? '체크인' : '희망일'} value={`${m.stay.checkIn}${m.stay.nights > 0 ? ` · ${m.stay.nights}박` : ''}`} />
              {m.stay.arrival ? <Row label={isHotel ? '도착 시간' : '희망 시간'} value={m.stay.arrival} /> : null}
            </>
          ) : r.kind === 'hospital_visit' ? (
            <>
              <Row label="희망 일시" value={`${m.visitYmd || '-'} ${m.visitTime || ''}`.trim()} />
              <Row label="확정 일시" value={m.reserveConfirmedAt ? <b style={{ color: '#047857' }}>{r.reserveYmd ?? r.reserveDate} {r.reserveTime}</b> : <Muted>아직 확정 전</Muted>} />
            </>
          ) : (
            <Row label="일정" value={<span>{r.reserveDate} · {r.reserveTime}{r.reserveYmd && r.reserveYmd !== r.reserveDate ? <span style={{ color: '#9c9c9c' }}> ({r.reserveYmd})</span> : null}</span>} />
          )}
          <Row label="인원" value={`${r.guests}명`} />
          {interests.length > 0 ? <Row label="관심 분야" value={interests.map((k) => LEAD_CATEGORY_LABEL_KO[k] ?? k).join(', ')} /> : null}
          <Row label="요청 사항" value={note ? <span style={{ whiteSpace: 'pre-wrap' }}>{note}</span> : <Muted>없음</Muted>} />
          {m.quoteNote ? <Row label="견적 메모" value={<span style={{ whiteSpace: 'pre-wrap' }}>{m.quoteNote}</span>} /> : null}
          {m.partnerQuote ? <Row label="파트너 제안" value={`${won(m.partnerQuote.won)}${m.partnerQuote.note ? ` · ${m.partnerQuote.note}` : ''} (${fmtDateTime(m.partnerQuote.at)})`} /> : null}
          {m.source ? <Row label="접수 경로" value={m.source === 'hospital_inquiry' ? '병원 문의 폼 / AI 상담' : m.source} /> : null}
          {m.conversationId ? <Row label="상담 대화 ID" value={<code style={{ fontSize: 11 }}>{m.conversationId}</code>} /> : null}
          {r.patientLabel && r.patientLabel !== name ? <Row label="환자 표기" value={r.patientLabel} /> : null}
        </Card>

        {/* ── 결제 · 금액 ── */}
        <Card title="💳 결제 · 금액" sub={PAYMENT_METHOD_KO(r.paymentMethod)}>
          {isRequest && r.totalWon === 0 ? (
            <Row label="금액" value={<span style={{ color: '#c81e42', fontWeight: 700 }}>{r.subtotalWon > 0 ? `표시가 ${won(r.subtotalWon)} · 견적 확정 전` : '가격 미표시 상품 · 견적 대기'}</span>} />
          ) : r.kind === 'hospital_visit' ? (
            <Row label="금액" value={<span style={{ color: '#1d4ed8', fontWeight: 700 }}>무료 예약 (진료비는 병원 현장 결제)</span>} />
          ) : (
            <>
              {r.unitPriceWon > 0 ? <Row label="단가 × 인원" value={`${won(r.unitPriceWon)} × ${r.guests}`} /> : null}
              {m.depositWon ? (
                <>
                  <Row label="예약금" value={<b>{won(m.depositWon)}</b>} />
                  <Row label="현장 결제 예정" value={won(m.payOnSiteWon ?? r.subtotalWon)} />
                </>
              ) : (
                <>
                  <Row label="상품 금액" value={won(r.subtotalWon)} />
                  {r.serviceFeeWon > 0 ? <Row label="수수료" value={won(r.serviceFeeWon)} /> : null}
                </>
              )}
              <Row label="결제 금액" value={<b style={{ fontSize: 16 }}>{won(r.totalWon)}</b>} />
            </>
          )}
          <Row label="결제 수단" value={PAYMENT_METHOD_KO(r.paymentMethod)} />
          {m.tossPaymentKey ? <Row label="토스 결제키" value={<span><code style={{ fontSize: 11, wordBreak: 'break-all' }}>{m.tossPaymentKey}</code>{m.tossApprovedAt ? <span style={{ color: '#6a6a6a' }}> · 승인 {fmtDateTime(m.tossApprovedAt)}</span> : null}{m.tossCancelStatus ? ` · ${m.tossCancelStatus}` : ''}</span>} /> : null}
          {r.kind === 'quote' && m.payToken && r.status === 'issued' ? <Row label="결제 링크" value={<code style={{ fontSize: 11, wordBreak: 'break-all' }}>{payLinkFor(r.locale || 'kr', r.invoiceNo, m.payToken)}</code>} /> : null}
          {r.paidAt ? <Row label="결제·확인 시각" value={fmtDateTime(r.paidAt)} /> : null}
          {r.reportedAt ? <Row label="입금 신고" value={fmtDateTime(r.reportedAt)} /> : null}
          {r.hospitalFeeBp != null || r.procedureAmountWon != null || m.hospitalActualAmountWon ? (
            <Row
              label="병원 수수료"
              value={[
                r.hospitalFeeBp != null ? `요율 ${(r.hospitalFeeBp / 100).toFixed(r.hospitalFeeBp % 100 === 0 ? 0 : 2)}%` : null,
                r.procedureAmountWon != null ? `시술가 ${won(r.procedureAmountWon)}` : null,
                m.hospitalActualAmountWon ? `실결제 ${won(m.hospitalActualAmountWon)}` : '실결제액 확정 전',
              ].filter(Boolean).join(' · ')}
            />
          ) : null}
          {st ? (
            <Row
              label="가맹점 정산"
              value={`최종 ${won(st.finalAmountWon)} · 온라인 선결제 ${won(st.onlinePaidWon)} · 수수료 ${won(st.feeWon)} · ${SETTLEMENT_STATUS_KO[st.status] ?? st.status}`}
            />
          ) : null}
          {est && r.status === 'paid' && !m.cancel ? (
            <Row label="지금 취소 시" value={`규정 환불 ${est.pct}% → ${won(est.refundWon)} (${REFUND_CATEGORY_KO[category]}${est.reserveYmd ? ` · ${est.daysBefore}일 전` : ''})`} />
          ) : null}
          {m.cancelRequest ? <Row label="고객 취소 요청" value={<span style={{ color: '#c2143c' }}>{fmtDateTime(m.cancelRequest.at)} · 규정 {m.cancelRequest.pct}% → {won(m.cancelRequest.refundWon)}{m.cancelRequest.reason ? ` · 사유: ${m.cancelRequest.reason}` : ''}</span>} /> : null}
          {m.cancel ? <Row label="취소·환불" value={<span style={{ color: '#c2143c' }}>{fmtDateTime(m.cancel.at)} · 환불 {won(m.cancel.refundWon)} · {m.cancel.method === 'toss' ? '토스 취소 완료' : m.cancel.method === 'alipay_manual' ? '알리페이 수동 송금 필요' : '환불 없음'}{m.cancel.note ? ` · ${m.cancel.note}` : ''}</span>} /> : null}
          <Row
            label="추천 귀속"
            value={
              r.partnerId || r.distributorId ? (
                <span>
                  {r.partnerId ? <span>파트너 {partnerById.get(r.partnerId)?.name ?? r.partnerId}{partnerById.get(r.partnerId)?.code ? ` (${partnerById.get(r.partnerId)?.code})` : ''}</span> : null}
                  {r.partnerId && r.distributorId ? ' · ' : ''}
                  {r.distributorId ? <span>총판 {partnerById.get(r.distributorId)?.name ?? r.distributorId}</span> : null}
                  {' '}<Link href="/master/partners" style={{ fontSize: 12 }}>파트너 관리</Link>
                </span>
              ) : <Muted>없음</Muted>
            }
          />
        </Card>

        {/* ── 진행 이력 ── */}
        <Card title="🕒 진행 이력" sub={`발행 ${fmtDateTime(r.createdAt)} · 마지막 변경 ${fmtDateTime(r.updatedAt)}`}>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {events.map((e, i) => (
              <li key={`${i}-${e.title}`} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10, fontSize: 13, alignItems: 'baseline' }}>
                <span style={{ color: '#6a6a6a', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDateTime(e.at)}</span>
                <span>
                  <span style={{ fontWeight: 700, color: e.tone ?? '#222' }}>{e.title}</span>
                  {e.detail ? <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 2, whiteSpace: 'pre-wrap' }}>{e.detail}</div> : null}
                </span>
              </li>
            ))}
          </ol>
          {room ? (
            <div style={{ marginTop: 14, fontSize: 12, color: '#6a6a6a', borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
              💬 채팅 {room.status} · 마지막 메시지 {fmtDateTime(room.lastMessageAt)}{room.preview || room.previewRaw ? ` · "${(room.preview || room.previewRaw || '').slice(0, 80)}"` : ''}
            </div>
          ) : null}
        </Card>
      </div>

      {/* ── 처리 ── */}
      <section style={{ marginTop: 20, border: '1px solid #ebebeb', borderRadius: 14, padding: '16px 18px', background: '#fff' }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>🛠 처리</div>
        <p style={{ fontSize: 12, color: '#6a6a6a', margin: '4px 0 10px' }}>
          목록 화면과 같은 버튼입니다. 입금 확인·예약 확정·취소·환불·정산은 확인 창을 한 번 거치고, 처리 뒤 이 페이지로 돌아옵니다.
        </p>
        <div style={{ fontSize: 13 }}>
          <OrderActions order={r} category={category} />
        </div>
      </section>

      {/* ── 원본 데이터 ── */}
      <details style={{ marginTop: 16, border: '1px solid #ebebeb', borderRadius: 14, padding: '12px 18px', background: '#fafafa' }}>
        <summary style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#6a6a6a' }}>원본 데이터 (checkout_orders 행 · meta JSON)</summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 16px', marginTop: 10, fontSize: 12 }}>
          <KV k="id" v={r.id} /><KV k="kind" v={r.kind} /><KV k="status" v={r.status} /><KV k="interest_key" v={r.interestKey} />
          <KV k="listing_slug" v={r.listingSlug} /><KV k="procedure_category" v={r.procedureCategory} /><KV k="hospital_name" v={r.hospitalName} />
          <KV k="partner_id" v={r.partnerId} /><KV k="distributor_id" v={r.distributorId} /><KV k="user_id" v={r.userId} />
          <KV k="created_at" v={fmtDateTime(r.createdAt, { seconds: true })} /><KV k="updated_at" v={fmtDateTime(r.updatedAt, { seconds: true })} />
          <KV k="reported_at" v={r.reportedAt ? fmtDateTime(r.reportedAt, { seconds: true }) : null} /><KV k="paid_at" v={r.paidAt ? fmtDateTime(r.paidAt, { seconds: true }) : null} />
          <KV k="completed_at" v={r.completedAt ? fmtDateTime(r.completedAt, { seconds: true }) : null} />
        </div>
        <pre style={{ fontSize: 11, lineHeight: 1.5, background: '#fff', border: '1px solid #ebebeb', borderRadius: 10, padding: 12, overflowX: 'auto', marginTop: 10 }}>
          {JSON.stringify(r.meta ?? {}, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function pillLink(color: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4, border: `1px solid ${color}`, color, background: '#fff',
    borderRadius: 9999, padding: '6px 12px', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
  };
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }): JSX.Element {
  return (
    <section style={{ border: '1px solid #ebebeb', borderRadius: 14, padding: '16px 18px', background: '#fff' }}>
      <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
      {sub ? <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 2 }}>{sub}</div> : null}
      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, fontSize: 13, alignItems: 'baseline' }}>
      <span style={{ color: '#6a6a6a', fontSize: 12 }}>{label}</span>
      <span style={{ wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }): JSX.Element {
  return <span style={{ color: '#9c9c9c' }}>{children}</span>;
}

function Copyable({ text }: { text: string }): JSX.Element {
  return <a href={`tel:${text.replace(/[^\d+]/g, '')}`} style={{ color: '#222', textDecoration: 'underline', textDecorationColor: '#ddd' }}>{text}</a>;
}

function KV({ k, v }: { k: string; v: string | null | undefined }): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
      <span style={{ color: '#9c9c9c', whiteSpace: 'nowrap' }}>{k}</span>
      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, wordBreak: 'break-all' }}>{v ?? '—'}</span>
    </div>
  );
}
