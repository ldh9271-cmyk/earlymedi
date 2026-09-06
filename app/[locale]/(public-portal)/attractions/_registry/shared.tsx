import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';

/** 관광지(관광사진) 카드 행. */
export type TourCardRow = {
  id: string;
  contentId: string;
  title: string;
  imageUrl: string | null;
  thumbUrl: string | null;
  location: string | null;
  sidoName: string | null;
  sgguName: string | null;
  keyword: string | null;
  categoryKeys: string[];
};

export const TOUR_CATS = ['nature', 'coast', 'heritage', 'city', 'night', 'theme', 'other'] as const;
export type TourCat = (typeof TOUR_CATS)[number];

export function tourTone(keys: string[]): { bg: string; fg: string } {
  const k = keys[0];
  switch (k) {
    case 'nature': return { bg: 'linear-gradient(150deg,#e6f7ee,#c9ecd6)', fg: '#065f46' };
    case 'coast': return { bg: 'linear-gradient(150deg,#e6f2ff,#c7ddff)', fg: '#1e3a8a' };
    case 'heritage': return { bg: 'linear-gradient(150deg,#f6ede0,#e6cfb0)', fg: '#7c2d12' };
    case 'city': return { bg: 'linear-gradient(150deg,#eeeef2,#d6d6e0)', fg: '#3f3f46' };
    case 'night': return { bg: 'linear-gradient(150deg,#e6e2f5,#c9c0e8)', fg: '#4c1d95' };
    case 'theme': return { bg: 'linear-gradient(150deg,#fde8ef,#f9c9d9)', fg: '#9d174d' };
    default: return { bg: 'linear-gradient(150deg,#f5f5f5,#e5e5e5)', fg: '#3f3f3f' };
  }
}

export function tourCatLabels(keys: string[], t: Dictionary['attractionsPage']): string[] {
  const order: string[] = [...TOUR_CATS];
  return keys
    .filter((k): k is TourCat => (order as string[]).includes(k))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((k) => t.cats[k]);
}

export function TourCard({ r, locale, t }: { r: TourCardRow; locale: PublicLocale; t: Dictionary['attractionsPage'] }): JSX.Element {
  const tone = tourTone(r.categoryKeys);
  const cover = r.thumbUrl || r.imageUrl || null;
  const labels = tourCatLabels(r.categoryKeys, t).slice(0, 2);
  return (
    <a
      href={`/${locale}/attractions/${encodeURIComponent(r.contentId)}`}
      style={{ display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid #ebebeb', borderRadius: 14, overflow: 'hidden', background: '#fff' }}
    >
      <div style={{ aspectRatio: '4/3', background: cover ? `#f2f2f2 url(${cover}) center / cover` : tone.bg, position: 'relative' }}>
        {!cover ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: tone.fg, textAlign: 'center' }}>{labels[0] ?? ''}</span>
          </div>
        ) : null}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.title}</div>
        <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 3 }}>{[r.sidoName, r.sgguName].filter(Boolean).join(' ') || r.location || ''}</div>
        {labels.length ? <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 6 }}>{labels.join(' · ')}</div> : null}
      </div>
    </a>
  );
}
