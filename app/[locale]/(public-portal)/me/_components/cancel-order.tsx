'use client';

/**
 * 마이페이지 예약 취소 버튼 + 환불 안내 다이얼로그.
 *  누르면 "지금 취소하면 얼마가 환불되는지" 를 규정표와 함께 먼저 보여주고,
 *  확인하면 /api/me/orders/cancel 로 취소(미결제) 또는 취소 요청(결제됨)을 보낸다.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { describeTier, currentTierIndex, type RefundCategory, type RefundEstimate, type RefundTierRange, type TierLabels } from '@/lib/refund/policy';

export type CancelLabels = TierLabels & {
  cancelBtn: string; dialogTitle: string; nowLabel: string; estimateLabel: string; paidLabel: string;
  estimateDays: string; estimateSameDay: string; estimateAfter: string; estimateCutoff: string; unpaidNote: string;
  reasonLabel: string; reasonPlaceholder: string; confirmPaid: string; confirmUnpaid: string; back: string; sending: string; error: string;
  cancelledDone: string; requestedDone: string; policyLink: string; colWhen: string; colRefund: string; notes: string[];
  cats: Record<RefundCategory, string>;
};

const fill = (tpl: string, v: Record<string, string | number>): string => tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(v[k] ?? ''));

export default function CancelOrderButton({ locale, orderId, title, invoiceNo, status, totalWon, category, estimate, tiers, sameDayHours, labels }: {
  locale: string; orderId: string; title: string; invoiceNo: string; status: string; totalWon: number;
  category: RefundCategory; estimate: RefundEstimate; tiers: RefundTierRange[]; sameDayHours: number | null; labels: CancelLabels;
}): JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'cancelled' | 'requested' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const unpaid = status === 'issued';
  const won = (n: number): string => `₩${n.toLocaleString('ko-KR')}`;
  const cur = currentTierIndex(category, estimate);
  const estimateText = unpaid ? labels.unpaidNote
    : estimate.afterStart ? labels.estimateAfter
      : estimate.sameDayCutoff && sameDayHours ? fill(labels.estimateCutoff, { h: sameDayHours })
        : estimate.daysBefore === 0 ? fill(labels.estimateSameDay, { pct: estimate.pct })
          : fill(labels.estimateDays, { n: estimate.daysBefore, pct: estimate.pct });

  async function submit(): Promise<void> {
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/me/orders/cancel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, reason }) });
      const j = (await res.json()) as { ok: true; mode: 'cancelled' | 'requested' } | { ok: false; reason: string };
      if (j.ok) { setDone(j.mode); router.refresh(); }
      else setErr(labels.error);
    } catch { setErr(labels.error); } finally { setBusy(false); }
  }

  const btn = (bg: string, fg: string, border?: string): React.CSSProperties => ({ background: bg, color: fg, border: border ?? 'none', borderRadius: 10, padding: '11px 16px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flex: 1 });
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ fontSize: 12, fontWeight: 700, color: '#6a6a6a', background: '#fff', border: '1px solid #dddddd', borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
        {labels.cancelBtn}
      </button>
      {open ? (
        <div role="dialog" aria-modal="true" onClick={() => !busy && setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 12 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{labels.dialogTitle}</div>
            <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 4 }}>{title} · {invoiceNo}</div>

            {done ? (
              <div style={{ marginTop: 16, background: '#ecfdf5', color: '#047857', borderRadius: 12, padding: '14px 16px', fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>
                {done === 'cancelled' ? labels.cancelledDone : labels.requestedDone}
                <div style={{ marginTop: 12 }}>
                  <button type="button" onClick={() => setOpen(false)} style={btn('#222', '#fff')}>{labels.back}</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginTop: 14, background: '#fff5f7', border: '1px solid #ffd7de', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: '#c81e42', fontWeight: 700 }}>{labels.nowLabel}</div>
                  <div style={{ fontSize: 14, marginTop: 4, color: '#222' }}>{estimateText}</div>
                  {!unpaid ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                      <span style={{ fontSize: 13, color: '#6a6a6a' }}>{labels.estimateLabel}</span>
                      <span style={{ fontSize: 22, fontWeight: 800, color: estimate.refundWon > 0 ? '#047857' : '#c2143c' }}>{won(estimate.refundWon)}</span>
                    </div>
                  ) : null}
                  {!unpaid ? <div style={{ fontSize: 12, color: '#9c9c9c', textAlign: 'right' }}>{labels.paidLabel} {won(totalWon)}</div> : null}
                </div>

                {!unpaid ? (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6a6a6a', marginBottom: 6 }}>{labels.cats[category]}</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ color: '#9c9c9c', fontSize: 11 }}><th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>{labels.colWhen}</th><th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>{labels.colRefund}</th></tr></thead>
                      <tbody>
                        {tiers.map((r, i) => {
                          const d = describeTier(r, i, labels);
                          const on = i === cur;
                          return (
                            <tr key={i} style={{ background: on ? '#fff5f7' : 'transparent', borderTop: '1px solid #f0f0f0' }}>
                              <td style={{ padding: '7px 8px', fontWeight: on ? 800 : 500, color: on ? '#c81e42' : '#222' }}>{on ? '▶ ' : ''}{d.when}</td>
                              <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: on ? 800 : 600, color: r.pct === 0 ? '#c2143c' : '#222' }}>{d.refund}</td>
                            </tr>
                          );
                        })}
                        <tr style={{ background: cur === -1 ? '#fff5f7' : 'transparent', borderTop: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '7px 8px', fontWeight: cur === -1 ? 800 : 500, color: cur === -1 ? '#c81e42' : '#222' }}>{cur === -1 ? '▶ ' : ''}{labels.tierAfter}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', color: '#c2143c', fontWeight: 600 }}>{labels.none}</td>
                        </tr>
                      </tbody>
                    </table>
                    <ul style={{ margin: '10px 0 0', paddingLeft: 16, fontSize: 12, color: '#6a6a6a', lineHeight: 1.6 }}>
                      {labels.notes.slice(0, 2).map((n) => <li key={n}>{n}</li>)}
                    </ul>
                    <a href={`/${locale}/policy/refund`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6, fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>{labels.policyLink} →</a>
                  </div>
                ) : null}

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: '#6a6a6a', marginBottom: 4 }}>{labels.reasonLabel}</div>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder={labels.reasonPlaceholder}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #dddddd', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
                </div>
                {err ? <p style={{ fontSize: 12, color: '#dc2626', margin: '8px 0 0' }}>{err}</p> : null}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button type="button" disabled={busy} onClick={() => setOpen(false)} style={btn('#fff', '#222', '1px solid #dddddd')}>{labels.back}</button>
                  <button type="button" disabled={busy} onClick={submit} style={btn('#ff385c', '#fff')}>{busy ? labels.sending : unpaid ? labels.confirmUnpaid : labels.confirmPaid}</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
