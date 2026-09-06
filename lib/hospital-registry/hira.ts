import 'server-only';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  CL_CODE_NAME, hospitalRegistry,
  type RegistryDepartment, type RegistryDetails, type RegistryHours, type RegistryTransport,
} from '@/drizzle/schema/hospital-registry';

/**
 * 건강보험심사평가원 오픈API 클라이언트 (공공데이터포털 apis.data.go.kr).
 *
 *  - 병원정보서비스 v2      : getHospBasisList  — 전국 요양기관 기본정보 (목록 적재)
 *  - 의료기관별상세정보 2.8 : getDgsbjtInfo2.8 (진료과목) · getDtlInfo2.8 (진료시간·주차·안내)
 *                            · getTrnsprtInfo2.8 (교통)      — 상세 화면용, 열람 시 갱신
 *
 * 인증키는 HIRA_SERVICE_KEY (공공데이터포털 '일반 인증키'). Encoding/Decoding
 * 어느 쪽이든 받도록 '%' 포함 여부로 판별한다.
 */
const BASE = 'https://apis.data.go.kr/B551182';
const BASIS_PATH = '/hospInfoServicev2/getHospBasisList';
const DETAIL_SVC = '/MadmDtlInfoService2.8';

export const REGISTRY_PAGE_SIZE = 1000;
/** 상세 정보 재조회 주기 — 열람 시 이보다 오래됐으면 새로 받는다 (실시간 반영). */
export const DETAILS_TTL_MS = 14 * 86_400_000;

function serviceKeyParam(): string {
  const raw = (process.env.HIRA_SERVICE_KEY ?? '').trim();
  if (!raw) throw new Error('HIRA_SERVICE_KEY 가 설정되지 않았습니다');
  return raw.includes('%') ? raw : encodeURIComponent(raw);
}

type Json = Record<string, unknown>;

async function callApi(path: string, params: Record<string, string | number | undefined>): Promise<{ items: Json[]; totalCount: number }> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${BASE}${path}?serviceKey=${serviceKeyParam()}&_type=json&${qs}`;
  // 공공데이터포털은 간헐적으로 연결이 끊긴다 — 네트워크 오류만 2회 재시도
  let res: Response | null = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3 && !res; attempt += 1) {
    try {
      res = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  if (!res) throw new Error(`HIRA ${path} 연결 실패: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`HIRA ${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
  let json: Json;
  try { json = JSON.parse(text) as Json; } catch {
    // 인증키 오류 등은 XML 로 내려온다
    throw new Error(`HIRA ${path} 비JSON 응답: ${text.slice(0, 200)}`);
  }
  const response = (json.response ?? json) as Json;
  const header = (response.header ?? {}) as Json;
  const code = String(header.resultCode ?? '00');
  if (code !== '00' && code !== '0') {
    throw new Error(`HIRA ${path} resultCode ${code}: ${String(header.resultMsg ?? '')}`);
  }
  const body = (response.body ?? {}) as Json;
  const itemsWrap = body.items as Json | string | undefined;
  let items: Json[] = [];
  if (itemsWrap && typeof itemsWrap === 'object') {
    const it = (itemsWrap as Json).item;
    items = Array.isArray(it) ? (it as Json[]) : it ? [it as Json] : [];
  }
  const totalCount = Number(body.totalCount ?? items.length) || 0;
  return { items, totalCount };
}

const str = (v: unknown): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};
const int = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};
const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : null;
};

export type BasisRow = typeof hospitalRegistry.$inferInsert;

/** getHospBasisList item → registry upsert row. */
export function mapBasisItem(it: Json): BasisRow | null {
  const ykiho = str(it.ykiho);
  const name = str(it.yadmNm);
  if (!ykiho || !name) return null;
  const clCd = str(it.clCd);
  return {
    ykiho,
    name,
    clCd,
    clName: str(it.clCdNm) ?? (clCd ? CL_CODE_NAME[clCd] ?? null : null),
    sidoCd: str(it.sidoCd),
    sidoName: str(it.sidoCdNm),
    sgguCd: str(it.sgguCd),
    sgguName: str(it.sgguCdNm),
    emdongName: str(it.emdongNm),
    postNo: str(it.postNo),
    addr: str(it.addr),
    tel: str(it.telno),
    url: str(it.hospUrl),
    estbDate: str(it.estbDd),
    drTotal: int(it.drTotCnt),
    // 전문의(mdeptSdrCnt) · 일반의(mdeptGdrCnt) · 치과(dety*) · 한의(cmdc*)
    drSpecialist: int(it.mdeptSdrCnt),
    drGeneral: int(it.mdeptGdrCnt) + int(it.mdeptIntnCnt) + int(it.mdeptResdntCnt),
    drDental: int(it.detyGdrCnt) + int(it.detyIntnCnt) + int(it.detyResdntCnt) + int(it.detySdrCnt),
    drOriental: int(it.cmdcGdrCnt) + int(it.cmdcIntnCnt) + int(it.cmdcResdntCnt) + int(it.cmdcSdrCnt),
    lng: num(it.XPos),
    lat: num(it.YPos),
    source: 'hira_api',
    syncedAt: new Date(),
  };
}

/** 한 페이지 upsert (ykiho 충돌 시 공공 필드만 갱신 — 계약/클레임/외국인 표기는 보존). */
export async function upsertBasisRows(rows: BasisRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  // 같은 페이지 안의 중복 ykiho 제거 (ON CONFLICT 는 한 문장에 같은 키 두 번을 허용하지 않음)
  const uniq = new Map<string, BasisRow>();
  for (const r of rows) uniq.set(r.ykiho, r);
  const values = [...uniq.values()];
  await db
    .insert(hospitalRegistry)
    .values(values)
    .onConflictDoUpdate({
      target: hospitalRegistry.ykiho,
      set: {
        name: sql`excluded.name`,
        clCd: sql`excluded.cl_cd`,
        clName: sql`excluded.cl_name`,
        sidoCd: sql`excluded.sido_cd`,
        sidoName: sql`excluded.sido_name`,
        sgguCd: sql`excluded.sggu_cd`,
        sgguName: sql`excluded.sggu_name`,
        emdongName: sql`excluded.emdong_name`,
        postNo: sql`excluded.post_no`,
        addr: sql`excluded.addr`,
        tel: sql`excluded.tel`,
        url: sql`excluded.url`,
        estbDate: sql`excluded.estb_date`,
        drTotal: sql`excluded.dr_total`,
        drGeneral: sql`excluded.dr_general`,
        drSpecialist: sql`excluded.dr_specialist`,
        drDental: sql`excluded.dr_dental`,
        drOriental: sql`excluded.dr_oriental`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        source: sql`excluded.source`,
        syncedAt: sql`excluded.synced_at`,
        updatedAt: sql`now()`,
      },
    });
  return values.length;
}

export type SyncPageResult = { pageNo: number; fetched: number; upserted: number; totalCount: number; done: boolean };

/**
 * 기본정보 한 페이지 동기화. 서버리스 시간 제한 안에서 끝나도록 페이지
 * 단위로 호출하고, 호출자가 done 까지 pageNo 를 올려가며 반복한다.
 * clCd / sidoCd 로 범위를 좁힐 수 있다 (예: 병원급만, 서울만).
 */
export async function syncBasisPage(opts: { pageNo: number; clCd?: string; sidoCd?: string; numOfRows?: number }): Promise<SyncPageResult> {
  const numOfRows = opts.numOfRows ?? REGISTRY_PAGE_SIZE;
  const { items, totalCount } = await callApi(BASIS_PATH, {
    pageNo: opts.pageNo, numOfRows, clCd: opts.clCd, sidoCd: opts.sidoCd,
  });
  const rows = items.map(mapBasisItem).filter((r): r is BasisRow => r !== null);
  const upserted = await upsertBasisRows(rows);
  const done = items.length < numOfRows || opts.pageNo * numOfRows >= totalCount;
  return { pageNo: opts.pageNo, fetched: items.length, upserted, totalCount, done };
}

// ── 상세 (진료과목 · 진료시간 · 교통) ──────────────────────────────

const hhmm = (v: unknown): string | null => {
  const s = str(v);
  return s && /^\d{3,4}$/.test(s) ? s.padStart(4, '0') : null;
};
const pair = (a: unknown, b: unknown): [string, string] | undefined => {
  const s = hhmm(a); const e = hhmm(b);
  return s && e ? [s, e] : undefined;
};

export async function fetchDetails(ykiho: string): Promise<RegistryDetails> {
  const [dept, dtl, trn] = await Promise.all([
    callApi(`${DETAIL_SVC}/getDgsbjtInfo2.8`, { ykiho, numOfRows: 100 }).catch(() => ({ items: [] as Json[], totalCount: 0 })),
    callApi(`${DETAIL_SVC}/getDtlInfo2.8`, { ykiho }).catch(() => ({ items: [] as Json[], totalCount: 0 })),
    callApi(`${DETAIL_SVC}/getTrnsprtInfo2.8`, { ykiho, numOfRows: 50 }).catch(() => ({ items: [] as Json[], totalCount: 0 })),
  ]);

  const departments: RegistryDepartment[] = dept.items
    .map((d) => ({ code: str(d.dgsbjtCd) ?? '', name: str(d.dgsbjtCdNm) ?? '', doctors: int(d.dgsbjtPrSdrCnt) }))
    .filter((d) => d.name);

  const h = dtl.items[0] ?? {};
  const hours: RegistryHours | undefined = dtl.items.length
    ? {
      mon: pair(h.trmtMonStart, h.trmtMonEnd), tue: pair(h.trmtTueStart, h.trmtTueEnd),
      wed: pair(h.trmtWedStart, h.trmtWedEnd), thu: pair(h.trmtThuStart, h.trmtThuEnd),
      fri: pair(h.trmtFriStart, h.trmtFriEnd), sat: pair(h.trmtSatStart, h.trmtSatEnd),
      sun: pair(h.trmtSunStart, h.trmtSunEnd),
      lunchWeek: str(h.lunchWeek) ?? undefined, lunchSat: str(h.lunchSat) ?? undefined,
      receptionWeek: str(h.rcvWeek) ?? undefined, receptionSat: str(h.rcvSat) ?? undefined,
      closedHoliday: str(h.noTrmtHoli) ?? undefined, closedSunday: str(h.noTrmtSun) ?? undefined,
      emergencyDay: str(h.emyDayYn) === 'Y', emergencyNight: str(h.emyNgtYn) === 'Y',
      parking: (str(h.parkQty) || str(h.parkEtc))
        ? { spaces: int(h.parkQty) || undefined, paid: str(h.parkXpnsYn) === 'Y', note: str(h.parkEtc) ?? undefined }
        : undefined,
      landmark: str(h.plcNm) ? { name: str(h.plcNm) ?? undefined, direction: str(h.plcDir) ?? undefined, distance: str(h.plcDist) ?? undefined } : undefined,
    }
    : undefined;

  // 2.8 실제 필드: trafNm(교통수단) · lineNo(노선, 숫자로 올 수 있음) · arivPlc(하차 지점)
  //               · dir(방향/경유) · rmk(승차 안내)
  const transport: RegistryTransport[] = trn.items.map((t) => ({
    type: str(t.trafNm) ?? '',
    line: str(t.lineNo) ?? undefined,
    station: str(t.arivPlc) ?? undefined,
    exit: undefined,
    distance: str(t.dir) ?? undefined,
    note: str(t.rmk) ?? undefined,
  })).filter((t) => t.type || t.station);

  return { departments, hours, transport };
}

/** 열람 시 상세를 갱신한다 — TTL 이 지났거나 아직 없으면 API 호출, 아니면 그대로. */
export async function ensureDetails(row: { id: string; ykiho: string; details: RegistryDetails; detailsSyncedAt: Date | null }): Promise<RegistryDetails> {
  const fresh = row.detailsSyncedAt && Date.now() - row.detailsSyncedAt.getTime() < DETAILS_TTL_MS;
  if (fresh) return row.details;
  if (!process.env.HIRA_SERVICE_KEY) return row.details;
  try {
    const d = await fetchDetails(row.ykiho);
    // 병원이 직접 입력한 소개·사진·언어는 보존하고 공공 필드만 갱신
    const merged: RegistryDetails = { ...row.details, departments: d.departments, hours: d.hours, transport: d.transport };
    await db.update(hospitalRegistry)
      .set({ details: merged, detailsSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(hospitalRegistry.id, row.id));
    return merged;
  } catch {
    return row.details;
  }
}

/** 상세 미수집(또는 오래된) 병원급 기관을 일괄 갱신 — 크론용, limit 만큼만. */
export async function refreshStaleDetails(limit = 40): Promise<number> {
  const cutoff = new Date(Date.now() - DETAILS_TTL_MS);
  const rows = await db.select({ id: hospitalRegistry.id, ykiho: hospitalRegistry.ykiho, details: hospitalRegistry.details, detailsSyncedAt: hospitalRegistry.detailsSyncedAt })
    .from(hospitalRegistry)
    .where(and(
      or(isNull(hospitalRegistry.detailsSyncedAt), lt(hospitalRegistry.detailsSyncedAt, cutoff)),
      // 계약·외국인·병원급 우선
      or(eq(hospitalRegistry.foreignLicensed, true), sql`${hospitalRegistry.contractedHospitalId} is not null`, sql`${hospitalRegistry.clCd} in ('01','11','21','41','93')`),
    ))
    .limit(limit);
  let n = 0;
  for (const r of rows) {
    await ensureDetails(r);
    n += 1;
  }
  return n;
}

// ── 진료과목(dgsbjtCd) 수집 — 과별 카테고리 ─────────────────────────

export type DeptSyncResult = { code: string; pages: number; hospitals: number; updated: number };

/**
 * 한 진료과목 코드의 전국 기관을 getHospBasisList?dgsbjtCd= 로 모두 받아
 * hospital_registry.dept_codes 에 코드를 추가한다 (중복 없이). 기관 수만큼
 * 상세 API 를 호출하지 않고 과목당 수십 회로 끝나 일일 트래픽 안에 든다.
 */
export async function syncDeptCode(code: string): Promise<DeptSyncResult> {
  const ykihos: string[] = [];
  let page = 1;
  for (;;) {
    const { items, totalCount } = await callApi(BASIS_PATH, { pageNo: page, numOfRows: REGISTRY_PAGE_SIZE, dgsbjtCd: code });
    for (const it of items) { const y = str(it.ykiho); if (y) ykihos.push(y); }
    if (items.length < REGISTRY_PAGE_SIZE || page * REGISTRY_PAGE_SIZE >= totalCount) break;
    page += 1;
  }
  let updated = 0;
  for (let i = 0; i < ykihos.length; i += 2000) {
    const chunk = ykihos.slice(i, i + 2000);
    // drizzle sql 템플릿은 JS 배열을 (a, b, c) 로 펼치므로 JSON 문자열로 넘겨 jsonb 로 푼다
    const res = await db.execute(sql`
      update hospital_registry
         set dept_codes = (select array(select distinct x from unnest(dept_codes || ${code}::text) as x order by x)),
             depts_synced_at = now()
       where ykiho in (select jsonb_array_elements_text(${JSON.stringify(chunk)}::jsonb))
         and not (dept_codes @> array[${code}::text])
    `);
    updated += Number((res as unknown as { count?: number }).count ?? 0);
  }
  return { code, pages: page, hospitals: ykihos.length, updated };
}
