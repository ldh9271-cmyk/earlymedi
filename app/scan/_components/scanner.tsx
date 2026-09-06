'use client';

/**
 * QR 스캐너 — 브라우저 BarcodeDetector(안드로이드 크롬·최신 사파리)로 카메라 프레임을
 * 읽고, 지원하지 않으면 코드 직접 입력으로 폴백. 인식 즉시 /api/voucher/checkin 호출.
 */
import { useEffect, useRef, useState } from 'react';

type Summary = {
  invoiceNo: string; listingTitle: string; reserveDate: string; reserveTime: string; guests: number; status: string;
  totalWon: number; depositWon: number | null; payOnSiteWon: number | null; checkedInAt: string | null; checkedInByName: string | null;
  guestName?: string | null; guestContact?: string | null; userEmail?: string | null; hospitalName?: string | null;
};
type Result = { ok: true; already: boolean; summary: Summary } | { ok: false; reason: string };

type Detector = { detect(src: ImageBitmapSource): Promise<Array<{ rawValue: string }>> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

export default function Scanner({ orgId }: { orgId: string }): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastRef = useRef<string>('');

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia));
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  async function submit(raw: string): Promise<void> {
    const token = raw.trim().replace(/^https?:\/\/[^/]+\/v\//, '');
    if (!token || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/voucher/checkin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, orgId }) });
      const j = (await res.json()) as Result;
      setResult(j);
      if (j.ok && navigator.vibrate) navigator.vibrate(120);
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류');
    } finally { setBusy(false); }
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
          if (v && v !== lastRef.current) { lastRef.current = v; await submit(v); }
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

  const won = (n: number | null | undefined): string => (n == null ? '—' : `₩${n.toLocaleString('ko-KR')}`);
  const reasonText: Record<string, string> = {
    invalid: '유효하지 않은 QR 입니다.', not_paid: '결제가 완료되지 않은 주문입니다.', cancelled: '취소된 주문입니다.',
    forbidden: '이 주문의 사업자가 아닙니다 (다른 매장/병원의 예약).', no_org: '활성 조직이 없습니다.', unauthenticated: '로그인이 필요합니다.',
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ border: '1px solid #ebebeb', borderRadius: 14, padding: 16, background: '#fff' }}>
        {supported ? (
          <>
            <div style={{ position: 'relative', background: '#111', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3', maxHeight: 360 }}>
              <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} />
              {!scanning ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>카메라를 시작하면 QR 을 자동으로 인식합니다</div>
              ) : (
                <div style={{ position: 'absolute', inset: '18% 22%', border: '3px solid rgba(255,56,92,.9)', borderRadius: 14, boxShadow: '0 0 0 9999px rgba(0,0,0,.35)' }} />
              )}
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
            <button type="button" onClick={() => { setResult(null); lastRef.current = ''; }} style={{ marginTop: 12, background: '#fff', border: '1px solid #a7f3d0', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>다음 고객 스캔</button>
          </div>
        ) : (
          <div style={{ border: '1px solid #fecdd3', background: '#fffafb', borderRadius: 14, padding: 16 }}>
            <b style={{ color: '#c2143c' }}>{reasonText[result.reason] ?? '확인할 수 없습니다.'}</b>
            <button type="button" onClick={() => { setResult(null); lastRef.current = ''; }} style={{ marginLeft: 10, background: '#fff', border: '1px solid #fecdd3', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>다시 스캔</button>
          </div>
        )
      ) : null}
    </div>
  );
}
