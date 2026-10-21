'use client';

// AI 상담이 대화로 모은 진료 예약 요청 초안 카드 — 내용 확인 → '예약 요청 보내기' → /api/ai/chat/booking.
// 회원만 보낼 수 있다(문의 폼 예약 모드와 같은 규칙): 비회원이면 초안을 sessionStorage 에 두고 로그인으로 보내며,
// 돌아오면 채팅이 같은 카드를 다시 띄운다(readSavedBookingDraft).
import { useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import type { BookingPayload } from '@/lib/ai/booking/draft';

export type { BookingPayload } from '@/lib/ai/booking/draft';
export const BOOKING_DRAFT_KEY = 'gu:ai-booking-draft';
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

type Labels = Dictionary['ai']['chat']['booking'];
type Transcript = Array<{ role: 'user' | 'assistant'; content: string }>;

export function saveBookingDraft(booking: BookingPayload, transcript: Transcript): void {
  try { sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({ booking, transcript: transcript.slice(-8), ts: Date.now() })); } catch { /* 저장 불가 */ }
}
export function clearBookingDraft(): void {
  try { sessionStorage.removeItem(BOOKING_DRAFT_KEY); } catch { /* ignore */ }
}
/** 로그인 전에 저장해 둔 초안 (2시간 안) */
export function readSavedBookingDraft(): { booking: BookingPayload; transcript: Transcript } | null {
  try {
    const raw = sessionStorage.getItem(BOOKING_DRAFT_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as { booking?: BookingPayload; transcript?: Transcript; ts?: number };
    if (!j.booking?.draft || !j.ts || Date.now() - j.ts > DRAFT_TTL_MS) { clearBookingDraft(); return null; }
    return { booking: j.booking, transcript: j.transcript ?? [] };
  } catch { return null; }
}

const HARD_ISSUES = new Set(['window', 'past']);

export default function BookingRequestCard({
  locale, booking, labels, transcript, compact = false, onSent,
}: {
  locale: PublicLocale;
  booking: BookingPayload;
  labels: Labels;
  transcript: Transcript;
  compact?: boolean;
  /** 전송 성공 — 부모가 대화에 ✅ 영수 메시지를 남겨 이후 턴에서 AI 가 접수 상태를 알게 한다 */
  onSent?: (invoiceNo: string | null) => void;
}): JSX.Element {
  const [phase, setPhase] = useState<'idle' | 'login' | 'sending' | 'sent' | 'error'>('idle');
  const [invoiceNo, setInvoiceNo] = useState<string | null>(null);
  const [errText, setErrText] = useState<string | null>(null);
  const d = booking.draft;
  const blocked = booking.issues.some((i) => HARD_ISSUES.has(i));
  const warn = booking.issues.map((i) => (i === 'window' ? labels.warnWindow : i === 'past' ? labels.warnPast : i === 'closed_day' ? labels.warnClosed : labels.warnHours));
  const gender = d.gender === 'female' ? labels.female : d.gender === 'male' ? labels.male : labels.other;
  const fs = compact ? 12 : 13;

  async function send(): Promise<void> {
    if (phase === 'sending' || phase === 'sent') return;
    setPhase('sending'); setErrText(null);
    const sb = createSupabaseBrowserClient();
    let authed = false;
    try { const { data } = sb ? await sb.auth.getUser() : { data: { user: null } }; authed = !!data.user; } catch { authed = false; }
    if (!authed) { saveBookingDraft(booking, transcript); setPhase('login'); return; }
    try {
      const res = await fetch('/api/ai/chat/booking', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, draft: d, transcript: transcript.slice(-8) }),
      });
      const j = (await res.json()) as { ok?: boolean; invoiceNo?: string | null; error?: string };
      if (res.status === 401) { saveBookingDraft(booking, transcript); setPhase('login'); return; }
      if (!res.ok || !j.ok) { setErrText(j.error && /[가-힣]|[a-z]/i.test(j.error) && j.error.length > 12 ? j.error : labels.error); setPhase('error'); return; }
      setInvoiceNo(j.invoiceNo ?? null); setPhase('sent'); clearBookingDraft(); onSent?.(j.invoiceNo ?? null);
    } catch { setErrText(labels.error); setPhase('error'); }
  }

  const loginHref = `/${locale}/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : `/${locale}`)}`;
  const rows: Array<[string, string]> = [
    [labels.hospital, d.hospitalName],
    [labels.when, `${d.visitYmd} ${d.visitTime} (KST)`],
    [labels.name, d.name], [labels.gender, gender], [labels.country, d.countryCode], [labels.phone, d.phone],
    [labels.messenger, `${d.messengerType} ${d.messengerId}`],
    ...(d.email ? [[labels.email, d.email] as [string, string]] : []),
    [labels.birth, d.birthDate],
    ...(d.memo ? [[labels.memo, d.memo] as [string, string]] : []),
  ];

  return (
    <div style={{ marginTop: 8, width: compact ? '100%' : 'min(100%, 420px)', border: '1px solid #ffd7de', background: '#fff', borderRadius: 14, padding: compact ? '12px 12px' : '14px 16px', fontSize: fs, lineHeight: 1.5, color: '#222' }}>
      <div style={{ fontWeight: 700, fontSize: fs + 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#ff385c', display: 'inline-block' }} />
        {labels.title}
      </div>
      <table style={{ marginTop: 8, borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{ color: '#6a6a6a', padding: '2px 8px 2px 0', whiteSpace: 'nowrap', verticalAlign: 'top', width: '32%' }}>{k}</td>
              <td style={{ padding: '2px 0', wordBreak: 'break-word' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {booking.hoursText ? <div style={{ marginTop: 6, fontSize: fs - 1, color: '#9c9c9c' }}>{labels.hoursLabel}: {booking.hoursText}</div> : null}
      {warn.map((w) => <div key={w} style={{ marginTop: 6, fontSize: fs - 1, color: blocked ? '#dc2626' : '#b45309' }}>⚠ {w}</div>)}
      <p style={{ margin: '8px 0 0', fontSize: fs - 1, color: '#6a6a6a' }}>{labels.note}</p>

      {phase === 'sent' ? (
        <div style={{ marginTop: 10, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '9px 12px', color: '#047857', fontWeight: 600 }}>
          {labels.sent.replace('{no}', invoiceNo ?? '-')}{' '}
          <Link href={`/${locale}/me`} style={{ color: '#047857', textDecoration: 'underline' }}>{labels.myPage}</Link>
        </div>
      ) : phase === 'login' ? (
        <div style={{ marginTop: 10, background: '#fff5f7', border: '1px solid #ffd7de', borderRadius: 10, padding: '9px 12px' }}>
          <div style={{ color: '#3f3f3f' }}>{labels.loginRequired}</div>
          <Link href={loginHref} style={{ display: 'inline-block', marginTop: 8, background: '#ff385c', color: '#fff', borderRadius: 9999, padding: '7px 14px', fontWeight: 700, textDecoration: 'none' }}>{labels.loginCta}</Link>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => { void send(); }} disabled={blocked || phase === 'sending'}
            style={{ marginTop: 10, width: '100%', height: compact ? 38 : 42, border: 'none', borderRadius: 10, background: blocked ? '#dddddd' : '#ff385c', color: '#fff', fontWeight: 700, fontSize: fs, cursor: blocked || phase === 'sending' ? 'default' : 'pointer', fontFamily: 'inherit', opacity: phase === 'sending' ? 0.7 : 1 }}>
            {phase === 'sending' ? labels.sending : labels.send}
          </button>
          {phase === 'error' && errText ? <div style={{ marginTop: 6, color: '#dc2626', fontSize: fs - 1 }}>{errText}</div> : null}
          <div style={{ marginTop: 6, fontSize: fs - 1, color: '#9c9c9c' }}>{labels.edit}</div>
        </>
      )}
    </div>
  );
}
