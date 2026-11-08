import { describe, expect, it } from 'vitest';
import { customerOf, kindLabel, statusOf, type OrderRow } from '@/app/master/orders/_lib/order-view';

/** checkout_orders 한 행의 최소 모양 — 테스트마다 필요한 칸만 덮어쓴다. */
function row(patch: Partial<OrderRow>): OrderRow {
  const base = {
    id: '11111111-1111-4111-8111-111111111111', invoiceNo: 'GU-20261108-0001', status: 'issued', locale: 'kr',
    listingSlug: null, listingTitle: '테스트 상품', interestKey: null, reserveDate: '2026-11-20', reserveYmd: '2026-11-20', reserveTime: '10:00', guests: 1,
    unitPriceWon: 0, subtotalWon: 0, serviceFeeWon: 0, totalWon: 0, paymentMethod: 'none', userId: null, userEmail: null, kind: 'listing',
    partnerId: null, distributorId: null, procedureCategory: null, procedureAmountWon: null, hospitalFeeBp: null, hospitalName: null, patientLabel: null,
    completedAt: null, guestName: null, guestContact: null, guestCountryCode: null, meta: {}, createdAt: new Date('2026-11-08T00:00:00Z'), updatedAt: new Date('2026-11-08T00:00:00Z'),
    reportedAt: null, paidAt: null,
  } as unknown as OrderRow;
  return { ...base, ...patch } as OrderRow;
}

describe('customerOf — 주문 종류별 고객 정보 통합', () => {
  it('병원 진료 예약: guest_* 칸과 meta 의 전화·메신저·이메일·성별·생년월일을 모은다', () => {
    const c = customerOf(row({
      kind: 'hospital_visit', guestName: '홍길동', guestContact: '010-1234-5678 · kakao hong', guestCountryCode: 'KR', patientLabel: '홍길동',
      meta: { hospitalVisit: true, phone: '010-1234-5678', messengerType: 'kakao', messengerId: 'hong', email: 'hong@example.com', gender: 'male', birthDate: '1990-01-01' },
    }));
    expect(c.name).toBe('홍길동');
    expect(c.email).toBe('hong@example.com');
    expect(c.member).toBe(false);
    expect(c.phone).toBe('010-1234-5678');
    expect(c.messenger).toBe('kakao hong');
    expect(c.country).toBe('KR');
    expect(c.gender).toBe('male');
    expect(c.birthDate).toBe('1990-01-01');
  });

  it('호텔 예약 문의: meta.stay 에서 이름·연락처·메신저·국가를 읽고 회원 이메일을 우선한다', () => {
    const c = customerOf(row({
      kind: 'stay_request', userId: '22222222-2222-4222-8222-222222222222', userEmail: 'member@example.com',
      meta: { stay: { name: 'Tanaka', contact: '+81 90 0000 0000', countryCode: 'JP', messengerKind: 'LINE', messengerId: 'tanaka_jp', checkIn: '2026-12-01', nights: 2, arrival: '15:00', note: '금연 객실' } },
    }));
    expect(c.name).toBe('Tanaka');
    expect(c.email).toBe('member@example.com');
    expect(c.member).toBe(true);
    expect(c.phone).toBe('+81 90 0000 0000');
    expect(c.messenger).toBe('LINE tanaka_jp');
    expect(c.country).toBe('JP');
  });

  it('비회원 요청에서 연락처가 이메일이면 이메일로, 전화는 비운다', () => {
    const c = customerOf(row({ kind: 'booking_request', meta: { stay: { name: 'Li', contact: 'li@example.com', countryCode: 'CN', messengerKind: null, messengerId: null, checkIn: '2026-12-05', nights: 0, arrival: null, note: null } } }));
    expect(c.email).toBe('li@example.com');
    expect(c.phone).toBeNull();
    expect(c.member).toBe(false);
  });

  it('결제 주문: 결제 폼/가입 메타에서 온 contactPhone·contactMessenger·contactCountry 를 쓴다', () => {
    const c = customerOf(row({
      kind: 'listing', userId: '33333333-3333-4333-8333-333333333333', userEmail: 'pay@example.com', totalWon: 50000,
      meta: { contactPhone: '010-9999-0000', contactMessenger: 'whatsapp +82109990000', contactCountry: 'KR', depositWon: 50000, payOnSiteWon: 300000 },
    }));
    expect(c.name).toBeNull();
    expect(c.email).toBe('pay@example.com');
    expect(c.phone).toBe('010-9999-0000');
    expect(c.messenger).toBe('whatsapp +82109990000');
    expect(c.country).toBe('KR');
  });
});

describe('statusOf / kindLabel — 진행 단계 라벨', () => {
  it('진료 예약은 issued=확정 대기, paid=확정, 방문 확인되면 방문 확인됨', () => {
    expect(statusOf(row({ kind: 'hospital_visit', status: 'issued' })).text).toContain('확정 대기');
    expect(statusOf(row({ kind: 'hospital_visit', status: 'paid', meta: { reserveConfirmedAt: '2026-11-08T01:00:00Z' } })).text).toBe('진료 예약 확정');
    expect(statusOf(row({ kind: 'hospital_visit', status: 'paid', meta: { voucher: { checkedInAt: '2026-11-20T01:00:00Z' } } })).text).toBe('방문 확인됨');
  });

  it('예약금 주문은 입금 뒤 확정 전/후를 구분한다', () => {
    expect(statusOf(row({ status: 'paid', meta: { depositWon: 50000 } })).text).toContain('확정 대기');
    expect(statusOf(row({ status: 'paid', meta: { depositWon: 50000, reserveConfirmedAt: '2026-11-08T01:00:00Z' } })).text).toBe('예약 확정');
    expect(kindLabel(row({ meta: { depositWon: 50000 } }))).toContain('예약금');
  });

  it('요청·견적 종류 라벨', () => {
    expect(kindLabel(row({ kind: 'stay_request' }))).toContain('호텔');
    expect(kindLabel(row({ kind: 'booking_request', meta: { subType: 'free' } }))).toContain('자유여행');
    expect(kindLabel(row({ kind: 'quote' }))).toContain('견적');
    expect(statusOf(row({ kind: 'quote', status: 'issued' })).text).toContain('결제 대기');
  });
});
