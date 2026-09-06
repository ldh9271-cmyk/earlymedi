import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

/** 미용업 레지스트리 카드 행. */
export type ShopCardRow = {
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
  chairs: number;
  beds: number;
  contractedListingId: string | null;
  claimStatus: string;
  details: { photos?: string[] } | null;
  partnerSlug?: string | null;
  partnerCover?: string | null;
};

export const SHOP_CATS = ['hair', 'makeup', 'nail', 'skin', 'pmu', 'personal_color', 'lash', 'waxing', 'scalp'] as const;
export type ShopCat = (typeof SHOP_CATS)[number];

export function isShopListed(r: { contractedListingId: string | null; claimStatus: string }): boolean {
  return Boolean(r.contractedListingId) || r.claimStatus === 'approved';
}

export function shopHref(locale: PublicLocale, r: ShopCardRow): string {
  if (r.contractedListingId && r.partnerSlug) return `/${locale}/listings/${r.partnerSlug}`;
  return `/${locale}/shops/r/${encodeURIComponent(r.mgtNo)}`;
}

/** 카테고리 톤 (이미지 없는 공공정보 카드 배경). */
export function catTone(keys: string[]): { bg: string; fg: string } {
  const k = keys[0];
  switch (k) {
    case 'hair': return { bg: 'linear-gradient(150deg,#fff1e6,#ffd9b8)', fg: '#9a3412' };
    case 'makeup': return { bg: 'linear-gradient(150deg,#fde8ef,#f9c9d9)', fg: '#9d174d' };
    case 'nail': return { bg: 'linear-gradient(150deg,#efe6ff,#dccbff)', fg: '#5b21b6' };
    case 'skin': return { bg: 'linear-gradient(150deg,#e6f7f2,#c9ecdf)', fg: '#065f46' };
    case 'pmu': return { bg: 'linear-gradient(150deg,#f3e8e2,#e2cfc3)', fg: '#7c2d12' };
    case 'personal_color': return { bg: 'linear-gradient(150deg,#e6f0ff,#c9dcff)', fg: '#1e3a8a' };
    default: return { bg: 'linear-gradient(150deg,#f5f5f5,#e5e5e5)', fg: '#3f3f3f' };
  }
}

export function catLabels(keys: string[], t: Dictionary['shopsRegistry']): string[] {
  const order: string[] = [...SHOP_CATS];
  return keys
    .filter((k): k is ShopCat => (order as string[]).includes(k))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((k) => t.cats[k]);
}

export function ShopCard({ r, locale, t, listedLabel, publicLabel }: {
  r: ShopCardRow; locale: PublicLocale; t: Dictionary['shopsRegistry']; listedLabel: string; publicLabel: string;
}): JSX.Element {
  const listed = isShopListed(r);
  const tone = catTone(r.categoryKeys);
  const cover = listed ? (r.partnerCover || r.details?.photos?.[0] || null) : null;
  const labels = catLabels(r.categoryKeys, t).slice(0, 3);
  return (
    <a
      href={shopHref(locale, r)}
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
        <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 6 }}>{labels.join(' · ')}</div>
      </div>
    </a>
  );
}
