'use client';

// AI Glow-Up 얼굴 분석 업로더 — 사진을 캔버스로 1024px 로 줄여
// /api/ai/glowup-analysis 에 보내고, 분석 코멘트 + 카테고리별 추천
// 카드를 렌더한다. 이미지는 서버에 저장되지 않는다.
import { useRef, useState } from 'react';
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
}: {
  locale: PublicLocale;
  t: Dictionary['ai']['upload'];
  note: string;
  catTitles: Record<string, string>;
}): JSX.Element {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'ready' | 'loading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recs, setRecs] = useState<RecSection[]>([]);

  function onPick(file: File | undefined): void {
    if (!file) return;
    setError(null);
    setAnalysis(null);
    setRecs([]);
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
    setError(null);
    setPhase('idle');
    if (fileRef.current) fileRef.current.value = '';
  }

  const seasonColor = analysis
    ? SEASON_COLORS[analysis.personalColorSeason.toLowerCase()] ?? '#ff385c'
    : '#ff385c';

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

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
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
          }}
        />
      ) : null}

      {error ? (
        <p style={{ fontSize: 14, color: '#dc2626', margin: '14px 0 0' }}>{error}</p>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        {phase !== 'loading' && phase !== 'done' ? (
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
        <p style={{ fontSize: 14, color: '#6a6a6a', margin: '18px 0 0' }}>{t.analyzing}</p>
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
