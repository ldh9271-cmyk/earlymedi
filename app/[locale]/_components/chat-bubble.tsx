'use client';

// 우하단 플로팅 챗 버블 — 전 페이지 공통. 탭하면 패널이 열린다.
//  · AI 탭: /api/ai/chat (스트리밍) 으로 대화. 대화가 길어지면 AI 상담 페이지로 유도.
//  · 상담원 탭(2026-10-13, 채널톡형 자체 채팅): 회원 전용. 예약 건별 방과 일반 문의 방을
//    /api/chat 으로 열고 5초 폴링으로 주고받는다. 같은 방을 업체(파트너 콘솔)와 플랫폼(마스터)이 본다.
//    마이페이지 '채팅 문의' 는 ?chat=<orderId> 로 이 위젯을 열어 그 예약 방으로 들어간다.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

type Card = { kind: 'clinic' | 'listing'; title: string; href: string; note: string };
type Msg = { role: 'user' | 'assistant'; content: string; cards?: Card[] };
type Room = { id: string; kind: string; title: string; status: string; orgName: string | null; consumerUnread: number; lastMessagePreview: string | null; lastMessageAt: string | null };
type HMsg = { id: string; senderRole: string; senderName: string | null; body: string; createdAt: string };

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
  h,
}: {
  locale: PublicLocale;
  t: Dictionary['ai']['chat'];
  h: Dictionary['chat'];
}): JSX.Element {
  const [open, setOpen] = useState(false);
  // ── 상담원 채팅 상태 ──
  const [mode, setMode] = useState<'ai' | 'human'>('ai');
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [hmsgs, setHmsgs] = useState<HMsg[]>([]);
  const [hinput, setHinput] = useState('');
  const [hbusy, setHbusy] = useState(false);
  const [hloading, setHloading] = useState(false);
  const [unread, setUnread] = useState(0);
  const hScrollRef = useRef<HTMLDivElement | null>(null);
  const lastAtRef = useRef<string | null>(null);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    if (authed !== null) return authed;
    const sb = createSupabaseBrowserClient();
    if (!sb) { setAuthed(false); return false; }
    try { const { data } = await sb.auth.getUser(); const ok = !!data.user; setAuthed(ok); return ok; } catch { setAuthed(false); return false; }
  }, [authed]);

  const loadRooms = useCallback(async (): Promise<Room[]> => {
    try {
      const res = await fetch('/api/chat/rooms', { cache: 'no-store' });
      if (!res.ok) return [];
      const j = (await res.json()) as { rooms: Room[] };
      setRooms(j.rooms);
      setUnread(j.rooms.reduce((a, r) => a + (r.consumerUnread || 0), 0));
      return j.rooms;
    } catch { return []; }
  }, []);

  const openRoom = useCallback(async (r: Room): Promise<void> => {
    setRoom(r); setHmsgs([]); lastAtRef.current = null; setHloading(true);
    try {
      const res = await fetch(`/api/chat/rooms/${r.id}/messages`, { cache: 'no-store' });
      if (res.ok) { const j = (await res.json()) as { room: Room; messages: HMsg[] }; setHmsgs(j.messages); setRoom(j.room); lastAtRef.current = j.messages.at(-1)?.createdAt ?? null; }
    } finally { setHloading(false); }
    void loadRooms();
  }, [loadRooms]);

  // 폴링 — 방이 열려 있는 동안 5초마다 새 메시지
  useEffect(() => {
    if (!open || mode !== 'human' || !room) return;
    const id = setInterval(async () => {
      try {
        const after = lastAtRef.current ? `?after=${encodeURIComponent(lastAtRef.current)}` : '';
        const res = await fetch(`/api/chat/rooms/${room.id}/messages${after}`, { cache: 'no-store' });
        if (!res.ok) return;
        const j = (await res.json()) as { room: Room; messages: HMsg[] };
        if (j.messages.length) {
          setHmsgs((prev) => { const seen = new Set(prev.map((m) => m.id)); return [...prev, ...j.messages.filter((m) => !seen.has(m.id))]; });
          lastAtRef.current = j.messages.at(-1)?.createdAt ?? lastAtRef.current;
        }
        if (j.room.status !== room.status) setRoom(j.room);
      } catch { /* 다음 폴링 */ }
    }, 5000);
    return () => clearInterval(id);
  }, [open, mode, room]);

  useEffect(() => { const el = hScrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [hmsgs, hloading, room]);

  // 마운트: 회원이면 배지용 unread, ?chat=<orderId> 딥링크면 그 예약 방으로
  useEffect(() => {
    void (async () => {
      const ok = await checkAuth();
      if (!ok) return;
      const qs = new URLSearchParams(window.location.search);
      const orderId = qs.get('chat');
      if (orderId) {
        setMode('human'); setOpen(true);
        try {
          const res = await fetch('/api/chat/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, locale }) });
          if (res.ok) { const j = (await res.json()) as { room: Room }; await openRoom(j.room); }
        } catch { /* 목록으로 */ }
        qs.delete('chat');
        const rest = qs.toString();
        window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
      } else {
        void loadRooms();
      }
    })();
    // 마운트 1회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchHuman = async (): Promise<void> => {
    setMode('human');
    const ok = await checkAuth();
    if (ok && rooms.length === 0) await loadRooms();
  };

  const newSupport = async (): Promise<void> => {
    setHbusy(true);
    try {
      const res = await fetch('/api/chat/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale, title: h.supportTitle }) });
      if (res.ok) { const j = (await res.json()) as { room: Room }; await openRoom(j.room); }
    } finally { setHbusy(false); }
  };

  const sendHuman = async (): Promise<void> => {
    const body = hinput.trim();
    if (!body || !room || hbusy) return;
    setHbusy(true); setHinput('');
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
      if (res.ok) { const j = (await res.json()) as { message: HMsg }; setHmsgs((prev) => [...prev, j.message]); lastAtRef.current = j.message.createdAt; }
      else if (res.status === 409) { setRoom({ ...room, status: 'closed' }); }
    } finally { setHbusy(false); }
  };

  const roleLabel = (m: HMsg): string => m.senderRole === 'platform' ? h.rolePlatform : m.senderRole === 'business' ? (room?.orgName || h.roleBusiness) : m.senderRole === 'consumer' ? h.roleYou : '';
  const loginHref = `/${locale}/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : `/${locale}`)}`;
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
              <div style={{ display: 'flex', gap: 4, background: '#f3f4f1', borderRadius: 999, padding: 3 }}>
                {([['ai', h.tabAi], ['human', h.tabHuman]] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => { if (k === 'human') void switchHuman(); else setMode('ai'); }}
                    style={{ border: 'none', cursor: 'pointer', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', background: mode === k ? '#fff' : 'transparent', color: mode === k ? '#222' : '#6a6a6a', boxShadow: mode === k ? 'rgba(0,0,0,0.08) 0 1px 3px' : 'none' }}>
                    {label}{k === 'human' && unread > 0 && mode !== 'human' ? <span style={{ marginLeft: 6, background: '#ff385c', color: '#fff', borderRadius: 999, padding: '0 6px', fontSize: 10 }}>{unread}</span> : null}
                  </button>
                ))}
              </div>
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

          {mode === 'human' ? (
            authed === false ? (
              <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', background: '#fafafa' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#3f3f3f', lineHeight: 1.6 }}>{h.loginRequired}</p>
                <Link href={loginHref} style={{ background: '#ff385c', color: '#fff', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>{h.loginCta}</Link>
              </div>
            ) : !room ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ margin: '2px 2px 6px', fontSize: 12, color: '#6a6a6a', lineHeight: 1.5 }}>{h.hint}</p>
                <button type="button" onClick={() => { void newSupport(); }} disabled={hbusy}
                  style={{ border: '1px dashed #ff385c', background: '#fff5f7', color: '#c81e42', borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  + {h.newSupport}
                </button>
                {rooms.map((r) => (
                  <button key={r.id} type="button" onClick={() => { void openRoom(r); }}
                    style={{ border: '1px solid #ebebeb', background: '#fff', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.kind === 'support' ? h.supportTitle : r.title}</span>
                      {r.consumerUnread > 0 ? <span style={{ background: '#ff385c', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{r.consumerUnread}</span> : null}
                    </span>
                    <span style={{ fontSize: 12, color: '#6a6a6a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.status === 'closed' ? h.closed : (r.lastMessagePreview || h.empty)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={() => { setRoom(null); void loadRooms(); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6a6a6a', padding: 0, fontFamily: 'inherit' }}>← {h.back}</button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.kind === 'support' ? h.supportTitle : room.title}</span>
                </div>
                <div ref={hScrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {hloading ? <div style={{ fontSize: 12, color: '#6a6a6a' }}>{h.loading}</div> : null}
                  {!hloading && hmsgs.length === 0 ? <div style={{ fontSize: 12, color: '#6a6a6a' }}>{h.empty}</div> : null}
                  {hmsgs.map((m) => {
                    const mine = m.senderRole === 'consumer';
                    const sys = m.senderRole === 'system';
                    return (
                      <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: sys ? 'center' : mine ? 'flex-end' : 'flex-start' }}>
                        {!mine && !sys ? <span style={{ fontSize: 10, fontWeight: 700, color: m.senderRole === 'platform' ? '#c81e42' : '#1d4ed8', marginBottom: 3 }}>{roleLabel(m)}</span> : null}
                        <div style={{ maxWidth: '88%', background: sys ? 'transparent' : mine ? '#ff385c' : m.senderRole === 'business' ? '#eff6ff' : '#fff', color: sys ? '#9c9c9c' : mine ? '#fff' : '#222', border: mine || sys ? 'none' : '1px solid #ebebeb', borderRadius: 13, padding: sys ? '2px 6px' : '9px 12px', fontSize: sys ? 11 : 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                        <span style={{ fontSize: 10, color: '#9c9c9c', marginTop: 2 }}>{new Date(m.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    );
                  })}
                </div>
                {room.status === 'closed' ? (
                  <div style={{ padding: 12, borderTop: '1px solid #ebebeb', fontSize: 12, color: '#6a6a6a', textAlign: 'center' }}>{h.closed}</div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); void sendHuman(); }} style={{ display: 'flex', gap: 6, padding: 12, borderTop: '1px solid #ebebeb' }}>
                    <input value={hinput} onChange={(e) => setHinput(e.target.value)} placeholder={h.placeholder} enterKeyHint="send"
                      style={{ flex: 1, minWidth: 0, height: 40, border: '1px solid #dddddd', borderRadius: 10, padding: '0 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#222', background: '#fff' }} />
                    <button type="submit" disabled={hbusy || !hinput.trim()} aria-label={h.send}
                      style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, background: '#ff385c', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: hbusy || !hinput.trim() ? 'default' : 'pointer', opacity: hbusy || !hinput.trim() ? 0.6 : 1 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </form>
                )}
              </>
            )
          ) : (<>
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
          </>)}
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
        {!open && unread > 0 ? <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 999, background: '#222', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', border: '2px solid #fff' }}>{unread}</span> : null}
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
