'use client';

// 데스크톱 히어로 갤러리 (클라이언트).
//
// 기존 서버 렌더 그리드는 이미지가 5장까지만 보이고 클릭도 안 됐다 —
// "1/9" 카운터만 있고 나머지를 볼 방법이 없었고, 공유·저장 버튼도
// 장식이었다. 이 컴포넌트가 세 가지를 실제로 동작하게 한다:
//   1) 아무 이미지나 클릭 → 전체 화면 라이트박스 (◀▶·키보드·ESC)
//   2) 공유 → navigator.share, 미지원 브라우저는 링크 복사 + 토스트
//   3) 하트 → localStorage(gu_favs) 에 즐겨찾기 토글, 채워진 하트로 표시
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

const FAV_KEY = 'gu_favs';

function readFavs(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

function floatBtn(): React.CSSProperties {
  return {
    width: 34, height: 34, borderRadius: '50%',
    background: 'rgba(255,255,255,0.95)', border: '1px solid #ebebeb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: 'rgba(0,0,0,0.08) 0 1px 4px', padding: 0,
  };
}

export default function HeroDesktopGallery({
  slides,
  backHref,
  listingSlug,
  linkCopiedText,
}: {
  slides: string[];
  backHref: string;
  listingSlug: string;
  linkCopiedText: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [fav, setFav] = useState(false);
  const [toast, setToast] = useState(false);

  const count = Math.max(1, slides.length);

  useEffect(() => {
    setFav(readFavs().includes(listingSlug));
  }, [listingSlug]);

  const show = useCallback((i: number) => {
    setIdx(((i % count) + count) % count);
    setOpen(true);
  }, [count]);

  // 라이트박스 키보드 조작 + 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') setIdx((v) => (v + 1) % count);
      if (e.key === 'ArrowLeft') setIdx((v) => (v - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, count]);

  async function share(): Promise<void> {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
        return;
      }
      throw new Error('no-share');
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setToast(true);
        setTimeout(() => setToast(false), 2200);
      } catch {
        /* 클립보드 접근 불가 — 조용히 무시 */
      }
    }
  }

  function toggleFav(): void {
    try {
      const favs = readFavs();
      const next = favs.includes(listingSlug)
        ? favs.filter((s) => s !== listingSlug)
        : [...favs, listingSlug];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      setFav(next.includes(listingSlug));
    } catch {
      setFav((v) => !v);
    }
  }

  const heroSrc = slides[0];

  return (
    <section
      className="m-lh-gallery"
      style={{
        position: 'relative', maxWidth: 1100, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(2, 170px)', gap: 8,
        padding: '0 12px', height: 'auto',
      }}
    >
      <div
        className="m-lh-main"
        role="button"
        tabIndex={0}
        aria-label="사진 크게 보기"
        onClick={() => show(0)}
        onKeyDown={(e) => { if (e.key === 'Enter') show(0); }}
        style={{
          gridColumn: 'span 2', gridRow: 'span 2',
          background: heroSrc
            ? `#f2f2f2 url(${heroSrc}) center / cover`
            : 'linear-gradient(135deg, #d8c7f5, #e7d6fb)',
          borderRadius: 14, position: 'relative', minHeight: 280, cursor: 'pointer',
        }}
      >
        <Link
          href={backHref}
          aria-label="Back"
          onClick={(e) => e.stopPropagation()}
          style={{ ...floatBtn(), position: 'absolute', top: 14, left: 14 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
      </div>

      {[0, 1, 2, 3].map((i) => {
        const src = slides[i + 1];
        return (
          <div
            key={i}
            className={`m-lh-thumb m-lh-thumb-${i}`}
            role={src ? 'button' : undefined}
            tabIndex={src ? 0 : undefined}
            aria-label={src ? '사진 크게 보기' : undefined}
            onClick={src ? () => show(i + 1) : undefined}
            onKeyDown={src ? (e) => { if (e.key === 'Enter') show(i + 1); } : undefined}
            style={{
              background: src
                ? `#f2f2f2 url(${src}) center / cover`
                : 'linear-gradient(135deg, #f7f7f7 0%, #ebebeb 100%)',
              borderRadius: 14, cursor: src ? 'pointer' : 'default',
            }}
          />
        );
      })}

      <div className="m-lh-controls" style={{ position: 'absolute', top: 14, right: 26, display: 'flex', gap: 8 }}>
        <button type="button" aria-label="Share" onClick={share} style={floatBtn()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
            <path d="M4 12v8h16v-8M12 3v13M8 7l4-4 4 4" />
          </svg>
        </button>
        <button type="button" aria-label="Save" aria-pressed={fav} onClick={toggleFav} style={floatBtn()}>
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill={fav ? '#ff385c' : 'none'}
            stroke={fav ? '#ff385c' : '#222'} strokeWidth="1.8"
          >
            <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        className="m-lh-counter"
        onClick={() => show(0)}
        style={{
          position: 'absolute', bottom: 14, right: 26,
          background: 'rgba(0,0,0,0.65)', color: '#fff',
          fontSize: 12, fontWeight: 600, padding: '4px 12px',
          borderRadius: 9999, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        1 / {count}
      </button>

      {/* 링크 복사 토스트 */}
      {toast && typeof document !== 'undefined'
        ? createPortal(
            <div
              style={{
                position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 13, fontWeight: 600,
                padding: '10px 18px', borderRadius: 9999, zIndex: 400,
              }}
            >
              {linkCopiedText}
            </div>,
            document.body,
          )
        : null}

      {/* 라이트박스 */}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 300,
                background: 'rgba(10,10,12,0.92)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                style={{
                  position: 'absolute', top: 20, right: 24,
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>

              {count > 1 ? (
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={(e) => { e.stopPropagation(); setIdx((v) => (v - 1 + count) % count); }}
                  style={{
                    position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M15 5l-7 7 7 7" strokeLinecap="round" />
                  </svg>
                </button>
              ) : null}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slides[idx]}
                alt={`photo ${idx + 1}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: '88vw', maxHeight: '84vh',
                  objectFit: 'contain', borderRadius: 10,
                  boxShadow: 'rgba(0,0,0,0.5) 0 12px 48px',
                }}
              />

              {count > 1 ? (
                <button
                  type="button"
                  aria-label="Next"
                  onClick={(e) => { e.stopPropagation(); setIdx((v) => (v + 1) % count); }}
                  style={{
                    position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" />
                  </svg>
                </button>
              ) : null}

              <div
                style={{
                  position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  background: 'rgba(255,255,255,0.12)', padding: '5px 14px', borderRadius: 9999,
                }}
              >
                {idx + 1} / {count}
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
