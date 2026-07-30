'use client';

// 우하단 플로팅 챗 버블 — 전 페이지 공통. 탭하면 패널이 열리고
// /api/ai/chat (스트리밍) 으로 대화한다. 대화가 길어지면 상세 상담은
// AI 상담 페이지로 유도한다.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

type Card = { kind: 'clinic' | 'listing'; title: string; href: string; note: string };
type Msg = { role: 'user' | 'assistant'; content: string; cards?: Card[] };

const PANEL_CSS =
  '@media (max-width: 768px) {'
  + '.m-cb-panel { width: calc(100vw - 24px) !important; right: 12px !important; bottom: 76px !important; height: 68vh !important; }'
  + '.m-cb-fab { right: 16px !important; bottom: 16px !important; }'
  + '}'
  // 하단 고정 예약 바가 있는 상세 페이지(리스팅 .m-ld-bottom-bar,
  // 클리닉 .m-cd-bottom-bar)에서는 <1024 구간에서 바가 노출되므로
  // FAB·패널을 바 높이만큼 위로 올려 예약 CTA와 겹치지 않게 한다.
  + '@media (max-width: 1023px) {'
  + 'body:has(.m-ld-bottom-bar) .m-cb-fab, body:has(.m-cd-bottom-bar) .m-cb-fab'
  + ' { bottom: calc(84px + env(safe-area-inset-bottom)) !important; }'
  + 'body:has(.m-ld-bottom-bar) .m-cb-panel, body:has(.m-cd-bottom-bar) .m-cb-panel'
  + ' { bottom: calc(150px + env(safe-area-inset-bottom)) !important; }'
  + '}';

export default function ChatBubble({
  locale,
  t,
}: {
  locale: PublicLocale;
  t: Dictionary['ai']['chat'];
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: t.greeting }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy, open]);

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
          messages: next.slice(1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) { setError(t.error); return; }
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
                if (last && last.role === 'assistant') copy[copy.length - 1] = { ...last, content: last.content + ev.delta };
                return copy;
              });
            }
            if (ev.done) {
              setMsgs((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === 'assistant') copy[copy.length - 1] = { ...last, cards: ev.cards ?? [] };
                return copy;
              });
            }
          } catch { /* partial */ }
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PANEL_CSS }} />

      {open ? (
        <div
          className="m-cb-panel"
          style={{
            position: 'fixed', right: 24, bottom: 92, zIndex: 60,
            width: 380, height: 520,
            background: '#fff', border: '1px solid #ebebeb', borderRadius: 18,
            boxShadow: 'rgba(0,0,0,0.10) 0 12px 32px, rgba(0,0,0,0.06) 0 2px 8px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#22c55e', flexShrink: 0 }} />
              <span style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="close"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, lineHeight: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div
            ref={scrollRef}
            style={{ flex: 1, overflowY: 'auto', padding: 14, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '88%',
                    background: m.role === 'user' ? '#ff385c' : '#fff',
                    color: m.role === 'user' ? '#fff' : '#222',
                    border: m.role === 'user' ? 'none' : '1px solid #ebebeb',
                    borderRadius: 13, padding: '9px 12px',
                    fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.content}
                </div>
                {m.cards && m.cards.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {m.cards.slice(0, 3).map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        onClick={() => setOpen(false)}
                        style={{
                          border: '1px solid #ffd7de', background: '#fff5f7',
                          borderRadius: 10, padding: '6px 10px',
                          fontSize: 12, fontWeight: 600, color: '#c81e42', textDecoration: 'none',
                        }}
                      >
                        {c.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {busy ? <div style={{ fontSize: 12, color: '#6a6a6a' }}>{t.thinking}</div> : null}
            {error ? <div style={{ fontSize: 12, color: '#dc2626' }}>{error}</div> : null}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
            style={{ display: 'flex', gap: 6, padding: 12, borderTop: '1px solid #ebebeb' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              enterKeyHint="send"
              style={{
                flex: 1, minWidth: 0, height: 40,
                border: '1px solid #dddddd', borderRadius: 10,
                padding: '0 12px', fontSize: 13, fontFamily: 'inherit',
                outline: 'none', color: '#222', background: '#fff',
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              style={{
                flexShrink: 0, width: 40, height: 40, borderRadius: 10,
                background: '#ff385c', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: busy || !input.trim() ? 'default' : 'pointer',
                opacity: busy || !input.trim() ? 0.6 : 1,
              }}
              aria-label={t.send}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>

          <div style={{ padding: '0 14px 12px' }}>
            <Link
              href={`/${locale}/ai-consult`}
              onClick={() => setOpen(false)}
              style={{ fontSize: 12, fontWeight: 600, color: '#ff385c', textDecoration: 'none' }}
            >
              {t.toConcierge}
            </Link>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="m-cb-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.title}
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 60,
          width: 56, height: 56, borderRadius: 9999,
          background: '#ff385c', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'rgba(255,56,92,0.35) 0 6px 18px, rgba(0,0,0,0.10) 0 2px 6px',
        }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9">
            <path d="M21 12a8 8 0 0 1-12 7l-5 1 1-5a8 8 0 1 1 16-3z" />
          </svg>
        )}
      </button>
    </>
  );
}
