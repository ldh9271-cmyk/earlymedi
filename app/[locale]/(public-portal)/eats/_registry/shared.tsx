import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

/** 일반음식점 레지스트리 카드 행. */
export type EatCardRow = {
  id: string;
  mgtNo: string;
  name: string;
  bizType: string | null;
  categoryKeys: string[];
  sidoName: string | null;
  sgguName: string | null;
  addrRoad: string | null;
  addrLot: string | null;
  statusCode: string | null;
  contractedListingId: string | null;
  claimStatus: string;
  details: { photos?: string[]; cuisine?: string } | null;
  partnerSlug?: string | null;
  partnerCover?: string | null;
};

export const EAT_CATS = ['korean', 'bbq', 'japanese', 'chinese', 'western', 'asian', 'cafe', 'chicken_pub', 'bunsik', 'bar', 'other'] as const;
export type EatCat = (typeof EAT_CATS)[number];

export function isEatListed(r: { contractedListingId: string | null; claimStatus: string }): boolean {
  return Boolean(r.contractedListingId) || r.claimStatus === 'approved';
}

export function eatHref(locale: PublicLocale, r: EatCardRow): string {
  if (r.contractedListingId && r.partnerSlug) return `/${locale}/listings/${r.partnerSlug}`;
  return `/${locale}/eats/r/${encodeURIComponent(r.mgtNo)}`;
}

/** 카테고리 톤 (이미지 없는 공공정보 카드 배경). */
export function eatTone(keys: string[]): { bg: string; fg: string } {
  const k = keys[0];
  switch (k) {
    case 'korean': return { bg: 'linear-gradient(150deg,#fef0e6,#ffdcc0)', fg: '#9a3412' };
    case 'bbq': return { bg: 'linear-gradient(150deg,#f6e3df,#e6c3ba)', fg: '#7c2d12' };
    case 'japanese': return { bg: 'linear-gradient(150deg,#eaf2ff,#cfe0ff)', fg: '#1e3a8a' };
    case 'chinese': return { bg: 'linear-gradient(150deg,#fdeaea,#f6c9c9)', fg: '#991b1b' };
    case 'western': return { bg: 'linear-gradient(150deg,#fdf6e3,#f2e3b8)', fg: '#854d0e' };
    case 'cafe': return { bg: 'linear-gradient(150deg,#f0eadf,#ded1bd)', fg: '#78350f' };
    case 'chicken_pub': return { bg: 'linear-gradient(150deg,#fff3d6,#ffe1a8)', fg: '#92400e' };
    case 'asian': return { bg: 'linear-gradient(150deg,#e8f7ee,#c9ecd6)', fg: '#065f46' };
    case 'bar': return { bg: 'linear-gradient(150deg,#efe6ff,#dccbff)', fg: '#5b21b6' };
    default: return { bg: 'linear-gradient(150deg,#f5f5f5,#e5e5e5)', fg: '#3f3f3f' };
  }
}

export function eatCatLabels(keys: string[], t: Dictionary['eatsRegistry']): string[] {
  const order: string[] = [...EAT_CATS];
  return keys
    .filter((k): k is EatCat => (order as string[]).includes(k))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((k) => t.cats[k]);
}

export function EatCard({ r, locale, t, listedLabel, publicLabel }: {
  r: EatCardRow; locale: PublicLocale; t: Dictionary['eatsRegistry']; listedLabel: string; publicLabel: string;
}): JSX.Element {
  const listed = isEatListed(r);
  const tone = eatTone(r.categoryKeys);
  const cover = listed ? (r.partnerCover || r.details?.photos?.[0] || null) : null;
  const labels = eatCatLabels(r.categoryKeys, t).slice(0, 2);
  return (
    <a
      href={eatHref(locale, r)}
      style={{ display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid #ebebeb', borderRadius: 14, overflow: 'hidden', background: '#fff', filter: listed ? 'none' : 'grayscale(1)', opacity: listed ? 1 : 0.88 }}
    >
      <div style={{ aspectRatio: '16/9', background: cover ? `#f2f2f2 url(${cover}) center / cover` : tone.bg, position: 'relative' }}>
        {!cover ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: tone.fg, textAlign: 'center' }}>{labels[0] ?? r.bizType ?? ''}</span>
          </div>
        ) : null}
        {listed ? <span style={{ position: 'absolute', top: 8, left: 8, background: '#ff385c', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '2px 6px' }}>glow-up</span> : null}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.name}</div>
        <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 3 }}>{[r.sidoName, r.sgguName].filter(Boolean).join(' ')}</div>
        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: listed ? '#c2143c' : '#6a6a6a', background: listed ? '#fff0f3' : '#f5f5f5', border: `1px solid ${listed ? '#fecdd3' : '#e5e5e5'}`, borderRadius: 999, padding: '2px 8px' }}>
            {listed ? listedLabel : publicLabel}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 6 }}>{[r.bizType, labels.join(' · ')].filter(Boolean).join(' · ')}</div>
      </div>
    </a>
  );
}
