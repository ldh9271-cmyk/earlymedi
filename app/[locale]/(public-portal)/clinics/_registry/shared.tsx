import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { HOSPITAL_GRADE_CL_CODES, type RegistryHours } from '@/drizzle/schema/hospital-registry';

/** 공개 목록·상세가 공유하는 최소 행 형태. */
export type RegistryCardRow = {
  id: string;
  ykiho: string;
  name: string;
  clCd: string | null;
  clName: string | null;
  sidoName: string | null;
  sgguName: string | null;
  addr: string | null;
  drTotal: number;
  foreignLicensed: boolean;
  contractedHospitalId: string | null;
  claimStatus: string;
  details: { departments?: Array<{ name: string; doctors: number }>; photos?: string[] } | null;
  partnerSlug?: string | null;
  partnerCover?: string | null;
};

/** 플랫폼 등록(컬러) 여부 — 계약 연결 또는 병원 직접 등록 승인. */
export function isListed(r: { contractedHospitalId: string | null; claimStatus: string }): boolean {
  return Boolean(r.contractedHospitalId) || r.claimStatus === 'approved';
}

/** 카드/상세 링크 — 계약 병원은 글로우업 상세, 아니면 공공정보 상세. */
export function registryHref(locale: PublicLocale, r: RegistryCardRow): string {
  if (r.contractedHospitalId && r.partnerSlug) return `/${locale}/clinics/${r.partnerSlug}`;
  return `/${locale}/clinics/r/${encodeURIComponent(r.ykiho)}`;
}

export function isHospitalGrade(clCd: string | null): boolean {
  return Boolean(clCd && HOSPITAL_GRADE_CL_CODES.includes(clCd));
}

/** 종별별 카드 색 (이미지가 없는 공공정보 카드의 배경). */
export function clTone(clCd: string | null): { bg: string; fg: string } {
  switch (clCd) {
    case '01': return { bg: 'linear-gradient(150deg,#e0ecff,#c7dafc)', fg: '#1e3a8a' };
    case '11': return { bg: 'linear-gradient(150deg,#e6f4ff,#d3e9ff)', fg: '#1d4ed8' };
    case '21': case '28': case '29': return { bg: 'linear-gradient(150deg,#eefaf3,#d9f2e3)', fg: '#047857' };
    case '41': case '51': return { bg: 'linear-gradient(150deg,#fff5e6,#ffe7c2)', fg: '#b45309' };
    case '92': case '93': return { bg: 'linear-gradient(150deg,#f4efe6,#e9dfcc)', fg: '#7c5a1e' };
    default: return { bg: 'linear-gradient(150deg,#fff7f8,#ffe3e9)', fg: '#c2143c' };
  }
}

export function Badge({ children, tone }: { children: React.ReactNode; tone: 'rose' | 'blue' | 'gray' }): JSX.Element {
  const c = tone === 'rose'
    ? { bg: '#fff0f3', fg: '#c2143c', bd: '#fecdd3' }
    : tone === 'blue'
      ? { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' }
      : { bg: '#f5f5f5', fg: '#6a6a6a', bd: '#e5e5e5' };
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: c.fg, background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export function RegistryBadges({ r, t }: { r: RegistryCardRow; t: Dictionary['clinicsPage']['registry'] }): JSX.Element | null {
  const listed = isListed(r);
  if (!listed && !r.foreignLicensed) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {listed ? <Badge tone="rose">{t.contractedBadge}</Badge> : null}
      {r.foreignLicensed ? <Badge tone="blue">{t.foreignBadge}</Badge> : null}
    </div>
  );
}

/**
 * 공개 카드 — 계약/승인 병원은 컬러(커버 이미지 또는 종별 톤), 그 외는
 * 흑백(filter: grayscale) 으로 "플랫폼 미등록" 을 한눈에 구분한다.
 */
export function RegistryCard({ r, locale, t }: { r: RegistryCardRow; locale: PublicLocale; t: Dictionary['clinicsPage']['registry'] }): JSX.Element {
  const listed = isListed(r);
  const tone = clTone(r.clCd);
  const cover = listed ? (r.partnerCover || r.details?.photos?.[0] || null) : null;
  const depts = (r.details?.departments ?? []).slice(0, 3).map((d) => d.name).filter(Boolean);
  return (
    <a
      href={registryHref(locale, r)}
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        border: '1px solid #ebebeb', borderRadius: 14, overflow: 'hidden', background: '#fff',
        filter: listed ? 'none' : 'grayscale(1)', opacity: listed ? 1 : 0.88,
      }}
    >
      <div style={{ aspectRatio: '16/9', background: cover ? `#f2f2f2 url(${cover}) center / cover` : tone.bg, position: 'relative' }}>
        {!cover ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: tone.fg, letterSpacing: '-0.01em', textAlign: 'center' }}>{r.clName ?? ''}</span>
          </div>
        ) : null}
        {listed ? <span style={{ position: 'absolute', top: 8, left: 8, background: '#ff385c', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '2px 6px' }}>glow-up</span> : null}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.name}</div>
        <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 3 }}>
          {[r.clName, [r.sidoName, r.sgguName].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
        </div>
        <div style={{ marginTop: 6 }}><RegistryBadges r={r} t={t} /></div>
        <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 6 }}>
          {r.drTotal > 0 ? `${t.doctors} ${r.drTotal}` : ''}{r.drTotal > 0 && depts.length ? ' · ' : ''}{depts.join(' · ')}
        </div>
      </div>
    </a>
  );
}

/** "HHMM" → "HH:MM" */
export const fmtTime = (s: string): string => `${s.slice(0, 2)}:${s.slice(2)}`;

export function hoursRows(h: RegistryHours | undefined, days: string[]): Array<{ day: string; text: string | null }> {
  if (!h) return [];
  const keys: Array<keyof RegistryHours> = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return keys.map((k, i) => {
    const v = h[k] as [string, string] | undefined;
    return { day: days[i] ?? k, text: v ? `${fmtTime(v[0])} – ${fmtTime(v[1])}` : null };
  });
}
