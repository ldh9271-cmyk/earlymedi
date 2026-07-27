'use client';

// 실시간 AI 상담 — /api/ai/chat 에 대화를 보내고, 답변과 함께
// 근거가 된 병원·상품 카드를 렌더한다. 세션은 브라우저 메모리에만
// 존재하며 서버에 저장하지 않는다.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

const leadInputStyle: React.CSSProperties = {
  height: 42, borderRadius: 10, border: '1px solid #dddddd',
  padding: '0 13px', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', background: '#fff', color: '#222',
  boxSizing: 'border-box', width: '100%',
};

type Card = { kind: 'clinic' | 'listing'; title: string; href: string; note: string };
type Msg = { role: 'user' | 'assistant'; content: string; cards?: Card[] };

export default function AiChat({
  locale,
  t,
  lead,
}: {
  locale: PublicLocale;
  t: Dictionary['ai']['chat'];
  lead: Dictionary['ai']['upload'];
}): JSX.Element {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: t.greeting }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // 대화가 일정 길이를 넘으면 연락처 폼을 띄워 리드로 저장한다.
  const [leadPhase, setLeadPhase] = useState<'hidden' | 'form' | 'sending' | 'sent'>('hidden');
  const [leadMsg, setLeadMsg] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState({ name: '', countryCode: '', contact: '', messenger: '', email: '' });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  async function send(text: string): Promise<void> {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    setInput('');
    const next: Msg[] = [...msgs, { role: 'user', content: q }];
    setMsgs(next);
    setBusy(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          stream: true,
          // 인사말은 서버로 보내지 않음 (모델이 자기 인사에 답하지 않도록)
          messages: next.slice(1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        setError(t.error);
        return;
      }
      // 빈 assistant 버블을 먼저 만들고 델타를 이어 붙인다 (타이핑 효과)
      setMsgs((prev) => [...prev, { role: 'assistant', content: '' }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let got = false;
      let failed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split(String.fromCharCode(10));
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const ev = JSON.parse(payload) as { delta?: string; done?: boolean; cards?: Card[]; error?: string };
            if (ev.error) { failed = true; continue; }
            if (ev.delta) {
              got = true;
              setMsgs((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === 'assistant') {
                  copy[copy.length - 1] = { ...last, content: last.content + ev.delta };
                }
                return copy;
              });
            }
            if (ev.done) {
              setMsgs((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === 'assistant') {
                  copy[copy.length - 1] = { ...last, cards: ev.cards ?? [] };
                }
                return copy;
              });
            }
          } catch {
            /* partial JSON — skip */
          }
        }
      }
      if (failed || !got) {
        setMsgs((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.role === 'assistant' && !m.content)));
        setError(t.error);
      }
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  async function submitLead(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLeadPhase('sending');
    setLeadMsg(null);
    try {
      const res = await fetch('/api/ai/chat-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          name: leadForm.name.trim(),
          countryCode: leadForm.countryCode.trim().toUpperCase().slice(0, 2),
          contact: leadForm.contact.trim(),
          messenger: leadForm.messenger.trim(),
          email: leadForm.email.trim(),
          messages: msgs.slice(1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) { setLeadMsg(lead.sendError); setLeadPhase('form'); return; }
      setLeadMsg(lead.sentNoEmail);
      setLeadPhase('sent');
    } catch {
      setLeadMsg(lead.sendError);
      setLeadPhase('form');
    }
  }

  // 사용자가 2번 이상 질문하면 연락처 남기기 유도
  const userTurns = msgs.filter((m) => m.role === 'user').length;
  const showLeadPrompt = userTurns >= 2 && leadPhase === 'hidden';

  const suggestions = [t.suggest1, t.suggest2, t.suggest3];

  return (
    <div
      id="ai-chat"
      style={{
        marginTop: 40,
        border: '1px solid #ebebeb', borderRadius: 18,
        background: '#fff', overflow: 'hidden',
      }}
    >
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #ebebeb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: 9999,
              background: '#22c55e', display: 'inline-block',
            }}
          />
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{t.title}</h2>
        </div>
        <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0', lineHeight: 1.5 }}>
          {t.subtitle}
        </p>
      </div>

      <div
        ref={scrollRef}
        style={{
          height: 420, overflowY: 'auto',
          padding: 18, background: '#fafafa',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '86%',
                background: m.role === 'user' ? '#ff385c' : '#fff',
                color: m.role === 'user' ? '#fff' : '#222',
                border: m.role === 'user' ? 'none' : '1px solid #ebebeb',
                borderRadius: 14,
                padding: '11px 14px',
                fontSize: 14, lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                boxShadow: m.role === 'user' ? 'none' : 'rgba(0,0,0,0.03) 0 1px 2px',
              }}
            >
              {m.content}
            </div>
            {m.cards && m.cards.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, maxWidth: '92%' }}>
                {m.cards.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    style={{
                      display: 'inline-flex', flexDirection: 'column',
                      border: '1px solid #ffd7de', background: '#fff5f7',
                      borderRadius: 12, padding: '9px 13px',
                      textDecoration: 'none', color: '#222', maxWidth: 260,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{c.title}</span>
                    {c.note ? (
                      <span style={{ fontSize: 12, color: '#c81e42', marginTop: 2 }}>{c.note}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {busy ? (
          <div style={{ fontSize: 13, color: '#6a6a6a' }}>{t.thinking}</div>
        ) : null}
        {error ? (
          <div style={{ fontSize: 13, color: '#dc2626' }}>{error}</div>
        ) : null}
      </div>

      {msgs.length <= 1 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 18px 0' }}>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              style={{
                border: '1px solid #dddddd', background: '#fff',
                borderRadius: 9999, padding: '8px 14px',
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#222',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {showLeadPrompt ? (
        <div style={{ padding: '12px 18px 0' }}>
          <button
            type="button"
            onClick={() => setLeadPhase('form')}
            style={{
              width: '100%', border: '1px dashed #ff9db1', background: '#fff5f7',
              borderRadius: 12, padding: '11px 14px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#c81e42',
            }}
          >
            {lead.emailBtn}
          </button>
        </div>
      ) : null}

      {leadPhase === 'form' || leadPhase === 'sending' ? (
        <form onSubmit={submitLead} style={{ padding: '12px 18px 0' }}>
          <div style={{ border: '1px solid #ebebeb', borderRadius: 14, padding: '16px 16px 18px', background: '#fafafa' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{lead.emailTitle}</div>
            <p style={{ fontSize: 12, color: '#6a6a6a', margin: '6px 0 12px', lineHeight: 1.5 }}>{lead.emailBody}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
              <input required value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} placeholder={lead.fieldName} style={leadInputStyle} />
              <input required value={leadForm.countryCode} onChange={(e) => setLeadForm({ ...leadForm, countryCode: e.target.value })} placeholder="US" maxLength={2} style={{ ...leadInputStyle, textTransform: 'uppercase' }} />
            </div>
            <input value={leadForm.contact} onChange={(e) => setLeadForm({ ...leadForm, contact: e.target.value })} placeholder={lead.fieldContact} style={{ ...leadInputStyle, marginTop: 8 }} />
            <input value={leadForm.messenger} onChange={(e) => setLeadForm({ ...leadForm, messenger: e.target.value })} placeholder={lead.fieldMessenger} style={{ ...leadInputStyle, marginTop: 8 }} />
            <input type="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} placeholder={lead.fieldEmail} style={{ ...leadInputStyle, marginTop: 8 }} />
            {leadMsg ? <p style={{ fontSize: 12, color: '#dc2626', margin: '8px 0 0' }}>{leadMsg}</p> : null}
            <button
              type="submit"
              disabled={leadPhase === 'sending'}
              style={{
                width: '100%', marginTop: 12, height: 44,
                background: '#ff385c', color: '#fff', border: 'none',
                borderRadius: 10, fontWeight: 700, fontSize: 14,
                cursor: leadPhase === 'sending' ? 'wait' : 'pointer',
                opacity: leadPhase === 'sending' ? 0.7 : 1, fontFamily: 'inherit',
              }}
            >
              {leadPhase === 'sending' ? lead.sending : lead.send}
            </button>
          </div>
        </form>
      ) : null}

      {leadPhase === 'sent' ? (
        <div style={{ padding: '12px 18px 0' }}>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '12px 14px', color: '#047857', fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
            {leadMsg}
          </div>
        </div>
      ) : null}

      <form
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
        style={{ display: 'flex', gap: 8, padding: 16 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          enterKeyHint="send"
          style={{
            flex: 1, minWidth: 0, height: 46,
            border: '1px solid #dddddd', borderRadius: 12,
            padding: '0 14px', fontSize: 14, fontFamily: 'inherit',
            outline: 'none', color: '#222', background: '#fff',
          }}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          style={{
            flexShrink: 0, height: 46, padding: '0 20px',
            background: '#ff385c', color: '#fff', border: 'none',
            borderRadius: 12, fontWeight: 700, fontSize: 14,
            cursor: busy || !input.trim() ? 'default' : 'pointer',
            opacity: busy || !input.trim() ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {t.send}
        </button>
      </form>

      <div style={{ padding: '0 18px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#9a9a9a', lineHeight: 1.5, flex: 1, minWidth: 200 }}>
          {t.disclaimer}
        </span>
        <Link
          href={`/${locale}/inquiry`}
          style={{ fontSize: 13, fontWeight: 600, color: '#ff385c', textDecoration: 'none', flexShrink: 0 }}
        >
          {t.toConcierge}
        </Link>
      </div>
    </div>
  );
}
