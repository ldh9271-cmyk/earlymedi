'use client';

/**
 * QR 스캐너 — 브라우저 BarcodeDetector(안드로이드 크롬·최신 사파리)로 카메라 프레임을
 * 읽고, 지원하지 않으면 코드 직접 입력으로 폴백. 인식 즉시 /api/voucher/checkin 호출.
 * 체크인 뒤에는 "최종 결제금액" 을 입력해 3자 검증(소비자 확인 → 플랫폼 수수료 확정)으로 넘긴다.
 */
import { useEffect, useRef, useState } from 'react';

type Settlement = {
  finalAmountWon: number; onlinePaidWon: number; status: 'declared' | 'confirmed' | 'disputed' | 'invoiced' | 'paid';
  declaredAt: string; confirmedBy: string | null; disputeNote: string | null; feeBp?: number; feeWon?: number;
};
type Summary = {
  invoiceNo: string; listingTitle: string; reserveDate: string; reserveTime: string; guests: number; status: string;
  totalWon: number; depositWon: number | null; payOnSiteWon: number | null; checkedInAt: string | null; checkedInByName: string | null;
  guestName?: string | null; guestContact?: string | null; userEmail?: string | null; hospitalName?: string | null;
  settlement: Settlement | null;
};
type Result = { ok: true; already: boolean; summary: Summary; feeBp?: number } | { ok: false; reason: string };

type Detector = { detect(src: ImageBitmapSource): Promise<Array<{ rawValue: string }>> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

const STATUS_KO: Record<Settlement['status'], string> = {
  declared: '소비자 확인 대기 (72시간 무응답 시 자동 확정)', confirmed: '금액 확정', disputed: '소비자 이의 — 운영팀 확인 중', invoiced: '수수료 청구됨', paid: '수수료 입금 완료',
};

/**
 * 스캔 화면 모션 (2026-10-18) — 카메라 위에 '스캔 중' 느낌을 준다.
 *  대기: 모서리 프레임 + QR 아이콘 위를 스캔 줄이 천천히 오감
 *  스캔: 로즈색 모서리 4개가 숨 쉬듯 커졌다 작아지고, 빛 꼬리가 달린 스캔 줄이 위아래로 훑음
 *  인식: 모서리가 초록으로 바뀌며 번쩍 + 체크 표시 → '확인 중…'
 * prefers-reduced-motion 이면 움직임을 끈다.
 */
const SCAN_CSS = `
.gu-scan-frame { position: absolute; inset: 16% 22%; border-radius: 16px; box-shadow: 0 0 0 9999px rgba(0,0,0,.42); transition: box-shadow .25s; }
.gu-scan-frame.idle { inset: 20% 30%; box-shadow: none; }
.gu-scan-corner { position: absolute; width: 28px; height: 28px; border: 4px solid #ff385c; animation: gu-corner-pulse 1.6s ease-in-out infinite; transition: border-color .2s; }
.gu-scan-corner.tl { top: -2px; left: -2px; border-right: 0; border-bottom: 0; border-top-left-radius: 14px; }
.gu-scan-corner.tr { top: -2px; right: -2px; border-left: 0; border-bottom: 0; border-top-right-radius: 14px; }
.gu-scan-corner.bl { bottom: -2px; left: -2px; border-right: 0; border-top: 0; border-bottom-left-radius: 14px; }
.gu-scan-corner.br { bottom: -2px; right: -2px; border-left: 0; border-top: 0; border-bottom-right-radius: 14px; }
.gu-scan-frame.idle .gu-scan-corner { border-color: rgba(255,255,255,.55); animation-duration: 2.4s; }
.gu-scan-frame.hit .gu-scan-corner { border-color: #22c55e; animation: none; }
.gu-scan-line { position: absolute; left: 6%; right: 6%; height: 3px; border-radius: 3px; background: linear-gradient(90deg, rgba(255,56,92,0), #ff385c 20%, #ff8fa6 50%, #ff385c 80%, rgba(255,56,92,0)); box-shadow: 0 0 12px 2px rgba(255,56,92,.75); animation: gu-scan-sweep 2.2s ease-in-out infinite; }
.gu-scan-line::after { content: ''; position: absolute; left: 0; right: 0; bottom: 3px; height: 42px; background: linear-gradient(to top, rgba(255,56,92,.28), rgba(255,56,92,0)); pointer-events: none; }
.gu-scan-frame.idle .gu-scan-line { background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.8) 50%, rgba(255,255,255,0)); box-shadow: 0 0 10px rgba(255,255,255,.5); animation-duration: 3s; }
.gu-scan-frame.idle .gu-scan-line::after { background: linear-gradient(to top, rgba(255,255,255,.12), rgba(255,255,255,0)); }
.gu-scan-frame.hit .gu-scan-line { display: none; }
.gu-scan-flash { position: absolute; inset: 0; border-radius: 16px; background: rgba(34,197,94,.28); animation: gu-flash .7s ease-out forwards; }
.gu-scan-check { position: absolute; left: 50%; top: 50%; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 999px; background: #22c55e; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 34px; font-weight: 800; animation: gu-pop .45s cubic-bezier(.2,1.6,.4,1) both; box-shadow: 0 6px 20px rgba(34,197,94,.5); }
.gu-scan-hint { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; color: #fff; font-size: 13px; font-weight: 600; text-shadow: 0 1px 3px rgba(0,0,0,.6); }
.gu-scan-dots::after { content: ''; display: inline-block; width: 1.2em; text-align: left; animation: gu-dots 1.2s steps(4) infinite; }
.gu-scan-qr { position: absolute; inset: 22%; opacity: .32; }
@keyframes gu-scan-sweep { 0% { top: 4%; } 50% { top: 94%; } 100% { top: 4%; } }
@keyframes gu-corner-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: .8; } }
@keyframes gu-flash { 0% { opacity: 1; } 100% { opacity: 0; } }
@keyframes gu-pop { 0% { transform: scale(.3); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes gu-dots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } }
@media (prefers-reduced-motion: reduce) { .gu-scan-line, .gu-scan-corner, .gu-scan-check, .gu-scan-flash, .gu-scan-dots::after { animation: none !important; } .gu-scan-line { top: 50%; } }
`;

function ScanOverlay({ mode, busy }: { mode: 'idle' | 'scan' | 'hit'; busy: boolean }): JSX.Element {
  return (
    <>
      <div className={`gu-scan-frame ${mode === 'idle' ? 'idle' : mode === 'hit' ? 'hit' : ''}`} aria-hidden>
        {mode === 'idle' ? (
          // 대기 화면용 QR 모양 그림 (장식)
          <svg className="gu-scan-qr" viewBox="0 0 29 29" fill="#fff" shapeRendering="crispEdges">
            <path d="M0 0h7v7H0zM1 1v5h5V1zM2 2h3v3H2zM22 0h7v7h-7zM23 1v5h5V1zM24 2h3v3h-3zM0 22h7v7H0zM1 23v5h5v-5zM2 24h3v3H2zM9 0h2v2H9zM12 1h2v3h-2zM15 0h3v2h-3zM9 4h3v2H9zM14 5h2v2h-2zM17 3h2v3h-2zM9 8h2v3H9zM12 9h3v2h-3zM16 8h2v2h-2zM19 9h3v2h-3zM23 9h2v3h-2zM26 8h3v2h-3zM0 9h2v2H0zM3 10h3v2H3zM1 13h2v3H1zM5 14h3v2H5zM9 13h2v2H9zM13 13h3v3h-3zM18 12h2v3h-2zM21 13h3v2h-3zM26 12h2v3h-2zM10 17h3v2h-3zM15 18h2v2h-2zM19 17h3v3h-3zM24 17h3v2h-3zM9 21h2v3H9zM13 22h3v2h-3zM18 22h2v2h-2zM22 21h3v3h-3zM26 22h3v2h-3zM10 26h3v3h-3zM15 25h2v4h-2zM19 26h3v2h-3zM24 26h2v3h-2zM27 27h2v2h-2z" />
          </svg>
        ) : null}
        <span className="gu-scan-corner tl" /><span className="gu-scan-corner tr" />
        <span className="gu-scan-corner bl" /><span className="gu-scan-corner br" />
        <span className="gu-scan-line" />
        {mode === 'hit' ? <><span className="gu-scan-flash" /><span className="gu-scan-check">✓</span></> : null}
      </div>
      {mode !== 'idle' ? (
        <div className="gu-scan-hint">
          {mode === 'hit' || busy ? <span className="gu-scan-dots">확인 중</span> : <span className="gu-scan-dots">QR 을 네모 안에 맞춰 주세요</span>}
        </div>
      ) : null}
    </>
  );
}

export default function Scanner({ orgId }: { orgId: string }): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [settleBusy, setSettleBusy] = useState(false);
  const [settleMsg, setSettleMsg] = useState<string | null>(null);
  const lastRef = useRef<string>('');
  // QR 인식 순간 0.9초 동안 초록 번쩍임 + 체크 표시
  const [hit, setHit] = useState(false);
  const hitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashHit = (): void => {
    setHit(true);
    if (hitTimer.current) clearTimeout(hitTimer.current);
    hitTimer.current = setTimeout(() => setHit(false), 900);
  };

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia));
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); if (hitTimer.current) clearTimeout(hitTimer.current); };
  }, []);

  async function submit(raw: string): Promise<void> {
    const tk = raw.trim().replace(/^https?:\/\/[^/]+\/v\//, '');
    if (!tk || busy) return;
    setBusy(true); setError(null); setSettleMsg(null);
    try {
      const res = await fetch('/api/voucher/checkin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: tk, orgId }) });
      const j = (await res.json()) as Result;
      setResult(j); setToken(tk);
      if (j.ok) {
        const s = j.summary.settlement;
        setAmount(String(s ? s.finalAmountWon : j.summary.totalWon + (j.summary.payOnSiteWon ?? 0)));
        setNote('');
        if (navigator.vibrate) navigator.vibrate(120);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류');
    } finally { setBusy(false); }
  }

  async function settle(): Promise<void> {
    const n = Math.round(Number(amount.replace(/[^\d]/g, '')));
    if (!Number.isFinite(n) || n < 0) { setSettleMsg('금액을 숫자로 입력해 주세요.'); return; }
    setSettleBusy(true); setSettleMsg(null);
    try {
      const res = await fetch('/api/voucher/settle', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, orgId, finalAmountWon: n, note }) });
      const j = (await res.json()) as { ok: true; summary: Summary } | { ok: false; reason: string };
      if (j.ok) {
        setResult((prev) => (prev && prev.ok ? { ...prev, summary: j.summary } : prev));
        setSettleMsg('기록되었습니다. 소비자가 확인하면 수수료가 확정됩니다.');
      } else {
        const m: Record<string, string> = { locked: '이미 확정·청구된 건이라 정정할 수 없습니다. 운영팀에 문의해 주세요.', bad_amount: '금액이 올바르지 않습니다.', not_checked_in: '먼저 방문 확인이 필요합니다.', forbidden: '이 주문의 사업자가 아닙니다.' };
        setSettleMsg(m[j.reason] ?? '기록하지 못했습니다.');
      }
    } catch (e) {
      setSettleMsg(e instanceof Error ? e.message : '네트워크 오류');
    } finally { setSettleBusy(false); }
  }

  async function start(): Promise<void> {
    setError(null); setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setScanning(true);
      const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
      const det = new Ctor({ formats: ['qr_code'] });
      const loop = async (): Promise<void> => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await det.detect(videoRef.current);
          const v = codes[0]?.rawValue;
          if (v && v !== lastRef.current) { lastRef.current = v; flashHit(); await submit(v); }
        } catch { /* 프레임 인식 실패 — 다음 프레임 */ }
        if (streamRef.current) setTimeout(() => { void loop(); }, 350);
      };
      void loop();
    } catch (e) {
      setError(e instanceof Error ? `카메라를 열 수 없습니다: ${e.message}` : '카메라를 열 수 없습니다');
    }
  }
  function stop(): void {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }
  function reset(): void { setResult(null); setSettleMsg(null); lastRef.current = ''; }

  const won = (n: number | null | undefined): string => (n == null ? '—' : `₩${n.toLocaleString('ko-KR')}`);
  const pct = (bp: number): string => `${(bp / 100).toFixed(bp % 100 === 0 ? 0 : 2)}%`;
  const reasonText: Record<string, string> = {
    invalid: '유효하지 않은 QR 입니다.', not_paid: '결제가 완료되지 않은 주문입니다.', cancelled: '취소된 주문입니다.',
    forbidden: '이 주문의 사업자가 아닙니다 (다른 매장/병원의 예약).', no_org: '활성 조직이 없습니다.', unauthenticated: '로그인이 필요합니다.',
  };
  const inputStyle = { border: '1px solid #dddddd', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit' } as const;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ border: '1px solid #ebebeb', borderRadius: 14, padding: 16, background: '#fff' }}>
        {supported ? (
          <>
            <style dangerouslySetInnerHTML={{ __html: SCAN_CSS }} />
            <div style={{ position: 'relative', background: '#111', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3', maxHeight: 360 }}>
              <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} />
              <ScanOverlay mode={!scanning ? 'idle' : hit ? 'hit' : 'scan'} busy={busy} />
              {!scanning ? (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>카메라를 시작하면 QR 을 자동으로 인식합니다</div>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {!scanning
                ? <button type="button" onClick={start} style={{ flex: 1, background: '#ff385c', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>📷 카메라 시작</button>
                : <button type="button" onClick={stop} style={{ flex: 1, background: '#222', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>■ 중지</button>}
            </div>
          </>
        ) : supported === false ? (
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: 0, lineHeight: 1.6 }}>이 브라우저는 카메라 QR 인식을 지원하지 않습니다. <b>휴대폰 기본 카메라</b>로 QR 을 찍으면 열리는 페이지에서 바로 방문 확인할 수 있고, 아래에 코드를 직접 입력해도 됩니다.</p>
        ) : null}
        <form onSubmit={(e) => { e.preventDefault(); void submit(manual); }} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="QR 아래 코드 또는 https://…/v/… 주소 붙여넣기"
            style={{ flex: 1, border: '1px solid #dddddd', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit' }} />
          <button type="submit" disabled={busy} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{busy ? '확인 중…' : '확인'}</button>
        </form>
        {error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{error}</p> : null}
      </div>

      {result ? (
        result.ok ? (
          <div style={{ border: '1px solid #a7f3d0', background: '#ecfdf5', borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#047857' }}>{result.already ? '이미 방문 확인된 예약입니다' : '✅ 방문 확인 완료'}</div>
            <div style={{ fontSize: 13, color: '#065f46', marginTop: 2 }}>{result.summary.checkedInAt ? new Date(result.summary.checkedInAt).toLocaleString('ko-KR') : ''}{result.summary.checkedInByName ? ` · ${result.summary.checkedInByName}` : ''}</div>
            <table style={{ width: '100%', fontSize: 14, marginTop: 12, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#6a6a6a', padding: '5px 0' }}>상품</td><td style={{ fontWeight: 700, textAlign: 'right' }}>{result.summary.listingTitle}</td></tr>
                <tr><td style={{ color: '#6a6a6a', padding: '5px 0' }}>인보이스</td><td style={{ fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }}>{result.summary.invoiceNo}</td></tr>
                <tr><td style={{ color: '#6a6a6a', padding: '5px 0' }}>예약</td><td style={{ fontWeight: 700, textAlign: 'right' }}>{result.summary.reserveDate} {result.summary.reserveTime} · {result.summary.guests}명</td></tr>
                <tr><td style={{ color: '#6a6a6a', padding: '5px 0' }}>온라인 결제</td><td style={{ fontWeight: 700, textAlign: 'right' }}>{won(result.summary.totalWon)}{result.summary.depositWon ? ' (예약금)' : ''}</td></tr>
                {result.summary.payOnSiteWon ? <tr><td style={{ color: '#6a6a6a', padding: '5px 0' }}>현장 결제 받을 금액</td><td style={{ fontWeight: 800, textAlign: 'right', color: '#c2143c' }}>{won(result.summary.payOnSiteWon)}</td></tr> : null}
                <tr><td style={{ color: '#6a6a6a', padding: '5px 0' }}>고객</td><td style={{ fontWeight: 700, textAlign: 'right' }}>{result.summary.guestName ?? result.summary.userEmail ?? '—'}{result.summary.guestContact ? ` · ${result.summary.guestContact}` : ''}</td></tr>
              </tbody>
            </table>

            <SettleBox
              s={result.summary.settlement}
              feeBp={result.summary.settlement?.feeBp ?? result.feeBp ?? 0}
              amount={amount} setAmount={setAmount} note={note} setNote={setNote}
              busy={settleBusy} msg={settleMsg} onSubmit={settle} won={won} pct={pct} inputStyle={inputStyle}
            />

            <button type="button" onClick={reset} style={{ marginTop: 12, background: '#fff', border: '1px solid #a7f3d0', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>다음 고객 스캔</button>
          </div>
        ) : (
          <div style={{ border: '1px solid #fecdd3', background: '#fffafb', borderRadius: 14, padding: 16 }}>
            <b style={{ color: '#c2143c' }}>{reasonText[result.reason] ?? '확인할 수 없습니다.'}</b>
            <button type="button" onClick={reset} style={{ marginLeft: 10, background: '#fff', border: '1px solid #fecdd3', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>다시 스캔</button>
          </div>
        )
      ) : null}
    </div>
  );
}

function SettleBox(props: {
  s: Settlement | null; feeBp: number; amount: string; setAmount: (v: string) => void; note: string; setNote: (v: string) => void;
  busy: boolean; msg: string | null; onSubmit: () => void; won: (n: number | null | undefined) => string; pct: (bp: number) => string;
  inputStyle: { border: string; borderRadius: number; padding: string; fontSize: number; fontFamily: string };
}): JSX.Element {
  const { s, feeBp, amount, setAmount, note, setNote, busy, msg, onSubmit, won, pct, inputStyle } = props;
  const n = Math.round(Number(amount.replace(/[^\d]/g, '')) || 0);
  const fee = Math.max(0, Math.round((n * feeBp) / 10_000));
  const editable = !s || s.status === 'declared' || s.status === 'disputed';
  return (
    <div style={{ marginTop: 14, borderTop: '1px dashed #a7f3d0', paddingTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#065f46' }}>💳 최종 결제금액 (3자 검증)</div>
      <p style={{ fontSize: 12, color: '#3f6f5a', margin: '4px 0 8px', lineHeight: 1.55 }}>
        온라인 결제분을 포함해 이 고객에게 실제로 받은 총액을 입력하세요. 소비자가 자기 화면에서 확인하면 플랫폼 수수료({pct(feeBp)})가 이 금액 기준으로 확정됩니다.
      </p>
      {s ? (
        <div style={{ fontSize: 13, background: '#fff', border: '1px solid #d1fae5', borderRadius: 10, padding: '8px 10px', marginBottom: 8 }}>
          <b>{won(s.finalAmountWon)}</b> 입력됨 · {new Date(s.declaredAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          <div style={{ color: s.status === 'disputed' ? '#c2143c' : '#047857', marginTop: 2 }}>
            {STATUS_KO[s.status]}{s.status === 'confirmed' && s.confirmedBy ? ` (${s.confirmedBy === 'consumer' ? '소비자 확인' : s.confirmedBy === 'auto' ? '자동' : '운영팀'})` : ''}
            {s.status === 'disputed' && s.disputeNote ? ` — "${s.disputeNote}"` : ''}
            {s.feeWon != null ? ` · 수수료 ${won(s.feeWon)}` : ''}
          </div>
        </div>
      ) : null}
      {editable ? (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="최종 결제금액 (원)" style={{ ...inputStyle, flex: 1, fontWeight: 700 }} />
            <span style={{ fontSize: 12, color: '#6a6a6a', whiteSpace: 'nowrap' }}>수수료 <b style={{ color: '#222' }}>{won(fee)}</b></span>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모 (선택 — 추가 시술·할인 등)" style={inputStyle} />
          <button type="submit" disabled={busy} style={{ background: '#047857', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            {busy ? '기록 중…' : s ? '금액 정정' : '최종 결제금액 기록'}
          </button>
        </form>
      ) : null}
      {msg ? <p style={{ fontSize: 12, color: msg.startsWith('기록되었') ? '#047857' : '#dc2626', margin: '8px 0 0' }}>{msg}</p> : null}
    </div>
  );
}
