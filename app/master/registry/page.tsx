import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq, sql } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { hospitalRegistry } from '@/drizzle/schema/hospital-registry';
import { beautyRegistry } from '@/drizzle/schema/beauty-registry';
import { lodgingRegistry } from '@/drizzle/schema/lodging-registry';
import { foodRegistry } from '@/drizzle/schema/food-registry';
import { hospitals } from '@/drizzle/schema/hospitals';
import { organizations } from '@/drizzle/schema/organizations';
import SyncRunner from './_components/sync-runner';
import { autoMatchContractsAction, autoMatchShopsAction, autoMatchStaysAction, autoMatchEatsAction, decideClaimAction, decideShopClaimAction, decideStayClaimAction, decideEatClaimAction, markForeignAction, setContractAction, setShopContractAction, setStayContractAction, setEatContractAction, reviewSubmissionAction } from './_actions';
import type { RegistryDetails } from '@/drizzle/schema/hospital-registry';
import { signedDocUrl } from '@/lib/storage/registry-files';
import { profileCompleteness } from '@/lib/registry/submission';
import { REGISTRY_AGENCY_FEE_WON } from '@/lib/registry/agency';
import { partnerListings } from '@/drizzle/schema/partner-listings';

export const dynamic = 'force-dynamic';

const input: React.CSSProperties = { border: '1px solid #dddddd', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', width: '100%' };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#6a6a6a', display: 'block', marginBottom: 4 };
const card: React.CSSProperties = { border: '1px solid #ebebeb', borderRadius: 12, padding: 18, background: '#fff' };
const btn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' });

/**
 * 전국 병원 레지스트리 관리 (마스터).
 *  1) 심평원 동기화 실행   2) 외국인환자 유치기관 명단 반영
 *  3) 계약 병원 연결(자동/수동)   4) 병원 직접 등록(클레임) 승인
 */
export default async function RegistryAdminPage({ searchParams }: { searchParams: { ok?: string; error?: string; misses?: string; q?: string; sq?: string; lq?: string; fq?: string } }): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');

  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      hospitalGrade: sql<number>`count(*) filter (where ${hospitalRegistry.clCd} in ('01','11','21','28','29','41','93'))::int`,
      contracted: sql<number>`count(*) filter (where ${hospitalRegistry.contractedHospitalId} is not null)::int`,
      claimed: sql<number>`count(*) filter (where ${hospitalRegistry.claimStatus} = 'approved')::int`,
      pendingClaims: sql<number>`count(*) filter (where ${hospitalRegistry.claimStatus} = 'pending')::int`,
      foreign: sql<number>`count(*) filter (where ${hospitalRegistry.foreignLicensed})::int`,
      withDetails: sql<number>`count(*) filter (where ${hospitalRegistry.detailsSyncedAt} is not null)::int`,
      lastSync: sql<Date | null>`max(${hospitalRegistry.syncedAt})`,
    })
    .from(hospitalRegistry);

  const [beauty] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${beautyRegistry.statusCode} = '01')::int`,
      hair: sql<number>`count(*) filter (where ${beautyRegistry.statusCode} = '01' and ${beautyRegistry.categoryKeys} @> array['hair']::text[])::int`,
      nail: sql<number>`count(*) filter (where ${beautyRegistry.statusCode} = '01' and ${beautyRegistry.categoryKeys} @> array['nail']::text[])::int`,
      makeup: sql<number>`count(*) filter (where ${beautyRegistry.statusCode} = '01' and ${beautyRegistry.categoryKeys} @> array['makeup']::text[])::int`,
      skin: sql<number>`count(*) filter (where ${beautyRegistry.statusCode} = '01' and ${beautyRegistry.categoryKeys} @> array['skin']::text[])::int`,
      pmu: sql<number>`count(*) filter (where ${beautyRegistry.statusCode} = '01' and ${beautyRegistry.categoryKeys} @> array['pmu']::text[])::int`,
      pcolor: sql<number>`count(*) filter (where ${beautyRegistry.statusCode} = '01' and ${beautyRegistry.categoryKeys} @> array['personal_color']::text[])::int`,
      listed: sql<number>`count(*) filter (where ${beautyRegistry.contractedListingId} is not null or ${beautyRegistry.claimStatus} = 'approved')::int`,
      pending: sql<number>`count(*) filter (where ${beautyRegistry.claimStatus} = 'pending')::int`,
      lastSync: sql<Date | null>`max(${beautyRegistry.syncedAt})`,
    })
    .from(beautyRegistry);

  const [lodging] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${lodgingRegistry.statusCode} = '01')::int`,
      hotel: sql<number>`count(*) filter (where ${lodgingRegistry.statusCode} = '01' and ${lodgingRegistry.categoryKeys} @> array['hotel']::text[])::int`,
      guesthouse: sql<number>`count(*) filter (where ${lodgingRegistry.statusCode} = '01' and ${lodgingRegistry.categoryKeys} @> array['guesthouse']::text[])::int`,
      pension: sql<number>`count(*) filter (where ${lodgingRegistry.statusCode} = '01' and ${lodgingRegistry.categoryKeys} @> array['pension']::text[])::int`,
      motel: sql<number>`count(*) filter (where ${lodgingRegistry.statusCode} = '01' and ${lodgingRegistry.categoryKeys} @> array['motel']::text[])::int`,
      medical: sql<number>`count(*) filter (where ${lodgingRegistry.statusCode} = '01' and ${lodgingRegistry.categoryKeys} @> array['medical_hotel']::text[])::int`,
      listed: sql<number>`count(*) filter (where ${lodgingRegistry.contractedListingId} is not null or ${lodgingRegistry.claimStatus} = 'approved')::int`,
      pending: sql<number>`count(*) filter (where ${lodgingRegistry.claimStatus} = 'pending')::int`,
      lastSync: sql<Date | null>`max(${lodgingRegistry.syncedAt})`,
    })
    .from(lodgingRegistry);

  const [food] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${foodRegistry.statusCode} = '01')::int`,
      korean: sql<number>`count(*) filter (where ${foodRegistry.statusCode} = '01' and ${foodRegistry.categoryKeys} @> array['korean']::text[])::int`,
      bbq: sql<number>`count(*) filter (where ${foodRegistry.statusCode} = '01' and ${foodRegistry.categoryKeys} @> array['bbq']::text[])::int`,
      japanese: sql<number>`count(*) filter (where ${foodRegistry.statusCode} = '01' and ${foodRegistry.categoryKeys} @> array['japanese']::text[])::int`,
      cafe: sql<number>`count(*) filter (where ${foodRegistry.statusCode} = '01' and ${foodRegistry.categoryKeys} @> array['cafe']::text[])::int`,
      listed: sql<number>`count(*) filter (where ${foodRegistry.contractedListingId} is not null or ${foodRegistry.claimStatus} = 'approved')::int`,
      pending: sql<number>`count(*) filter (where ${foodRegistry.claimStatus} = 'pending')::int`,
      lastSync: sql<Date | null>`max(${foodRegistry.syncedAt})`,
    })
    .from(foodRegistry);

  const byType = await db
    .select({ clName: hospitalRegistry.clName, n: sql<number>`count(*)::int` })
    .from(hospitalRegistry)
    .groupBy(hospitalRegistry.clName)
    .orderBy(desc(sql`count(*)`));

  const pending = await db
    .select({
      id: hospitalRegistry.id, name: hospitalRegistry.name, addr: hospitalRegistry.addr, clName: hospitalRegistry.clName,
      claimedAt: hospitalRegistry.claimedAt, orgName: organizations.name, orgId: organizations.id,
    })
    .from(hospitalRegistry)
    .leftJoin(organizations, eq(organizations.id, hospitalRegistry.claimOrgId))
    .where(eq(hospitalRegistry.claimStatus, 'pending'))
    .orderBy(desc(hospitalRegistry.claimedAt))
    .limit(50);

  // 병원 자체 등록 검수 큐 — 콘솔 양식(직접/대행)으로 검수 요청된 건 + 보완 요청 상태
  const submissionsRaw = await db
    .select({
      id: hospitalRegistry.id, name: hospitalRegistry.name, ykiho: hospitalRegistry.ykiho, clName: hospitalRegistry.clName, addr: hospitalRegistry.addr,
      foreignLicensed: hospitalRegistry.foreignLicensed, claimStatus: hospitalRegistry.claimStatus, details: hospitalRegistry.details, orgName: organizations.name,
    })
    .from(hospitalRegistry)
    .leftJoin(organizations, eq(organizations.id, hospitalRegistry.claimOrgId))
    .where(sql`${hospitalRegistry.details}->'submission'->>'status' in ('submitted', 'rejected')`)
    .orderBy(desc(sql`${hospitalRegistry.details}->'submission'->>'submittedAt'`))
    .limit(50);
  const submissions = await Promise.all(submissionsRaw.map(async (s) => {
    const d = s.details as RegistryDetails;
    return {
      ...s, d,
      bizUrl: d.docs?.businessLicense ? await signedDocUrl(d.docs.businessLicense.path) : null,
      foreignUrl: d.docs?.foreignPatientCert ? await signedDocUrl(d.docs.foreignPatientCert.path) : null,
      completeness: profileCompleteness(d),
    };
  }));

  // 계약 병원(hospitals) 중 레지스트리 연결이 없는 것
  const unlinked = await db
    .select({ id: hospitals.id, name: hospitals.name })
    .from(hospitals)
    .where(sql`${hospitals.countryCode} = 'KR' and not exists (select 1 from hospital_registry r where r.contracted_hospital_id = ${hospitals.id})`)
    .orderBy(hospitals.name)
    .limit(200);

  // 뷰티샵: 직접 등록 대기 + 미연결 글로우업 매장 + 검색(수동 연결)
  const shopPending = await db
    .select({ id: beautyRegistry.id, name: beautyRegistry.name, addr: beautyRegistry.addrRoad, bizType: beautyRegistry.bizType, claimedAt: beautyRegistry.claimedAt, orgName: organizations.name })
    .from(beautyRegistry)
    .leftJoin(organizations, eq(organizations.id, beautyRegistry.claimOrgId))
    .where(eq(beautyRegistry.claimStatus, 'pending'))
    .orderBy(desc(beautyRegistry.claimedAt))
    .limit(50);
  const unlinkedShops = await db
    .select({ id: partnerListings.id, title: partnerListings.title, category: partnerListings.category })
    .from(partnerListings)
    .where(sql`${partnerListings.category} in ('hair','makeup','nail','pmu','personal_color') and not exists (select 1 from beauty_registry b where b.contracted_listing_id = ${partnerListings.id})`)
    .orderBy(partnerListings.title)
    .limit(200);
  const sq = (searchParams.sq ?? '').trim();
  const shopFound = sq
    ? await db
      .select({ id: beautyRegistry.id, mgtNo: beautyRegistry.mgtNo, name: beautyRegistry.name, bizType: beautyRegistry.bizType, addr: beautyRegistry.addrRoad, status: beautyRegistry.statusName, contractedListingId: beautyRegistry.contractedListingId })
      .from(beautyRegistry)
      .where(sql`${beautyRegistry.name} ilike ${'%' + sq.replace(/[%_]/g, '') + '%'} and ${beautyRegistry.statusCode} = '01'`)
      .limit(30)
    : [];

  // 숙박: 직접 등록 대기 + 미연결 글로우업 호텔 상품 + 검색(수동 연결)
  const stayPending = await db
    .select({ id: lodgingRegistry.id, name: lodgingRegistry.name, addr: lodgingRegistry.addrRoad, bizType: lodgingRegistry.bizType, claimedAt: lodgingRegistry.claimedAt, orgName: organizations.name })
    .from(lodgingRegistry)
    .leftJoin(organizations, eq(organizations.id, lodgingRegistry.claimOrgId))
    .where(eq(lodgingRegistry.claimStatus, 'pending'))
    .orderBy(desc(lodgingRegistry.claimedAt))
    .limit(50);
  const unlinkedStays = await db
    .select({ id: partnerListings.id, title: partnerListings.title, category: partnerListings.category })
    .from(partnerListings)
    .where(sql`${partnerListings.category} = 'hotel' and not exists (select 1 from lodging_registry b where b.contracted_listing_id = ${partnerListings.id})`)
    .orderBy(partnerListings.title)
    .limit(200);
  const lq = (searchParams.lq ?? '').trim();
  const stayFound = lq
    ? await db
      .select({ id: lodgingRegistry.id, mgtNo: lodgingRegistry.mgtNo, name: lodgingRegistry.name, bizType: lodgingRegistry.bizType, addr: lodgingRegistry.addrRoad, status: lodgingRegistry.statusName, contractedListingId: lodgingRegistry.contractedListingId })
      .from(lodgingRegistry)
      .where(sql`${lodgingRegistry.name} ilike ${'%' + lq.replace(/[%_]/g, '') + '%'} and ${lodgingRegistry.statusCode} = '01'`)
      .limit(30)
    : [];

  // 맛집: 직접 등록 대기 + 미연결 글로우업 찐맛집 + 검색(수동 연결)
  const eatPending = await db
    .select({ id: foodRegistry.id, name: foodRegistry.name, addr: foodRegistry.addrRoad, bizType: foodRegistry.bizType, claimedAt: foodRegistry.claimedAt, orgName: organizations.name })
    .from(foodRegistry)
    .leftJoin(organizations, eq(organizations.id, foodRegistry.claimOrgId))
    .where(eq(foodRegistry.claimStatus, 'pending'))
    .orderBy(desc(foodRegistry.claimedAt))
    .limit(50);
  const unlinkedEats = await db
    .select({ id: partnerListings.id, title: partnerListings.title, category: partnerListings.category })
    .from(partnerListings)
    .where(sql`${partnerListings.category} in ('food','restaurant') and not exists (select 1 from food_registry b where b.contracted_listing_id = ${partnerListings.id})`)
    .orderBy(partnerListings.title)
    .limit(200);
  const fq = (searchParams.fq ?? '').trim();
  const eatFound = fq
    ? await db
      .select({ id: foodRegistry.id, mgtNo: foodRegistry.mgtNo, name: foodRegistry.name, bizType: foodRegistry.bizType, addr: foodRegistry.addrRoad, status: foodRegistry.statusName, contractedListingId: foodRegistry.contractedListingId })
      .from(foodRegistry)
      .where(sql`${foodRegistry.name} ilike ${'%' + fq.replace(/[%_]/g, '') + '%'} and ${foodRegistry.statusCode} = '01'`)
      .limit(30)
    : [];

  // 검색(수동 연결용)
  const q = (searchParams.q ?? '').trim();
  const found = q
    ? await db
      .select({ id: hospitalRegistry.id, ykiho: hospitalRegistry.ykiho, name: hospitalRegistry.name, clName: hospitalRegistry.clName, addr: hospitalRegistry.addr, contractedHospitalId: hospitalRegistry.contractedHospitalId, foreign: hospitalRegistry.foreignLicensed })
      .from(hospitalRegistry)
      .where(sql`${hospitalRegistry.name} ilike ${'%' + q.replace(/[%_]/g, '') + '%'}`)
      .limit(30)
    : [];

  const fmtDate = (d: Date | null | undefined): string => (d ? new Date(d).toLocaleString('ko-KR') : '—');

  return (
    <div style={{ padding: '28px 32px 100px', maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link href="/master" style={{ fontSize: 12, color: '#6a6a6a' }}>← 마스터 홈</Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 0' }}>전국 병원 레지스트리</h1>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '4px 0 0' }}>
            심평원 전국 의료기관 → 공개 <Link href="/kr/clinics/all" style={{ color: '#1d4ed8' }}>병원 찾기</Link>. 계약 병원은 컬러, 나머지는 흑백, 외국인환자 유치기관은 배지.
          </p>
        </div>
      </div>

      {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{searchParams.error}</p> : null}
      {searchParams.ok ? <p style={{ color: '#047857', fontSize: 13, margin: 0 }}>{searchParams.ok}</p> : null}
      {searchParams.misses ? (
        <details style={{ ...card, borderColor: '#fde68a', background: '#fffbeb' }}>
          <summary style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>미매칭 목록 (주소를 함께 적어 다시 반영하거나 아래 검색으로 수동 연결)</summary>
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{searchParams.misses}</pre>
        </details>
      ) : null}

      {/* 현황 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[
          ['전체 기관', stats?.total ?? 0], ['병원급 이상', stats?.hospitalGrade ?? 0],
          ['계약 연결', stats?.contracted ?? 0], ['직접 등록 승인', stats?.claimed ?? 0],
          ['외국인 진료 가능', stats?.foreign ?? 0], ['상세 수집', stats?.withDetails ?? 0],
        ].map(([l, v]) => (
          <div key={String(l)} style={card}>
            <div style={{ fontSize: 12, color: '#6a6a6a' }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{Number(v).toLocaleString('ko-KR')}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: '#9c9c9c', margin: '-10px 0 0' }}>마지막 동기화 {fmtDate(stats?.lastSync)}
        {byType.length ? ` · ${byType.slice(0, 8).map((t) => `${t.clName ?? '기타'} ${t.n.toLocaleString('ko-KR')}`).join(' · ')}` : ''}</p>

      <SyncRunner hasKey={Boolean(process.env.HIRA_SERVICE_KEY)} />

      {/* 미용업(뷰티샵) 레지스트리 현황 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>미용업(뷰티샵) 레지스트리 — 행안부 생활_미용업</h2>
          <Link href="/kr/shops/all" style={{ fontSize: 12, color: '#1d4ed8' }}>공개 뷰티샵 찾기 →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 12 }}>
          {[
            ['전체(폐업 포함)', beauty?.total ?? 0], ['영업 중', beauty?.active ?? 0], ['헤어', beauty?.hair ?? 0], ['네일', beauty?.nail ?? 0],
            ['메이크업', beauty?.makeup ?? 0], ['피부관리', beauty?.skin ?? 0], ['반영구(키워드)', beauty?.pmu ?? 0], ['퍼스널컬러(키워드)', beauty?.pcolor ?? 0],
            ['글로우업 등록', beauty?.listed ?? 0], ['직접 등록 대기', beauty?.pending ?? 0],
          ].map(([l, v]) => (
            <div key={String(l)} style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#6a6a6a' }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{Number(v).toLocaleString('ko-KR')}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#9c9c9c', margin: '8px 0 0' }}>마지막 동기화 {fmtDate(beauty?.lastSync)} · 전체 적재는 로컬 스크립트, 이후 매일 크론이 최근 변경분만 갱신합니다. 반영구·퍼스널컬러는 법정 업태가 없어 상호 키워드로 태깅.</p>
      </div>

      {/* 숙박업 레지스트리 현황 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>숙박업 레지스트리 — 행안부 문화_숙박업</h2>
          <Link href="/kr/stays/all" style={{ fontSize: 12, color: '#1d4ed8' }}>공개 전국 숙박 찾기 →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 12 }}>
          {[
            ['전체(폐업 포함)', lodging?.total ?? 0], ['영업 중', lodging?.active ?? 0], ['호텔', lodging?.hotel ?? 0], ['게스트하우스·한옥', lodging?.guesthouse ?? 0],
            ['생활숙박·펜션', lodging?.pension ?? 0], ['모텔·여관', lodging?.motel ?? 0], ['의료관광호텔', lodging?.medical ?? 0],
            ['글로우업 등록', lodging?.listed ?? 0], ['직접 등록 대기', lodging?.pending ?? 0],
          ].map(([l, v]) => (
            <div key={String(l)} style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#6a6a6a' }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{Number(v).toLocaleString('ko-KR')}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#9c9c9c', margin: '8px 0 0' }}>마지막 동기화 {fmtDate(lodging?.lastSync)} · 전체 58,713건은 로컬 스크립트로 적재, 이후 매일 크론이 최근 변경분만 갱신합니다. 호텔·게스트하우스·펜션·모텔 구분은 업태 + 상호 키워드.</p>
      </div>

      {/* 일반음식점(맛집) 레지스트리 현황 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>맛집(일반음식점) 레지스트리 — 행안부 식품_일반음식점</h2>
          <Link href="/kr/eats/all" style={{ fontSize: 12, color: '#1d4ed8' }}>공개 전국 맛집 찾기 →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 12 }}>
          {[
            ['전체(폐업 포함)', food?.total ?? 0], ['영업 중', food?.active ?? 0], ['한식', food?.korean ?? 0], ['고기·구이', food?.bbq ?? 0],
            ['일식·회', food?.japanese ?? 0], ['카페·디저트', food?.cafe ?? 0], ['글로우업 등록', food?.listed ?? 0], ['직접 등록 대기', food?.pending ?? 0],
          ].map(([l, v]) => (
            <div key={String(l)} style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#6a6a6a' }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{Number(v).toLocaleString('ko-KR')}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#9c9c9c', margin: '8px 0 0' }}>마지막 동기화 {fmtDate(food?.lastSync)} · 전국 대용량 데이터라 로컬 스크립트로 순차 적재, 이후 매일 크론이 최근 변경분만 갱신합니다. 한식·고기·카페 구분은 업태 + 상호 키워드.</p>
      </div>



      {/* 외국인환자 유치기관 명단 */}
      <form action={markForeignAction} style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>외국인환자 유치 의료기관 명단 반영</h2>
        <p style={{ fontSize: 12, color: '#6a6a6a', margin: '0 0 10px', lineHeight: 1.6 }}>
          한 줄에 한 기관 — <code>기관명</code> 또는 <code>기관명[탭/쉼표]주소</code>. 엑셀에서 두 열을 복사해 붙여넣으면 됩니다.
          동명 병원이 있으면 주소로 구분합니다. 암호화 요양기호를 알면 그것만 붙여도 됩니다.
        </p>
        <textarea name="list" rows={6} placeholder={'서울아산병원\t서울 송파구 올림픽로43길 88\n연세대학교의과대학 세브란스병원\t서울 서대문구 연세로 50'} style={{ ...input, fontFamily: 'monospace', fontSize: 12 }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'end', marginTop: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}><span style={label}>출처 표기</span><input name="source" defaultValue="보건복지부 외국인환자 유치 의료기관 등록 현황" style={input} /></div>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="replace" /> 기존 표기를 모두 지우고 이 명단으로 교체</label>
          <button type="submit" style={btn('#1d4ed8')}>명단 반영</button>
        </div>
      </form>

      {/* 계약 병원 연결 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>계약 병원 연결</h2>
            <p style={{ fontSize: 12, color: '#6a6a6a', margin: '4px 0 0' }}>플랫폼 등록 병원(hospitals) {unlinked.length}곳이 아직 레지스트리와 연결되지 않았습니다. 연결되면 공개 목록에서 컬러 카드로 보입니다.</p>
          </div>
          <form action={autoMatchContractsAction}><button type="submit" style={btn('#222')}>이름으로 자동 연결</button></form>
        </div>
        {unlinked.length > 0 ? (
          <p style={{ fontSize: 12, color: '#6a6a6a', margin: '10px 0 0', lineHeight: 1.7 }}>
            미연결: {unlinked.slice(0, 40).map((h) => h.name).join(' · ')}{unlinked.length > 40 ? ` 외 ${unlinked.length - 40}곳` : ''}
          </p>
        ) : null}
        <form style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'end' }}>
          <div style={{ flex: 1 }}><span style={label}>레지스트리에서 병원 검색 (수동 연결·확인)</span><input name="q" defaultValue={q} placeholder="병원명" style={input} /></div>
          <button type="submit" style={btn('#6a6a6a')}>검색</button>
        </form>
        {found.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#fafafa', textAlign: 'left' }}>
                {['기관명', '종별', '주소', '외국인', '계약 연결 (hospitals.id)', ''].map((h) => <th key={h} style={{ padding: '8px 10px', color: '#6a6a6a' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {found.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}><Link href={`/kr/clinics/r/${encodeURIComponent(r.ykiho)}`} style={{ color: '#222' }}>{r.name}</Link></td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{r.clName ?? '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#6a6a6a' }}>{r.addr ?? '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{r.foreign ? '✓' : ''}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <form action={setContractAction} style={{ display: 'flex', gap: 6 }}>
                        <input type="hidden" name="registryId" value={r.id} />
                        <select name="hospitalId" defaultValue={r.contractedHospitalId ?? ''} style={{ ...input, width: 260, padding: '4px 8px' }}>
                          <option value="">— 연결 없음 (흑백) —</option>
                          {(r.contractedHospitalId ? [{ id: r.contractedHospitalId, name: '(현재 연결됨)' }] : []).concat(unlinked).map((h) => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                        <button type="submit" style={{ ...btn('#1d4ed8'), padding: '4px 10px', fontSize: 12 }}>저장</button>
                      </form>
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 10, color: '#9c9c9c' }}>{r.ykiho.slice(0, 10)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : q ? <p style={{ fontSize: 12, color: '#6a6a6a', marginTop: 8 }}>검색 결과 없음</p> : null}
      </div>

      {/* 뷰티샵: 글로우업 매장 연결 + 직접 등록 승인 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>뷰티샵 — 글로우업 매장 연결</h2>
            <p style={{ fontSize: 12, color: '#6a6a6a', margin: '4px 0 0' }}>글로우업 부가상품(헤어·메이크업·네일·반영구·퍼스널컬러) {unlinkedShops.length}곳이 아직 미용업 레지스트리와 연결되지 않았습니다. 연결되면 공개 뷰티샵 찾기와 지도에서 컬러로 보입니다.</p>
          </div>
          <form action={autoMatchShopsAction}><button type="submit" style={btn('#222')}>상호로 자동 연결</button></form>
        </div>
        {unlinkedShops.length > 0 ? <p style={{ fontSize: 12, color: '#6a6a6a', margin: '10px 0 0', lineHeight: 1.7 }}>미연결: {unlinkedShops.slice(0, 30).map((l) => l.title).join(' · ')}{unlinkedShops.length > 30 ? ` 외 ${unlinkedShops.length - 30}곳` : ''}</p> : null}
        <form style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'end' }}>
          <div style={{ flex: 1 }}><span style={label}>미용업 레지스트리에서 매장 검색 (수동 연결)</span><input name="sq" defaultValue={sq} placeholder="상호" style={input} /></div>
          <button type="submit" style={btn('#6a6a6a')}>검색</button>
        </form>
        {shopFound.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {shopFound.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}><Link href={`/kr/shops/r/${encodeURIComponent(r.mgtNo)}`} style={{ color: '#222' }}>{r.name}</Link><div style={{ fontSize: 11, color: '#9c9c9c' }}>{r.bizType} · {r.addr}</div></td>
                    <td style={{ padding: '8px 10px' }}>
                      <form action={setShopContractAction} style={{ display: 'flex', gap: 6 }}>
                        <input type="hidden" name="registryId" value={r.id} />
                        <select name="listingId" defaultValue={r.contractedListingId ?? ''} style={{ ...input, width: 260, padding: '4px 8px' }}>
                          <option value="">— 연결 없음 (흑백) —</option>
                          {(r.contractedListingId ? [{ id: r.contractedListingId, title: '(현재 연결됨)', category: '' }] : []).concat(unlinkedShops).map((l) => <option key={l.id} value={l.id}>{l.title}{l.category ? ` · ${l.category}` : ''}</option>)}
                        </select>
                        <button type="submit" style={{ ...btn('#1d4ed8'), padding: '4px 10px', fontSize: 12 }}>저장</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : sq ? <p style={{ fontSize: 12, color: '#6a6a6a', marginTop: 8 }}>검색 결과 없음</p> : null}

        <h3 style={{ fontSize: 14, fontWeight: 700, margin: '18px 0 6px' }}>매장 직접 등록 요청 ({shopPending.length})</h3>
        {shopPending.length === 0 ? <p style={{ fontSize: 13, color: '#9c9c9c', margin: 0 }}>대기 중인 요청이 없습니다.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {shopPending.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 10px' }}><b>{p.name}</b><div style={{ fontSize: 11, color: '#6a6a6a' }}>{p.bizType} · {p.addr}</div></td>
                  <td style={{ padding: '8px 10px', fontSize: 12 }}>요청 조직: <b>{p.orgName ?? '—'}</b><div style={{ fontSize: 11, color: '#9c9c9c' }}>{fmtDate(p.claimedAt)}</div></td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <form action={decideShopClaimAction} style={{ display: 'inline' }}><input type="hidden" name="registryId" value={p.id} /><input type="hidden" name="decision" value="approved" /><button type="submit" style={{ ...btn('#047857'), padding: '5px 12px', fontSize: 12 }}>승인</button></form>
                    <form action={decideShopClaimAction} style={{ display: 'inline', marginLeft: 6 }}><input type="hidden" name="registryId" value={p.id} /><input type="hidden" name="decision" value="rejected" /><button type="submit" style={{ ...btn('#6a6a6a'), padding: '5px 12px', fontSize: 12 }}>반려</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 숙박: 글로우업 호텔 상품 연결 + 직접 등록 승인 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>숙박 — 글로우업 호텔 상품 연결</h2>
            <p style={{ fontSize: 12, color: '#6a6a6a', margin: '4px 0 0' }}>글로우업 호텔 상품 {unlinkedStays.length}곳이 아직 숙박업 레지스트리와 연결되지 않았습니다. 연결되면 공개 전국 숙박 찾기와 지도에서 컬러로 보입니다.</p>
          </div>
          <form action={autoMatchStaysAction}><button type="submit" style={btn('#222')}>상호로 자동 연결</button></form>
        </div>
        {unlinkedStays.length > 0 ? <p style={{ fontSize: 12, color: '#6a6a6a', margin: '10px 0 0', lineHeight: 1.7 }}>미연결: {unlinkedStays.slice(0, 30).map((l) => l.title).join(' · ')}{unlinkedStays.length > 30 ? ` 외 ${unlinkedStays.length - 30}곳` : ''}</p> : null}
        <form style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'end' }}>
          <div style={{ flex: 1 }}><span style={label}>숙박업 레지스트리에서 숙소 검색 (수동 연결)</span><input name="lq" defaultValue={lq} placeholder="상호" style={input} /></div>
          <button type="submit" style={btn('#6a6a6a')}>검색</button>
        </form>
        {stayFound.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {stayFound.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}><Link href={`/kr/stays/r/${encodeURIComponent(r.mgtNo)}`} style={{ color: '#222' }}>{r.name}</Link><div style={{ fontSize: 11, color: '#9c9c9c' }}>{r.bizType} · {r.addr}</div></td>
                    <td style={{ padding: '8px 10px' }}>
                      <form action={setStayContractAction} style={{ display: 'flex', gap: 6 }}>
                        <input type="hidden" name="registryId" value={r.id} />
                        <select name="listingId" defaultValue={r.contractedListingId ?? ''} style={{ ...input, width: 260, padding: '4px 8px' }}>
                          <option value="">— 연결 없음 (흑백) —</option>
                          {(r.contractedListingId ? [{ id: r.contractedListingId, title: '(현재 연결됨)', category: '' }] : []).concat(unlinkedStays).map((l) => <option key={l.id} value={l.id}>{l.title}{l.category ? ` · ${l.category}` : ''}</option>)}
                        </select>
                        <button type="submit" style={{ ...btn('#1d4ed8'), padding: '4px 10px', fontSize: 12 }}>저장</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : lq ? <p style={{ fontSize: 12, color: '#6a6a6a', marginTop: 8 }}>검색 결과 없음</p> : null}

        <h3 style={{ fontSize: 14, fontWeight: 700, margin: '18px 0 6px' }}>숙소 직접 등록 요청 ({stayPending.length})</h3>
        {stayPending.length === 0 ? <p style={{ fontSize: 13, color: '#9c9c9c', margin: 0 }}>대기 중인 요청이 없습니다.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {stayPending.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 10px' }}><b>{p.name}</b><div style={{ fontSize: 11, color: '#6a6a6a' }}>{p.bizType} · {p.addr}</div></td>
                  <td style={{ padding: '8px 10px', fontSize: 12 }}>요청 조직: <b>{p.orgName ?? '—'}</b><div style={{ fontSize: 11, color: '#9c9c9c' }}>{fmtDate(p.claimedAt)}</div></td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <form action={decideStayClaimAction} style={{ display: 'inline' }}><input type="hidden" name="registryId" value={p.id} /><input type="hidden" name="decision" value="approved" /><button type="submit" style={{ ...btn('#047857'), padding: '5px 12px', fontSize: 12 }}>승인</button></form>
                    <form action={decideStayClaimAction} style={{ display: 'inline', marginLeft: 6 }}><input type="hidden" name="registryId" value={p.id} /><input type="hidden" name="decision" value="rejected" /><button type="submit" style={{ ...btn('#6a6a6a'), padding: '5px 12px', fontSize: 12 }}>반려</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 맛집: 글로우업 찐맛집 연결 + 직접 등록 승인 */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>맛집 — 글로우업 찐맛집 연결</h2>
            <p style={{ fontSize: 12, color: '#6a6a6a', margin: '4px 0 0' }}>글로우업 찐맛집 {unlinkedEats.length}곳이 아직 일반음식점 레지스트리와 연결되지 않았습니다. 연결되면 공개 전국 맛집 찾기와 지도에서 컬러로 보입니다.</p>
          </div>
          <form action={autoMatchEatsAction}><button type="submit" style={btn('#222')}>상호로 자동 연결</button></form>
        </div>
        {unlinkedEats.length > 0 ? <p style={{ fontSize: 12, color: '#6a6a6a', margin: '10px 0 0', lineHeight: 1.7 }}>미연결: {unlinkedEats.slice(0, 30).map((l) => l.title).join(' · ')}{unlinkedEats.length > 30 ? ` 외 ${unlinkedEats.length - 30}곳` : ''}</p> : null}
        <form style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'end' }}>
          <div style={{ flex: 1 }}><span style={label}>일반음식점 레지스트리에서 가게 검색 (수동 연결)</span><input name="fq" defaultValue={fq} placeholder="상호" style={input} /></div>
          <button type="submit" style={btn('#6a6a6a')}>검색</button>
        </form>
        {eatFound.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {eatFound.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}><Link href={`/kr/eats/r/${encodeURIComponent(r.mgtNo)}`} style={{ color: '#222' }}>{r.name}</Link><div style={{ fontSize: 11, color: '#9c9c9c' }}>{r.bizType} · {r.addr}</div></td>
                    <td style={{ padding: '8px 10px' }}>
                      <form action={setEatContractAction} style={{ display: 'flex', gap: 6 }}>
                        <input type="hidden" name="registryId" value={r.id} />
                        <select name="listingId" defaultValue={r.contractedListingId ?? ''} style={{ ...input, width: 260, padding: '4px 8px' }}>
                          <option value="">— 연결 없음 (흑백) —</option>
                          {(r.contractedListingId ? [{ id: r.contractedListingId, title: '(현재 연결됨)', category: '' }] : []).concat(unlinkedEats).map((l) => <option key={l.id} value={l.id}>{l.title}{l.category ? ` · ${l.category}` : ''}</option>)}
                        </select>
                        <button type="submit" style={{ ...btn('#1d4ed8'), padding: '4px 10px', fontSize: 12 }}>저장</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : fq ? <p style={{ fontSize: 12, color: '#6a6a6a', marginTop: 8 }}>검색 결과 없음</p> : null}

        <h3 style={{ fontSize: 14, fontWeight: 700, margin: '18px 0 6px' }}>맛집 직접 등록 요청 ({eatPending.length})</h3>
        {eatPending.length === 0 ? <p style={{ fontSize: 13, color: '#9c9c9c', margin: 0 }}>대기 중인 요청이 없습니다.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {eatPending.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 10px' }}><b>{p.name}</b><div style={{ fontSize: 11, color: '#6a6a6a' }}>{p.bizType} · {p.addr}</div></td>
                  <td style={{ padding: '8px 10px', fontSize: 12 }}>요청 조직: <b>{p.orgName ?? '—'}</b><div style={{ fontSize: 11, color: '#9c9c9c' }}>{fmtDate(p.claimedAt)}</div></td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <form action={decideEatClaimAction} style={{ display: 'inline' }}><input type="hidden" name="registryId" value={p.id} /><input type="hidden" name="decision" value="approved" /><button type="submit" style={{ ...btn('#047857'), padding: '5px 12px', fontSize: 12 }}>승인</button></form>
                    <form action={decideEatClaimAction} style={{ display: 'inline', marginLeft: 6 }}><input type="hidden" name="registryId" value={p.id} /><input type="hidden" name="decision" value="rejected" /><button type="submit" style={{ ...btn('#6a6a6a'), padding: '5px 12px', fontSize: 12 }}>반려</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 병원 자체 등록 검수 (콘솔 양식 · 대행) */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>병원 등록 검수 ({submissions.filter((s) => s.d.submission?.status === 'submitted').length})</h2>
        <p style={{ fontSize: 12, color: '#6a6a6a', margin: '0 0 10px' }}>
          의료기관 콘솔 &quot;병원 공개 정보&quot; 에서 검수 요청한 건입니다. 서류(사업자등록증·유치기관 등록증)와 프로필을 확인해 1~2 영업일 내 승인하면 클레임 승인과 함께 공개 상세에 그대로 게시됩니다.
          대행(₩{REGISTRY_AGENCY_FEE_WON.toLocaleString('ko-KR')}) 결제 건은 자료를 바탕으로 운영팀이 콘솔 양식을 대신 채운 뒤 승인합니다.
        </p>
        {submissions.length === 0 ? <p style={{ fontSize: 13, color: '#9c9c9c', margin: 0 }}>검수 대기 건이 없습니다.</p> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {submissions.map((s) => {
              const sub = s.d.submission; const p = s.d.profile ?? {}; const ag = s.d.agency;
              return (
                <div key={s.id} style={{ border: `1px solid ${sub?.status === 'rejected' ? '#fecdd3' : '#e5e7eb'}`, borderRadius: 12, padding: '12px 14px', background: sub?.status === 'rejected' ? '#fff5f7' : '#fafafa' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <b style={{ fontSize: 14 }}>{s.name}</b>
                    <span style={{ fontSize: 11, color: '#6a6a6a' }}>{s.clName} · {s.addr}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sub?.mode === 'agency' ? '#c2143c' : '#1d4ed8', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 999, padding: '2px 8px' }}>
                      {sub?.mode === 'agency' ? `대행 · ${ag?.paidAt ? '결제 완료' : '미결제'}${ag?.invoiceNo ? ` · ${ag.invoiceNo}` : ''}` : '직접 등록'}
                    </span>
                    <span style={{ fontSize: 11, color: sub?.status === 'rejected' ? '#c2143c' : '#b45309', fontWeight: 700 }}>{sub?.status === 'rejected' ? '보완 요청 중' : '검수 대기'}</span>
                    <span style={{ fontSize: 11, color: '#9c9c9c' }}>{sub?.submittedAt ? new Date(sub.submittedAt).toLocaleString('ko-KR') : ''} · {sub?.contactEmail ?? s.orgName ?? ''}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8, fontSize: 12 }}>
                    <span>소개 {(p.intro ?? '').length}자</span>
                    <span>대표 사진 {p.cover ? '있음' : <b style={{ color: '#c2143c' }}>없음</b>}</span>
                    <span>추가 사진 {(p.photos ?? []).length}장</span>
                    <span>대표 시술 {(p.signatureProcedures ?? []).length} · 의료진 {(p.doctors ?? []).length}</span>
                    <span>사업자등록증 {s.bizUrl ? <a href={s.bizUrl} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 700 }}>열기 (10분)</a> : <b style={{ color: '#c2143c' }}>없음</b>}</span>
                    <span>유치기관 등록증 {s.foreignUrl ? <a href={s.foreignUrl} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 700 }}>열기</a> : (s.foreignLicensed ? <b style={{ color: '#b45309' }}>미첨부</b> : '해당 없음')}</span>
                    <Link href={`/kr/clinics/r/${encodeURIComponent(s.ykiho)}`} target="_blank" style={{ color: '#222', textDecoration: 'underline' }}>공개 페이지</Link>
                  </div>
                  {p.tagline || p.intro ? <p style={{ fontSize: 12, color: '#3f3f3f', margin: '6px 0 0', lineHeight: 1.5 }}>{p.tagline ? <b>{p.tagline} — </b> : null}{(p.intro ?? '').slice(0, 160)}{(p.intro ?? '').length > 160 ? '…' : ''}</p> : null}
                  {p.cover || (p.photos ?? []).length ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto' }}>
                      {[p.cover, ...(p.photos ?? [])].filter(Boolean).slice(0, 8).map((u) => <div key={u} style={{ width: 96, height: 64, flexShrink: 0, borderRadius: 8, background: `#eee url(${u}) center / cover` }} />)}
                    </div>
                  ) : null}
                  {!s.completeness.ok ? <p style={{ fontSize: 11, color: '#c2143c', margin: '6px 0 0' }}>미비: {s.completeness.missing.join(', ')}</p> : null}
                  {sub?.status === 'rejected' && sub.reviewNote ? <p style={{ fontSize: 11, color: '#c2143c', margin: '6px 0 0' }}>보완 요청 사유: {sub.reviewNote}</p> : null}
                  <form action={reviewSubmissionAction} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 8 }}>
                    <input type="hidden" name="registryId" value={s.id} />
                    <input name="note" placeholder="메모 / 반려 사유 (병원 이메일로 전달)" style={{ flex: '1 1 260px', border: '1px solid #dddddd', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit' }} />
                    <button type="submit" name="decision" value="approved" style={{ ...btn('#047857'), padding: '6px 14px', fontSize: 12 }}>승인 · 게시</button>
                    <button type="submit" name="decision" value="rejected" style={{ ...btn('#c2143c'), padding: '6px 14px', fontSize: 12 }}>보완 요청</button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 클레임 승인 */}
      <div style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>병원 직접 등록 요청 ({stats?.pendingClaims ?? 0})</h2>
        <p style={{ fontSize: 12, color: '#6a6a6a', margin: '0 0 10px' }}>비계약 병원 관계자가 파트너센터에 가입하며 『우리 병원』으로 지정한 건입니다. 승인하면 공개 목록에서 컬러 카드가 되고 병원이 소개·사진·언어를 직접 입력할 수 있습니다.</p>
        {pending.length === 0 ? <p style={{ fontSize: 13, color: '#9c9c9c', margin: 0 }}>대기 중인 요청이 없습니다.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {pending.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 10px' }}><b>{p.name}</b><div style={{ fontSize: 11, color: '#6a6a6a' }}>{p.clName} · {p.addr}</div></td>
                  <td style={{ padding: '8px 10px', fontSize: 12 }}>요청 조직: <b>{p.orgName ?? '—'}</b><div style={{ fontSize: 11, color: '#9c9c9c' }}>{fmtDate(p.claimedAt)}</div></td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <form action={decideClaimAction} style={{ display: 'inline' }}>
                      <input type="hidden" name="registryId" value={p.id} /><input type="hidden" name="decision" value="approved" />
                      <button type="submit" style={{ ...btn('#047857'), padding: '5px 12px', fontSize: 12 }}>승인</button>
                    </form>
                    <form action={decideClaimAction} style={{ display: 'inline', marginLeft: 6 }}>
                      <input type="hidden" name="registryId" value={p.id} /><input type="hidden" name="decision" value="rejected" />
                      <button type="submit" style={{ ...btn('#6a6a6a'), padding: '5px 12px', fontSize: 12 }}>반려</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
