'use client';

// 바우처 상태 실시간 표시 — 8초마다 /api/voucher/status 를 폴링해 사업자 스캔을 반영.
import { useEffect, useState } from 'react';

type S = { status: string; checkedInAt: string | null; checkedInByName: string | null };

export default function VoucherLive({ token, initial, labels }: {
  token: string; initial: S;
  labels: { paid: string; checkedIn: string; cancelled: string; waiting: string; checkedInAt: string; by: string; live: string };
}): JSX.Element {
  const [s, setS] = useState<S>(initial);
  useEffect(() => {
    if (s.checkedInAt || s.status === 'cancelled') return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/voucher/status?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (res.ok) {
          const j = (await res.json()) as S;
          setS({ status: j.status, checkedInAt: j.checkedInAt, checkedInByName: j.checkedInByName });
          if (j.checkedInAt && navigator.vibrate) navigator.vibrate(200);
        }
      } catch { /* 다음 주기 */ }
    }, 8000);
    return () => clearInterval(id);
  }, [token, s.checkedInAt, s.status]);

  const checked = Boolean(s.checkedInAt);
  const cancelled = s.status === 'cancelled';
  const tone = cancelled ? { bg: '#f5f5f5', fg: '#6a6a6a' } : checked ? { bg: '#ecfdf5', fg: '#047857' } : { bg: '#eff6ff', fg: '#1d4ed8' };
  return (
    <div style={{ marginTop: 16, background: tone.bg, color: tone.fg, borderRadius: 12, padding: '12px 14px' }}>
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
  );
}
