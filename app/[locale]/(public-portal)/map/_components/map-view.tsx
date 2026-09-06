'use client';

/**
 * 지도로 찾기 — 좌측 목록 패널 + 지도 (네이버 부동산형 UI).
 *
 * 지도 제공자 2종을 같은 인터페이스로 감싼다:
 *  - Kakao  : 한국어 로케일(kr). 국내 도로·건물·POI 라벨이 가장 정확. 단, 라벨이 한국어만.
 *  - Google : 그 외 5개 로케일. `language=` 로 지도 라벨이 사용자 언어로 표기.
 *  키가 없는 제공자는 다른 쪽으로 폴백한다 (둘 다 없으면 안내 카드).
 *
 * 데이터는 두 경우 모두 /api/map/markers (뷰포트 bbox + 필터) 한 곳에서 받는다.
 * 줌은 카카오 레벨(1=최대 확대 … 14) 기준으로 통일하고, 구글은 zoom = 20 - level 로 변환.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Marker = { k: 'h' | 'b' | 'l' | 'f' | 'a'; id: string; key: string; name: string; lat: number; lng: number; listed: boolean; foreign?: boolean; type?: string | null; cats?: string[]; slug?: string | null; region?: string | null };
type Cluster = { lat: number; lng: number; count: number; listed: number; k: 'h' | 'b' | 'l' | 'f' | 'a' };
type Payload = { markers: Marker[]; clusters: Cluster[]; counts: { hospital: number; beauty: number; stays: number; eats: number; attractions: number } };

type Labels = {
  title: string; hospitals: string; shops: string; stays: string; eats: string; attractions: string; all: string; foreign: string; listed: string; searchPlaceholder: string; myLocation: string;
  zoomHint: string; inView: string; listTitle: string; empty: string; noKey: string; detail: string; publicData: string; dept: string; cat: string;
  contractedBadge: string; foreignBadge: string; viewList: string; viewMap: string;
};

// ── 제공자 공통 인터페이스 ─────────────────────────────────────────
type LL = { lat: number; lng: number };
type Provider = {
  name: 'kakao' | 'google';
  getBounds(): { sw: LL; ne: LL };
  getLevel(): number;               // 카카오 레벨 기준
  setLevel(level: number): void;
  panTo(p: LL): void;
  setCenter(p: LL): void;
  onIdle(cb: () => void): void;
  clear(): void;
  add(p: LL, el: HTMLElement, anchor: 'center' | 'bottom', z: number): void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { kakao?: any; google?: any } }

const KAKAO_MAX = 14;
const toGoogleZoom = (level: number): number => Math.max(3, Math.min(20, 20 - level));
const toKakaoLevel = (zoom: number): number => Math.max(1, Math.min(KAKAO_MAX, 20 - zoom));

function loadScript(src: string, ready: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ready()) { resolve(); return; }
    const existing = document.querySelector(`script[data-map-src="${src}"]`);
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true; s.dataset.mapSrc = src;
    s.onload = () => resolve(); s.onerror = () => reject(new Error('map sdk load failed'));
    document.head.appendChild(s);
  });
}

async function createKakao(el: HTMLElement, key: string, center: LL, level: number): Promise<Provider> {
  await loadScript(`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`, () => Boolean(window.kakao?.maps?.Map));
  await new Promise<void>((res) => window.kakao.maps.load(() => res()));
  const { maps } = window.kakao;
  const map = new maps.Map(el, { center: new maps.LatLng(center.lat, center.lng), level });
  const overlays: any[] = [];
  return {
    name: 'kakao',
    getBounds() { const b = map.getBounds(); const sw = b.getSouthWest(); const ne = b.getNorthEast(); return { sw: { lat: sw.getLat(), lng: sw.getLng() }, ne: { lat: ne.getLat(), lng: ne.getLng() } }; },
    getLevel() { return map.getLevel(); },
    setLevel(l) { map.setLevel(Math.max(1, Math.min(KAKAO_MAX, l))); },
    panTo(p) { map.panTo(new maps.LatLng(p.lat, p.lng)); },
    setCenter(p) { map.setCenter(new maps.LatLng(p.lat, p.lng)); },
    onIdle(cb) { maps.event.addListener(map, 'idle', cb); },
    clear() { for (const o of overlays) o.setMap(null); overlays.length = 0; },
    add(p, content, anchor, z) {
      const ov = new maps.CustomOverlay({ position: new maps.LatLng(p.lat, p.lng), content, yAnchor: anchor === 'bottom' ? 1 : 0.5, xAnchor: 0.5, zIndex: z, clickable: true });
      ov.setMap(map); overlays.push(ov);
    },
  };
}

async function createGoogle(el: HTMLElement, key: string, center: LL, level: number, language: string): Promise<Provider> {
  await loadScript(`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&language=${encodeURIComponent(language)}&region=KR&loading=async`, () => Boolean(window.google?.maps?.Map));
  // loading=async 는 콜백 없이도 window.google.maps 가 준비될 때까지 잠깐 기다릴 수 있다
  for (let i = 0; i < 50 && !window.google?.maps?.Map; i += 1) await new Promise((r) => setTimeout(r, 100));
  const g = window.google.maps;
  const map = new g.Map(el, { center, zoom: toGoogleZoom(level), disableDefaultUI: true, clickableIcons: false, gestureHandling: 'greedy', mapTypeControl: false });
  // HTML 오버레이 — OverlayView 서브클래스 (mapId 없이 동작)
  class HtmlOverlay extends g.OverlayView {
    pos: any; el: HTMLElement; anchor: 'center' | 'bottom';
    constructor(pos: LL, elx: HTMLElement, anchor: 'center' | 'bottom', z: number) {
      super(); this.pos = new g.LatLng(pos.lat, pos.lng); this.el = elx; this.anchor = anchor;
      this.el.style.position = 'absolute'; this.el.style.zIndex = String(z);
    }
    onAdd() { this.getPanes()?.overlayMouseTarget.appendChild(this.el); }
    draw() {
      const proj = this.getProjection(); if (!proj) return;
      const pt = proj.fromLatLngToDivPixel(this.pos); if (!pt) return;
      const w = this.el.offsetWidth; const h = this.el.offsetHeight;
      this.el.style.left = `${pt.x - w / 2}px`;
      this.el.style.top = this.anchor === 'bottom' ? `${pt.y - h}px` : `${pt.y - h / 2}px`;
    }
    onRemove() { this.el.parentNode?.removeChild(this.el); }
  }
  const overlays: any[] = [];
  return {
    name: 'google',
    getBounds() { const b = map.getBounds(); if (!b) return { sw: center, ne: center }; const sw = b.getSouthWest(); const ne = b.getNorthEast(); return { sw: { lat: sw.lat(), lng: sw.lng() }, ne: { lat: ne.lat(), lng: ne.lng() } }; },
    getLevel() { return toKakaoLevel(map.getZoom() ?? 15); },
    setLevel(l) { map.setZoom(toGoogleZoom(l)); },
    panTo(p) { map.panTo(p); },
    setCenter(p) { map.setCenter(p); },
    onIdle(cb) { map.addListener('idle', cb); },
    clear() { for (const o of overlays) o.setMap(null); overlays.length = 0; },
    add(p, content, anchor, z) { const ov = new HtmlOverlay(p, content, anchor, z); ov.setMap(map); overlays.push(ov); },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const GOOGLE_LANG: Record<string, string> = { kr: 'ko', en: 'en', zh: 'zh-CN', ja: 'ja', ru: 'ru', vi: 'vi' };

export default function MapView({ locale, kakaoKey, googleKey, labels, depts, cats, initial }: {
  locale: string; kakaoKey: string | null; googleKey: string | null; labels: Labels;
  depts: Array<{ key: string; label: string }>; cats: Array<{ key: string; label: string }>;
  initial: { lat: number; lng: number; level: number; kinds: string; dept: string; cat: string; foreign: boolean; listed: boolean; q: string };
}): JSX.Element {
  const mapEl = useRef<HTMLDivElement>(null);
  const provRef = useRef<Provider | null>(null);
  const [ready, setReady] = useState(false);
  const [providerName, setProviderName] = useState<'kakao' | 'google' | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<Payload>({ markers: [], clusters: [], counts: { hospital: 0, beauty: 0, stays: 0, eats: 0, attractions: 0 } });
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState(initial.level);
  const [kinds, setKinds] = useState<'all' | 'hospital' | 'beauty' | 'stays' | 'eats' | 'attraction'>(['hospital', 'beauty', 'stays', 'eats', 'attraction'].includes(initial.kinds) ? initial.kinds as 'hospital' | 'beauty' | 'stays' | 'eats' | 'attraction' : 'all');
  const [dept, setDept] = useState(initial.dept);
  const [cat, setCat] = useState(initial.cat);
  const [foreign, setForeign] = useState(initial.foreign);
  const [listed, setListed] = useState(initial.listed);
  const [q, setQ] = useState(initial.q);
  const [active, setActive] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [tick, setTick] = useState(0);

  // 제공자 선택: kr → 카카오 우선, 그 외 → 구글 우선. 키 없는 쪽은 폴백.
  const preferKakao = locale === 'kr';
  const chosen: 'kakao' | 'google' | null = preferKakao
    ? (kakaoKey ? 'kakao' : googleKey ? 'google' : null)
    : (googleKey ? 'google' : kakaoKey ? 'kakao' : null);

  useEffect(() => {
    if (!chosen || !mapEl.current) return;
    let cancelled = false;
    const center = { lat: initial.lat, lng: initial.lng };
    const make = chosen === 'kakao'
      ? createKakao(mapEl.current, kakaoKey as string, center, initial.level)
      : createGoogle(mapEl.current, googleKey as string, center, initial.level, GOOGLE_LANG[locale] ?? 'en');
    make.then((p) => {
      if (cancelled) return;
      provRef.current = p;
      p.onIdle(() => { setLevel(p.getLevel()); setTick((t) => t + 1); });
      setProviderName(p.name);
      setReady(true);
    }).catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'map load failed'));
    return () => { cancelled = true; };
  }, [chosen, kakaoKey, googleKey, locale, initial.lat, initial.lng, initial.level]);

  // ── 데이터 로드 ────────────────────────────────────────────────
  const load = useCallback(async () => {
    const p = provRef.current; if (!p) return;
    const b = p.getBounds();
    const qs = new URLSearchParams({ sw: `${b.sw.lat},${b.sw.lng}`, ne: `${b.ne.lat},${b.ne.lng}`, zoom: String(p.getLevel()), kinds: kinds === 'all' ? 'hospital,beauty,lodging,food,attraction' : kinds === 'stays' ? 'lodging' : kinds === 'eats' ? 'food' : kinds === 'attraction' ? 'attraction' : kinds });
    if (dept) qs.set('dept', dept); if (cat) qs.set('cat', cat); if (foreign) qs.set('foreign', '1'); if (listed) qs.set('listed', '1'); if (q) qs.set('q', q);
    setLoading(true);
    try { const res = await fetch(`/api/map/markers?${qs.toString()}`); if (res.ok) setData((await res.json()) as Payload); }
    finally { setLoading(false); }
  }, [kinds, dept, cat, foreign, listed, q]);
  useEffect(() => { if (ready) void load(); }, [ready, tick, load]);

  // ── 오버레이 ──────────────────────────────────────────────────
  useEffect(() => {
    const p = provRef.current; if (!p) return;
    p.clear();
    for (const c of data.clusters) {
      const el = document.createElement('div');
      const size = Math.min(64, 34 + Math.log10(c.count + 1) * 12);
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;background:${c.k === 'h' ? 'rgba(29,78,216,.85)' : c.k === 'l' ? 'rgba(15,118,110,.85)' : c.k === 'f' ? 'rgba(217,119,6,.88)' : c.k === 'a' ? 'rgba(5,150,105,.85)' : 'rgba(157,23,77,.85)'};border:2px solid #fff;`;
      el.textContent = c.count.toLocaleString();
      el.onclick = () => { p.setLevel(p.getLevel() - 2); p.panTo({ lat: c.lat, lng: c.lng }); };
      p.add({ lat: c.lat, lng: c.lng }, el, 'center', 2);
    }
    for (const m of data.markers) {
      const el = document.createElement('a');
      el.href = hrefOf(m, locale);
      const bg = m.listed ? '#ff385c' : m.k === 'h' ? '#334155' : m.k === 'l' ? '#0f766e' : m.k === 'f' ? '#b45309' : m.k === 'a' ? '#059669' : '#6b7280';
      const isActive = active === `${m.k}:${m.id}`;
      el.style.cssText = `display:inline-flex;align-items:center;gap:4px;max-width:180px;background:${bg};color:#fff;border-radius:8px;padding:4px 8px;font-size:11px;font-weight:700;text-decoration:none;box-shadow:0 2px 6px rgba(0,0,0,.25);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:2px solid ${isActive ? '#fde047' : '#fff'};opacity:${m.listed ? 1 : 0.9};margin-bottom:6px;`;
      const dot = m.foreign ? '<span style="width:7px;height:7px;border-radius:50%;background:#60a5fa;display:inline-block"></span>' : '';
      const tag = m.k === 'h' || m.k === 'l' || m.k === 'f' || m.k === 'a' ? (m.type ?? '') : (m.cats?.[0] ? catLabelOf(m.cats[0], cats) : (m.type ?? ''));
      el.innerHTML = `${dot}<span style="opacity:.85;font-weight:600">${escapeHtml(tag)}</span><span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(m.name)}</span>`;
      el.onmouseenter = () => setActive(`${m.k}:${m.id}`);
      p.add({ lat: m.lat, lng: m.lng }, el, 'bottom', isActive ? 10 : 3);
    }
  }, [data, active, locale, cats]);

  const listItems = useMemo(() => data.markers.slice(0, 80), [data]);
  const focus = (m: Marker): void => { setActive(`${m.k}:${m.id}`); provRef.current?.panTo({ lat: m.lat, lng: m.lng }); };
  const myLocation = (): void => {
    navigator.geolocation?.getCurrentPosition((pos) => { const p = provRef.current; if (!p) return; p.setLevel(5); p.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }); });
  };
  const chip = (on: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', padding: '6px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    border: `1px solid ${on ? '#222' : '#dddddd'}`, background: on ? '#222' : '#fff', color: on ? '#fff' : '#222', fontFamily: 'inherit',
  });
  const total = (kinds === 'all' || kinds === 'hospital' ? data.counts.hospital : 0) + (kinds === 'all' || kinds === 'beauty' ? data.counts.beauty : 0) + (kinds === 'all' || kinds === 'stays' ? data.counts.stays : 0) + (kinds === 'all' || kinds === 'eats' ? data.counts.eats : 0) + (kinds === 'all' || kinds === 'attraction' ? data.counts.attractions : 0);

  return (
    <div className={`m-map-root${mobileView === 'list' ? ' is-list' : ''}`} style={{ display: 'grid', gridTemplateColumns: panelOpen ? '380px 1fr' : '0px 1fr', height: 'calc(100vh - 140px)', minHeight: 520, position: 'relative', borderTop: '1px solid #ebebeb' }}>
      <style dangerouslySetInnerHTML={{ __html: '.m-map-hs::-webkit-scrollbar{display:none} .m-map-viewbtn{display:none} @media (max-width:768px){ .m-map-root{grid-template-columns:1fr !important;grid-template-rows:minmax(220px,40vh) 1fr;height:auto !important;min-height:calc(100vh - 120px) !important} .m-map-panel{order:2;border-right:none !important;border-top:1px solid #ebebeb;min-height:52vh} .m-map-list{max-height:none !important} .m-map-root.is-list{grid-template-rows:0px 1fr} .m-map-root.is-list .m-map-canvas{display:none} .m-map-root.is-list .m-map-panel{border-top:none;min-height:calc(100vh - 130px)} .m-map-toggle{display:none !important} .m-map-viewbtn{display:inline-flex} }' }} />

      <aside className="m-map-panel" style={{ borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: '#fff' }}>
        <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #f0f0f0' }}>
          <form onSubmit={(e) => { e.preventDefault(); setTick((t) => t + 1); }} style={{ display: 'flex', gap: 6 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.searchPlaceholder}
              style={{ flex: 1, border: '1px solid #dddddd', borderRadius: 999, padding: '9px 14px', fontSize: 13, fontFamily: 'inherit' }} />
            <button type="submit" style={{ ...chip(true), padding: '8px 14px' }}>🔍</button>
          </form>
          <div className="m-map-hs" style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {(['all', 'hospital', 'beauty', 'stays', 'eats', 'attraction'] as const).map((k) => (
              <button key={k} type="button" style={chip(kinds === k)} onClick={() => { setKinds(k); if (k !== 'hospital') setDept(''); if (k !== 'beauty') setCat(''); }}>
                {k === 'all' ? labels.all : k === 'hospital' ? labels.hospitals : k === 'beauty' ? labels.shops : k === 'stays' ? labels.stays : k === 'eats' ? labels.eats : labels.attractions}
              </button>
            ))}
            <button type="button" style={chip(foreign)} onClick={() => setForeign(!foreign)}>{labels.foreign}</button>
            <button type="button" style={chip(listed)} onClick={() => setListed(!listed)}>{labels.listed}</button>
          </div>
          {kinds === 'all' || kinds === 'hospital' ? (
            <div className="m-map-hs" style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#6a6a6a', alignSelf: 'center', flexShrink: 0 }}>{labels.dept}</span>
              <button type="button" style={chip(!dept)} onClick={() => setDept('')}>{labels.all}</button>
              {depts.map((d) => <button key={d.key} type="button" style={chip(dept === d.key)} onClick={() => setDept(d.key)}>{d.label}</button>)}
            </div>
          ) : null}
          {kinds === 'all' || kinds === 'beauty' ? (
            <div className="m-map-hs" style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#6a6a6a', alignSelf: 'center', flexShrink: 0 }}>{labels.cat}</span>
              <button type="button" style={chip(!cat)} onClick={() => setCat('')}>{labels.all}</button>
              {cats.map((c) => <button key={c.key} type="button" style={chip(cat === c.key)} onClick={() => setCat(c.key)}>{c.label}</button>)}
            </div>
          ) : null}
        </div>
        <div style={{ padding: '8px 14px', fontSize: 12, color: '#6a6a6a', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <span>{labels.inView} · <b style={{ color: '#222' }}>{total.toLocaleString()}</b>{loading ? ' …' : ''}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>{labels.hospitals} {data.counts.hospital.toLocaleString()} · {labels.shops} {data.counts.beauty.toLocaleString()} · {labels.stays} {data.counts.stays.toLocaleString()} · {labels.eats} {data.counts.eats.toLocaleString()} · {labels.attractions} {data.counts.attractions.toLocaleString()}</span>
            <button type="button" className="m-map-viewbtn" onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
              style={{ alignItems: 'center', gap: 4, border: '1px solid #222', background: mobileView === 'list' ? '#222' : '#fff', color: mobileView === 'list' ? '#fff' : '#222', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {mobileView === 'list' ? `🗺 ${labels.viewMap}` : `☰ ${labels.viewList}`}
            </button>
          </span>
        </div>
        <div className="m-map-list" style={{ overflowY: 'auto', flex: 1 }}>
          {data.clusters.length > 0 && data.markers.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6a6a6a', padding: 18, lineHeight: 1.6 }}>{labels.zoomHint}</p>
          ) : listItems.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6a6a6a', padding: 18, lineHeight: 1.6 }}>{labels.empty}</p>
          ) : listItems.map((m) => {
            const on = active === `${m.k}:${m.id}`;
            return (
              <div key={`${m.k}:${m.id}`} onMouseEnter={() => focus(m)} style={{ padding: '12px 14px', borderBottom: '1px solid #f3f3f3', background: on ? '#fff7f8' : '#fff', filter: m.listed ? 'none' : 'grayscale(1)', opacity: m.listed ? 1 : 0.85 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: m.listed ? '#ff385c' : '#6b7280', borderRadius: 5, padding: '1px 6px' }}>{m.listed ? labels.contractedBadge : labels.publicData}</span>
                  {m.foreign ? <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 5, padding: '1px 6px' }}>{labels.foreignBadge}</span> : null}
                  <span style={{ fontSize: 11, color: '#6a6a6a' }}>{m.k === 'h' || m.k === 'l' || m.k === 'f' || m.k === 'a' ? (m.type ?? '') : (m.cats ?? []).slice(0, 2).map((c) => catLabelOf(c, cats)).join(' · ')}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{m.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: '#6a6a6a' }}>{m.region ?? ''}</span>
                  <a href={hrefOf(m, locale)} style={{ fontSize: 12, color: '#c2143c', fontWeight: 700, textDecoration: 'none' }}>{labels.detail} →</a>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="m-map-canvas" style={{ position: 'relative', minWidth: 0 }}>
        <div ref={mapEl} style={{ position: 'absolute', inset: 0, background: '#eef2f5' }} />
        {!chosen || loadError ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#fff', border: '1px solid #fecdd3', borderRadius: 14, padding: 20, maxWidth: 440, fontSize: 13, lineHeight: 1.7, color: '#3f3f3f' }}>
              <b style={{ color: '#c2143c' }}>{loadError ? `Map SDK: ${loadError}` : labels.noKey}</b>
              <div style={{ marginTop: 6 }}>NEXT_PUBLIC_KAKAO_MAP_KEY (한국어) · NEXT_PUBLIC_GOOGLE_MAPS_KEY (영·중·일·러·베) 중 하나 이상이 필요합니다.</div>
            </div>
          </div>
        ) : null}
        <button type="button" className="m-map-toggle" onClick={() => setPanelOpen(!panelOpen)}
          style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 5, background: '#fff', border: '1px solid #dddddd', borderLeft: 'none', borderRadius: '0 8px 8px 0', width: 22, height: 48, cursor: 'pointer', fontSize: 12 }}>
          {panelOpen ? '‹' : '›'}
        </button>
        <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" onClick={myLocation} style={{ background: '#fff', border: '1px solid #dddddd', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>📍 {labels.myLocation}</button>
          <button type="button" onClick={() => provRef.current?.setLevel(level - 1)} style={{ background: '#fff', border: '1px solid #dddddd', borderRadius: 8, width: 34, height: 34, fontSize: 18, cursor: 'pointer' }}>＋</button>
          <button type="button" onClick={() => provRef.current?.setLevel(level + 1)} style={{ background: '#fff', border: '1px solid #dddddd', borderRadius: 8, width: 34, height: 34, fontSize: 18, cursor: 'pointer' }}>－</button>
        </div>
        <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', zIndex: 5, background: '#fff', border: '1px solid #e5e5e5', borderRadius: 999, padding: '10px 18px', fontSize: 13, boxShadow: '0 4px 14px rgba(0,0,0,.12)', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{labels.hospitals} {data.counts.hospital.toLocaleString()}</span>
          <span style={{ margin: '0 10px', color: '#dddddd' }}>|</span>
          <span style={{ color: '#9d174d', fontWeight: 700 }}>{labels.shops} {data.counts.beauty.toLocaleString()}</span>
          <span style={{ margin: '0 10px', color: '#dddddd' }}>|</span>
          <span style={{ color: '#0f766e', fontWeight: 700 }}>{labels.stays} {data.counts.stays.toLocaleString()}</span>
          <span style={{ margin: '0 10px', color: '#dddddd' }}>|</span>
          <span style={{ color: '#b45309', fontWeight: 700 }}>{labels.eats} {data.counts.eats.toLocaleString()}</span>
          {providerName ? <span style={{ marginLeft: 10, fontSize: 10, color: '#9c9c9c' }}>{providerName === 'kakao' ? 'Kakao' : 'Google'}</span> : null}
        </div>
      </div>
    </div>
  );
}

function hrefOf(m: Marker, locale: string): string {
  if (m.k === 'h') return m.listed && m.slug ? `/${locale}/clinics/${m.slug}` : `/${locale}/clinics/r/${encodeURIComponent(m.key)}`;
  if (m.listed && m.slug) return `/${locale}/listings/${m.slug}`;
  if (m.k === 'l') return `/${locale}/stays/r/${encodeURIComponent(m.key)}`;
  if (m.k === 'f') return `/${locale}/eats/r/${encodeURIComponent(m.key)}`;
  if (m.k === 'a') return `/${locale}/attractions/${encodeURIComponent(m.key)}`;
  return `/${locale}/shops/r/${encodeURIComponent(m.key)}`;
}
function catLabelOf(key: string, cats: Array<{ key: string; label: string }>): string {
  return cats.find((c) => c.key === key)?.label ?? key;
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}
