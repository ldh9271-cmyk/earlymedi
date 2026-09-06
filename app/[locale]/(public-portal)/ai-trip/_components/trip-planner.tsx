'use client';

// AI 여행하기 — /api/ai/trip 에 대화를 보내 일정을 스트리밍으로 받고, 그 뒤 흐름을 한 화면에서 잇는다.
//   이메일 받기(로그인 필요 → 회원가입/로그인 후 ?plan=&send=1 복귀·자동 발송)
//   → 이 일정으로 확정 → 플랫폼 도움 여부(예: 연락처·출발일 → 컨시어지 검증·견적 / 아니오: 직접 진행)
//   → 견적 도착(금액·메모·검증 일정) → 결제(토스 결제창, 없으면 알리페이 QR + 완료 신고) → 스케줄 완성.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { mdToHtml } from '@/lib/ai/md-lite';
import { openTossPayment } from '@/lib/payments/toss-client';

type Msg = { role: 'user' | 'assistant'; content: string };
type SendState = { phase: 'idle' | 'sending' | 'sent' | 'failed'; email?: string };
export type PlanView = {
  id: string; status: string; emailed: boolean;
  quoteWon: number | null; quoteNote: string | null; verifiedPlanMd: string | null; startYmd: string | null;
  order: { id: string; invoiceNo: string; status: string; totalWon: number } | null;
};

const MD_CSS =
  '.m-trip-md h2{font-size:15px;font-weight:800;margin:14px 0 6px}.m-trip-md h3{font-size:14px;font-weight:700;margin:12px 0 4px}.m-trip-md h4{font-size:13px;font-weight:700;margin:10px 0 4px}'
  + '.m-trip-md p{margin:6px 0}.m-trip-md ul,.m-trip-md ol{margin:4px 0 8px;padding-left:20px}.m-trip-md li{margin:3px 0}.m-trip-md a{color:#c81e42;font-weight:600;text-decoration:none}.m-trip-md strong{font-weight:700}'
  + '.m-trip-md > :first-child{margin-top:0}';
const ALIPAY_QR_SRC = '/payment/alipay-qr.png';

const inputStyle: React.CSSProperties = { height: 42, borderRadius: 10, border: '1px solid #dddddd', padding: '0 13px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#222', boxSizing: 'border-box', width: '100%' };
const primaryBtn: React.CSSProperties = { background: '#ff385c', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const ghostBtn: React.CSSProperties = { background: '#fff', color: '#222', border: '1px solid #dddddd', borderRadius: 10, padding: '11px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };

export default function TripPlanner({ locale, t, userEmail, initialPlan, initialMessages, autoSend, tossEnabled }: {
  locale: PublicLocale;
  t: Dictionary['ai']['trip'];
  userEmail: string | null;
  initialPlan: PlanView | null;
  initialMessages: Msg[];
  autoSend: boolean;
  tossEnabled: boolean;
}): JSX.Element {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages.length ? initialMessages : []);
  const [planId, setPlanId] = useState<string | null>(initialPlan?.id ?? null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendState, setSendState] = useState<SendState>({ phase: initialPlan?.emailed ? 'sent' : 'idle', email: initialPlan?.emailed ? (userEmail ?? undefined) : undefined });
  const [askSignup, setAskSignup] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoSent = useRef(false);

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, busy]);

  async function sendEmail(id: string): Promise<void> {
    setSendState({ phase: 'sending' });
    try {
      const res = await fetch('/api/ai/trip/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: id, locale }) });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; email?: string };
      if (res.ok && j.ok) setSendState({ phase: 'sent', email: j.email });
      else setSendState({ phase: 'failed' });
    } catch { setSendState({ phase: 'failed' }); }
  }

  // 회원가입/로그인 뒤 ?send=1 로 돌아온 경우 한 번만 자동 발송
  useEffect(() => {
    if (autoSend && userEmail && initialPlan?.id && !autoSent.current) { autoSent.current = true; void sendEmail(initialPlan.id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ask(text: string): Promise<void> {
    const q = text.trim();
    if (!q || busy) return;
    setError(null); setInput(''); setAskSignup(false); setSendState({ phase: 'idle' });
    const next: Msg[] = [...msgs, { role: 'user', content: q }];
    setMsgs(next); setBusy(true);
    try {
      const res = await fetch('/api/ai/trip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale, planId: planId ?? undefined, messages: next }) });
      if (!res.ok || !res.body) { setError(t.error); return; }
      setMsgs((prev) => [...prev, { role: 'assistant', content: '' }]);
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      let buf = ''; let got = false; let failed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim(); if (!payload) continue;
          try {
            const ev = JSON.parse(payload) as { delta?: string; done?: boolean; planId?: string | null; error?: string };
            if (ev.error) { failed = true; continue; }
            if (ev.delta) { got = true; setMsgs((prev) => { const c = [...prev]; const last = c[c.length - 1]; if (last?.role === 'assistant') c[c.length - 1] = { ...last, content: last.content + ev.delta }; return c; }); }
            if (ev.done && ev.planId) setPlanId(ev.planId);
          } catch { /* partial */ }
        }
      }
      if (failed || !got) { setMsgs((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.role === 'assistant' && !m.content))); setError(t.error); }
    } catch { setError(t.error); } finally { setBusy(false); }
  }

  const hasPlan = Boolean(planId) && msgs.some((m) => m.role === 'assistant' && m.content);
  const returnTo = `/${locale}/ai-trip?plan=${planId ?? ''}&send=1`;
  const chipStyle: React.CSSProperties = { border: '1px solid #dddddd', background: '#fff', borderRadius: 9999, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#222', textAlign: 'left' };
  // 일정 확정 이후 단계는 대화 수정을 막지 않지만, 견적·결제 단계에서는 채팅 입력을 닫는다
  const status = initialPlan?.status ?? 'draft';
  const locked = status === 'quoted' || status === 'paid';

  return (
    <div style={{ marginTop: 28, border: '1px solid #ebebeb', borderRadius: 18, background: '#fff', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: MD_CSS }} />
      <div ref={scrollRef} style={{ minHeight: 320, maxHeight: 620, overflowY: 'auto', padding: 18, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Bubble role="assistant"><span>{t.greeting}</span></Bubble>
        {msgs.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.role === 'assistant' ? <div className="m-trip-md" dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }} /> : <span>{m.content}</span>}
          </Bubble>
        ))}
        {busy ? <div style={{ fontSize: 13, color: '#6a6a6a' }}>{t.thinking}</div> : null}
        {error ? <div style={{ fontSize: 13, color: '#dc2626' }}>{error}</div> : null}
      </div>

      {msgs.length === 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 18px 0' }}>
          {[t.suggestFree, t.suggestPackage, t.suggestTraining].map((s) => (
            <button key={s} type="button" onClick={() => void ask(s)} style={chipStyle}>{s}</button>
          ))}
        </div>
      ) : null}

      {/* ① 이메일 받기 */}
      {hasPlan && !busy && status === 'draft' ? (
        <div style={{ padding: '12px 18px 0' }}>
          {sendState.phase === 'sent' ? (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '12px 14px', color: '#047857', fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
              {t.sentOk.replace('{email}', sendState.email ?? userEmail ?? '')}
            </div>
          ) : sendState.phase === 'failed' ? (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px 14px', color: '#be123c', fontSize: 13, lineHeight: 1.5 }}>{t.sentFail}</div>
          ) : askSignup && !userEmail ? (
            <div style={{ border: '1px solid #ebebeb', borderRadius: 14, padding: '16px', background: '#fff' }}>
              <p style={{ fontSize: 13, color: '#3f3f3f', margin: '0 0 12px', lineHeight: 1.55 }}>{t.emailNeedSignup}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={`/${locale}/signup?next=${encodeURIComponent(returnTo)}`} style={{ ...primaryBtn, textDecoration: 'none', fontSize: 13, padding: '10px 16px' }}>{t.signupCta}</Link>
                <Link href={`/${locale}/login?next=${encodeURIComponent(returnTo)}`} style={{ ...ghostBtn, textDecoration: 'none', fontSize: 13, padding: '10px 16px' }}>{t.loginCta}</Link>
              </div>
            </div>
          ) : (
            <button type="button" disabled={sendState.phase === 'sending'}
              onClick={() => { if (userEmail && planId) void sendEmail(planId); else setAskSignup(true); }}
              style={{ width: '100%', border: '1px dashed #ff9db1', background: '#fff5f7', borderRadius: 12, padding: '11px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#c81e42' }}>
              {sendState.phase === 'sending' ? t.sending : `✉️ ${t.emailBtn}`}
            </button>
          )}
        </div>
      ) : null}

      {/* ② 확정 → 도움 여부 → 견적 → 결제 → 완성 */}
      {hasPlan && !busy && planId && (sendState.phase === 'sent' || status !== 'draft') ? (
        <Workflow locale={locale} t={t} planId={planId} status={status} plan={initialPlan} userEmail={userEmail} tossEnabled={tossEnabled} />
      ) : null}

      {!locked ? (
        <form onSubmit={(e) => { e.preventDefault(); void ask(input); }} style={{ display: 'flex', gap: 8, padding: 16 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.placeholder} enterKeyHint="send"
            style={{ flex: 1, height: 46, borderRadius: 12, border: '1px solid #dddddd', padding: '0 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          <button type="submit" disabled={busy || !input.trim()} style={{ height: 46, padding: '0 18px', borderRadius: 12, border: 'none', background: '#ff385c', color: '#fff', fontWeight: 700, fontSize: 14, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{t.send}</button>
        </form>
      ) : <div style={{ height: 16 }} />}
      <p style={{ fontSize: 11, color: '#9c9c9c', margin: '0 18px 14px', lineHeight: 1.5 }}>{t.disclaimer}</p>
    </div>
  );
}

/** 이메일 이후 단계. 서버 상태(status)를 기준으로 그리고, 액션 뒤엔 같은 일정으로 새로 고쳐 서버 진실을 다시 읽는다. */
function Workflow({ locale, t, planId, status, plan, userEmail, tossEnabled }: {
  locale: PublicLocale; t: Dictionary['ai']['trip']; planId: string; status: string; plan: PlanView | null; userEmail: string | null; tossEnabled: boolean;
}): JSX.Element {
  const [phase, setPhase] = useState<'idle' | 'confirmed' | 'helpForm' | 'busy'>('idle');
  const [form, setForm] = useState({ name: '', phone: '', messenger: '', startYmd: '' });
  const [err, setErr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [reported, setReported] = useState(false);
  const reload = (): void => { window.location.href = `/${locale}/ai-trip?plan=${planId}`; };
  const post = async (body: Record<string, unknown>): Promise<boolean> => {
    const res = await fetch('/api/ai/trip/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId, locale, ...body }) });
    return res.ok;
  };
  const box: React.CSSProperties = { margin: '12px 18px 0', border: '1px solid #ebebeb', borderRadius: 14, padding: 16, background: '#fff' };
  const label = (k: string): string => (t.statusLabels as Record<string, string>)[k] ?? k;

  if (!userEmail) {
    const returnTo = `/${locale}/ai-trip?plan=${planId}`;
    return (
      <div style={box}>
        <p style={{ fontSize: 13, color: '#3f3f3f', margin: '0 0 10px' }}>{t.loginToConfirm}</p>
        <Link href={`/${locale}/login?next=${encodeURIComponent(returnTo)}`} style={{ ...ghostBtn, textDecoration: 'none', fontSize: 13, padding: '10px 16px' }}>{t.loginCta}</Link>
      </div>
    );
  }

  // 스케줄 완성
  if (status === 'paid') {
    return (
      <div style={{ ...box, background: '#ecfdf5', borderColor: '#a7f3d0' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#047857' }}>{t.paidTitle}</div>
        <p style={{ fontSize: 13, color: '#065f46', margin: '6px 0 12px', lineHeight: 1.6 }}>{t.paidBody}</p>
        {plan?.verifiedPlanMd ? <div className="m-trip-md" style={{ background: '#fff', border: '1px solid #d1fae5', borderRadius: 12, padding: '10px 14px', fontSize: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: mdToHtml(plan.verifiedPlanMd) }} /> : null}
        <div style={{ marginTop: 12 }}>
          <Link href={`/${locale}/me`} style={{ ...primaryBtn, textDecoration: 'none', fontSize: 13, padding: '10px 16px' }}>{t.voucherLink}</Link>
        </div>
      </div>
    );
  }

  // 견적 도착 → 결제
  if (status === 'quoted' && plan?.order) {
    const o = plan.order;
    const pay = async (): Promise<void> => {
      setErr(null);
      if (tossEnabled) {
        setPhase('busy');
        const outcome = await openTossPayment({
          amount: o.totalWon, orderId: o.invoiceNo, orderName: `${t.title} · ${o.invoiceNo}`,
          successUrl: `${window.location.origin}/${locale}/checkout/toss/success`, failUrl: `${window.location.origin}/${locale}/checkout/toss/fail`,
          customerEmail: userEmail, locale,
        });
        setPhase('idle');
        if (outcome === 'redirected' || outcome === 'cancelled') return;
      }
      setShowQr(true);
    };
    const reportPaid = async (): Promise<void> => {
      setPhase('busy');
      try { await fetch('/api/checkout/order', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceNo: o.invoiceNo }) }); } catch { /* ignore */ }
      setReported(true); setPhase('idle');
    };
    const pending = o.status === 'reported' || reported;
    return (
      <div style={{ ...box, borderColor: '#fecdd3', background: '#fff5f7' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#c81e42' }}>{t.quoteTitle}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#6a6a6a' }}>{t.quoteAmount}</span>
          <span style={{ fontSize: 26, fontWeight: 800 }}>₩{o.totalWon.toLocaleString('ko-KR')}</span>
          <span style={{ fontSize: 12, color: '#9c9c9c' }}>{t.invoiceLabel} {o.invoiceNo}</span>
        </div>
        {plan.quoteNote ? (
          <div style={{ marginTop: 10, fontSize: 13, color: '#3f3f3f', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}><b>{t.quoteNoteLabel}</b><br />{plan.quoteNote}</div>
        ) : null}
        {plan.verifiedPlanMd ? (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#222' }}>{t.quoteVerifiedPlan}</summary>
            <div className="m-trip-md" style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 12, padding: '10px 14px', fontSize: 14, lineHeight: 1.6, marginTop: 8 }} dangerouslySetInnerHTML={{ __html: mdToHtml(plan.verifiedPlanMd) }} />
          </details>
        ) : null}
        {pending ? (
          <div style={{ marginTop: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>{t.payReported}</div>
        ) : showQr ? (
          <div style={{ marginTop: 12, background: '#fff', border: '1px solid #ebebeb', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t.payAlipayTitle}</div>
            <p style={{ fontSize: 12, color: '#6a6a6a', margin: '6px 0 10px' }}>{t.payAlipayHint}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ALIPAY_QR_SRC} alt="Alipay QR" style={{ width: 200, height: 200, objectFit: 'contain', border: '1px solid #ebebeb', borderRadius: 10 }} />
            <div style={{ marginTop: 12 }}>
              <button type="button" onClick={() => void reportPaid()} disabled={phase === 'busy'} style={primaryBtn}>{t.payDoneBtn}</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <button type="button" onClick={() => void pay()} disabled={phase === 'busy'} style={{ ...primaryBtn, width: '100%' }}>{phase === 'busy' ? '…' : `💳 ${t.payBtn}`}</button>
          </div>
        )}
        {err ? <p style={{ fontSize: 12, color: '#dc2626', margin: '8px 0 0' }}>{err}</p> : null}
      </div>
    );
  }

  if (status === 'help_requested') {
    return (
      <div style={{ ...box, background: '#fff7ed', borderColor: '#fed7aa' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>{label('help_requested')}</div>
        <p style={{ fontSize: 13, color: '#3f3f3f', margin: '6px 0 0', lineHeight: 1.6 }}>{t.helpSent}</p>
      </div>
    );
  }

  // 도움 요청 폼 (confirmed 상태 '예' 또는 help_declined 에서 다시 요청)
  if (phase === 'helpForm') {
    const submit = async (e: React.FormEvent): Promise<void> => {
      e.preventDefault(); setPhase('busy'); setErr(null);
      const ok = await post({ step: 'help', wantHelp: true, contact: { name: form.name, phone: form.phone, messenger: form.messenger }, startYmd: form.startYmd });
      if (ok) reload(); else { setErr(t.error); setPhase('helpForm'); }
    };
    return (
      <form onSubmit={submit} style={box}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{t.helpFormTitle}</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t.fieldPhone} style={inputStyle} />
          <input value={form.messenger} onChange={(e) => setForm({ ...form, messenger: e.target.value })} placeholder={t.fieldMessenger} style={inputStyle} />
          <label style={{ fontSize: 12, color: '#6a6a6a' }}>{t.fieldStart}
            <input type="date" value={form.startYmd} onChange={(e) => setForm({ ...form, startYmd: e.target.value })} style={{ ...inputStyle, marginTop: 4 }} />
          </label>
        </div>
        {err ? <p style={{ fontSize: 12, color: '#dc2626', margin: '8px 0 0' }}>{err}</p> : null}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="submit" disabled={phase !== 'helpForm'} style={primaryBtn}>{t.helpSubmit}</button>
          <button type="button" onClick={() => setPhase('idle')} style={ghostBtn}>{t.helpNo}</button>
        </div>
      </form>
    );
  }

  // 확정됨 → 도움 여부 질문
  if (status === 'confirmed' || status === 'help_declined' || phase === 'confirmed') {
    const decline = async (): Promise<void> => { setPhase('busy'); const ok = await post({ step: 'help', wantHelp: false }); if (ok) reload(); else { setErr(t.error); setPhase('idle'); } };
    return (
      <div style={{ ...box, background: '#eff6ff', borderColor: '#bfdbfe' }}>
        {status === 'help_declined' ? (
          <p style={{ fontSize: 13, color: '#3f3f3f', margin: '0 0 10px', lineHeight: 1.6 }}>{t.helpDeclined}</p>
        ) : (
          <>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8' }}>{t.helpQuestion}</div>
            <p style={{ fontSize: 13, color: '#3f3f3f', margin: '6px 0 12px', lineHeight: 1.6 }}>{t.helpBody}</p>
          </>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setPhase('helpForm')} disabled={phase === 'busy'} style={primaryBtn}>{status === 'help_declined' ? t.helpAskAgain : t.helpYes}</button>
          {status !== 'help_declined' ? <button type="button" onClick={() => void decline()} disabled={phase === 'busy'} style={ghostBtn}>{t.helpNo}</button> : null}
        </div>
        {err ? <p style={{ fontSize: 12, color: '#dc2626', margin: '8px 0 0' }}>{err}</p> : null}
      </div>
    );
  }

  // draft(이메일 발송 후) → 확정 버튼
  const confirm = async (): Promise<void> => { setPhase('busy'); setErr(null); const ok = await post({ step: 'confirm' }); if (ok) reload(); else { setErr(t.error); setPhase('idle'); } };
  return (
    <div style={box}>
      <p style={{ fontSize: 13, color: '#3f3f3f', margin: '0 0 10px', lineHeight: 1.6 }}>{t.confirmHint}</p>
      <button type="button" onClick={() => void confirm()} disabled={phase === 'busy'} style={{ ...primaryBtn, width: '100%' }}>{phase === 'busy' ? '…' : `✅ ${t.confirmBtn}`}</button>
      {err ? <p style={{ fontSize: 12, color: '#dc2626', margin: '8px 0 0' }}>{err}</p> : null}
    </div>
  );
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }): JSX.Element {
  const user = role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: user ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: user ? '80%' : '94%', background: user ? '#ff385c' : '#fff', color: user ? '#fff' : '#222', border: user ? 'none' : '1px solid #ebebeb', borderRadius: 14, padding: '11px 14px', fontSize: 14, lineHeight: 1.6, whiteSpace: user ? 'pre-wrap' : 'normal', boxShadow: user ? 'none' : 'rgba(0,0,0,0.03) 0 1px 2px' }}>
        {children}
      </div>
    </div>
  );
}
