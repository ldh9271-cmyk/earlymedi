import 'server-only';
import proj4 from 'proj4';

/**
 * 행정안전부 지방행정인허가데이터(LOCALDATA) 공공데이터포털 API 공통 클라이언트.
 *  - 미용업 /1741000/beauty_salons/info · 숙박업 /1741000/lodgings/info 등 같은 응답 구조
 *  - 동작하는 파라미터는 pageNo / numOfRows(최대 100) 만. 최근 갱신 순 정렬.
 *  - 좌표 CRD_INFO_X/Y 는 TM 중부원점(EPSG:5174, Bessel) → WGS84 변환.
 *  - 인증키는 HIRA_SERVICE_KEY (공공데이터포털 계정 공용).
 */
export const LOCALDATA_PAGE_SIZE = 100;
const TM_5174 = '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43';

export type Json = Record<string, unknown>;
export const str = (v: unknown): string | null => { if (v === undefined || v === null) return null; const s = String(v).trim(); return s === '' ? null : s; };
export const num = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) ? n : null; };
export const int = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; };

function key(): string {
  const raw = (process.env.HIRA_SERVICE_KEY ?? '').trim();
  if (!raw) throw new Error('HIRA_SERVICE_KEY 가 설정되지 않았습니다');
  return raw.includes('%') ? raw : encodeURIComponent(raw);
}

export async function fetchLocaldataPage(endpoint: string, pageNo: number, numOfRows = LOCALDATA_PAGE_SIZE): Promise<{ items: Json[]; totalCount: number }> {
  const url = `${endpoint}?serviceKey=${key()}&type=json&pageNo=${pageNo}&numOfRows=${numOfRows}`;
  let res: Response | null = null; let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3 && !res; attempt += 1) {
    try { res = await fetch(url, { cache: 'no-store' }); } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); }
  }
  if (!res) throw new Error(`LOCALDATA 연결 실패: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`LOCALDATA HTTP ${res.status}: ${text.slice(0, 160)}`);
  let json: Json;
  try { json = JSON.parse(text) as Json; } catch { throw new Error(`LOCALDATA 비JSON: ${text.slice(0, 160)}`); }
  const body = ((json.response as Json | undefined)?.body ?? {}) as Json;
  const wrap = body.items as Json | undefined;
  const it = wrap && typeof wrap === 'object' ? (wrap as Json).item : undefined;
  const items = Array.isArray(it) ? (it as Json[]) : it ? [it as Json] : [];
  return { items, totalCount: Number(body.totalCount ?? 0) || 0 };
}

/** TM(5174) → WGS84. 한국 영역 밖이면 null. */
export function tmToWgs84(x: number | null, y: number | null): { lat: number; lng: number } | null {
  if (!x || !y || Math.abs(x) > 2_000_000 || Math.abs(y) > 2_000_000) return null;
  try {
    const [lo, la] = proj4(TM_5174, 'EPSG:4326', [x, y]) as [number, number];
    return la > 32 && la < 40 && lo > 124 && lo < 132 ? { lat: la, lng: lo } : null;
  } catch { return null; }
}

/** 주소 → 시도(심평원 축약형과 동일)·시군구. */
export function regionOf(addr: string | null): { sido: string | null; sggu: string | null } {
  if (!addr) return { sido: null, sggu: null };
  const parts = addr.split(/\s+/);
  const sidoRaw = parts[0] ?? '';
  const sido = sidoRaw
    .replace(/특별자치도$|특별자치시$|광역시$|특별시$|통합특별시$/, '')
    .replace(/^전남광주$/, '광주').replace(/^전라남도$/, '전남').replace(/^전라북도$/, '전북')
    .replace(/^충청남도$/, '충남').replace(/^충청북도$/, '충북').replace(/^경상남도$/, '경남').replace(/^경상북도$/, '경북')
    .replace(/^경기도$/, '경기');
  let sggu = parts[1] ?? null;
  if (sggu && /시$/.test(sggu) && parts[2] && /구$|군$/.test(parts[2])) sggu = `${sggu} ${parts[2]}`;
  return { sido: sido || null, sggu };
}

export function parseLastMod(v: unknown): Date | null {
  const s = str(v);
  return s ? new Date(s.replace(' ', 'T') + '+09:00') : null;
}
