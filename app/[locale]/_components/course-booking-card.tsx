'use client';

// 랜딩 베스트셀러 코스 예약 카드 (클라이언트).
// 시작일 하나만 고르면 durationDays 기준으로 종료일이 자동 계산되고,
// 인원(최대 6명)에 따라 요금이 곱해진다.
import { useEffect, useMemo, useState } from 'react';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import ReserveButton, { type ReserveSummary } from './reserve-modal';

const MAX_GUESTS = 6;

export type CourseBookingLabels = {
  perPerson: string;
  startDate: string;
  pax: string;
  guest1: string; // 단수형 (예: '게스트 1명' / '1 guest')
  guestN: string; // '{n}' 치환 템플릿
  book: string;
  notCharged: string;
  included: string;
  thirdRow: string;
  total: string;
  rating: string;
};

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function toYmd(d: Date): string {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

export default function CourseBookingCard({
  bcp47,
  locale,
  priceLabel,
  priceWon,
  durationDays,
  bookHref,
  labels,
  summary,
  checkout,
  listingSlug,
}: {
  bcp47: string;
  locale: PublicLocale;
  priceLabel: string;
  priceWon: number | null;
  durationDays: number;
  bookHref: string;
  labels: CourseBookingLabels;
  summary: ReserveSummary;
  checkout: Dictionary['checkout'];
  listingSlug?: string;
}): JSX.Element {
  const [start, setStart] = useState('');
  const [guests, setGuests] = useState(1);
  // min 날짜는 서버/클라이언트 시간대가 달라 hydration 이 어긋날 수 있어 mount 후 설정
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');
  useEffect(() => {
    setMinDate(toYmd(new Date()));
    const limit = new Date();
    limit.setMonth(limit.getMonth() + 3); // 예약 상한 — 오늘 + 3개월
    setMaxDate(toYmd(limit));
  }, []);

  const nights = Math.max(1, durationDays - 1);
  const endDate = useMemo(() => {
    if (!start) return null;
    const d = new Date(start + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + nights);
    return d;
  }, [start, nights]);

  const fmt = (d: Date): string =>
    d.toLocaleDateString(bcp47, { year: 'numeric', month: 'short', day: 'numeric' });

  const totalLabel = priceWon
    ? '₩' + (priceWon * guests).toLocaleString('ko-KR')
    : priceLabel;
  const href = useMemo(() => {
    const params = [start ? 'start=' + start : null, 'guests=' + guests]
      .filter(Boolean)
      .join('&');
    return bookHref + (bookHref.includes('?') ? '&' : '?') + params;
  }, [bookHref, start, guests]);

  const fieldLabelStyle = { fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' } as const;
  const fieldValueStyle = {
    border: 'none', outline: 'none', background: 'transparent',
    fontSize: 14, marginTop: 2, width: '100%', padding: 0,
    fontFamily: 'inherit', color: '#222', cursor: 'pointer',
  } as const;

  return (
    <div
      className="m-course-book"
      style={{
        position: 'sticky', top: 200,
        border: '1px solid #dddddd', borderRadius: 14, padding: 24,
        boxShadow:
          'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <span className="m-course-price" style={{ fontSize: 21, fontWeight: 700 }}>{priceLabel}</span>{' '}
          <span style={{ fontSize: 15, color: '#6a6a6a' }}>{labels.perPerson}</span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
            <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
          </svg>
          {labels.rating}
        </span>
      </div>
      <div
        style={{
          border: '1px solid #c1c1c1', borderRadius: 12,
          marginTop: 18, overflow: 'hidden',
        }}
      >
        <label style={{ display: 'block', padding: '12px 14px', borderBottom: '1px solid #c1c1c1', cursor: 'pointer' }}>
          <div style={fieldLabelStyle}>{labels.startDate}</div>
          <input
            type="date"
            value={start}
            min={minDate}
            max={maxDate}
            onChange={(e) => {
              let v = e.target.value;
              if (v && minDate && v < minDate) v = minDate;
              if (v && maxDate && v > maxDate) v = maxDate;
              setStart(v);
            }}
            style={fieldValueStyle}
          />
          {start && endDate ? (
            <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 4 }}>
              {fmt(new Date(start + 'T00:00:00'))} → {fmt(endDate)}
            </div>
          ) : null}
        </label>
        <label style={{ display: 'block', padding: '12px 14px', cursor: 'pointer' }}>
          <div style={fieldLabelStyle}>{labels.pax}</div>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            style={{ ...fieldValueStyle, appearance: 'none', WebkitAppearance: 'none' }}
          >
            {Array.from({ length: MAX_GUESTS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? labels.guest1 : labels.guestN.replace('{n}', String(n))}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ReserveButton
        locale={locale}
        href={href}
        label={labels.book}
        summary={summary}
        labels={checkout}
        listingSlug={listingSlug}
        fixedDateLabel={start && endDate ? fmt(new Date(start + 'T00:00:00')) + ' → ' + fmt(endDate) : undefined}
        guestCount={guests}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', marginTop: 16,
          background: '#ff385c', color: '#fff',
          border: 'none', borderRadius: 8, height: 50,
          fontWeight: 500, fontSize: 16,
          cursor: 'pointer', textDecoration: 'none',
        }}
      />
      <div style={{ textAlign: 'center', fontSize: 14, color: '#6a6a6a', marginTop: 12 }}>
        {labels.notCharged}
      </div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6a6a6a' }}>
          <span>{priceLabel} × {guests}</span>
          <span>{totalLabel}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6a6a6a' }}>
          <span>{labels.thirdRow}</span>
          <span>{labels.included}</span>
        </div>
        <div style={{ height: 1, background: '#ebebeb', margin: '6px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 16 }}>
          <span>{labels.total}</span>
          <span>{totalLabel}</span>
        </div>
      </div>
    </div>
  );
}
