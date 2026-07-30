'use client';

// 예약하기 → 데스크톱·모바일 모두 같은 팝업(모달) 흐름이다 (2026-07-28
// 부터 통일). 모바일에서는 전면 시트로 펼쳐진다. href(/checkout)는 JS 가
// 실행되기 전 클릭에 대한 폴백으로만 남아 있다.
//
// 모달은 2단계다.
//   1) 예약 정보 — 날짜(달력)·시간·인원을 직접 고르고 요금이 즉시 갱신
//   2) 결제 — 인보이스 발행 + 알리페이 QR → 완료 시 마이페이지/문의로 연결
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { LOCALE_TO_BCP47, type PublicLocale } from '@/lib/i18n/locales';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { openTossPayment, tossClientKey } from '@/lib/payments/toss-client';
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

const MAX_GUESTS = 6;
/** 상담·픽업 가능한 시간대 (24h 기준, 로케일 포맷으로 표시). */
const HOUR_SLOTS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
/** 알리페이 가맹점 QR — public/payment/ 에 실제 QR 이미지를 넣는다. */
const ALIPAY_QR_SRC = '/payment/alipay-qr.png';

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

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function todayYmd(): string {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
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
  listingSlug,
  date,
  dateYmd,
  guestCount = 1,
  /** 코스처럼 종료일이 시작일에서 파생되는 상품 — 날짜 표기를 그대로 쓴다. */
  fixedDateLabel,
  style,
  className,
}: {
  locale: PublicLocale;
  /** 모바일 폴백 — /[locale]/checkout?slug=… */
  href: string;
  label: string;
  summary: ReserveSummary;
  labels: Dictionary['checkout'];
  /** 인보이스에 남길 상품 slug. */
  listingSlug?: string;
  date?: string;
  dateYmd?: string;
  guestCount?: number;
  fixedDateLabel?: string;
  style?: React.CSSProperties;
  className?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'trip' | 'pay'>('trip');
  const [ymd, setYmd] = useState(dateYmd ?? '');
  const [hour, setHour] = useState(14);
  const [guests, setGuests] = useState(Math.max(1, guestCount));
  const [minDate, setMinDate] = useState('');
  const [qrFailed, setQrFailed] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // null = 확인 전, true/false = 로그인 여부. 헤더와 같은 브라우저 세션을 본다.
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setAuthed(false); return undefined; }
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) setAuthed(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // 오늘 날짜는 서버/클라 시간대가 어긋날 수 있어 mount 후 설정
  useEffect(() => { setMinDate(todayYmd()); }, []);

  // 가입/로그인을 마치고 ?reserve=1 로 돌아오면 예약을 이어서 진행한다.
  useEffect(() => {
    if (!authed || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('reserve') !== '1') return;
    setStep('trip');
    setOpen(true);
    // 새로고침해도 다시 열리지 않도록 쿼리를 정리
    params.delete('reserve');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }, [authed]);
  // 트리거 쪽 인원/날짜가 바뀌면 모달 기본값도 따라간다
  useEffect(() => { setGuests(Math.max(1, guestCount)); }, [guestCount]);
  useEffect(() => { if (dateYmd) setYmd(dateYmd); }, [dateYmd]);

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

  const bcp47 = LOCALE_TO_BCP47[locale];

  const timeOptions = useMemo(
    () => HOUR_SLOTS.map((h) => ({
      value: h,
      label: new Date(2026, 0, 1, h, 0).toLocaleTimeString(bcp47, { hour: 'numeric', minute: '2-digit' }),
    })),
    [bcp47],
  );

  const dateLabel = fixedDateLabel
    || (ymd
      ? new Date(ymd + 'T00:00:00').toLocaleDateString(bcp47, {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
      })
      : (date || labels.defaultDate));
  const timeLabel = timeOptions.find((o) => o.value === hour)?.label ?? labels.defaultTime;
  const guestsLabel = guests === 1 ? labels.oneGuest : labels.guestN.replace('{n}', String(guests));

  const lineAmount = summary.priceWon * guests;
  const serviceFee = Math.round((lineAmount * 0.1) / 1000) * 1000;
  const total = lineAmount + serviceFee;

  const confirmHref = buildInquiryHref({
    locale,
    title: summary.title,
    interest: summary.interest,
    date: dateLabel,
    time: timeLabel,
    guests: guestsLabel,
    total,
  });

  /**
   * 로그인 여부를 확정한다. 마운트 직후 세션 조회가 끝나기 전(authed=null)에
   * 클릭이 들어올 수 있어, 그때는 조회를 기다렸다 판단한다 — 확인 전이라고
   * 통과시키면 비회원에게 예약 팝업이 열려버린다.
   */
  async function resolveAuthed(): Promise<boolean> {
    if (authed !== null) return authed;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setAuthed(false); return false; }
    try {
      const { data } = await supabase.auth.getUser();
      const ok = !!data.user;
      setAuthed(ok);
      return ok;
    } catch {
      setAuthed(false);
      return false;
    }
  }

  /** 가입 후 이 페이지로 돌아와 예약을 이어가도록 하는 경로. */
  function signupHref(): string {
    const back = `${window.location.pathname}?reserve=1`;
    return `/${locale}/signup?next=${encodeURIComponent(back)}`;
  }

  /**
   * '결제하기' — 인보이스를 발행하고 결제 단계로 넘어간다.
   * 발행이 실패해도 결제 화면은 띄운다 (게스트를 막지 않고, 관리자는
   * 이후 문의 리드로 확인). 금액은 서버에서 다시 계산한다.
   */
  async function issueInvoice(): Promise<void> {
    if (issuing) return;
    // 팝업이 열려 있는 동안 세션이 만료됐거나, 확인 전에 열린 경우를 막는다
    if (!(await resolveAuthed())) {
      window.location.href = signupHref();
      return;
    }
    setIssuing(true);
    setQrFailed(false);
    let issuedNo: string | null = null;
    try {
      const res = await fetch('/api/checkout/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          listingSlug: listingSlug ?? null,
          listingTitle: summary.title,
          interestKey: summary.interest,
          reserveDate: dateLabel,
          reserveTime: timeLabel,
          guests,
          unitPriceWon: summary.priceWon,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { invoiceNo?: string };
        if (data.invoiceNo) {
          issuedNo = data.invoiceNo;
          setInvoiceNo(data.invoiceNo);
        }
      }
    } catch {
      /* 발행 실패해도 결제 안내는 계속 */
    }

    // 토스페이먼츠가 구성돼 있으면 QR 대신 토스 결제창을 연다. 인증이
    // 진행되면 successUrl 로 떠나고, 사용자가 창을 닫으면 예약 정보
    // 단계에 그대로 남는다 (같은 인보이스로 재시도 가능). 결제창 열기
    // 자체가 실패하면 기존 알리페이 QR 단계로 폴백한다.
    if (issuedNo && tossClientKey()) {
      const outcome = await openTossPayment({
        amount: total,
        orderId: issuedNo,
        orderName: summary.title,
        successUrl: `${window.location.origin}/${locale}/checkout/toss/success`,
        failUrl: `${window.location.origin}/${locale}/checkout/toss/fail`,
      });
      setIssuing(false);
      if (outcome === 'redirected' || outcome === 'cancelled') return;
      setStep('pay');
      return;
    }

    setIssuing(false);
    setStep('pay');
  }

  // 회원이면 마이페이지 결제내역에서 인보이스를 바로 확인하게 하고,
  // 비회원은 연락처를 남겨야 컨시어지가 이어받을 수 있으므로 문의 폼으로.
  // 렌더 시점의 authed 는 아직 확인 중(null)일 수 있어 링크는 폴백일 뿐,
  // 실제 목적지는 클릭 때 finishPayment() 가 확정한다.
  function myPageHref(): string {
    return `/${locale}/me${invoiceNo ? `?invoice=${encodeURIComponent(invoiceNo)}` : ''}`;
  }
  const doneHref = authed === false
    ? (invoiceNo ? `${confirmHref}&invoice=${encodeURIComponent(invoiceNo)}` : confirmHref)
    : myPageHref();

  /**
   * '결제를 완료했어요' — 입금 신고를 먼저 확정하고 이동한다.
   *
   * 신고 요청을 띄워만 두고 곧바로 페이지를 옮기면 요청이 중간에 끊겨
   * 마이페이지에 '입금 대기'로 남는다. 그래서 응답을 기다린 뒤 이동한다
   * (실패해도 이동은 막지 않는다 — 인보이스는 이미 발행돼 있다).
   */
  async function finishPayment(): Promise<void> {
    if (finishing) return;
    setFinishing(true);
    const ok = await resolveAuthed();
    if (invoiceNo) {
      try {
        await fetch('/api/checkout/order', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceNo }),
        });
      } catch {
        /* 신고 실패는 이동을 막지 않는다 */
      }
    }
    // 방금 바뀐 상태가 보이도록 서버에서 새로 받는다
    window.location.href = ok
      ? myPageHref()
      : (invoiceNo ? `${confirmHref}&invoice=${encodeURIComponent(invoiceNo)}` : confirmHref);
  }

  const fieldBox = {
    border: '1px solid #dddddd', borderRadius: 10,
    padding: '8px 12px', display: 'flex', flexDirection: 'column' as const,
    minWidth: 0,
  };
  const fieldLabel = { fontSize: 10, fontWeight: 700, letterSpacing: '0.3px', color: '#222' };
  const fieldInput = {
    border: 'none', outline: 'none', background: 'transparent',
    fontSize: 14, marginTop: 2, width: '100%', padding: 0,
    fontFamily: 'inherit', color: '#222', cursor: 'pointer',
  };

  return (
    <>
      <Link
        href={href}
        className={className}
        style={style}
        onClick={(e) => {
          if (typeof window === 'undefined') return;
          e.preventDefault();
          if (authed === true) {
            setStep('trip');
            setOpen(true);
            return;
          }
          // 비로그인이거나 아직 확인 전 — 세션을 확정한 뒤 분기한다.
          // 확인 전이라고 그냥 열어주면 비회원이 예약 팝업에 들어간다.
          void (async () => {
            if (!(await resolveAuthed())) {
              // 가입을 마치면 이 페이지로 돌아와 팝업이 다시 열린다
              window.location.href = signupHref();
              return;
            }
            setStep('trip');
            setOpen(true);
          })();
        }}
      >
        {label}
      </Link>

      {/* 트리거가 하단 고정 바(fixed z-40) 안에 있으면 그 스태킹
          컨텍스트에 갇혀 z-100 이어도 헤더(z-50)·챗 버블(z-60) 아래에
          깔린다 — 팝업이 헤더에 잘리고 스크롤이 막힌 것처럼 보인다.
          portal 로 body 직속에 렌더해 어디서 열어도 최상단에 띄운다. */}
      {open && typeof document !== 'undefined' ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="m-rsv-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          {/* 모바일: 데스크톱과 같은 흐름을 전면 시트로 펼친다 */}
          <style
            dangerouslySetInnerHTML={{
              __html:
                '@media (max-width: 767px) {'
                + '.m-rsv-overlay { padding: 0 !important; align-items: stretch !important; }'
                + '.m-rsv-dialog { max-width: none !important; max-height: none !important;'
                + ' height: 100dvh !important; border-radius: 0 !important; }'
                + '}',
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="m-rsv-dialog"
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
                onClick={() => (step === 'pay' ? setStep('trip') : setOpen(false))}
                aria-label={step === 'pay' ? labels.payBack : 'close'}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, lineHeight: 0 }}
              >
                {step === 'pay' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
                    <path d="M15 5l-7 7 7 7" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
                {step === 'pay' ? labels.payTitle : labels.title}
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

              {step === 'trip' ? (
                <>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>{labels.yourTrip}</h3>

                  {fixedDateLabel ? (
                    <InfoRow label={labels.date} value={fixedDateLabel} />
                  ) : (
                    <label style={{ ...fieldBox, marginBottom: 10 }}>
                      <span style={fieldLabel}>{labels.date}</span>
                      <input
                        type="date"
                        value={ymd}
                        min={minDate}
                        onChange={(e) => setYmd(e.target.value)}
                        style={fieldInput}
                      />
                    </label>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={fieldBox}>
                      <span style={fieldLabel}>{labels.time}</span>
                      <select
                        value={hour}
                        onChange={(e) => setHour(Number(e.target.value))}
                        style={{ ...fieldInput, appearance: 'none', WebkitAppearance: 'none' }}
                      >
                        {timeOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </label>
                    <label style={fieldBox}>
                      <span style={fieldLabel}>{labels.guests}</span>
                      <select
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        style={{ ...fieldInput, appearance: 'none', WebkitAppearance: 'none' }}
                      >
                        {Array.from({ length: MAX_GUESTS }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n === 1 ? labels.oneGuest : labels.guestN.replace('{n}', String(n))}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div style={{ height: 1, background: '#ebebeb', margin: '18px 0' }} />

                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>{labels.priceDetails}</h3>
                  <PriceRow
                    label={priceLine(labels.lineSession, summary.priceWon, summary.priceUnitLabel, guests)}
                    value={`₩${lineAmount.toLocaleString('ko-KR')}`}
                  />
                  <PriceRow label={labels.serviceFee} value={`₩${serviceFee.toLocaleString('ko-KR')}`} />
                  <div style={{ height: 1, background: '#ebebeb', margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                    <span>{labels.total} (KRW)</span>
                    <span>₩{total.toLocaleString('ko-KR')}</span>
                  </div>
                </>
              ) : (
                <>
                  {/* 결제 단계 — 가맹점 알리페이 QR */}
                  {invoiceNo ? (
                    <div
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: '#fff5f7', border: '1px solid #fecdd3',
                        color: '#c81e42', borderRadius: 9999,
                        padding: '5px 12px', fontSize: 12, fontWeight: 700,
                        marginBottom: 12,
                      }}
                    >
                      {labels.invoiceNo} {invoiceNo}
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 14, color: '#6a6a6a' }}>{labels.payAmount}</span>
                    <span style={{ fontSize: 20, fontWeight: 700 }}>₩{total.toLocaleString('ko-KR')}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 4 }}>
                    {dateLabel} · {timeLabel} · {guestsLabel}
                  </div>

                  {/* 가맹점에서 받은 QR 카드 이미지 자체가 헤더·Pay Now·
                      결제수단 로고를 모두 담고 있어 그대로 노출한다. */}
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                    {qrFailed ? (
                      <div
                        style={{
                          width: 260, minHeight: 200, borderRadius: 14,
                          border: '1px dashed #dddddd', background: '#fafafa',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 20,
                        }}
                      >
                        <span style={{ fontSize: 12, color: '#6a6a6a', textAlign: 'center', lineHeight: 1.6 }}>
                          {labels.payQrPending}
                        </span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ALIPAY_QR_SRC}
                        alt="Alipay QR — Korea Glow up"
                        onError={() => setQrFailed(true)}
                        style={{ width: 260, maxWidth: '100%', height: 'auto', display: 'block' }}
                      />
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: '#222', margin: '14px 0 4px', lineHeight: 1.55 }}>
                    {labels.payScan}
                  </p>
                  <p style={{ fontSize: 12, color: '#6a6a6a', margin: 0 }}>{labels.paySupported}</p>
                  <p style={{ fontSize: 12, color: '#9c9c9c', margin: '10px 0 0', lineHeight: 1.55 }}>
                    {labels.payAfterNote}
                  </p>
                </>
              )}
            </div>

            <div style={{ padding: '14px 20px 18px', borderTop: '1px solid #ebebeb' }}>
              {step === 'trip' ? (
                <button
                  type="button"
                  disabled={issuing}
                  onClick={() => { void issueInvoice(); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', height: 50, border: 'none',
                    background: '#ff385c', color: '#fff',
                    borderRadius: 12, fontSize: 16, fontWeight: 700,
                    fontFamily: 'inherit', cursor: issuing ? 'default' : 'pointer',
                    opacity: issuing ? 0.65 : 1,
                  }}
                >
                  {issuing ? labels.issuing : labels.confirmCta}
                </button>
              ) : (
                <Link
                  href={doneHref}
                  onClick={(e) => { e.preventDefault(); void finishPayment(); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', height: 50,
                    background: '#ff385c', color: '#fff',
                    borderRadius: 12, fontSize: 16, fontWeight: 700,
                    textDecoration: 'none',
                    opacity: finishing ? 0.65 : 1,
                    pointerEvents: finishing ? 'none' : 'auto',
                  }}
                >
                  {labels.payDone}
                </Link>
              )}
              <div style={{ textAlign: 'center', fontSize: 12, color: '#6a6a6a', marginTop: 8 }}>
                {labels.notChargedNote}
              </div>
            </div>
          </div>
        </div>,
        document.body,
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
