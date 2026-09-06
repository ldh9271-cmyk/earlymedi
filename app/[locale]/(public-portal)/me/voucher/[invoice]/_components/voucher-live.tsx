'use client';

// 바우처 상태 실시간 표시 — 8초마다 /api/voucher/status 를 폴링해 사업자 스캔·최종 결제금액 입력을 반영.
// 3자 검증: 가맹점이 입력한 최종 결제금액을 소비자가 여기서 확인/이의 → 플랫폼 수수료 확정.
import { useEffect, useState } from 'react';

type Settlement = { finalAmountWon: number; status: 'declared' | 'confirmed' | 'disputed' | 'invoiced' | 'paid'; declaredAt: string } | null;
type S = { status: string; checkedInAt: string | null; checkedInByName: string | null; settlement: Settlement };
type Labels = {
  paid: string; checkedIn: string; cancelled: string; waiting: string; checkedInAt: string; by: string; live: string;
  finalAmount: string; amountHint: string; confirmAmount: string; dispute: string; disputeNote: string; disputeSend: string;
  amountConfirmed: string; disputed: string; amountWaiting: string;
};

export default function VoucherLive({ token, initial, labels }: { token: string; initial: S; labels: Labels }): JSX.Element {
  const [s, setS] = useState<S>(initial);
  const [busy, setBusy] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const settled = s.settlement && s.settlement.status !== 'declared';
  const done = s.status === 'cancelled' || Boolean(settled);
  useEffect(() => {
    if (done) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/voucher/status?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (res.ok) {
          const j = (await res.json()) as S;
          setS((prev) => {
            if (!prev.checkedInAt && j.checkedInAt && navigator.vibrate) navigator.vibrate(200);
            return { status: j.status, checkedInAt: j.checkedInAt, checkedInByName: j.checkedInByName, settlement: j.settlement ?? null };
          });
        }
      } catch { /* 다음 주기 */ }
    }, 8000);
    return () => clearInterval(id);
  }, [token, done]);

  async function respond(action: 'confirm' | 'dispute'): Promise<void> {
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/voucher/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action, note }) });
      const j = (await res.json()) as { ok: true; summary: S } | { ok: false; reason: string };
      if (j.ok) { setS({ status: j.summary.status, checkedInAt: j.summary.checkedInAt, checkedInByName: j.summary.checkedInByName, settlement: j.summary.settlement ?? null }); setDisputing(false); }
      else setErr(j.reason);
    } catch (e) { setErr(e instanceof Error ? e.message : 'error'); } finally { setBusy(false); }
  }

  const checked = Boolean(s.checkedInAt);
  const cancelled = s.status === 'cancelled';
  const tone = cancelled ? { bg: '#f5f5f5', fg: '#6a6a6a' } : checked ? { bg: '#ecfdf5', fg: '#047857' } : { bg: '#eff6ff', fg: '#1d4ed8' };
  const st = s.settlement;
  const btn = (bg: string, fg = '#fff'): React.CSSProperties => ({ background: bg, color: fg, border: bg === '#fff' ? '1px solid #dddddd' : 'none', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flex: 1 });
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ background: tone.bg, color: tone.fg, borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{cancelled ? labels.cancelled : checked ? `✅ ${labels.checkedIn}` : labels.paid}</div>
        {checked && s.checkedInAt ? (
          <div style={{ fontSize: 12, marginTop: 4 }}>{labels.checkedInAt} {new Date(s.checkedInAt).toLocaleString()}{s.checkedInByName ? ` · ${labels.by} ${s.checkedInByName}` : ''}</div>
        ) : !cancelled ? (
          <div style={{ fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1d4ed8', display: 'inline-block', animation: 'pulse 1.4s infinite' }} />
            {labels.waiting} · {labels.live}
            <style>{'@keyframes pulse{0%,100%{opacity:.25}50%{opacity:1}}'}</style>
          </div>
        ) : null}
      </div>

      {checked && !cancelled ? (
        <div style={{ marginTop: 10, border: '1px solid #ebebeb', borderRadius: 12, padding: '12px 14px', textAlign: 'left', background: '#fff' }}>
          <div style={{ fontSize: 12, color: '#6a6a6a' }}>{labels.finalAmount}</div>
          {!st ? (
            <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1d4ed8', display: 'inline-block', animation: 'pulse 1.4s infinite' }} />
              {labels.amountWaiting}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>₩{st.finalAmountWon.toLocaleString('ko-KR')}</div>
              {st.status === 'declared' ? (
                <>
                  <p style={{ fontSize: 12, color: '#6a6a6a', margin: '6px 0 10px', lineHeight: 1.55 }}>{labels.amountHint}</p>
                  {!disputing ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" disabled={busy} onClick={() => respond('confirm')} style={btn('#047857')}>✓ {labels.confirmAmount}</button>
                      <button type="button" disabled={busy} onClick={() => setDisputing(true)} style={btn('#fff', '#c2143c')}>{labels.dispute}</button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={labels.disputeNote} rows={2}
                        style={{ border: '1px solid #dddddd', borderRadius: 10, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" disabled={busy} onClick={() => respond('dispute')} style={btn('#c2143c')}>{labels.disputeSend}</button>
                        <button type="button" disabled={busy} onClick={() => setDisputing(false)} style={btn('#fff', '#222')}>←</button>
                      </div>
                    </div>
                  )}
                </>
              ) : st.status === 'disputed' ? (
                <div style={{ fontSize: 13, color: '#c2143c', marginTop: 6, fontWeight: 700 }}>{labels.disputed}</div>
              ) : (
                <div style={{ fontSize: 13, color: '#047857', marginTop: 6, fontWeight: 700 }}>✓ {labels.amountConfirmed}</div>
              )}
              {err ? <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>{err}</p> : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
