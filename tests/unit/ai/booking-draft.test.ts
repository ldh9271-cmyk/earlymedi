/** AI 상담 '대화로 예약 요청' — 블록 추출·초안 검증·진료시간 경고 (순수 로직) */
import { describe, expect, it } from 'vitest';
import { extractBookingBlock, stripBookingBlock } from '@/lib/ai/booking/block';
import { bookingPrompt, resolveBookingDraft, type ClinicRef } from '@/lib/ai/booking/draft';
import { checkVisitSlot } from '@/lib/booking/visit-slot';
import type { WeeklyHours } from '@/lib/hours/status';

const HOURS: WeeklyHours = { mon: ['1000', '1900'], tue: ['1000', '1900'], wed: ['1000', '1900'], thu: ['1000', '1900'], fri: ['1000', '1900'], sat: ['1000', '1500'], lunchWeek: '13:00~14:00', closedHoliday: 'Y' };
const CLINIC: ClinicRef = { hospitalId: '11111111-1111-4111-8111-111111111111', hospitalName: '드림성형외과의원', title: '드림성형외과', hours: HOURS, hoursText: '평일 10:00~19:00 · 토 10:00~15:00 · 점심 13:00~14:00' };
// 2026-10-21(수) 11:00 KST = 02:00Z
const NOW = new Date('2026-10-21T02:00:00Z');
const base = { hospital: '드림성형외과', visitYmd: '2026-10-28', visitTime: '14:30', name: '田中 花子', gender: 'female', countryCode: 'jp', phone: '+81 90 1234 5678', messengerType: 'LINE', messengerId: 'hanako_t', email: '', birthDate: '1992-05-04', memo: '쌍꺼풀 매몰법 상담' };
const block = `요약입니다. 아래 카드를 확인해 주세요.\n<booking>${JSON.stringify(base)}</booking>`;

describe('booking block', () => {
  it('완성 블록을 떼어 내고 JSON 을 파싱한다', () => {
    const r = extractBookingBlock(block);
    expect(r.text).toBe('요약입니다. 아래 카드를 확인해 주세요.');
    expect((r.raw as { hospital: string }).hospital).toBe('드림성형외과');
  });
  it('스트리밍 중 잘린 꼬리와 코드펜스도 표시에서 지운다', () => {
    expect(stripBookingBlock('답변\n```json\n<booking>{"hospital":"드')).toBe('답변');
    expect(stripBookingBlock('블록 없음')).toBe('블록 없음');
  });
});

describe('resolveBookingDraft', () => {
  it('DATA 병원과 짝을 맞추고 시간을 정규화한다', () => {
    const r = resolveBookingDraft({ ...base, visitTime: '14시30', hospital: '드림성형외과의원 (Dream)' }, { clinics: [CLINIC], now: NOW });
    expect(r?.draft.hospitalId).toBe(CLINIC.hospitalId);
    expect(r?.draft.hospitalName).toBe('드림성형외과의원');
    expect(r?.draft.visitTime).toBe('14:30');
    expect(r?.draft.countryCode).toBe('JP');
    expect(r?.issues).toEqual([]);
    expect(r?.hoursText).toBe(CLINIC.hoursText);
  });
  it('DATA 에 없는 병원·필수값 누락이면 null', () => {
    expect(resolveBookingDraft({ ...base, hospital: '없는병원' }, { clinics: [CLINIC], now: NOW })).toBeNull();
    expect(resolveBookingDraft({ ...base, phone: '' }, { clinics: [CLINIC], now: NOW })).toBeNull();
  });
  it('3개월 밖·지난 시간은 하드 경고, 휴진·점심·시간 밖은 안내 경고', () => {
    expect(resolveBookingDraft({ ...base, visitYmd: '2027-03-01' }, { clinics: [CLINIC], now: NOW })?.issues).toEqual(['window']);
    expect(resolveBookingDraft({ ...base, visitYmd: '2026-10-21', visitTime: '10:30' }, { clinics: [CLINIC], now: NOW })?.issues).toEqual(['past']);
    expect(resolveBookingDraft({ ...base, visitYmd: '2026-10-25' }, { clinics: [CLINIC], now: NOW })?.issues).toEqual(['closed_day']); // 일요일
    expect(resolveBookingDraft({ ...base, visitTime: '13:20' }, { clinics: [CLINIC], now: NOW })?.issues).toEqual(['lunch']);
    expect(resolveBookingDraft({ ...base, visitTime: '19:30' }, { clinics: [CLINIC], now: NOW })?.issues).toEqual(['after_close']);
    expect(resolveBookingDraft({ ...base, visitYmd: '2026-12-25' }, { clinics: [CLINIC], holidays: new Set(['2026-12-25']), now: NOW })?.issues).toEqual(['closed_day']);
  });
});

describe('checkVisitSlot', () => {
  it('진료시간 정보가 없으면 지난 시간만 본다', () => {
    expect(checkVisitSlot(null, '2026-10-28', '03:00', new Set(), NOW)).toBeNull();
    expect(checkVisitSlot(null, '2026-10-20', '15:00', new Set(), NOW)).toBe('past');
  });
});

describe('bookingPrompt', () => {
  it('오늘 날짜·요일과 프로필을 넣는다', () => {
    const p = bookingPrompt({ todayYmd: '2026-10-21', member: true, profile: { name: '홍길동', phone: '+82 10 1234 5678' } });
    expect(p).toContain('2026-10-21 (Wed)');
    expect(p).toContain('name=홍길동');
    expect(p).toContain('<booking>');
    expect(bookingPrompt({ todayYmd: '2026-10-21', member: false, profile: null })).toContain('not signed in');
  });
});
