'use client';

/**
 * 목록 검색 — 서버가 렌더한 표·카드 목록을 페이지 이동 없이 글자로 거른다.
 *
 *  - 범위: 기본은 이 컴포넌트의 **부모 요소** 안(같은 부모에 있는 목록만). `scope` 에
 *    CSS 셀렉터를 주면 그 요소 안으로 바꿀 수 있다.
 *  - 행: `rowSelector` (기본 `tbody > tr` 과 `[data-search-row]`). 행에 `data-search-text`
 *    가 있으면 그 값으로, 없으면 화면 글자(textContent) 전체로 비교한다.
 *  - 매칭: 대소문자·공백 무시, 띄어쓰기로 나눈 단어를 모두 포함해야 한다(AND).
 *    예) "피부과 신사" → 피부과이면서 신사가 들어간 행.
 *  - `[data-search-group]` 요소는 안에 보이는 행이 하나도 없으면 통째로 숨긴다
 *    (카테고리별 섹션 제목이 빈 채로 남지 않도록).
 *  - 서버 액션 후 목록이 다시 그려져도(router.refresh) 검색어가 남아 있으면 다시 거른다.
 *  - 검색어는 경로별로 sessionStorage 에 남겨, 행을 편집하고 돌아와도 필터가 유지된다.
 */
import { useEffect, useRef, useState } from 'react';

const DEFAULT_ROWS = 'tbody > tr, [data-search-row]';

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

function setHidden(el: HTMLElement, hide: boolean): void {
  if (hide) {
    if (el.style.display === 'none') return; // 원래 숨겨진 요소는 건드리지 않는다
    el.dataset.searchDisplay = el.style.display;
    el.style.display = 'none';
  } else if (el.dataset.searchDisplay !== undefined) {
    el.style.display = el.dataset.searchDisplay;
    delete el.dataset.searchDisplay;
  }
}

export default function ListSearch({
  scope,
  rowSelector = DEFAULT_ROWS,
  placeholder = '목록에서 검색…',
  hint,
  storageKey,
  style,
}: {
  /** 거를 범위의 CSS 셀렉터. 없으면 이 컴포넌트의 부모 요소. */
  scope?: string;
  rowSelector?: string;
  placeholder?: string;
  /** 입력 아래 작은 안내 문구 */
  hint?: string;
  /** sessionStorage 키(기본: 현재 경로). 같은 페이지에 검색창이 둘이면 서로 다르게 준다. */
  storageKey?: string;
  style?: React.CSSProperties;
}): JSX.Element {
  const wrap = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [stat, setStat] = useState<{ shown: number; total: number } | null>(null);
  const [restored, setRestored] = useState(false);

  // 저장된 검색어 복원 (경로별)
  useEffect(() => {
    const key = `list-search:${storageKey ?? window.location.pathname}`;
    try {
      const saved = window.sessionStorage.getItem(key);
      if (saved) setQ(saved);
    } catch { /* 시크릿 모드 등 — 무시 */ }
    setRestored(true);
  }, [storageKey]);

  useEffect(() => {
    if (!restored) return;
    const key = `list-search:${storageKey ?? window.location.pathname}`;
    try {
      if (q) window.sessionStorage.setItem(key, q); else window.sessionStorage.removeItem(key);
    } catch { /* 무시 */ }

    const root: Element | null = scope ? document.querySelector(scope) : (wrap.current?.parentElement ?? null);
    if (!root) return;
    const self = wrap.current;
    const terms = q.trim().split(/\s+/).filter(Boolean).map(normalize);

    const apply = (): void => {
      const rows = Array.from(root.querySelectorAll<HTMLElement>(rowSelector))
        .filter((r) => !(self && self.contains(r)) && !r.closest('thead') && !r.hasAttribute('data-search-skip'));
      let shown = 0;
      for (const r of rows) {
        const text = normalize(r.getAttribute('data-search-text') ?? r.textContent ?? '');
        const match = terms.every((t) => text.includes(t));
        if (match) shown += 1;
        setHidden(r, !match);
      }
      for (const g of Array.from(root.querySelectorAll<HTMLElement>('[data-search-group]'))) {
        const inner = Array.from(g.querySelectorAll<HTMLElement>(rowSelector));
        const anyVisible = inner.some((r) => r.style.display !== 'none');
        setHidden(g, terms.length > 0 && inner.length > 0 && !anyVisible);
      }
      setStat(terms.length ? { shown, total: rows.length } : null);
    };
    apply();

    // 서버 액션 뒤 목록이 새로 그려지면(childList 변경) 검색어를 다시 적용한다.
    // 우리가 바꾸는 건 style 속성뿐이라 childList 감시로는 되돌이가 생기지 않는다.
    if (!terms.length) return;
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
  }, [q, scope, rowSelector, storageKey, restored]);

  const active = q.trim().length > 0;

  return (
    <div ref={wrap} style={{ margin: '0 0 12px', ...style }} data-search-skip>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 40, maxWidth: 480,
          border: `1px solid ${focus ? '#ff385c' : '#dddddd'}`, borderRadius: 10, background: '#fff',
          padding: '0 10px 0 12px', boxShadow: focus ? '0 0 0 3px rgba(255,56,92,0.15)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6a6a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); } }}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          spellCheck={false}
          style={{ flex: 1, minWidth: 0, height: '100%', border: 0, outline: 'none', background: 'transparent', fontSize: 14, color: '#222', fontFamily: 'inherit' }}
        />
        {stat ? (
          <span style={{ fontSize: 12, color: stat.shown === 0 ? '#dc2626' : '#6a6a6a', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {stat.shown} / {stat.total}
          </span>
        ) : null}
        {active ? (
          <button
            type="button"
            onClick={() => { setQ(''); input.current?.focus(); }}
            aria-label="검색어 지우기"
            style={{ border: 0, background: '#f0f0f0', color: '#444', borderRadius: 999, width: 22, height: 22, fontSize: 13, lineHeight: '22px', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            ×
          </button>
        ) : null}
      </div>
      {stat && stat.shown === 0 ? (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#dc2626' }}>‘{q.trim()}’ 에 맞는 항목이 없습니다. 다른 단어로 찾거나 × 로 지우세요.</p>
      ) : hint ? (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#8a8a8a' }}>{hint}</p>
      ) : null}
    </div>
  );
}
