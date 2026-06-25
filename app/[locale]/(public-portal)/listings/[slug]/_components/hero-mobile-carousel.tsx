'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * 모바일 전용 hero 캐러셀 — cover + 갤러리를 한 장씩 가로 스크롤로
 * 보여준다. 데스크톱에서는 부모 페이지의 CSS로 display:none 처리.
 *
 *   - scroll-snap-type: x mandatory + 각 슬라이드 100vw → 손가락
 *     스와이프 시 자동으로 한 슬라이드씩 스냅.
 *   - useEffect 의 scroll 리스너가 현재 인덱스를 추적해 우하단
 *     "N / total" 카운터를 업데이트.
 *   - back / share / heart 아이콘은 그대로 floating.
 */
export function HeroMobileCarousel({
  slides,
  backHref,
}: {
  slides: ReadonlyArray<string>;
  backHref: string;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onScroll(): void {
      if (!el) return;
      const w = el.clientWidth;
      if (w <= 0) return;
      const next = Math.round(el.scrollLeft / w);
      setIdx(Math.min(Math.max(next, 0), slides.length - 1));
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [slides.length]);

  return (
    <section
      className="m-lh-mobile-carousel"
      style={{ position: 'relative' }}
    >
      {/* Hide webkit scrollbar — dangerouslySetInnerHTML to dodge
          the React '>' → '&gt;' hydration mismatch trap. */}
      <style
        dangerouslySetInnerHTML={{
          __html: '.m-lh-mobile-carousel > div::-webkit-scrollbar { display: none; }',
        }}
      />
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {slides.map((src, i) => (
          <div
            key={i}
            style={{
              flex: '0 0 100%',
              aspectRatio: '1 / 1',
              maxHeight: 460,
              background: src
                ? `#f2f2f2 url(${src}) center / cover no-repeat`
                : 'linear-gradient(135deg, #d8c7f5, #e7d6fb)',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
            }}
          />
        ))}
      </div>

      <Link
        href={backHref}
        aria-label="Back"
        style={{
          position: 'absolute', top: 14, left: 14,
          width: 36, height: 36, borderRadius: 9999,
          background: '#fff', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'rgba(0,0,0,0.15) 0 2px 6px',
          textDecoration: 'none',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>

      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8 }}>
        <button type="button" aria-label="Share" style={floatingBtn()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
            <path d="M4 12v8h16v-8M12 3v13M8 7l4-4 4 4" />
          </svg>
        </button>
        <button type="button" aria-label="Save" style={floatingBtn()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
            <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
          </svg>
        </button>
      </div>

      <div
        style={{
          position: 'absolute', bottom: 14, right: 14,
          background: 'rgba(0,0,0,0.65)', color: '#fff',
          fontSize: 12, fontWeight: 600,
          padding: '4px 10px', borderRadius: 9999,
        }}
      >
        {idx + 1} / {slides.length}
      </div>

      {/* 인디케이터 도트 — 슬라이드 수 ≤ 6 일 때만 노출. */}
      {slides.length > 1 && slides.length <= 6 ? (
        <div
          style={{
            position: 'absolute', bottom: 14, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', gap: 6,
            pointerEvents: 'none',
          }}
        >
          {slides.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === idx ? 8 : 6, height: i === idx ? 8 : 6,
                borderRadius: 9999,
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.55)',
                boxShadow: 'rgba(0,0,0,0.3) 0 1px 2px',
                transition: 'all 120ms ease',
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function floatingBtn(): React.CSSProperties {
  return {
    width: 36, height: 36, borderRadius: 9999,
    background: '#fff', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'rgba(0,0,0,0.15) 0 2px 6px',
  };
}
