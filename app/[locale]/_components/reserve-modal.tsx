'use client';

// 예약하기 → 데스크톱은 팝업(모달)으로 결제 요약을 띄우고, 모바일은
// 기존대로 /checkout 페이지로 바로 이동한다. 좁은 화면에서 모달은
// 스크롤·닫기가 번거로워 전체 페이지가 더 낫다.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

export type ReserveSummary = {
  title: string;
  coverImageUrl: string | null;
  rating: string;
  location: string;
  priceWon: number;
  /** '1인', '박' 처럼 DB/사전에서 온 단위 라벨. */
  priceUnitLabel: string;
  interest: string;
};

/** 팝업으로 띄울 최소 화면 폭 — 이 아래는 페이지 이동. */
const DESKTOP_MIN_WIDTH = 1024;

/** '/ 1인' · '1인' → '인' — 수량은 실제 인원수로 다시 붙인다. */
function bareUnit(unit: string): string {
  const cleaned = unit.replace(/^\s*\/\s*/, '').replace(/^\s*1\s*/, '').trim();
  return cleaned || unit;
}

function priceLine(tpl: string, priceWon: number, unit: string, guests: number): string {
  const u = bareUnit(unit);
  // 사전 템플릿은 '{price} × 1{unit}' / '{price} × 1 {unit}' 두 형태
  return tpl
    .replace('{price}', `₩${priceWon.toLocaleString('ko-KR')}`)
    .replace(/1\s*\{unit\}/, `${guests}${tpl.includes('1 {unit}') ? ' ' : ''}${u}`);
}

export function buildInquiryHref(opts: {
  locale: PublicLocale;
  title: string;
  interest: string;
  date: string;
  time: string;
  guests: string;
  total: number;
}): string {
  const qs = new URLSearchParams({
    program: opts.title,
    interest: opts.interest,
    date: opts.date,
    time: opts.time,
    guests: opts.guests,
    total: String(opts.total),
    source: 'checkout',
  });
  return `/${opts.locale}/inquiry?${qs.toString()}`;
}

/**
 * 예약 CTA. 데스크톱에서는 클릭을 가로채 모달을 열고, 모바일에서는
 * href 로 그대로 이동한다 (JS 실행 전 클릭도 링크로 동작).
 */
export default function ReserveButton({
  locale,
  href,
  label,
  summary,
  labels,
  date,
  time,
  guests,
  guestCount = 1,
  style,
  className,
}: {
  locale: PublicLocale;
  /** 모바일 폴백 — /[locale]/checkout?slug=… */
  href: string;
  label: string;
  summary: ReserveSummary;
  labels: Dictionary['checkout'];
  date?: string;
  time?: string;
  guests?: string;
  guestCount?: number;
  style?: React.CSSProperties;
  className?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);

  // 모달 열려 있는 동안 배경 스크롤 잠금 + ESC 닫기
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shownDate = date || labels.defaultDate;
  const shownTime = time || labels.defaultTime;
  const shownGuests = guests || labels.oneGuest;

  const lineAmount = summary.priceWon * Math.max(1, guestCount);
  const serviceFee = Math.round((lineAmount * 0.1) / 1000) * 1000;
  const total = lineAmount + serviceFee;

  const confirmHref = buildInquiryHref({
    locale,
    title: summary.title,
    interest: summary.interest,
    date: shownDate,
    time: shownTime,
    guests: shownGuests,
    total,
  });

  return (
    <>
      <Link
        href={href}
        className={className}
        style={style}
        onClick={(e) => {
          if (typeof window === 'undefined') return;
          // CSS 브레이크포인트와 같은 기준으로 판단 — 모바일은 링크 그대로
          const desktop = typeof window.matchMedia === 'function'
            ? window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches
            : window.innerWidth >= DESKTOP_MIN_WIDTH;
          if (!desktop) return; // 모바일 → 예약 페이지로 이동
          e.preventDefault();
          setOpen(true);
        }}
      >
        {label}
      </Link>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 520, maxHeight: '88vh',
              background: '#fff', borderRadius: 16,
              boxShadow: 'rgba(0,0,0,0.20) 0 16px 48px',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px 20px', borderBottom: '1px solid #ebebeb',
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="close"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, lineHeight: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
                {labels.title}
              </h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 72, height: 72, borderRadius: 12, flexShrink: 0,
                    background: summary.coverImageUrl
                      ? `#f2f2f2 url(${summary.coverImageUrl}) center / cover`
                      : 'linear-gradient(135deg, #ffd7de, #fff1f4)',
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{summary.title}</div>
                  <div style={{ fontSize: 13, color: '#222', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#222" style={{ flexShrink: 0 }}>
                      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                    </svg>
                    <span style={{ fontWeight: 600 }}>{summary.rating}</span>
                    <span>·</span>
                    <span>{summary.location}</span>
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: '#ebebeb', margin: '18px 0' }} />

              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>{labels.yourTrip}</h3>
              <InfoRow label={labels.date} value={shownDate} />
              <InfoRow label={labels.time} value={shownTime} />
              <InfoRow label={labels.guests} value={shownGuests} />

              <div style={{ height: 1, background: '#ebebeb', margin: '14px 0 18px' }} />

              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>{labels.priceDetails}</h3>
              <PriceRow
                label={priceLine(labels.lineSession, summary.priceWon, summary.priceUnitLabel, Math.max(1, guestCount))}
                value={`₩${lineAmount.toLocaleString('ko-KR')}`}
              />
              <PriceRow label={labels.serviceFee} value={`₩${serviceFee.toLocaleString('ko-KR')}`} />
              <div style={{ height: 1, background: '#ebebeb', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                <span>{labels.total} (KRW)</span>
                <span>₩{total.toLocaleString('ko-KR')}</span>
              </div>

              <div style={{ fontSize: 12, color: '#9c9c9c', marginTop: 16, lineHeight: 1.5 }}>
                {labels.paymentNote}
              </div>
            </div>

            <div style={{ padding: '14px 20px 18px', borderTop: '1px solid #ebebeb' }}>
              <Link
                href={confirmHref}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: 50,
                  background: '#ff385c', color: '#fff',
                  borderRadius: 12, fontSize: 16, fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                {labels.confirmCta}
              </Link>
              <div style={{ textAlign: 'center', fontSize: 12, color: '#6a6a6a', marginTop: 8 }}>
                {labels.notChargedNote}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '3px 0 10px' }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 14, color: '#6a6a6a', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
      <span style={{ fontSize: 14, color: '#222' }}>{label}</span>
      <span style={{ fontSize: 14, color: '#222' }}>{value}</span>
    </div>
  );
}
