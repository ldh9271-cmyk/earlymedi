'use client';

// 실시간 AI 상담 — /api/ai/chat 에 대화를 보내고, 답변과 함께
// 근거가 된 병원·상품 카드를 렌더한다. 세션은 브라우저 메모리에만
// 존재하며 서버에 저장하지 않는다.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

type Card = { kind: 'clinic' | 'listing'; title: string; href: string; note: string };
type Msg = { role: 'user' | 'assistant'; content: string; cards?: Card[] };

export default function AiChat({
  locale,
  t,
}: {
  locale: PublicLocale;
  t: Dictionary['ai']['chat'];
}): JSX.Element {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: t.greeting }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
          // 인사말은 서버로 보내지 않음 (모델이 자기 인사에 답하지 않도록)
          messages: next.slice(1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        setError(t.error);
        return;
      }
      const j = await res.json();
      setMsgs((prev) => [...prev, { role: 'assistant', content: j.text, cards: j.cards ?? [] }]);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }

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
