import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { and, desc, eq, ilike, inArray, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { hospitalRegistry, HOSPITAL_GRADE_CL_CODES } from '@/drizzle/schema/hospital-registry';
import { hospitals } from '@/drizzle/schema/hospitals';
import { RegistryCard, type RegistryCardRow } from '../_registry/shared';
import { DEPT_GROUPS, DEPT_GROUP_BY_KEY, groupKeyOfCode } from '@/lib/hospital-registry/departments';

export const dynamic = 'force-dynamic';

/** 카드 썸네일은 hospitals 가 아니라 hospital_locale_content(현재 로케일 → kr 폴백)의 cover/landing/gallery[0].
 * 글로우업 등록 병원(hospitals.primary_categories) → 과별 그룹 키. 레지스트리와 아직
 *  연결되지 않은 등록 병원도 해당 과 목록에 컬러 카드로 함께 나오게 한다. */
const HOSPITAL_CAT_TO_DEPT: Record<string, string[]> = {
  plastic_surgery: ['plastic_surgery'], dermatology: ['dermatology'], hair: ['dermatology', 'plastic_surgery'],
  dental: ['dental'], cosmetic_dental: ['dental'], ophthalmology: ['ophthalmology'], obstetrics: ['obgyn'], fertility: ['obgyn'],
  oriental: ['oriental'], checkup: ['internal', 'family'], orthopedic: ['orthopedics'], cardiology: ['internal', 'thoracic'],
  oncology: ['internal'], gastroenterology: ['internal'], neurology: ['neurology'], urology: ['urology'], ent: ['ent'], general: ['family', 'internal'],
};

const PAGE_SIZE = 24;
const CSS =
  '.m-cl-hscroll::-webkit-scrollbar { display: none; }'
  + '.m-ra-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }'
  + '.m-ra-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }'
  + '@media (max-width: 1024px) { .m-ra-grid { grid-template-columns: repeat(3, 1fr); } }'
  + '@media (max-width: 768px) { .m-ra-page { padding: 20px 16px 80px !important; } .m-ra-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } .m-ra-title { font-size: 22px !important; } }';

type Search = { q?: string; sido?: string; type?: string; foreign?: string; listed?: string; page?: string; dept?: string };

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const dict = await getDictionary(params.locale);
  return { title: `${dict.clinicsPage.registry.title} · GlowUpTour`, description: dict.clinicsPage.registry.subtitle };
}

/**
 * 전국 병원 찾기 — 심평원 레지스트리 전체.
 * 컬러 = 글로우업 등록(계약 연결 또는 직접 등록 승인), 흑백 = 공공정보만.
 * 기본 보기는 병원급 이상, '전체' 칩으로 의원까지 확장.
 */
export default async function RegistryListPage({ params, searchParams }: { params: { locale: string }; searchParams: Search }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.clinicsPage.registry;

  const q = (searchParams.q ?? '').trim().slice(0, 60);
  const sido = (searchParams.sido ?? '').trim();
  const hasAny = Object.values(searchParams).some((v) => (v ?? '') !== '');
  const type = searchParams.type ?? (hasAny ? 'all' : 'hospital');
  const foreign = searchParams.foreign === '1';
  const listed = searchParams.listed === '1';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dept = searchParams.dept && DEPT_GROUP_BY_KEY[searchParams.dept] ? searchParams.dept : '';
  const deptCodes = dept ? (DEPT_GROUP_BY_KEY[dept]?.codes ?? []) : [];

  const conds: SQL[] = [];
  if (q) {
    const like = `%${q.replace(/[%_]/g, '')}%`;
    conds.push(or(ilike(hospitalRegistry.name, like), ilike(hospitalRegistry.addr, like)) as SQL);
  }
  if (sido) conds.push(eq(hospitalRegistry.sidoName, sido));
  if (type === 'hospital') conds.push(inArray(hospitalRegistry.clCd, HOSPITAL_GRADE_CL_CODES));
  else if (type && type !== 'all') conds.push(eq(hospitalRegistry.clCd, type));
  if (foreign) conds.push(eq(hospitalRegistry.foreignLicensed, true));
  if (listed) conds.push(or(isNotNull(hospitalRegistry.contractedHospitalId), eq(hospitalRegistry.claimStatus, 'approved')) as SQL);
  // 과별: 심평원 진료과목 코드 배열과 교집합 (GIN 인덱스)
  // (코드는 우리 상수라 raw 로 배열 리터럴을 만든다 — drizzle 은 JS 배열 파라미터를 튜플로 펼침)
  if (deptCodes.length) {
    const lit = deptCodes.filter((c) => /^\d{2}$/.test(c)).map((c) => `'${c}'`).join(',');
    conds.push(sql`${hospitalRegistry.deptCodes} && ${sql.raw(`array[${lit}]::text[]`)}`);
  }
  const where = conds.length ? and(...conds) : undefined;

  let rows: RegistryCardRow[] = [];
  let total = 0;
  let sidoOptions: string[] = [];
  let error: string | null = null;
  try {
    const [cnt] = await db.select({ n: sql<number>`count(*)::int` }).from(hospitalRegistry).where(where);
    total = cnt?.n ?? 0;
    const listedRank = sql`case when ${hospitalRegistry.contractedHospitalId} is not null or ${hospitalRegistry.claimStatus} = 'approved' then 0 else 1 end`;
    const foreignRank = sql`case when ${hospitalRegistry.foreignLicensed} then 0 else 1 end`;
    const gradeRank = sql`case when ${hospitalRegistry.clCd} in ('01','11','21','41','93') then 0 when ${hospitalRegistry.clCd} in ('28','29') then 1 else 2 end`;
    const found = await db
      .select({
        id: hospitalRegistry.id, ykiho: hospitalRegistry.ykiho, name: hospitalRegistry.name, clCd: hospitalRegistry.clCd, clName: hospitalRegistry.clName,
        sidoName: hospitalRegistry.sidoName, sgguName: hospitalRegistry.sgguName, addr: hospitalRegistry.addr, drTotal: hospitalRegistry.drTotal,
        foreignLicensed: hospitalRegistry.foreignLicensed, contractedHospitalId: hospitalRegistry.contractedHospitalId, claimStatus: hospitalRegistry.claimStatus,
        details: hospitalRegistry.details, deptCodes: hospitalRegistry.deptCodes, partnerSlug: hospitals.slug, partnerCover: sql<string | null>`(select coalesce(c.cover_image_url, c.landing_image_url, case when jsonb_typeof(c.gallery_image_urls) = 'array' then c.gallery_image_urls->>0 end) from hospital_locale_content c where c.hospital_id = hospitals.id and coalesce(c.cover_image_url, c.landing_image_url, case when jsonb_typeof(c.gallery_image_urls) = 'array' then c.gallery_image_urls->>0 end) is not null order by (c.locale = ${locale}) desc, (c.locale = 'kr') desc limit 1)`,
      })
      .from(hospitalRegistry)
      .leftJoin(hospitals, eq(hospitals.id, hospitalRegistry.contractedHospitalId))
      .where(where)
      .orderBy(listedRank, foreignRank, gradeRank, desc(hospitalRegistry.drTotal), hospitalRegistry.name)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    // 과목 코드 → 소비자 과별 라벨 (중복 그룹 제거, 최대 3개)
    rows = found.map((f) => {
      const keys = Array.from(new Set((f.deptCodes ?? []).map(groupKeyOfCode).filter((k): k is string => Boolean(k))));
      const deptLabels = keys.map((k) => (dict.clinicsPage.depts as Record<string, string>)[k] ?? k);
      return { ...f, deptLabels } as RegistryCardRow;
    });
    // 과별 필터 + 첫 페이지: 레지스트리 미연결 등록 병원도 해당 과에 포함 (컬러 카드, 글로우업 상세로 연결)
    if (dept && page === 1) {
      const unlinked = await db
        .select({ id: hospitals.id, name: hospitals.name, slug: hospitals.slug, cover: sql<string | null>`(select coalesce(c.cover_image_url, c.landing_image_url, case when jsonb_typeof(c.gallery_image_urls) = 'array' then c.gallery_image_urls->>0 end) from hospital_locale_content c where c.hospital_id = hospitals.id and coalesce(c.cover_image_url, c.landing_image_url, case when jsonb_typeof(c.gallery_image_urls) = 'array' then c.gallery_image_urls->>0 end) is not null order by (c.locale = ${locale}) desc, (c.locale = 'kr') desc limit 1)`, cats: hospitals.primaryCategories, addressJson: hospitals.addressJson })
        .from(hospitals)
        .where(sql`${hospitals.countryCode} = 'KR' and ${hospitals.isActiveForMatching} = true and not exists (select 1 from hospital_registry r where r.contracted_hospital_id = ${hospitals.id})`)
        .limit(200);
      const label = (dict.clinicsPage.depts as Record<string, string>)[dept] ?? dept;
      const extras: RegistryCardRow[] = unlinked
        .filter((h) => ((h.cats ?? []) as string[]).some((c) => (HOSPITAL_CAT_TO_DEPT[c] ?? []).includes(dept)))
        .filter((h) => !sido || JSON.stringify(h.addressJson ?? {}).includes(sido))
        .map((h) => ({
          id: `hosp:${h.id}`, ykiho: h.slug, name: h.name, clCd: null, clName: dict.clinicsPage.registry.contractedBadge,
          sidoName: ((h.addressJson as { city?: string } | null)?.city ?? null), sgguName: null, addr: null, drTotal: 0,
          foreignLicensed: false, contractedHospitalId: h.id, claimStatus: 'approved', details: null, deptLabels: [label],
          partnerSlug: h.slug, partnerCover: h.cover,
        }));
      if (extras.length) { rows = [...extras, ...rows]; total += extras.length; }
    }
    const sidos = await db.selectDistinct({ s: hospitalRegistry.sidoName }).from(hospitalRegistry).where(isNotNull(hospitalRegistry.sidoName)).orderBy(hospitalRegistry.sidoName);
    sidoOptions = sidos.map((r) => r.s).filter((s): s is string => Boolean(s));
  } catch (err) {
    error = err instanceof Error ? err.message : 'db_error';
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Partial<Search>): string => {
    const p = new URLSearchParams();
    const merged: Search = { q, sido, type, foreign: foreign ? '1' : '', listed: listed ? '1' : '', dept, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/${locale}/clinics/all${s ? `?${s}` : ''}`;
  };
  const chip = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: 9999, fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap',
    border: `1px solid ${active ? '#222' : '#dddddd'}`, background: active ? '#222' : '#fff', color: active ? '#fff' : '#222',
  });

  return (
    <section className="m-ra-page" style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 80px' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Link href={`/${locale}/clinics`} style={{ fontSize: 12, color: '#6a6a6a' }}>← {dict.clinicsPage.recommended}</Link>
      <h1 className="m-ra-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: '6px 0 0' }}>{t.title}</h1>
      <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0', lineHeight: 1.6 }}>{t.subtitle}</p>

      {/* 검색 */}
      <form action={`/${locale}/clinics/all`} method="get" style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
        <input type="hidden" name="type" value={type} />
        {foreign ? <input type="hidden" name="foreign" value="1" /> : null}
        {listed ? <input type="hidden" name="listed" value="1" /> : null}
        {dept ? <input type="hidden" name="dept" value={dept} /> : null}
        <input name="q" defaultValue={q} placeholder={t.searchPlaceholder}
          style={{ flex: 1, minWidth: 220, border: '1px solid #dddddd', borderRadius: 999, padding: '11px 16px', fontSize: 14, fontFamily: 'inherit' }} />
        <select name="sido" defaultValue={sido} style={{ border: '1px solid #dddddd', borderRadius: 999, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', background: '#fff' }}>
          <option value="">{t.region}</option>
          {sidoOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" style={{ background: '#ff385c', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t.search}</button>
      </form>

      {/* 필터 칩 */}
      <div className="m-ra-filters" style={{ marginTop: 12 }}>
        <Link href={qs({ type: 'hospital', page: '' })} style={chip(type === 'hospital')}>{t.filterHospitalGrade}</Link>
        <Link href={qs({ type: 'all', page: '' })} style={chip(type === 'all')}>{t.filterAll}</Link>
        <Link href={qs({ foreign: foreign ? '' : '1', page: '' })} style={chip(foreign)}>{t.filterForeign}</Link>
        <Link href={qs({ listed: listed ? '' : '1', page: '' })} style={chip(listed)}>{t.filterContracted}</Link>
        <span style={{ fontSize: 13, color: '#6a6a6a', marginLeft: 'auto' }}>{t.results} <b style={{ color: '#222' }}>{total.toLocaleString(locale === 'kr' ? 'ko-KR' : 'en-US')}</b>{t.countSuffix}</span>
      </div>

      {/* 과별(진료과) 칩 — 심평원 진료과목 코드 기준 */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6a6a6a', marginBottom: 6 }}>{t.dept}</div>
        {/* 가로 스크롤이면 오른쪽 칩이 잘려 보여(사용자 지적) 줄바꿈으로 전부 노출 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 4 }}>
          <Link href={qs({ dept: '', page: '' })} style={{ ...chip(!dept), flexShrink: 0 }}>{t.filterAll}</Link>
          {DEPT_GROUPS.map((g) => (
            <Link key={g.key} href={qs({ dept: g.key, type: 'all', page: '' })} style={{ ...chip(dept === g.key), flexShrink: 0 }}>
              {(dict.clinicsPage.depts as Record<string, string>)[g.key] ?? g.ko}
            </Link>
          ))}
        </div>
      </div>

      {error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>{error}</p> : null}

      {rows.length === 0 && !error ? (
        <p style={{ fontSize: 14, color: '#6a6a6a', border: '1px dashed #dddddd', borderRadius: 14, padding: 28, marginTop: 20, textAlign: 'center' }}>{t.noResults}</p>
      ) : (
        <div className="m-ra-grid" style={{ marginTop: 20 }}>
          {rows.map((r) => <RegistryCard key={r.id} r={r} locale={locale} t={t} />)}
        </div>
      )}

      {pages > 1 ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28, alignItems: 'center', fontSize: 13 }}>
          {page > 1 ? <Link href={qs({ page: String(page - 1) })} style={chip(false)}>← {t.prev}</Link> : null}
          <span style={{ color: '#6a6a6a' }}>{page} / {pages}</span>
          {page < pages ? <Link href={qs({ page: String(page + 1) })} style={chip(false)}>{t.next} →</Link> : null}
        </div>
      ) : null}

      <p style={{ fontSize: 11, color: '#9c9c9c', marginTop: 28 }}>{t.dataSource}</p>
    </section>
  );
}
