'use client';

// AI Glow-Up 얼굴 분석 업로더 — 사진을 캔버스로 1024px 로 줄여
// /api/ai/glowup-analysis 에 보내고, 분석 코멘트 + 카테고리별 추천
// 카드를 렌더한다. 이미지는 서버에 저장되지 않는다(결과 텍스트만 저장).
//
// '결과를 이메일로 받기'는 회원 계정 이메일로만 보낸다:
//   비로그인 → 회원가입/로그인 → ?analysis=<id>&send=1 로 복귀 → 저장된 결과를 다시 띄우고 자동 발송.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

type RecItem = { title: string; href: string; img: string | null; promo: string | null };
type RecSection = { key: string; items: RecItem[] };
type Analysis = {
  personalColorSeason: string;
  personalColorNote: string;
  skinNote: string;
  hairNote: string;
  browNote: string;
  overallNote: string;
};
export type FaceInitialResult = { id: string; analysis: Analysis; recs: RecSection[] };

const leadInputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #dddddd',
  padding: '0 14px', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', background: '#fff', color: '#222',
  boxSizing: 'border-box',
};

// 분석 중 애니메이션 — 스피너·줄무늬 진행바·단계 문구 페이드·미리보기 맥동
const AI_LOADING_CSS = `
@keyframes aiSpin { to { transform: rotate(360deg); } }
@keyframes aiStripes { from { background-position: 0 0; } to { background-position: 28px 0; } }
@keyframes aiFade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
@keyframes aiPulse { 0%, 100% { box-shadow: 0 0 0 3px #ff385c33; } 50% { box-shadow: 0 0 0 9px #ff385c11; } }
@media (prefers-reduced-motion: reduce) { .m-ai-upload * { animation: none !important; } }
`;

const SEASON_COLORS: Record<string, string> = {
  'spring warm': '#f59e0b',
  'summer cool': '#60a5fa',
  'autumn warm': '#b45309',
  'winter cool': '#6366f1',
};

export default function FaceAnalyzer({
  locale,
  t,
  note,
  catTitles,
  userEmail = null,
  initialResult = null,
  autoSend = false,
}: {
  locale: PublicLocale;
  t: Dictionary['ai']['upload'];
  note: string;
  catTitles: Record<string, string>;
  userEmail?: string | null;
  initialResult?: FaceInitialResult | null;
  autoSend?: boolean;
}): JSX.Element {
  const fileRef = useRef<HTMLInputElement | null>(null);
  // 모바일 전용 — capture="user" 가 붙어 있어 누르면 앨범이 아니라 전면 카메라가 바로 열린다
  const cameraRef = useRef<HTMLInputElement | null>(null);
  // 서버 렌더는 PC 형태(버튼 하나)로 그리고, 마운트 뒤 터치 기기면 촬영/앨범 두 버튼으로 바꾼다
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const ua = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(coarse || ua);
  }, []);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'ready' | 'loading' | 'done'>(initialResult ? 'done' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(initialResult?.analysis ?? null);
  const [recs, setRecs] = useState<RecSection[]>(initialResult?.recs ?? []);
  const [analysisId, setAnalysisId] = useState<string | null>(initialResult?.id ?? null);
  // 결과 이메일 발송 — 로그인 회원은 선택 연락처만 받고 계정 이메일로, 비회원은 회원가입/로그인으로
  const [emailPhase, setEmailPhase] = useState<'hidden' | 'signup' | 'form' | 'sending' | 'sent' | 'failed'>('hidden');
  // 분석 중 진행률 — 실제 진행도를 알 수 없는 10초짜리 요청이라, 92% 를 향해 점점 느려지는
  // 가짜 진행률을 보여준다. 멈춘 것처럼 보이지만 않으면 된다. 응답이 오면 100 으로 채운다.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (phase !== 'loading') { setProgress(0); return; }
    let p = 0;
    const id = window.setInterval(() => {
      p += (92 - p) * 0.035;
      setProgress(p);
    }, 100);
    return () => window.clearInterval(id);
  }, [phase]);
  const stepText = progress < 22 ? t.step1 : progress < 48 ? t.step2 : progress < 74 ? t.step3 : t.step4;
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [contact, setContact] = useState({ phone: '', messenger: '', birthDate: '' });
  const autoSent = useRef(false);

  async function sendReport(id: string, withContact: boolean): Promise<void> {
    setEmailPhase('sending');
    try {
      const res = await fetch('/api/ai/glowup-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale, analysisId: id,
          contact: withContact ? { phone: contact.phone.trim(), messenger: contact.messenger.trim(), birthDate: contact.birthDate || '' } : undefined,
        }),
      });
      if (!res.ok) { setEmailPhase('failed'); return; }
      const j = (await res.json()) as { emailed?: boolean; email?: string };
      setSentMsg(j.emailed ? t.sentTo.replace('{email}', j.email ?? userEmail ?? '') : t.sentNoEmail);
      setEmailPhase('sent');
    } catch {
      setEmailPhase('failed');
    }
  }

  // 회원가입/로그인 뒤 ?send=1 로 돌아온 경우 한 번만 자동 발송
  useEffect(() => {
    if (autoSend && userEmail && initialResult?.id && !autoSent.current) { autoSent.current = true; void sendReport(initialResult.id, false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPick(file: File | undefined): void {
    if (!file) return;
    setError(null);
    setAnalysis(null);
    setRecs([]);
    setAnalysisId(null);
    setEmailPhase('hidden');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // 긴 변 1024px 로 축소 → 페이로드·비용 절감
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setPreview(canvas.toDataURL('image/jpeg', 0.85));
      setPhase('ready');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function analyze(): Promise<void> {
    if (!preview) return;
    setPhase('loading');
    setError(null);
    try {
      const res = await fetch('/api/ai/glowup-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: preview, mimeType: 'image/jpeg', locale }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error === 'no_face' ? t.errorNoFace : t.errorGeneric);
        setPhase('ready');
        return;
      }
      const j = await res.json();
      setAnalysis(j.analysis);
      setRecs(j.recs ?? []);
      setAnalysisId(j.id ?? null);
      setPhase('done');
    } catch {
      setError(t.errorGeneric);
      setPhase('ready');
    }
  }

  function reset(): void {
    setPreview(null);
    setAnalysis(null);
    setRecs([]);
    setAnalysisId(null);
    setError(null);
    setPhase('idle');
    setEmailPhase('hidden');
    setSentMsg(null);
    if (fileRef.current) fileRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  }

  const seasonColor = analysis
    ? SEASON_COLORS[analysis.personalColorSeason.toLowerCase()] ?? '#ff385c'
    : '#ff385c';
  const returnTo = `/${locale}/ai-consult?analysis=${analysisId ?? ''}&send=1#ai-analyzer`;

  return (
    <div
      id="ai-analyzer"
      className="m-ai-upload"
      style={{
        marginTop: 40,
        border: '1px dashed #dddddd',
        background: '#fafafa',
        borderRadius: 18,
        padding: '40px 32px',
        textAlign: 'center',
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{t.title}</h2>
      <p
        style={{
          fontSize: 14, color: '#6a6a6a',
          margin: '8px auto 0', maxWidth: 520, lineHeight: 1.5,
        }}
      >
        {t.body}
      </p>

      {/* 앨범/파일 선택 — PC 는 이것만 쓴다 */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      {/* 카메라 촬영 — capture 속성은 모바일 브라우저만 존중하고 PC 에선 일반 파일 선택으로 동작한다 */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: 'none' }}
        onChange={(e) => onPick(e.target.files?.[0])}
      />

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="preview"
          style={{
            width: 168, height: 168, objectFit: 'cover',
            borderRadius: 16, marginTop: 20,
            border: '1px solid #ebebeb',
            boxShadow: phase === 'loading' ? '0 0 0 3px #ff385c33' : 'none',
            animation: phase === 'loading' ? 'aiPulse 1.6s ease-in-out infinite' : 'none',
          }}
        />
      ) : null}

      {error ? (
        <p style={{ fontSize: 14, color: '#dc2626', margin: '14px 0 0' }}>{error}</p>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        {phase !== 'loading' && phase !== 'done' ? (
          isMobile ? (
            // 모바일: 바로 찍기 / 앨범에서 고르기 두 갈래. 사진이 있으면 둘 다 보조 버튼으로 내려간다
            <>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                style={{
                  background: preview ? '#fff' : '#ff385c',
                  color: preview ? '#222' : '#fff',
                  border: preview ? '1px solid #222' : 'none',
                  borderRadius: 10, padding: '12px 20px',
                  fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                📷 {t.takePhoto}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  background: '#fff', color: '#222',
                  border: '1px solid #222',
                  borderRadius: 10, padding: '12px 20px',
                  fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                🖼 {t.fromAlbum}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                background: preview ? '#fff' : '#ff385c',
                color: preview ? '#222' : '#fff',
                border: preview ? '1px solid #222' : 'none',
                borderRadius: 10, padding: '12px 22px',
                fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {preview ? t.change : t.choose}
            </button>
          )
        ) : null}
        {phase === 'ready' ? (
          <button
            type="button"
            onClick={analyze}
            style={{
              background: '#ff385c', color: '#fff',
              border: 'none', borderRadius: 10, padding: '12px 22px',
              fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {t.analyze}
          </button>
        ) : null}
        {phase === 'done' ? (
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#fff', color: '#222',
              border: '1px solid #222', borderRadius: 10, padding: '12px 22px',
              fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {t.retry}
          </button>
        ) : null}
      </div>

      {phase === 'loading' ? (
        <div style={{ margin: '18px auto 0', maxWidth: 360 }} role="status" aria-live="polite">
          <style dangerouslySetInnerHTML={{ __html: AI_LOADING_CSS }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, color: '#222', fontWeight: 600 }}>
            <span style={{
              width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
              border: '2px solid #ffd4dc', borderTopColor: '#ff385c',
              animation: 'aiSpin 0.8s linear infinite',
            }} />
            <span key={stepText} style={{ animation: 'aiFade 0.35s ease-out' }}>{stepText}…</span>
          </div>
          <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: '#ffe3e9', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.round(progress)}%`, borderRadius: 999,
              background: 'repeating-linear-gradient(45deg, #ff385c 0 10px, #ff6b85 10px 20px)',
              backgroundSize: '28px 28px',
              animation: 'aiStripes 0.6s linear infinite',
              transition: 'width 0.15s linear',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#6a6a6a' }}>
            <span>{t.analyzing}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#ff385c' }}>{Math.round(progress)}%</span>
          </div>
        </div>
      ) : null}

      {analysis ? (
        <div style={{ marginTop: 28, textAlign: 'left' }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, textAlign: 'center' }}>{t.resultTitle}</h3>
          <div
            style={{
              margin: '14px auto 0', maxWidth: 620,
              background: '#fff', border: '1px solid #ebebeb', borderRadius: 14,
              padding: '18px 20px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: seasonColor, color: '#fff',
                  borderRadius: 9999, padding: '6px 16px',
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.3px',
                  textTransform: 'capitalize',
                }}
              >
                {analysis.personalColorSeason}
              </span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#3f3f3f', margin: '12px 0 0', textAlign: 'center' }}>
              {analysis.overallNote}
            </p>
            <div style={{ height: 1, background: '#ebebeb', margin: '14px 0' }} />
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[analysis.personalColorNote, analysis.skinNote, analysis.hairNote, analysis.browNote]
                .filter(Boolean)
                .map((line, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, fontSize: 14, lineHeight: 1.55, color: '#3f3f3f' }}>
                    <span style={{ color: '#ff385c', flexShrink: 0 }}>✓</span>
                    {line}
                  </li>
                ))}
            </ul>
          </div>

          {recs.length > 0 ? (
            <>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '30px 0 0', textAlign: 'center' }}>{t.recTitle}</h3>
              {recs.map((section) => (
                <div key={section.key} style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>
                    {catTitles[section.key] ?? section.key}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: 12, marginTop: 10,
                    }}
                  >
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: '#fff', border: '1px solid #ebebeb', borderRadius: 12,
                          padding: 10, textDecoration: 'none', color: 'inherit',
                        }}
                      >
                        <div
                          style={{
                            width: 64, height: 64, borderRadius: 10, flexShrink: 0,
                            background: item.img
                              ? `#f2f2f2 url(${item.img}) center / cover`
                              : 'linear-gradient(150deg, #fff7f8 0%, #ffe3e9 100%)',
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14, fontWeight: 600, lineHeight: 1.3,
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {item.title}
                          </div>
                          {item.promo ? (
                            <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 2 }}>{item.promo}</div>
                          ) : null}
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#ff385c', marginTop: 4 }}>
                            {t.viewDetail}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : null}

          {/* 결과 이메일 발송 — 회원 계정 이메일로만. 비회원은 회원가입/로그인 뒤 복귀·자동 발송 */}
          <div style={{ marginTop: 30, textAlign: 'center' }}>
            {emailPhase === 'hidden' || emailPhase === 'failed' ? (
              <>
                {emailPhase === 'failed' ? (
                  <p style={{ fontSize: 13, color: '#dc2626', margin: '0 0 10px' }}>{t.sendError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => { if (!analysisId) { setEmailPhase('failed'); return; } setEmailPhase(userEmail ? 'form' : 'signup'); }}
                  style={{
                    background: '#ff385c', color: '#fff',
                    border: 'none', borderRadius: 10, padding: '13px 26px',
                    fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ✉️ {t.emailBtn}
                </button>
              </>
            ) : null}

            {emailPhase === 'signup' ? (
              <div style={{ margin: '0 auto', maxWidth: 480, background: '#fff', border: '1px solid #ebebeb', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{t.emailTitle}</div>
                <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 14px', lineHeight: 1.5 }}>{t.needSignup}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Link href={`/${locale}/signup?next=${encodeURIComponent(returnTo)}`} style={{ background: '#ff385c', color: '#fff', borderRadius: 10, padding: '11px 16px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>{t.signupCta}</Link>
                  <Link href={`/${locale}/login?next=${encodeURIComponent(returnTo)}`} style={{ border: '1px solid #dddddd', color: '#222', borderRadius: 10, padding: '11px 16px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>{t.loginCta}</Link>
                </div>
              </div>
            ) : null}

            {emailPhase === 'form' || emailPhase === 'sending' ? (
              <form
                onSubmit={(e) => { e.preventDefault(); if (analysisId) void sendReport(analysisId, true); }}
                style={{
                  margin: '0 auto', maxWidth: 480, textAlign: 'left',
                  background: '#fff', border: '1px solid #ebebeb', borderRadius: 14,
                  padding: '20px 20px 22px',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700 }}>{t.emailTitle}</div>
                <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 14px', lineHeight: 1.5 }}>
                  {t.emailBody} <b style={{ color: '#222' }}>{userEmail}</b>
                </p>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6a6a6a', marginBottom: 6 }}>{t.optionalContact}</div>
                <input
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  placeholder={t.fieldContact}
                  style={{ ...leadInputStyle, width: '100%' }}
                />
                <input
                  value={contact.messenger}
                  onChange={(e) => setContact({ ...contact, messenger: e.target.value })}
                  placeholder={t.fieldMessenger}
                  style={{ ...leadInputStyle, marginTop: 10, width: '100%' }}
                />
                <label style={{ display: 'block', marginTop: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6a6a6a', display: 'block', marginBottom: 4 }}>
                    {t.fieldDob}
                  </span>
                  <input
                    type="date"
                    value={contact.birthDate}
                    onChange={(e) => setContact({ ...contact, birthDate: e.target.value })}
                    max={new Date().toISOString().slice(0, 10)}
                    style={{ ...leadInputStyle, width: '100%' }}
                  />
                </label>
                <button
                  type="submit"
                  disabled={emailPhase === 'sending'}
                  style={{
                    width: '100%', marginTop: 14,
                    background: '#ff385c', color: '#fff',
                    border: 'none', borderRadius: 10, padding: '13px 0',
                    fontWeight: 700, fontSize: 15,
                    cursor: emailPhase === 'sending' ? 'wait' : 'pointer',
                    opacity: emailPhase === 'sending' ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {emailPhase === 'sending' ? t.sending : t.send}
                </button>
              </form>
            ) : null}

            {emailPhase === 'sent' ? (
              <div
                style={{
                  margin: '0 auto', maxWidth: 480,
                  background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 14,
                  padding: '16px 20px', color: '#047857',
                  fontSize: 14, fontWeight: 600, lineHeight: 1.5,
                }}
              >
                {sentMsg}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <p
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, fontSize: 12, color: '#6a6a6a',
          margin: '22px 0 0',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        {note}
      </p>
    </div>
  );
}
