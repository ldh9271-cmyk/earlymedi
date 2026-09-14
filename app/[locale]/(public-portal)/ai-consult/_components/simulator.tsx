'use client';

/**
 * 스타일 시뮬레이션 — 사진 한 장 + 프리셋 버튼 → AI 가 편집한 결과를 전후 슬라이더로.
 *
 * 흐름: 사진 선택(PC 파일 / 모바일 촬영·앨범) → 프리셋 → 실행.
 * 비용: 회원 첫 1회 무료, 이후 1회 = runCost 포인트. 포인트는 토스로 팩을 사서 충전.
 * 비로그인은 화면은 보되 실행 버튼이 로그인으로 안내한다(무료 1회가 가입 유인).
 * 사진·결과는 서버에 저장되지 않는다. 결과는 "참고용 예시" 면책과 함께만 보여준다.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { openTossPayment } from '@/lib/payments/toss-client';

type Wallet = { balance: number; freeLeft: number; runCost: number; packs: Array<{ key: string; priceWon: number; points: number }>; firstBonusPct?: number };
type Rec = { title: string; href: string; img: string | null; promo: string | null };
type Group = 'hair' | 'color' | 'makeup' | 'tone' | 'skin';
const GROUPS: Array<{ key: Group; presets: string[] }> = [
  { key: 'hair', presets: ['hair_short_bob', 'hair_layered', 'hair_wave', 'hair_bangs'] },
  { key: 'color', presets: ['color_ash_brown', 'color_warm_brown', 'color_dark_black', 'color_milk_tea'] },
  { key: 'makeup', presets: ['makeup_natural', 'makeup_glam', 'makeup_clean'] },
  { key: 'tone', presets: ['tone_spring_warm', 'tone_summer_cool', 'tone_autumn_warm', 'tone_winter_cool'] },
  { key: 'skin', presets: ['skin_glow'] },
];

export default function Simulator({ locale, t, userEmail, note }: {
  locale: PublicLocale; t: Dictionary['ai']['sim']; userEmail: string | null; note: string;
}): JSX.Element {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>('hair_wave');
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [split, setSplit] = useState(50);
  const [err, setErr] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [charge, setCharge] = useState<'closed' | 'open' | 'paying'>('closed');
  const [notice, setNotice] = useState<string | null>(null);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [landingHref, setLandingHref] = useState<string | null>(null);

  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    setIsMobile(coarse || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    void refreshWallet();
    const q = new URLSearchParams(window.location.search).get('credits');
    if (q === 'ok') setNotice(t.creditsOk);
    else if (q === 'fail') setNotice(t.creditsFail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'running') { setProgress(0); return; }
    let p = 0;
    const id = window.setInterval(() => { p += (92 - p) * 0.03; setProgress(p); }, 100);
    return () => window.clearInterval(id);
  }, [phase]);

  async function refreshWallet(): Promise<void> {
    try {
      const r = await fetch('/api/ai/sim-credits', { cache: 'no-store' });
      const j = (await r.json()) as { wallet?: Wallet };
      if (j.wallet) setWallet(j.wallet);
    } catch { /* 지갑 표시만 빠진다 */ }
  }

  function onPick(file: File | undefined): void {
    if (!file) return;
    setErr(null); setAfter(null); setPhase('idle');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      const g = c.getContext('2d');
      if (!g) return;
      g.drawImage(img, 0, 0, c.width, c.height);
      setBefore(c.toDataURL('image/jpeg', 0.9));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function run(): Promise<void> {
    if (!before) return;
    if (!userEmail) { setErr(t.loginToUse); return; }
    setErr(null); setPhase('running'); setAfter(null); setRecs([]);
    try {
      const r = await fetch('/api/ai/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: before, mimeType: 'image/jpeg', preset, locale }),
      });
      const j = (await r.json()) as { image?: string; mimeType?: string; error?: string; wallet?: Wallet; recs?: Rec[]; landingHref?: string };
      if (!r.ok || !j.image) {
        if (j.wallet) setWallet(j.wallet);
        setErr(j.error === 'insufficient_points' ? t.errNoPoints : j.error === 'refused' ? t.errRefused : j.error === 'login_required' ? t.loginToUse : j.error === 'confirm_email' ? t.errConfirmEmail : t.errFailed);
        if (j.error === 'insufficient_points') setCharge('open');
        setPhase('idle');
        return;
      }
      setAfter(`data:${j.mimeType ?? 'image/png'};base64,${j.image}`);
      if (j.wallet) setWallet(j.wallet);
      setRecs(j.recs ?? []); setLandingHref(j.landingHref ?? null);
      setSplit(50);
      setPhase('done');
    } catch {
      setErr(t.errFailed); setPhase('idle');
    }
  }

  async function buy(packKey: string): Promise<void> {
    setCharge('paying'); setErr(null);
    try {
      const r = await fetch('/api/ai/sim-credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pack: packKey, locale }) });
      const j = (await r.json()) as { invoiceNo?: string; amountWon?: number; points?: number; error?: string };
      if (!r.ok || !j.invoiceNo || !j.amountWon) { setErr(j.error === 'login_required' ? t.loginToUse : t.errFailed); setCharge('open'); return; }
      const origin = window.location.origin;
      const out = await openTossPayment({
        amount: j.amountWon, orderId: j.invoiceNo, orderName: `GlowUpTour AI ${j.points?.toLocaleString('ko-KR')}P`,
        successUrl: `${origin}/${locale}/ai-consult/toss?result=success`, failUrl: `${origin}/${locale}/ai-consult/toss?result=fail`,
        customerEmail: userEmail, locale,
      });
      if (out !== 'redirected') setCharge('open');
    } catch { setErr(t.errFailed); setCharge('open'); }
  }

  const costLabel = wallet
    ? (wallet.freeLeft > 0 ? t.freeBadge : t.cost.replace('{n}', wallet.runCost.toLocaleString('ko-KR')))
    : '';
  const presetLabel = (k: string): string => (t.presets as Record<string, string>)[k] ?? k;
  const groupLabel = (g: Group): string => (t.groups as Record<string, string>)[g] ?? g;
  const btn = (active: boolean): React.CSSProperties => ({
    border: active ? '2px solid #047857' : '1px solid #dddddd', background: active ? '#ecfdf5' : '#fff', color: '#222',
    borderRadius: 999, padding: '7px 12px', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
  });

  return (
    <div id="ai-sim" style={{ border: '1px dashed #dddddd', background: '#fafafa', borderRadius: 18, padding: '32px 24px' }}>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes simSpin{to{transform:rotate(360deg)}} @keyframes simStripes{from{background-position:0 0}to{background-position:28px 0}}' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{t.title}</h2>
        {wallet ? (
          <div style={{ fontSize: 13, color: '#222', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ background: '#ecfdf5', color: '#047857', borderRadius: 999, padding: '4px 10px', fontWeight: 700 }}>{costLabel}</span>
            {userEmail ? <span>{t.balance}: <b>{wallet.balance.toLocaleString('ko-KR')}P</b></span> : null}
            {userEmail ? <button type="button" onClick={() => setCharge('open')} style={{ ...btn(false), padding: '5px 10px' }}>{t.charge}</button> : null}
          </div>
        ) : null}
      </div>
      <p style={{ fontSize: 14, color: '#6a6a6a', margin: '8px 0 0', lineHeight: 1.55, maxWidth: 680 }}>{t.intro}</p>
      {notice ? <p style={{ fontSize: 13, color: '#047857', margin: '10px 0 0', fontWeight: 600 }}>{notice}</p> : null}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onPick(e.target.files?.[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={(e) => onPick(e.target.files?.[0])} />

      {/* 1) 사진 */}
      <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {isMobile ? (
          <>
            <button type="button" onClick={() => cameraRef.current?.click()} style={{ ...btn(false), background: before ? '#fff' : '#ff385c', color: before ? '#222' : '#fff', border: before ? '1px solid #222' : 'none', padding: '11px 18px', fontWeight: 600 }}>📷 {t.takePhoto}</button>
            <button type="button" onClick={() => fileRef.current?.click()} style={{ ...btn(false), border: '1px solid #222', padding: '11px 18px', fontWeight: 600 }}>🖼 {t.fromAlbum}</button>
          </>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} style={{ ...btn(false), background: before ? '#fff' : '#ff385c', color: before ? '#222' : '#fff', border: before ? '1px solid #222' : 'none', padding: '11px 18px', fontWeight: 600 }}>{before ? t.changePhoto : t.choosePhoto}</button>
        )}
        {before && !after ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={before} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, border: '1px solid #ebebeb' }} />
        ) : null}
      </div>

      {/* 2) 프리셋 */}
      <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
        {GROUPS.map((g) => (
          <div key={g.key} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6a6a6a', minWidth: 76 }}>{groupLabel(g.key)}</span>
            {g.presets.map((k) => (
              <button key={k} type="button" onClick={() => setPreset(k)} style={btn(preset === k)} aria-pressed={preset === k}>{presetLabel(k)}</button>
            ))}
          </div>
        ))}
      </div>

      {/* 3) 실행 */}
      <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {userEmail ? (
          <button type="button" disabled={!before || phase === 'running'} onClick={() => void run()}
            style={{ background: '#047857', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 15, cursor: !before || phase === 'running' ? 'not-allowed' : 'pointer', opacity: !before || phase === 'running' ? 0.5 : 1, fontFamily: 'inherit' }}>
            {phase === 'running' ? t.running : t.run}{wallet && before && phase !== 'running' ? ` · ${costLabel}` : ''}
          </button>
        ) : (
          <Link href={`/${locale}/signup?next=${encodeURIComponent(`/${locale}/ai-consult#ai-sim`)}`}
            style={{ background: '#047857', color: '#fff', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            {t.signupCta}
          </Link>
        )}
        {after ? <button type="button" onClick={() => { setAfter(null); setPhase('idle'); }} style={btn(false)}>{t.tryAnother}</button> : null}
      </div>
      {err ? <p style={{ fontSize: 13, color: '#c1121f', margin: '10px 0 0' }}>{err}</p> : null}

      {phase === 'running' ? (
        <div style={{ margin: '14px 0 0', maxWidth: 360 }} role="status" aria-live="polite">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #a7f3d0', borderTopColor: '#047857', animation: 'simSpin 0.8s linear infinite' }} />
            {t.running}
          </div>
          <div style={{ marginTop: 8, height: 8, borderRadius: 999, background: '#d1fae5', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(progress)}%`, background: 'repeating-linear-gradient(45deg,#047857 0 10px,#10b981 10px 20px)', backgroundSize: '28px 28px', animation: 'simStripes 0.6s linear infinite', transition: 'width .15s linear' }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#047857', fontWeight: 600, marginTop: 4 }}>{Math.round(progress)}%</div>
        </div>
      ) : null}

      {/* 4) 전후 슬라이더 */}
      {before && after ? (
        <div style={{ marginTop: 20 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '1 / 1', margin: '0 auto', borderRadius: 16, overflow: 'hidden', border: '1px solid #ebebeb', background: '#000', userSelect: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={after} alt={t.after} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, width: `${split}%`, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={before} alt={t.before} style={{ position: 'absolute', inset: 0, width: `${10000 / split}%`, maxWidth: 'none', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${split}%`, width: 2, background: '#fff', boxShadow: '0 0 0 1px rgba(0,0,0,.2)' }} />
            <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 8px' }}>{t.before}</span>
            <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(4,120,87,.85)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 8px' }}>{t.after}</span>
            <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label={t.sliderHint}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'ew-resize', margin: 0 }} />
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#6a6a6a', margin: '8px 0 0' }}>{t.sliderHint}</p>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#b45309', margin: '8px auto 0', maxWidth: 560, lineHeight: 1.5, fontWeight: 600 }}>{t.disclaimer}</p>

          {/* 이 스타일 잘하는 샵 — 시뮬레이션을 예약 유입으로 */}
          {recs.length > 0 ? (
            <div style={{ marginTop: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t.shopsTitle}</h3>
                {landingHref ? <Link href={landingHref} style={{ fontSize: 13, fontWeight: 700, color: '#047857', textDecoration: 'none' }}>{t.shopsMore}</Link> : null}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginTop: 10 }}>
                {recs.map((r) => (
                  <Link key={r.href} href={r.href} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #ebebeb', borderRadius: 12, padding: 10, textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ width: 60, height: 60, borderRadius: 10, flexShrink: 0, background: r.img ? `#f2f2f2 url(${r.img}) center / cover` : 'linear-gradient(150deg,#fff7f8,#ffe3e9)' }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.title}</div>
                      {r.promo ? <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 2 }}>{r.promo}</div> : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 첫 충전 프로모 — 무료 1회를 다 쓴 회원이 아직 충전 전이면 */}
      {userEmail && wallet && wallet.freeLeft === 0 && (wallet.firstBonusPct ?? 0) > 0 && wallet.balance < wallet.runCost && charge === 'closed' ? (
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '12px 16px' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#047857' }}>{t.firstChargePromo.replace('{pct}', String(wallet.firstBonusPct))}</span>
          <button type="button" onClick={() => setCharge('open')} style={{ background: '#047857', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>{t.charge}</button>
        </div>
      ) : null}

      {/* 충전 */}
      {charge !== 'closed' && wallet ? (
        <div style={{ marginTop: 20, background: '#fff', border: '1px solid #ebebeb', borderRadius: 14, padding: 18, maxWidth: 560 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 15 }}>{t.chargeTitle}</b>
            <button type="button" onClick={() => setCharge('closed')} style={{ background: 'none', border: 'none', color: '#717171', cursor: 'pointer', fontFamily: 'inherit' }}>{t.close}</button>
          </div>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 12px', lineHeight: 1.5 }}>{t.chargeBody.replace('{n}', wallet.runCost.toLocaleString('ko-KR'))}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {wallet.packs.map((p) => {
              const fb = wallet.firstBonusPct ?? 0;
              const pts = fb > 0 ? Math.round(p.points * (1 + fb / 100)) : p.points;
              const bonus = Math.round((pts / p.priceWon - 1) * 100);
              return (
                <button key={p.key} type="button" disabled={charge === 'paying'} onClick={() => void buy(p.key)}
                  style={{ border: fb > 0 ? '1px solid #047857' : '1px solid #dddddd', background: '#fff', borderRadius: 12, padding: '14px 12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {fb > 0 ? <div style={{ fontSize: 10, fontWeight: 700, color: '#047857', marginBottom: 4 }}>{t.firstBonusTag.replace('{pct}', String(fb))}</div> : null}
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{pts.toLocaleString('ko-KR')}P</div>
                  <div style={{ fontSize: 13, color: '#222', marginTop: 2 }}>₩{p.priceWon.toLocaleString('ko-KR')}</div>
                  <div style={{ fontSize: 11, color: bonus > 0 ? '#047857' : '#9c9c9c', marginTop: 4, fontWeight: 700 }}>
                    {t.runs.replace('{n}', String(Math.floor(pts / wallet.runCost)))}{bonus > 0 ? ` · ${t.bonus.replace('{pct}', String(bonus))}` : ''}
                  </div>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: '#9c9c9c', margin: '10px 0 0' }}>{t.chargeNote}</p>
        </div>
      ) : null}

      <p style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6a6a6a', margin: '22px 0 0' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        {note}
      </p>
    </div>
  );
}
