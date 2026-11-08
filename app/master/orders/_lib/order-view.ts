import type { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import type { StayRequestMeta } from '@/lib/stay/request';
import type { HospitalVisitMeta } from '@/lib/hospital-visit/service';
import type { CancelMeta, CancelRequestMeta } from '@/lib/refund/service';
import type { VoucherMeta } from '@/lib/voucher/token';

/**
 * 예약 인보이스(checkout_orders) 화면 공용 — 목록(/master/orders)과 상세(/master/orders/[id])가
 * 같은 라벨·고객 정보 판정을 쓴다.
 *
 * 고객 정보는 주문 종류마다 다른 자리에 저장돼 있다:
 *   - 결제 주문(listing·quote): user_email + meta.contactPhone/contactMessenger/contactCountry (결제 폼 또는 가입 메타)
 *   - 호텔·예약 요청(stay_request·booking_request): meta.stay.{name,contact,countryCode,messengerKind,messengerId}
 *   - 병원 진료 예약(hospital_visit): guest_name/guest_contact/guest_country_code + meta.{phone,messengerType,messengerId,email,gender,birthDate}
 * customerOf() 가 이를 한 모양으로 합친다.
 */
export type OrderRow = typeof checkoutOrders.$inferSelect;

/** 주문 meta 에 실제로 쓰이는 키들 — 각 흐름의 타입을 합친 느슨한 뷰 */
export type OrderMetaView = Partial<StayRequestMeta> & Partial<HospitalVisitMeta> & {
  ua?: string;
  depositWon?: number;
  payOnSiteWon?: number;
  contactCountry?: string;
  contactPhone?: string;
  contactMessenger?: string;
  tossPaymentKey?: string;
  tossApprovedAt?: string;
  tossCancelStatus?: string;
  quoteNote?: string | null;
  quotedAt?: string;
  quotedBy?: string;
  reserveConfirmedAt?: string;
  hospitalActualAmountWon?: number;
  hospitalFeeSettledAt?: string;
  hospitalProcedureYmd?: string;
  cancelRequest?: CancelRequestMeta;
  cancel?: CancelMeta;
  voucher?: VoucherMeta;
  payToken?: string;
};

export const metaOf = (r: OrderRow): OrderMetaView => ((r.meta ?? {}) as OrderMetaView);

export const STATUS_LABEL: Record<string, { text: string; bg: string; fg: string }> = {
  issued: { text: '발행됨 · 입금 대기', bg: '#fff7ed', fg: '#b45309' },
  reported: { text: '입금 신고 · 확인 필요', bg: '#eff6ff', fg: '#1d4ed8' },
  paid: { text: '입금 확인', bg: '#ecfdf5', fg: '#047857' },
  cancelled: { text: '취소', bg: '#f5f5f5', fg: '#6a6a6a' },
};

export const statusOf = (r: OrderRow): { text: string; bg: string; fg: string } => {
  const m = metaOf(r);
  // 진행 단계가 더 있는 종류는 상태값보다 자세히 보여준다
  if (r.status === 'paid' && m.voucher?.checkedInAt) return { text: '방문 확인됨', bg: '#eff6ff', fg: '#1d4ed8' };
  if (r.kind === 'hospital_visit') {
    if (r.status === 'issued') return { text: '진료 예약 요청 · 확정 대기', bg: '#fffbeb', fg: '#b45309' };
    if (r.status === 'paid') return { text: '진료 예약 확정', bg: '#ecfdf5', fg: '#047857' };
  }
  if ((r.kind === 'stay_request' || r.kind === 'booking_request') && r.status === 'issued') return { text: '요청 접수 · 견적 대기', bg: '#fffbeb', fg: '#b45309' };
  if (r.kind === 'quote' && r.status === 'issued') return { text: '견적 발행 · 결제 대기', bg: '#fff5f7', fg: '#c81e42' };
  if (r.status === 'paid' && m.depositWon && !m.reserveConfirmedAt) return { text: '예약금 입금 · 확정 대기', bg: '#fff7ed', fg: '#b45309' };
  if (r.status === 'paid' && m.depositWon && m.reserveConfirmedAt) return { text: '예약 확정', bg: '#ecfdf5', fg: '#047857' };
  return STATUS_LABEL[r.status] ?? { text: r.status, bg: '#f5f5f5', fg: '#6a6a6a' };
};

/** 주문 종류 한국어 라벨 */
export function kindLabel(r: OrderRow): string {
  const m = metaOf(r);
  switch (r.kind) {
    case 'hospital_visit': return '🏥 병원 진료 예약 (무료)';
    case 'stay_request': return '🏨 호텔 예약 문의';
    case 'booking_request': return m.subType === 'free' ? '🧳 자유여행 견적 문의' : '📩 예약 요청 (확인 후 견적)';
    case 'quote': return '💌 견적 인보이스';
    default:
      if (m.depositWon) return '💳 예약금 결제';
      if (r.procedureCategory || r.hospitalName) return '💳 의료 상품 결제';
      return '💳 예약 결제';
  }
}

export type CustomerView = {
  name: string | null;
  /** 회원 계정 이메일(또는 폼에 적은 이메일) */
  email: string | null;
  /** 계정에 묶인 주문인지 */
  member: boolean;
  phone: string | null;
  messenger: string | null;
  country: string | null;
  gender: string | null;
  birthDate: string | null;
  /** 원문 연락처(합쳐진 문자열) — 전화/메신저로 못 나눈 경우 */
  rawContact: string | null;
};

const notEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export function customerOf(r: OrderRow): CustomerView {
  const m = metaOf(r);
  const stay = m.stay;
  const stayContact = stay?.contact?.trim() || null;
  const stayIsEmail = !!stayContact && stayContact.includes('@');

  const name = [r.guestName, stay?.name, r.patientLabel].find(notEmpty) ?? null;
  const email = [r.userEmail, m.email, stayIsEmail ? stayContact : null].find(notEmpty) ?? null;
  const phone = [m.phone, m.contactPhone, !stayIsEmail ? stayContact : null].find(notEmpty) ?? null;
  const messenger = stay?.messengerId
    ? `${stay.messengerKind ?? ''} ${stay.messengerId}`.trim()
    : m.messengerId
      ? `${m.messengerType ?? ''} ${m.messengerId}`.trim()
      : notEmpty(m.contactMessenger) ? m.contactMessenger : null;
  const country = [r.guestCountryCode, stay?.countryCode, m.contactCountry].find(notEmpty) ?? null;
  const rawContact = notEmpty(r.guestContact) ? r.guestContact : null;
  return {
    name, email, member: !!r.userId, phone, messenger, country,
    gender: notEmpty(m.gender) ? m.gender : null,
    birthDate: notEmpty(m.birthDate) ? m.birthDate : null,
    rawContact,
  };
}

export const GENDER_KO: Record<string, string> = { male: '남성', female: '여성', other: '기타', prefer_not_to_say: '밝히지 않음', m: '남성', f: '여성' };

export const won = (n: number | null | undefined): string => `₩${Math.round(n ?? 0).toLocaleString('ko-KR')}`;

/** 서울 시각 — 운영자 화면 공통 포맷 */
export function fmtDateTime(v: string | Date | null | undefined, opts: { seconds?: boolean } = {}): string {
  if (!v) return '-';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    ...(opts.seconds ? { second: '2-digit' } : {}), hour12: false, timeZone: 'Asia/Seoul',
  });
}

export const PAYMENT_METHOD_KO = (m: string): string => {
  if (m === 'none') return '결제 없음(요청)';
  if (m === 'alipay') return '알리페이 QR';
  if (m.startsWith('toss')) {
    const sub = m.split(':')[1] ?? '';
    const subKo: Record<string, string> = { card: '카드', '카드': '카드', 간편결제: '간편결제', easy_pay: '간편결제', 가상계좌: '가상계좌', 계좌이체: '계좌이체', 휴대폰: '휴대폰' };
    return `토스페이먼츠${sub ? ` · ${subKo[sub] ?? sub}` : ''}`;
  }
  return m;
};
