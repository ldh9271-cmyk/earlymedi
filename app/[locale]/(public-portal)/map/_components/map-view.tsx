'use client';

/**
 * 지도로 찾기 — 카카오맵 + 좌측 목록 패널 (네이버 부동산형 UI).
 *
 *  - 지도 이동/확대마다 /api/map/markers 로 뷰포트 안의 병원·뷰티샵을 받아
 *    광역에서는 격자 클러스터(숫자 원), 확대하면 개별 말풍선 마커를 그린다.
 *  - 컬러 말풍선 = 글로우업 등록(계약/승인), 회색 = 공공정보만. 외국인 진료 가능은 파란 점.
 *  - 좌측 패널: 필터(병원/뷰티샵 · 과별 · 카테고리 · 외국인 · 등록만) + 현재 화면 목록.
 *  - 카카오맵 SDK 는 NEXT_PUBLIC_KAKAO_MAP_KEY(JavaScript 키) 가 있어야 로드된다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Marker = { k: 'h' | 'b'; id: string; key: string; name: string; lat: number; lng: number; listed: boolean; foreign?: boolean; type?: string | null; cats?: string[]; slug?: string | null; region?: string | null };
type Cluster = { lat: number; lng: number; count: number; listed: number; k: 'h' | 'b' };
type Payload = { markers: Marker[]; clusters: Cluster[]; counts: { hospital: number; beauty: number } };

type Labels = {
  title: string; hospitals: string; shops: string; all: string; foreign: string; listed: string; searchPlaceholder: string; myLocation: string;
  zoomHint: string; inView: string; listTitle: string; empty: string; noKey: string; detail: string; publicData: string; dept: string; cat: string;
  contractedBadge: string; foreignBadge: string;
};

declare global {
  interface Window { kakao?: KakaoNS }
}
// 카카오맵 SDK 최소 타입 (필요한 것만)
type LatLng = { getLat(): number; getLng(): number };
type Bounds = { getSouthWest(): LatLng; getNorthEast(): LatLng };
type KMap = { getBounds(): Bounds; getLevel(): number; setLevel(l: number): void; setCenter(c: LatLng): void; panTo(c: LatLng): void; getCenter(): LatLng };
type Overlay = { setMap(m: KMap | null): void };
type KakaoNS = {
  maps: {
    load(cb: () => void): void;
    LatLng: new (lat: number, lng: number) => LatLng;
    Map: new (el: HTMLElement, opts: { center: LatLng; level: number }) => KMap;
    CustomOverlay: new (opts: { position: LatLng; content: HTMLElement | string; yAnchor?: number; xAnchor?: number; zIndex?: number; clickable?: boolean }) => Overlay;
    event: { addListener(target: KMap, type: string, cb: () => void): void };
    ZoomControl: new () => unknown;
    ControlPosition: { RIGHT: unknown };
  };
};

export default function MapView({ locale, appKey, labels, depts, cats, initial }: {
  locale: string; appKey: string | null; labels: Labels;
  depts: Array<{ key: string; label: string }>; cats: Array<{ key: string; label: string }>;
  initial: { lat: number; lng: number; level: number; kinds: string; dept: string; cat: string; foreign: boolean; listed: boolean; q: string };
}): JSX.Element {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KMap | null>(null);
  const overlaysRef = useRef<Overlay[]>([]);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Payload>({ markers: [], clusters: [], counts: { hospital: 0, beauty: 0 } });
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState(initial.level);
  const [kinds, setKinds] = useState<'all' | 'hospital' | 'beauty'>(initial.kinds === 'hospital' || initial.kinds === 'beauty' ? initial.kinds : 'all');
  const [dept, setDept] = useState(initial.dept);
  const [cat, setCat] = useState(initial.cat);
  const [foreign, setForeign] = useState(initial.foreign);
  const [listed, setListed] = useState(initial.listed);
  const [q, setQ] = useState(initial.q);
  const [active, setActive] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  // ── SDK 로드 ─────────────────────────────────────────────────
  useEffect(() => {
    if (!appKey) return;
    const init = (): void => {
      const kakao = window.kakao;
      if (!kakao) return;
      kakao.maps.load(() => {
        if (!mapEl.current) return;
        const { maps } = kakao;
        const map = new maps.Map(mapEl.current, { center: new maps.LatLng(initial.lat, initial.lng), level: initial.level });
        mapRef.current = map;
        maps.event.addListener(map, 'idle', () => { setLevel(map.getLevel()); setTick((t) => t + 1); });
        setReady(true);
      });
    };
    if (window.kakao?.maps) { init(); return; }
    const s = document.createElement('script');
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }, [appKey, initial.lat, initial.lng, initial.level]);

  const [tick, setTick] = useState(0);

  // ── 데이터 로드 (뷰포트/필터 변경 시) ─────────────────────────
  const load = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const sw = b.getSouthWest(); const ne = b.getNorthEast();
    const p = new URLSearchParams({
      sw: `${sw.getLat()},${sw.getLng()}`, ne: `${ne.getLat()},${ne.getLng()}`, zoom: String(map.getLevel()),
      kinds: kinds === 'all' ? 'hospital,beauty' : kinds,
    });
    if (dept) p.set('dept', dept);
    if (cat) p.set('cat', cat);
    if (foreign) p.set('foreign', '1');
    if (listed) p.set('listed', '1');
    if (q) p.set('q', q);
    setLoading(true);
    try {
      const res = await fetch(`/api/map/markers?${p.toString()}`);
      if (res.ok) setData((await res.json()) as Payload);
    } finally { setLoading(false); }
  }, [kinds, dept, cat, foreign, listed, q]);

  useEffect(() => { if (ready) void load(); }, [ready, tick, load]);

  // ── 오버레이 그리기 ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current; const kakao = window.kakao;
    if (!map || !kakao) return;
    for (const o of overlaysRef.current) o.setMap(null);
    overlaysRef.current = [];
    const { maps } = kakao;
    for (const c of data.clusters) {
      const el = document.createElement('div');
      const size = Math.min(64, 34 + Math.log10(c.count + 1) * 12);
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;background:${c.k === 'h' ? 'rgba(29,78,216,.85)' : 'rgba(157,23,77,.85)'};border:2px solid #fff;`;
      el.textContent = c.count.toLocaleString();
      el.onclick = () => { map.setLevel(Math.max(1, map.getLevel() - 2)); map.panTo(new maps.LatLng(c.lat, c.lng)); };
      const ov = new maps.CustomOverlay({ position: new maps.LatLng(c.lat, c.lng), content: el, yAnchor: 0.5, xAnchor: 0.5, zIndex: 2 });
      ov.setMap(map); overlaysRef.current.push(ov);
    }
    for (const m of data.markers) {
      const el = document.createElement('a');
      const href = m.k === 'h'
        ? (m.listed && m.slug ? `/${locale}/clinics/${m.slug}` : `/${locale}/clinics/r/${encodeURIComponent(m.key)}`)
        : (m.listed && m.slug ? `/${locale}/listings/${m.slug}` : `/${locale}/shops/r/${encodeURIComponent(m.key)}`);
      el.href = href;
      const bg = m.listed ? '#ff385c' : m.k === 'h' ? '#334155' : '#6b7280';
      const isActive = active === `${m.k}:${m.id}`;
      el.style.cssText = `position:relative;display:inline-flex;align-items:center;gap:4px;max-width:180px;background:${bg};color:#fff;border-radius:8px;padding:4px 8px;font-size:11px;font-weight:700;text-decoration:none;box-shadow:0 2px 6px rgba(0,0,0,.25);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:2px solid ${isActive ? '#fde047' : '#fff'};opacity:${m.listed ? 1 : 0.9};transform:translateY(-6px);`;
      const dot = m.foreign ? `<span style="width:7px;height:7px;border-radius:50%;background:#60a5fa;display:inline-block"></span>` : '';
      const tag = m.k === 'h' ? (m.type ?? '') : (m.cats?.[0] ? catLabelOf(m.cats[0], cats) : (m.type ?? ''));
      el.innerHTML = `${dot}<span style="opacity:.85;font-weight:600">${escapeHtml(tag)}</span><span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(m.name)}</span>`;
      el.onmouseenter = () => setActive(`${m.k}:${m.id}`);
      const ov = new maps.CustomOverlay({ position: new maps.LatLng(m.lat, m.lng), content: el, yAnchor: 1, xAnchor: 0.5, zIndex: isActive ? 10 : 3, clickable: true });
      ov.setMap(map); overlaysRef.current.push(ov);
    }
  }, [data, active, locale, cats]);

  const listItems = useMemo(() => data.markers.slice(0, 80), [data]);
  const focus = (m: Marker): void => {
    const map = mapRef.current; const kakao = window.kakao;
    if (!map || !kakao) return;
    setActive(`${m.k}:${m.id}`);
    map.panTo(new kakao.maps.LatLng(m.lat, m.lng));
  };
  const myLocation = (): void => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const map = mapRef.current; const kakao = window.kakao;
      if (!map || !kakao) return;
      map.setLevel(5); map.setCenter(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
    });
  };

  const chip = (on: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', padding: '6px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    border: `1px solid ${on ? '#222' : '#dddddd'}`, background: on ? '#222' : '#fff', color: on ? '#fff' : '#222', fontFamily: 'inherit',
  });
  const total = (kinds === 'beauty' ? 0 : data.counts.hospital) + (kinds === 'hospital' ? 0 : data.counts.beauty);

  return (
    <div className="m-map-root" style={{ display: 'grid', gridTemplateColumns: panelOpen ? '380px 1fr' : '0px 1fr', height: 'calc(100vh - 140px)', minHeight: 520, position: 'relative', borderTop: '1px solid #ebebeb' }}>
      <style dangerouslySetInnerHTML={{ __html: '.m-map-hs::-webkit-scrollbar{display:none} @media (max-width:768px){ .m-map-root{grid-template-columns:1fr !important;grid-template-rows:1fr 42vh;height:calc(100vh - 120px) !important} .m-map-panel{order:2;border-right:none !important;border-top:1px solid #ebebeb} .m-map-toggle{display:none !important} }' }} />

      {/* 좌측 패널 */}
      <aside className="m-map-panel" style={{ borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: '#fff' }}>
        <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #f0f0f0' }}>
          <form onSubmit={(e) => { e.preventDefault(); setTick((t) => t + 1); }} style={{ display: 'flex', gap: 6 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.searchPlaceholder}
              style={{ flex: 1, border: '1px solid #dddddd', borderRadius: 999, padding: '9px 14px', fontSize: 13, fontFamily: 'inherit' }} />
            <button type="submit" style={{ ...chip(true), padding: '8px 14px' }}>🔍</button>
          </form>
          <div className="m-map-hs" style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {(['all', 'hospital', 'beauty'] as const).map((k) => (
              <button key={k} type="button" style={chip(kinds === k)} onClick={() => { setKinds(k); if (k === 'beauty') setDept(''); if (k === 'hospital') setCat(''); }}>
                {k === 'all' ? labels.all : k === 'hospital' ? labels.hospitals : labels.shops}
              </button>
            ))}
            <button type="button" style={chip(foreign)} onClick={() => setForeign(!foreign)}>{labels.foreign}</button>
            <button type="button" style={chip(listed)} onClick={() => setListed(!listed)}>{labels.listed}</button>
          </div>
          {kinds !== 'beauty' ? (
            <div className="m-map-hs" style={{ display: 'flex', gap: 6, marginTop: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
              <span style={{ fontSize: 11, color: '#6a6a6a', alignSelf: 'center', flexShrink: 0 }}>{labels.dept}</span>
              <button type="button" style={chip(!dept)} onClick={() => setDept('')}>{labels.all}</button>
              {depts.map((d) => <button key={d.key} type="button" style={chip(dept === d.key)} onClick={() => setDept(d.key)}>{d.label}</button>)}
            </div>
          ) : null}
          {kinds !== 'hospital' ? (
            <div className="m-map-hs" style={{ display: 'flex', gap: 6, marginTop: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
              <span style={{ fontSize: 11, color: '#6a6a6a', alignSelf: 'center', flexShrink: 0 }}>{labels.cat}</span>
              <button type="button" style={chip(!cat)} onClick={() => setCat('')}>{labels.all}</button>
              {cats.map((c) => <button key={c.key} type="button" style={chip(cat === c.key)} onClick={() => setCat(c.key)}>{c.label}</button>)}
            </div>
          ) : null}
        </div>
        <div style={{ padding: '8px 14px', fontSize: 12, color: '#6a6a6a', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <span>{labels.inView} · <b style={{ color: '#222' }}>{total.toLocaleString()}</b>{loading ? ' …' : ''}</span>
          <span>{labels.hospitals} {data.counts.hospital.toLocaleString()} · {labels.shops} {data.counts.beauty.toLocaleString()}</span>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {data.clusters.length > 0 && data.markers.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6a6a6a', padding: 18, lineHeight: 1.6 }}>{labels.zoomHint}</p>
          ) : listItems.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6a6a6a', padding: 18, lineHeight: 1.6 }}>{labels.empty}</p>
          ) : listItems.map((m) => {
            const href = m.k === 'h'
              ? (m.listed && m.slug ? `/${locale}/clinics/${m.slug}` : `/${locale}/clinics/r/${encodeURIComponent(m.key)}`)
              : (m.listed && m.slug ? `/${locale}/listings/${m.slug}` : `/${locale}/shops/r/${encodeURIComponent(m.key)}`);
            const on = active === `${m.k}:${m.id}`;
            return (
              <div key={`${m.k}:${m.id}`} onMouseEnter={() => focus(m)} style={{ padding: '12px 14px', borderBottom: '1px solid #f3f3f3', background: on ? '#fff7f8' : '#fff', filter: m.listed ? 'none' : 'grayscale(1)', opacity: m.listed ? 1 : 0.85 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: m.listed ? '#ff385c' : '#6b7280', borderRadius: 5, padding: '1px 6px' }}>{m.listed ? labels.contractedBadge : labels.publicData}</span>
                  {m.foreign ? <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 5, padding: '1px 6px' }}>{labels.foreignBadge}</span> : null}
                  <span style={{ fontSize: 11, color: '#6a6a6a' }}>{m.k === 'h' ? (m.type ?? '') : (m.cats ?? []).slice(0, 2).map((c) => catLabelOf(c, cats)).join(' · ')}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{m.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: '#6a6a6a' }}>{m.region ?? ''}</span>
                  <a href={href} style={{ fontSize: 12, color: '#c2143c', fontWeight: 700, textDecoration: 'none' }}>{labels.detail} →</a>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* 지도 */}
      <div style={{ position: 'relative', minWidth: 0 }}>
        <div ref={mapEl} style={{ position: 'absolute', inset: 0, background: '#eef2f5' }} />
        {!appKey ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#fff', border: '1px solid #fecdd3', borderRadius: 14, padding: 20, maxWidth: 420, fontSize: 13, lineHeight: 1.7, color: '#3f3f3f' }}>
              <b style={{ color: '#c2143c' }}>{labels.noKey}</b>
              <div style={{ marginTop: 6 }}>Kakao Developers → 내 애플리케이션 → 앱 키(JavaScript 키) · 플랫폼 Web 에 사이트 도메인 등록 후 Vercel 환경변수에 넣어 주세요.</div>
            </div>
          </div>
        ) : null}
        <button type="button" className="m-map-toggle" onClick={() => setPanelOpen(!panelOpen)}
          style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 5, background: '#fff', border: '1px solid #dddddd', borderLeft: 'none', borderRadius: '0 8px 8px 0', width: 22, height: 48, cursor: 'pointer', fontSize: 12 }}>
          {panelOpen ? '‹' : '›'}
        </button>
        <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" onClick={myLocation} style={{ background: '#fff', border: '1px solid #dddddd', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>📍 {labels.myLocation}</button>
          <button type="button" onClick={() => mapRef.current?.setLevel(Math.max(1, level - 1))} style={{ background: '#fff', border: '1px solid #dddddd', borderRadius: 8, width: 34, height: 34, fontSize: 18, cursor: 'pointer' }}>＋</button>
          <button type="button" onClick={() => mapRef.current?.setLevel(Math.min(14, level + 1))} style={{ background: '#fff', border: '1px solid #dddddd', borderRadius: 8, width: 34, height: 34, fontSize: 18, cursor: 'pointer' }}>－</button>
        </div>
        <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', zIndex: 5, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 999, padding: '10px 18px', fontSize: 13, boxShadow: '0 4px 14px rgba(0,0,0,.12)', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{labels.hospitals} {data.counts.hospital.toLocaleString()}</span>
          <span style={{ margin: '0 10px', color: '#dddddd' }}>|</span>
          <span style={{ color: '#9d174d', fontWeight: 700 }}>{labels.shops} {data.counts.beauty.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function catLabelOf(key: string, cats: Array<{ key: string; label: string }>): string {
  return cats.find((c) => c.key === key)?.label ?? key;
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
