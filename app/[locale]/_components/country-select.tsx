'use client';

// 국기 이미지가 붙는 국가 선택 드롭다운.
//
// 네이티브 <select> 의 <option> 은 이미지를 못 넣고, 국기 이모지는
// Windows 크롬에서 글자(KR)로 깨져 보인다 — 그래서 flagcdn.com 의
// 실제 국기 PNG 를 쓰는 커스텀 드롭다운으로 대체한다. 이미지 로드가
// 실패해도 국가 코드는 항상 보이므로 기능은 유지된다.
import { useEffect, useRef, useState } from 'react';

/** flag-icons 프로젝트 기반 CDN — w40 = 40px(레티나 대비 2x). */
function flagSrc(cc: string): string {
  return `https://flagcdn.com/w40/${cc.toLowerCase()}.png`;
}

function Flag({ cc }: { cc: string }): JSX.Element {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flagSrc(cc)}
      alt=""
      width={20}
      height={15}
      loading="lazy"
      style={{
        width: 20, height: 15, objectFit: 'cover', borderRadius: 2,
        border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0, display: 'block',
      }}
    />
  );
}

export default function CountrySelect({
  value,
  onChange,
  codes,
  ariaLabel,
}: {
  value: string;
  onChange: (cc: string) => void;
  codes: readonly string[];
  ariaLabel?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭·ESC 로 닫기
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative', minWidth: 0 }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: 'none', background: 'transparent', padding: 0,
          fontSize: 14, fontFamily: 'inherit', color: '#222',
          cursor: 'pointer', width: '100%', marginTop: 2,
        }}
      >
        {value ? <Flag cc={value} /> : null}
        <span style={{ fontWeight: 600 }}>{value || '—'}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="2.5" style={{ marginLeft: 'auto' }}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: -13, zIndex: 30,
            width: 168, maxHeight: 264, overflowY: 'auto',
            background: '#fff', border: '1px solid #ebebeb', borderRadius: 12,
            boxShadow: 'rgba(0,0,0,0.12) 0 6px 20px',
            padding: 6,
          }}
        >
          {codes.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={c === value}
              onClick={() => { onChange(c); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', border: 'none', textAlign: 'left',
                background: c === value ? '#fff5f7' : 'transparent',
                borderRadius: 8, padding: '8px 10px',
                fontSize: 14, fontFamily: 'inherit', color: '#222',
                cursor: 'pointer',
              }}
            >
              <Flag cc={c} />
              <span style={{ fontWeight: c === value ? 700 : 500 }}>{c}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
