'use client';

/**
 * 두 줄 칩 줄 — 기본은 칩 두 줄 높이까지만 보이고(넘치는 칩은 숨김), 아래 가운데
 * '더보기 ▾' 를 누르면 전부 펼쳐진다. 칩 높이를 실제로 재서 두 줄 한도를 정하므로
 * 글꼴·언어가 달라도 정확히 두 줄이고, 두 줄 안에 다 들어가면 버튼을 숨긴다.
 * mobileOnly 면 768px 이하에서만 접는다 (데스크톱은 전부 표시).
 */
import { useEffect, useRef, useState } from 'react';

export default function MoreRow({ label, more, less, rows = 2, gap = 6, mobileOnly = false, defaultOpen = false, children, style }: {
  label?: string; more: string; less: string; rows?: number; gap?: number; mobileOnly?: boolean; defaultOpen?: boolean; children: React.ReactNode; style?: React.CSSProperties;
}): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [cap, setCap] = useState<number | undefined>(undefined);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = (): void => {
      const active = !mobileOnly || window.matchMedia('(max-width: 768px)').matches;
      if (!active) { setCap(undefined); setOverflow(false); return; }
      const first = el.firstElementChild as HTMLElement | null;
      const h = first ? first.offsetHeight : 31;
      const c = h * rows + gap * (rows - 1);
      setCap(c);
      setOverflow(el.scrollHeight > c + 2);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, [children, rows, gap, mobileOnly]);
  return (
    <div style={style}>
      {label ? <div style={{ fontSize: 11, color: '#6a6a6a' }}>{label}</div> : null}
      <div ref={ref} style={{ display: 'flex', gap, marginTop: label ? 4 : 0, flexWrap: 'wrap', maxHeight: open || cap == null ? undefined : cap, overflow: 'hidden' }}>
        {children}
      </div>
      {overflow ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
            style={{ border: '1px solid #e5e5e5', background: '#fafafa', borderRadius: 999, padding: '4px 16px', fontSize: 12, fontWeight: 700, color: '#1d4ed8', cursor: 'pointer', fontFamily: 'inherit' }}>
            {open ? `${less} ▴` : `${more} ▾`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
