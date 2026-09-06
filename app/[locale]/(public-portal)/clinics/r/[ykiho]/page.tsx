import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { db } from '@/lib/db/client';
import { hospitalRegistry, type RegistryProfile } from '@/drizzle/schema/hospital-registry';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { hospitals } from '@/drizzle/schema/hospitals';
import { ensureDetails } from '@/lib/hospital-registry/hira';
import { Badge, clTone, hoursRows, isListed, type RegistryCardRow } from '../../_registry/shared';
import OpenStatusBadge from '@/components/shared/open-status-badge';
import { loadHolidayYmds } from '@/lib/hours/holidays';

export const dynamic = 'force-dynamic';

const CSS =
  '.m-rd-body { display: grid; grid-template-columns: 1fr 340px; gap: 28px; }'
  + '.m-rd-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }'
  + '.m-rd-bottom { display: none; }'
  + '@media (max-width: 1024px) { .m-rd-body { grid-template-columns: 1fr; } .m-rd-side { position: static !important; } }'
  + '@media (max-width: 768px) { .m-rd-page { padding: 16px 16px 110px !important; } .m-rd-title { font-size: 21px !important; }'
  + '  .m-rd-bottom { display: flex; position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-top: 1px solid #ebebeb; padding: 10px 14px; gap: 8px; z-index: 40; } }';

async function load(ykiho: string) {
  const [row] = await db
    .select({
      id: hospitalRegistry.id, ykiho: hospitalRegistry.ykiho, name: hospitalRegistry.name, clCd: hospitalRegistry.clCd, clName: hospitalRegistry.clName,
      sidoName: hospitalRegistry.sidoName, sgguName: hospitalRegistry.sgguName, emdongName: hospitalRegistry.emdongName, postNo: hospitalRegistry.postNo,
      addr: hospitalRegistry.addr, tel: hospitalRegistry.tel, url: hospitalRegistry.url, estbDate: hospitalRegistry.estbDate,
      drTotal: hospitalRegistry.drTotal, drSpecialist: hospitalRegistry.drSpecialist, drGeneral: hospitalRegistry.drGeneral, drDental: hospitalRegistry.drDental, drOriental: hospitalRegistry.drOriental,
      lat: hospitalRegistry.lat, lng: hospitalRegistry.lng,
      foreignLicensed: hospitalRegistry.foreignLicensed, foreignLicensedSource: hospitalRegistry.foreignLicensedSource,
      contractedHospitalId: hospitalRegistry.contractedHospitalId, claimStatus: hospitalRegistry.claimStatus,
      details: hospitalRegistry.details, detailsSyncedAt: hospitalRegistry.detailsSyncedAt, syncedAt: hospitalRegistry.syncedAt,
      partnerSlug: hospitals.slug, partnerCover: hospitals.coverImageUrl,
    })
    .from(hospitalRegistry)
    .leftJoin(hospitals, eq(hospitals.id, hospitalRegistry.contractedHospitalId))
    .where(eq(hospitalRegistry.ykiho, ykiho))
    .limit(1);
  return row ?? null;
}

export async function generateMetadata({ params }: { params: { locale: string; ykiho: string } }): Promise<Metadata> {
  if (!isPublicLocale(params.locale)) return {};
  const row = await load(decodeURIComponent(params.ykiho)).catch(() => null);
  if (!row) return {};
  const dict = await getDictionary(params.locale);
  const t = dict.clinicsPage.registry;
  const desc = [row.clName, row.addr, row.foreignLicensed ? t.foreignBadge : null].filter(Boolean).join(' · ');
  return { title: `${row.name} · GlowUpTour`, description: desc, robots: isListed(row) ? undefined : { index: true, follow: true } };
}

/**
 * 공공정보 병원 상세 (모두닥 구성 참고): 상단 헤더 → 액션 버튼(전화·지도·문의)
 * → 진료과목 → 진료시간표 → 위치·교통 → 소개(직접 등록 병원) → 직접 등록 CTA.
 * 상세(진료과목·시간·교통)는 열람 시 TTL 이 지났으면 심평원 API 로 즉시 갱신.
 */
function ProfileBlocks({ p, cp, section, h2, languages, langLabel }: {
  p: RegistryProfile; cp: Dictionary['clinicsPage']; section: React.CSSProperties; h2: React.CSSProperties; languages: string[]; langLabel: string;
}): JSX.Element {
  const chip: React.CSSProperties = { display: 'inline-block', border: '1px solid #ffd7de', background: '#fff5f7', color: '#c81e42', borderRadius: 9999, padding: '6px 13px', fontSize: 13, fontWeight: 600 };
  const rows: Array<[string, React.ReactNode]> = [];
  if (p.hoursText) rows.push([cp.detailHours, p.hoursText]);
  if (p.station) rows.push([cp.detailStation, p.station]);
  if (p.website) rows.push([cp.detailWebsite, <a key="w" href={p.website.startsWith('http') ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#ff385c', fontWeight: 600, textDecoration: 'none' }}>{p.website.replace(/^https?:\/\//, '')}</a>]);
  return (
    <>
      {p.signatureProcedures?.length ? (
        <div style={section}><h2 style={h2}>{cp.detailProcedures}</h2><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{p.signatureProcedures.map((s) => <span key={s} style={chip}>{s}</span>)}</div></div>
      ) : null}
      {p.departments?.length ? (
        <div style={section}><h2 style={h2}>{cp.detailDepartments}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {p.departments.map((d) => (
              <div key={d.title} style={{ border: '1px solid #ebebeb', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{d.title}</div>
                {d.items.length ? <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 4, lineHeight: 1.6 }}>{d.items.join(' · ')}</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {p.doctors?.length ? (
        <div style={section}><h2 style={h2}>{cp.detailDoctors}</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {p.doctors.map((d) => <li key={`${d.name}-${d.role}`} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 14 }}><span style={{ fontWeight: 700 }}>{d.name}</span><span style={{ color: '#6a6a6a' }}>{d.role}</span></li>)}
          </ul>
        </div>
      ) : null}
      {p.facilities?.length ? (
        <div style={section}><h2 style={h2}>{cp.detailFacilities}</h2><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{p.facilities.map((f) => <span key={f} style={{ fontSize: 13, border: '1px solid #e5e5e5', borderRadius: 999, padding: '5px 11px', background: '#fafafa' }}>{f}</span>)}</div></div>
      ) : null}
      {languages.length || p.foreignNote ? (
        <div style={section}><h2 style={h2}>{cp.detailForeign}</h2>
          {languages.length ? <p style={{ fontSize: 13, color: '#3f3f3f', margin: 0 }}><b>{langLabel}</b> · {languages.join(', ')}</p> : null}
          {p.foreignNote ? <p style={{ fontSize: 14, color: '#3f3f3f', margin: languages.length ? '8px 0 0' : 0, lineHeight: 1.6 }}>{p.foreignNote}</p> : null}
        </div>
      ) : null}
      {p.trust?.length ? (
        <div style={section}><ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: '#3f3f3f', lineHeight: 1.8 }}>{p.trust.map((x) => <li key={x}>{x}</li>)}</ul></div>
      ) : null}
      {rows.length ? (
        <div style={section}><h2 style={h2}>{cp.detailInfo}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
            {rows.map(([k, v]) => <div key={k} style={{ display: 'flex', gap: 12 }}><span style={{ width: 92, flexShrink: 0, color: '#6a6a6a' }}>{k}</span><span style={{ color: '#222', lineHeight: 1.5 }}>{v}</span></div>)}
          </div>
        </div>
      ) : null}
      {p.notice ? <p style={{ padding: '12px 14px', background: '#fafafa', border: '1px solid #ebebeb', borderRadius: 10, fontSize: 12, color: '#6a6a6a', lineHeight: 1.6, margin: 0 }}>{p.notice}</p> : null}
    </>
  );
}

export default async function RegistryDetailPage({ params }: { params: { locale: string; ykiho: string } }): Promise<JSX.Element> {
  if (!isPublicLocale(params.locale)) notFound();
  const locale = params.locale as PublicLocale;
  const dict = await getDictionary(locale);
  const t = dict.clinicsPage.registry;
  const row = await load(decodeURIComponent(params.ykiho)).catch(() => null);
  if (!row) notFound();

  const details = await ensureDetails({ id: row.id, ykiho: row.ykiho, details: row.details, detailsSyncedAt: row.detailsSyncedAt });
  // 진료 중/종료 배지 — 심평원 요일별 진료시간 + 공휴일 (클라이언트에서 서울 시각으로 계산)
  const holidays = await loadHolidayYmds().catch(() => [] as string[]);
  const listed = isListed(row);
  const tone = clTone(row.clCd);
  // 병원 자체 등록 프로필 — 관리자 검수 승인 뒤에만 공개 (글로우 인증 상세와 같은 구성)
  const profile = details.submission?.status === 'approved' ? details.profile : undefined;
  const photos = listed
    ? (profile ? [profile.cover, ...(profile.photos ?? [])].filter((x): x is string => Boolean(x)) : (details.photos ?? []))
    : [];
  const badgeHours = profile?.hoursWeekly ?? details.hours ?? null;
  const cover = row.partnerCover || photos[0] || null;
  const hours = hoursRows(details.hours, t.days as unknown as string[]);
  const hasHours = hours.some((h) => h.text);
  const h = details.hours;
  const mapQuery = row.addr ? encodeURIComponent(`${row.name} ${row.addr}`) : encodeURIComponent(row.name);
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const inquiryHref = row.contractedHospitalId
    ? `/${locale}/inquiry?hospital=${row.contractedHospitalId}`
    : `/${locale}/inquiry?memo=${encodeURIComponent(row.name)}`;
  const claimHref = `/signup?claim=${encodeURIComponent(row.ykiho)}`;
  const nf = (n: number): string => n.toLocaleString(locale === 'kr' ? 'ko-KR' : 'en-US');
  const estb = row.estbDate && /^\d{8}$/.test(row.estbDate) ? `${row.estbDate.slice(0, 4)}.${row.estbDate.slice(4, 6)}` : null;
  const fmtDate = (d: Date | null): string => (d ? new Date(d).toISOString().slice(0, 10) : '—');

  const section: React.CSSProperties = { border: '1px solid #ebebeb', borderRadius: 14, padding: 18, background: '#fff' };
  const h2: React.CSSProperties = { fontSize: 16, fontWeight: 700, margin: '0 0 10px' };
  const actionBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid #dddddd', borderRadius: 10, padding: '10px 8px', fontSize: 13, fontWeight: 600, color: '#222', textDecoration: 'none', background: '#fff' };
  const cellStyle = (c: string, w?: number): React.CSSProperties => ({ padding: '8px 10px', color: c, fontWeight: w });

  return (
    <section className="m-rd-page" style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 40px 80px', filter: listed ? 'none' : 'grayscale(1)' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Link href={`/${locale}/clinics/all`} style={{ fontSize: 12, color: '#6a6a6a' }}>← {t.title}</Link>

      {/* 헤더 (사진 없으면 종별 톤 배너) */}
      <div style={{ marginTop: 10, borderRadius: 16, overflow: 'hidden', background: cover ? `#f2f2f2 url(${cover}) center / cover` : tone.bg, aspectRatio: cover ? '21/9' : 'auto', minHeight: cover ? undefined : 96, display: 'flex', alignItems: 'flex-end', padding: cover ? 0 : '18px 20px' }}>
        {!cover ? <span style={{ fontSize: 14, fontWeight: 800, color: tone.fg }}>{row.clName ?? ''}</span> : null}
      </div>
      {photos.length > 1 ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
          {photos.slice(1, 8).map((p) => <div key={p} style={{ width: 120, height: 80, flexShrink: 0, borderRadius: 10, background: `#f2f2f2 url(${p}) center / cover` }} />)}
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {listed ? <Badge tone="rose">{t.contractedBadge}</Badge> : <Badge tone="gray">{t.publicBadge}</Badge>}
          {row.foreignLicensed ? <Badge tone="blue">{t.foreignBadge}</Badge> : null}
          {row.claimStatus === 'pending' ? <Badge tone="gray">{t.claimPending}</Badge> : null}
        </div>
        <h1 className="m-rd-title" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', margin: '8px 0 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {row.name}
          <OpenStatusBadge hours={badgeHours} holidays={holidays} labels={dict.openStatus} />
        </h1>
        <p style={{ fontSize: 14, color: '#6a6a6a', margin: '6px 0 0' }}>
          {[row.clName, [row.sidoName, row.sgguName, row.emdongName].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
          {row.drTotal > 0 ? ` · ${t.doctors} ${nf(row.drTotal)}` : ''}{estb ? ` · ${t.established} ${estb}` : ''}
        </p>
        {row.foreignLicensed && details.foreignCountries?.length ? (
          <p style={{ fontSize: 13, color: '#1d4ed8', margin: '6px 0 0' }}>
            <b>{t.foreignCountries}</b> · {details.foreignCountries.join(' / ')}
          </p>
        ) : null}
        {profile?.tagline ? <p style={{ fontSize: 15, color: '#c81e42', fontWeight: 600, margin: '8px 0 0', lineHeight: 1.5 }}>{profile.tagline}</p> : null}
      </div>

      <div className="m-rd-body" style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 액션 */}
          <div className="m-rd-actions">
            {row.tel ? <a href={`tel:${row.tel.replace(/[^0-9+]/g, '')}`} style={actionBtn}>📞 {t.callBtn}</a> : <span style={{ ...actionBtn, color: '#bbb' }}>📞 {t.callBtn}</span>}
            <a href={mapHref} target="_blank" rel="noreferrer" style={actionBtn}>📍 {t.mapBtn}</a>
            <Link href={inquiryHref} style={{ ...actionBtn, background: '#ff385c', color: '#fff', border: 'none' }}>💬 {t.inquireBtn}</Link>
          </div>
          {row.contractedHospitalId && row.partnerSlug ? (
            <Link href={`/${locale}/clinics/${row.partnerSlug}`} style={{ fontSize: 13, fontWeight: 700, color: '#c2143c' }}>→ {t.viewPartnerPage}</Link>
          ) : null}

          {/* 소개 (직접 등록 병원) */}
          {listed && details.intro ? (
            <div style={section}>
              <h2 style={h2}>{t.intro}</h2>
              <p style={{ fontSize: 14, color: '#3f3f3f', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>{details.intro}</p>
              {details.languages?.length ? <p style={{ fontSize: 13, color: '#6a6a6a', margin: '10px 0 0' }}><b>{t.languages}</b> · {details.languages.join(', ')}</p> : null}
            </div>
          ) : null}

          {/* 자체 등록 프로필 (검수 승인) — 대표 시술 · 진료 분야 · 의료진 · 시설 · 외국인 안내 · 신뢰 포인트 · 안내 */}
          {profile ? <ProfileBlocks p={profile} cp={dict.clinicsPage} section={section} h2={h2} languages={details.languages ?? []} langLabel={t.languages} /> : null}

          {/* 진료과목 */}
          {details.departments?.length ? (
            <div style={section}>
              <h2 style={h2}>{t.departments}</h2>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {details.departments.map((d) => (
                  <span key={d.code || d.name} style={{ fontSize: 13, border: '1px solid #e5e5e5', borderRadius: 999, padding: '5px 11px', background: '#fafafa' }}>
                    {d.name}{d.doctors > 0 ? <span style={{ color: '#9c9c9c', marginLeft: 4 }}>{d.doctors}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* 진료시간 */}
          {hasHours || h?.lunchWeek || h?.closedHoliday ? (
            <div style={section}>
              <h2 style={{ ...h2, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {t.hours}
                <OpenStatusBadge hours={badgeHours} holidays={holidays} labels={dict.openStatus} size="sm" />
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                <tbody>
                  {hours.map((r) => (
                    <tr key={r.day} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={cellStyle('#6a6a6a', 600)}>{r.day}</td>
                      <td style={cellStyle(r.text ? '#222' : '#c2143c')}>{r.text ?? t.closed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 8, lineHeight: 1.7 }}>
                {h?.lunchWeek ? <div><b>{t.lunch}</b> {h.lunchWeek}{h.lunchSat ? ` · ${t.days[5]} ${h.lunchSat}` : ''}</div> : null}
                {h?.receptionWeek ? <div><b>{t.reception}</b> {h.receptionWeek}{h.receptionSat ? ` · ${t.days[5]} ${h.receptionSat}` : ''}</div> : null}
                {h?.closedHoliday ? <div>{t.holidayClosed} · {h.closedHoliday}</div> : null}
                {h?.closedSunday ? <div>{t.sundayClosed} · {h.closedSunday}</div> : null}
                {h?.emergencyDay || h?.emergencyNight ? <div><b>{t.emergency}</b> {h.emergencyDay ? 'Day' : ''}{h.emergencyDay && h.emergencyNight ? ' · ' : ''}{h.emergencyNight ? 'Night' : ''}</div> : null}
                {h?.parking ? <div><b>{t.parking}</b> {h.parking.spaces ? `${h.parking.spaces} ` : ''}{h.parking.paid ? '💳' : ''} {h.parking.note ?? ''}</div> : null}
              </div>
            </div>
          ) : null}

          {/* 위치 · 교통 */}
          <div style={section}>
            <h2 style={h2}>{t.address}</h2>
            <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>{row.addr ?? '—'}{row.postNo ? <span style={{ color: '#9c9c9c' }}> ({row.postNo})</span> : null}</p>
            {h?.landmark?.name ? <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}><b>{t.landmark}</b> {h.landmark.name} {h.landmark.direction ?? ''} {h.landmark.distance ?? ''}</p> : null}
            {details.transport?.length ? (
              <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13, color: '#3f3f3f', lineHeight: 1.7 }}>
                {details.transport.slice(0, 8).map((tr, i) => (
                  <li key={i}>{[tr.type, tr.line, tr.station, tr.exit, tr.distance, tr.note].filter(Boolean).join(' · ')}</li>
                ))}
              </ul>
            ) : null}
            {row.addr ? (
              <iframe
                title="map"
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed&hl=${locale === 'kr' ? 'ko' : locale}`}
                style={{ width: '100%', height: 240, border: 0, borderRadius: 12, marginTop: 12 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : null}
          </div>
        </div>

        {/* 우측 카드 */}
        <aside className="m-rd-side" style={{ position: 'sticky', top: 90, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={section}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={cellStyle('#6a6a6a')}>{t.type}</td><td style={cellStyle('#222', 600)}>{row.clName ?? '—'}</td></tr>
                <tr><td style={cellStyle('#6a6a6a')}>{t.doctors}</td><td style={cellStyle('#222', 600)}>{row.drTotal > 0 ? nf(row.drTotal) : '—'}</td></tr>
                <tr><td style={cellStyle('#6a6a6a')}>{t.phone}</td><td style={cellStyle('#222', 600)}>{row.tel ?? '—'}</td></tr>
                <tr><td style={cellStyle('#6a6a6a')}>{t.website}</td><td style={{ ...cellStyle('#1d4ed8', 600), wordBreak: 'break-all' }}>{row.url ? <a href={row.url.startsWith('http') ? row.url : `http://${row.url}`} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8' }}>{row.url.replace(/^https?:\/\//, '')}</a> : '—'}</td></tr>
                {estb ? <tr><td style={cellStyle('#6a6a6a')}>{t.established}</td><td style={cellStyle('#222', 600)}>{estb}</td></tr> : null}
              </tbody>
            </table>
          </div>

          {!listed ? (
            <div style={{ ...section, borderColor: '#fecdd3', background: '#fffafb', filter: 'none' }}>
              <h2 style={{ ...h2, margin: '0 0 6px' }}>{t.claimTitle}</h2>
              <p style={{ fontSize: 13, color: '#3f3f3f', lineHeight: 1.65, margin: 0 }}>{t.claimBody}</p>
              {row.claimStatus === 'pending' ? (
                <p style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: '#b45309' }}>{t.claimPending}</p>
              ) : (
                <Link href={claimHref} style={{ display: 'block', marginTop: 12, textAlign: 'center', background: '#ff385c', color: '#fff', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>{t.claimCta} →</Link>
              )}
            </div>
          ) : null}

          <p style={{ fontSize: 11, color: '#9c9c9c', margin: 0, lineHeight: 1.6 }}>
            {t.dataSource} · {t.synced} {fmtDate(row.syncedAt)}{row.detailsSyncedAt ? ` · ${t.detailsSynced} ${fmtDate(row.detailsSyncedAt)}` : ''}
            {row.foreignLicensed && row.foreignLicensedSource ? <><br />{row.foreignLicensedSource}</> : null}
          </p>
        </aside>
      </div>

      {/* 모바일 하단 고정 바 */}
      <div className="m-rd-bottom">
        {row.tel ? <a href={`tel:${row.tel.replace(/[^0-9+]/g, '')}`} style={{ ...actionBtn, flex: 1 }}>📞 {t.callBtn}</a> : null}
        <Link href={listed ? inquiryHref : claimHref} style={{ ...actionBtn, flex: 2, background: '#ff385c', color: '#fff', border: 'none' }}>{listed ? t.inquireBtn : t.claimCta}</Link>
      </div>
    </section>
  );
}

export type { RegistryCardRow };
