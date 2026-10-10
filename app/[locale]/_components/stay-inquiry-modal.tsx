'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { openTossPayment } from '@/lib/payments/toss-client';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import CountrySelect from './country-select';
import { COUNTRY_CODES, LOCALE_DEFAULT_COUNTRY, MESSENGER_KINDS, MESSENGER_LABEL } from './reserve-modal';

/**
 * 예약 팝업 — 결제 팝업(reserve-modal)과 같은 생김새. 상품 종류에 따라 네 가지로 동작한다.
 *
 *   'stay'    호텔: 요금 미표시 · 체크인 · 박수 · 도착 시간 → 문의 접수(kind stay_request) → 견적 인보이스
 *   'trip'    자유여행: 요금 미표시 · 여행 시작일 · 기간 → 문의 접수(booking_request) → 견적 인보이스
 *   'booking' 맛집·퍼스널컬러·헤어·메이크업·네일·반영구·사진·K-팝 투어: 표시 가격은 안내용 · 희망 날짜·시간 → 요청 접수 → 확인 후 견적 인보이스
 *   'pay'     패키지·연수여행: 정가 상품 · 여행 시작일(시간 없음) · 같은 정보를 받고 바로 토스 결제 (서버가 금액을 다시 계산)
 *
 *   공통: 이름 · 국가 · 연락처 · 메신저 · 인원 · 요청. 비회원도 보낼 수 있다(이름·연락처·메신저·날짜 필수).
 *   로그인 회원은 가입 정보(이름·이메일·국가·전화·메신저)로 미리 채우고 수정만 하게 한다.
 */
type Labels = Dictionary['checkout']['stay'];
export type StaySummary = { title: string; coverImageUrl: string | null; rating: string | number | null; location: string };
export type StayVariant = 'stay' | 'trip' | 'booking' | 'pay';

const ARRIVALS = ['', '10:00', '12:00', '14:00', '15:00', '16:00', '18:00', '20:00', '22:00'];
const HOURS = ['', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
/** 서버(lib/stay/request)와 같은 규칙: 상품가 × 인원 + 10% 수수료(천원 반올림). 표시용. */
const feeFor = (subtotal: number): number => Math.round((subtotal * 0.1) / 1000) * 1000;

export default function StayInquiryButton({ locale, href, label, summary, listingSlug, labels, style, className, variant = 'stay', priceLabel = null, priceWon = 0, initialDate, initialGuests }: {
  locale: string;
  /** JS 가 안 도는 경우의 폴백 (일반 문의 폼 또는 /checkout) */
  href: string;
  label: string;
  summary: StaySummary;
  listingSlug: string;
  labels: Labels;
  style?: React.CSSProperties;
  className?: string;
  variant?: StayVariant;
  /** booking: 안내용 표시 가격 ("₩120,000 / 세션") */
  priceLabel?: string | null;
  /** pay: 1인(1단위) 가격 — 총액 표시용 */
  priceWon?: number;
  /** 바깥 카드에서 이미 고른 날짜·인원 (홈 코스 카드) — 팝업 필드에 미리 넣는다 */
  initialDate?: string;
  initialGuests?: number;
}) {
  const isStay = variant === 'stay';
  const isTrip = variant === 'trip';
  const isPay = variant === 'pay';
  const hasNights = isStay || isTrip;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [ccode, setCcode] = useState(LOCALE_DEFAULT_COUNTRY[locale] ?? 'US');
  const [msgKind, setMsgKind] = useState('');
  const [msgId, setMsgId] = useState('');
  const [date, setDate] = useState('');
  const [nights, setNights] = useState(isTrip ? 3 : 1);
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(isStay ? 2 : 1);
  const [note, setNote] = useState('');
  const [minDate, setMinDate] = useState('');
  const [member, setMember] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ invoiceNo: string; amountWon: number; pay: boolean; paidWindow: 'none' | 'cancelled' | 'error' } | null>(null);

  // 회원이면 가입 정보로 채운다 — 이름·이메일·국가·전화·메신저 (patient-signup-form 이 user_metadata 에 저장)
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted || !data.user) return;
      const um = (data.user.user_metadata ?? {}) as {
        full_name?: string; username?: string; name?: string; country_code?: string; phone?: string; messenger_kind?: string; messenger_id?: string;
      };
      setMember(true);
      setName((v) => v || um.full_name || um.name || um.username || '');
      setContact((v) => v || data.user?.email || um.phone || '');
      if (um.country_code) setCcode(um.country_code);
      if (um.messenger_kind) setMsgKind(um.messenger_kind);
      if (um.messenger_id) setMsgId(um.messenger_id);
      setPrefilled(!!(um.full_name || um.username || data.user?.email));
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => { if (initialDate) setDate(initialDate); }, [initialDate]);
  useEffect(() => { if (initialGuests && initialGuests > 0) setGuests(Math.min(10, initialGuests)); }, [initialGuests]);

  useEffect(() => {
    const d = new Date(); const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setMinDate(ymd);
  }, []);

  const valid = name.trim().length > 0 && contact.trim().length >= 3 && !!msgKind && msgId.trim().length > 0 && !!date;
  const subtotal = Math.max(0, priceWon) * guests;
  const fee = feeFor(subtotal);
  const total = subtotal + fee;
  const T = {
    title: isStay || isTrip ? labels.title : isPay ? labels.payTitle : labels.bookingTitle,
    cta: isStay || isTrip ? labels.cta : isPay ? labels.payCta : labels.bookingCta,
    intro: isStay || isTrip ? labels.intro : isPay ? labels.payIntro : labels.bookingIntro,
    date: isStay ? labels.checkIn : isTrip || isPay ? labels.tripDate : labels.date,
    nights: isTrip ? labels.period : labels.nights,
    time: isStay ? labels.arrival : labels.time,
    doneTitle: isStay || isTrip ? labels.doneTitle : isPay ? labels.payDoneTitle : labels.bookingDone,
    doneBody: isStay || isTrip ? labels.doneBody : isPay ? labels.payDoneBody : labels.bookingDoneBody,
  };

  const openPay = async (invoiceNo: string, amountWon: number): Promise<void> => {
    const outcome = await openTossPayment({
      amount: amountWon, orderId: invoiceNo, orderName: `${summary.title} · ${invoiceNo}`,
      successUrl: `${window.location.origin}/${locale}/checkout/toss/success${member ? '' : '?back=pay'}`,
      failUrl: `${window.location.origin}/${locale}/checkout/toss/fail`,
      customerEmail: contact.includes('@') ? contact.trim() : null, locale,
    });
    if (outcome === 'redirected') return;
    setDone({ invoiceNo, amountWon, pay: true, paidWindow: outcome === 'cancelled' ? 'cancelled' : 'error' });
  };

  const submit = async (): Promise<void> => {
    if (!valid) { setMissing(true); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/stay/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale, listingSlug, name: name.trim(), contact: contact.trim(), countryCode: ccode || null,
          messengerKind: msgKind || null, messengerId: msgId.trim() || null,
          checkIn: date, nights: hasNights ? nights : 1, arrival: isTrip || isPay ? null : (time || null), guests, note: note.trim() || null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; invoiceNo?: string; member?: boolean; pay?: boolean; amountWon?: number };
      if (!res.ok || !j.ok || !j.invoiceNo) { setErr(labels.failed); return; }
      if (j.pay && j.amountWon && j.amountWon > 0) { await openPay(j.invoiceNo, j.amountWon); return; }
      setDone({ invoiceNo: j.invoiceNo, amountWon: 0, pay: false, paidWindow: 'none' });
    } catch { setErr(labels.failed); } finally { setBusy(false); }
  };

  const fieldBox: React.CSSProperties = { border: '1px solid #dddddd', borderRadius: 10, padding: '8px 12px', display: 'flex', flexDirection: 'column', minWidth: 0 };
  const bad: React.CSSProperties = { border: '1.5px solid #dc2626', background: '#fff5f5' };
  const fieldLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.3px', color: '#222' };
  const fieldInput: React.CSSProperties = { border: 'none', outline: 'none', background: 'transparent', fontSize: 14, marginTop: 2, width: '100%', padding: 0, fontFamily: 'inherit', color: '#222' };
  const select: React.CSSProperties = { ...fieldInput, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' };
  const won = (n: number): string => `₩${n.toLocaleString('ko-KR')}`;

  return (
    <>
      <Link
        href={href}
        className={className}
        style={style}
        onClick={(e) => { if (typeof window === 'undefined') return; e.preventDefault(); setOpen(true); }}
      >
        {label}
      </Link>

      {open && typeof document !== 'undefined' ? createPortal(
        <div role="dialog" aria-modal="true" onClick={() => setOpen(false)} className="m-rsv-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <style dangerouslySetInnerHTML={{ __html:
            '@media (max-width: 767px) {'
            + '.m-rsv-overlay { padding: 0 !important; align-items: stretch !important; }'
            + '.m-rsv-dialog { max-width: none !important; max-height: none !important; height: 100dvh !important; border-radius: 0 !important; }'
            + '}' }} />
          <div onClick={(e) => e.stopPropagation()} className="m-rsv-dialog"
            style={{ width: '100%', maxWidth: 520, maxHeight: '88vh', background: '#fff', borderRadius: 16, boxShadow: 'rgba(0,0,0,0.20) 0 16px 48px', display: 'flex', flexDirection: 'column', overflow: 'hidden', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #ebebeb' }}>
              <button type="button" onClick={() => setOpen(false)} aria-label="close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
              </button>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>{T.title}</h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 72, height: 72, borderRadius: 12, flexShrink: 0, background: summary.coverImageUrl ? `#f2f2f2 url(${summary.coverImageUrl}) center / cover` : 'linear-gradient(135deg, #ffd7de, #fff1f4)' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{summary.title}</div>
                  <div style={{ fontSize: 13, color: '#222', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {summary.rating ? (<>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#222" style={{ flexShrink: 0 }}><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" /></svg>
                      <span style={{ fontWeight: 600 }}>{summary.rating}</span><span>·</span>
                    </>) : null}
                    <span>{summary.location}</span>
                  </div>
                  {priceLabel && !isPay ? <div style={{ fontSize: 13, color: '#c81e42', fontWeight: 700, marginTop: 4 }}>{labels.priceGuide} · {priceLabel}</div> : null}
                  {isPay && priceLabel ? <div style={{ fontSize: 13, color: '#222', fontWeight: 700, marginTop: 4 }}>{priceLabel}</div> : null}
                </div>
              </div>
              <div style={{ height: 1, background: '#ebebeb', margin: '18px 0' }} />

              {done ? (
                <div style={{ padding: '8px 0 4px' }}>
                  {done.pay ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 800, color: done.paidWindow === 'error' ? '#dc2626' : '#b45309' }}>{done.paidWindow === 'error' ? labels.failed : labels.payCancelled}</div>
                      <p style={{ fontSize: 14, color: '#3f3f3f', lineHeight: 1.6, margin: '10px 0 0' }}>{summary.title} · {won(done.amountWon)}</p>
                      {member ? <p style={{ fontSize: 13, color: '#c81e42', fontWeight: 600, lineHeight: 1.6, margin: '8px 0 0' }}>{labels.doneMember}</p> : null}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#047857' }}>✅ {T.doneTitle}</div>
                      <p style={{ fontSize: 14, color: '#3f3f3f', lineHeight: 1.6, margin: '10px 0 0' }}>{T.doneBody}</p>
                      {member ? <p style={{ fontSize: 13, color: '#c81e42', fontWeight: 600, lineHeight: 1.6, margin: '8px 0 0' }}>{labels.doneMember}</p> : null}
                    </>
                  )}
                  <div style={{ fontSize: 12, color: '#9c9c9c', marginTop: 10 }}>{done.invoiceNo}</div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: '#6a6a6a', lineHeight: 1.55, margin: '0 0 14px' }}>{T.intro}</p>
                  {prefilled ? <p style={{ fontSize: 12, color: '#047857', fontWeight: 600, margin: '0 0 10px' }}>{labels.memberPrefilled}</p> : null}

                  <label style={{ ...fieldBox, marginBottom: 10, ...(missing && !name.trim() ? bad : {}) }}>
                    <span style={fieldLabel}>{labels.name}</span>
                    <input type="text" value={name} maxLength={120} onChange={(e) => { setName(e.target.value); setMissing(false); }} style={fieldInput} />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 10, marginBottom: 10 }}>
                    <div style={fieldBox}>
                      <span style={fieldLabel}>🌐</span>
                      <CountrySelect value={ccode} onChange={(c) => setCcode(c)} codes={COUNTRY_CODES} ariaLabel="country" />
                    </div>
                    <label style={{ ...fieldBox, ...(missing && contact.trim().length < 3 ? bad : {}) }}>
                      <span style={fieldLabel}>{labels.contact}</span>
                      <input type="text" value={contact} maxLength={200} placeholder="name@example.com / +82 10-…" onChange={(e) => { setContact(e.target.value); setMissing(false); }} style={fieldInput} />
                    </label>
                  </div>
                  <p style={{ fontSize: 11, color: '#9c9c9c', margin: '-4px 0 10px 2px' }}>{labels.contactHint}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 10, marginBottom: 10 }}>
                    <label style={{ ...fieldBox, ...(missing && !msgKind ? bad : {}) }}>
                      <span style={fieldLabel}>{labels.messenger}</span>
                      <select value={msgKind} onChange={(e) => { setMsgKind(e.target.value); setMissing(false); }} style={select}>
                        <option value="">{labels.msgNone}</option>
                        {MESSENGER_KINDS.map((k) => <option key={k} value={k}>{MESSENGER_LABEL[k]}</option>)}
                      </select>
                    </label>
                    <label style={{ ...fieldBox, ...(missing && !msgId.trim() ? bad : {}) }}>
                      <span style={fieldLabel}>{labels.messengerId}</span>
                      <input type="text" value={msgId} maxLength={100} placeholder="@id" onChange={(e) => { setMsgId(e.target.value); setMissing(false); }} style={fieldInput} />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: hasNights ? '1.4fr 1fr' : '1fr', gap: 10, marginBottom: 10 }}>
                    <label style={{ ...fieldBox, ...(missing && !date ? bad : {}) }}>
                      <span style={fieldLabel}>{T.date}</span>
                      <input type="date" value={date} min={minDate} onChange={(e) => { setDate(e.target.value); setMissing(false); }} style={{ ...fieldInput, cursor: 'pointer' }} />
                    </label>
                    {hasNights ? (
                      <label style={fieldBox}>
                        <span style={fieldLabel}>{T.nights}</span>
                        <select value={nights} onChange={(e) => setNights(Number(e.target.value))} style={select}>
                          {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{labels.nightN.replace('{n}', String(n))}</option>)}
                        </select>
                      </label>
                    ) : null}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isTrip || isPay ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    {isTrip || isPay ? null : (
                      <label style={fieldBox}>
                        <span style={fieldLabel}>{T.time}</span>
                        <select value={time} onChange={(e) => setTime(e.target.value)} style={select}>
                          {(isStay ? ARRIVALS : HOURS).map((a) => <option key={a || 'none'} value={a}>{a || labels.arrivalNone}</option>)}
                        </select>
                      </label>
                    )}
                    <label style={fieldBox}>
                      <span style={fieldLabel}>{labels.guests}</span>
                      <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} style={select}>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                  </div>
                  <label style={{ ...fieldBox, marginBottom: 4 }}>
                    <span style={fieldLabel}>{labels.note}</span>
                    <textarea value={note} maxLength={2000} rows={2} placeholder={labels.notePlaceholder} onChange={(e) => setNote(e.target.value)} style={{ ...fieldInput, resize: 'vertical', lineHeight: 1.5 }} />
                  </label>

                  {isPay ? (
                    <div style={{ marginTop: 14, borderTop: '1px solid #ebebeb', paddingTop: 12, fontSize: 13, color: '#3f3f3f', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{won(Math.max(0, priceWon))} × {guests}</span><span>{won(subtotal)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{labels.fee}</span><span>{won(fee)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, marginTop: 4 }}><span>{labels.total}</span><span>{won(total)}</span></div>
                    </div>
                  ) : null}
                  {missing ? <p style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, margin: '8px 0 0 2px' }}>{labels.required}</p> : null}
                  {err ? <p style={{ color: '#dc2626', fontSize: 12, fontWeight: 600, margin: '8px 0 0 2px' }}>{err}</p> : null}
                </>
              )}
            </div>

            <div style={{ padding: '12px 20px 18px', borderTop: '1px solid #ebebeb' }}>
              {done ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  {done.pay && done.paidWindow !== 'none' ? (
                    <button type="button" onClick={() => { void openPay(done.invoiceNo, done.amountWon); }} style={{ flex: 1, height: 50, background: '#ff385c', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{labels.payCta} · {won(done.amountWon)}</button>
                  ) : member ? (
                    <Link href={`/${locale}/me?invoice=${encodeURIComponent(done.invoiceNo)}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 50, background: '#ff385c', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
                      {labels.myPage}
                    </Link>
                  ) : null}
                  <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, height: 50, background: '#f3f4f1', color: '#222', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{labels.close}</button>
                </div>
              ) : (
                <button type="button" onClick={() => { void submit(); }} disabled={busy}
                  style={{ width: '100%', height: 52, background: '#ff385c', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
                  {busy ? labels.submitting : isPay ? `${T.cta} · ${won(total)}` : T.cta}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
