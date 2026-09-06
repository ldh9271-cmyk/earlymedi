'use client';

// AI 여행하기 — /api/ai/trip 에 대화를 보내 일정을 스트리밍으로 받고,
// '이메일로 받기'는 로그인 상태면 바로 /api/ai/trip/send, 아니면 회원가입/로그인으로
// 보냈다가 ?plan=<id>&send=1 로 돌아와 자동 발송한다.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { mdToHtml } from '@/lib/ai/md-lite';

type Msg = { role: 'user' | 'assistant'; content: string };
type SendState = { phase: 'idle' | 'sending' | 'sent' | 'failed'; email?: string };

const MD_CSS =
  '.m-trip-md h2{font-size:15px;font-weight:800;margin:14px 0 6px}.m-trip-md h3{font-size:14px;font-weight:700;margin:12px 0 4px}.m-trip-md h4{font-size:13px;font-weight:700;margin:10px 0 4px}'
  + '.m-trip-md p{margin:6px 0}.m-trip-md ul,.m-trip-md ol{margin:4px 0 8px;padding-left:20px}.m-trip-md li{margin:3px 0}.m-trip-md a{color:#c81e42;font-weight:600;text-decoration:none}.m-trip-md strong{font-weight:700}'
  + '.m-trip-md > :first-child{margin-top:0}';

export default function TripPlanner({ locale, t, userEmail, initialPlanId, initialMessages, autoSend }: {
  locale: PublicLocale;
  t: Dictionary['ai']['trip'];
  userEmail: string | null;
  initialPlanId: string | null;
  initialMessages: Msg[];
  autoSend: boolean;
}): JSX.Element {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages.length ? initialMessages : []);
  const [planId, setPlanId] = useState<string | null>(initialPlanId);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendState, setSendState] = useState<SendState>({ phase: 'idle' });
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
    if (autoSend && userEmail && initialPlanId && !autoSent.current) { autoSent.current = true; void sendEmail(initialPlanId); }
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

      {hasPlan && !busy ? (
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
                <Link href={`/${locale}/signup?next=${encodeURIComponent(returnTo)}`} style={{ background: '#ff385c', color: '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{t.signupCta}</Link>
                <Link href={`/${locale}/login?next=${encodeURIComponent(returnTo)}`} style={{ border: '1px solid #dddddd', color: '#222', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{t.loginCta}</Link>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={sendState.phase === 'sending'}
              onClick={() => { if (userEmail && planId) void sendEmail(planId); else setAskSignup(true); }}
              style={{ width: '100%', border: '1px dashed #ff9db1', background: '#fff5f7', borderRadius: 12, padding: '11px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#c81e42' }}
            >
              {sendState.phase === 'sending' ? t.sending : `✉️ ${t.emailBtn}`}
            </button>
          )}
        </div>
      ) : null}

      <form onSubmit={(e) => { e.preventDefault(); void ask(input); }} style={{ display: 'flex', gap: 8, padding: 16 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.placeholder} enterKeyHint="send"
          style={{ flex: 1, height: 46, borderRadius: 12, border: '1px solid #dddddd', padding: '0 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
        <button type="submit" disabled={busy || !input.trim()} style={{ height: 46, padding: '0 18px', borderRadius: 12, border: 'none', background: '#ff385c', color: '#fff', fontWeight: 700, fontSize: 14, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{t.send}</button>
      </form>
      <p style={{ fontSize: 11, color: '#9c9c9c', margin: '0 18px 14px', lineHeight: 1.5 }}>{t.disclaimer}</p>
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
