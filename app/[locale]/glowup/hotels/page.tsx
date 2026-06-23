import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame, StatusBar } from '../_components/phone-frame';

export const metadata = { title: '프리미엄 호텔 — Korea Glow-up' };

/**
 * S7 · Premium Hotel selection (4 nights, central Seoul 5-star).
 *
 * Two hotel cards:
 *   - Atelier Ambassador Myeongdong (selected — wine 2px border +
 *     "선택됨" chip top-right)
 *   - Hyundai Premier Hotel (default — light border, +₩0 markup)
 *
 * Each card: hero band (diagonal pattern) + 5-star + district +
 * Korean name (Noto Serif KR) + amenities + price/night.
 *
 * Footer CTA: full-width wine button "아테르 앰배서더로 예약 →"
 * → /[locale]/glowup/checkout?hotel=atelier
 */

const HOTELS = [
  {
    id: 'atelier-ambassador',
    selected: true,
    name: '아테르 앰배서더 명동',
    district: '명동',
    amenities: '스파 · 루프탑 · 조식 뷔페 · 피트니스',
    price: 320000,
    upcharge: '코스 포함가',
    pattern: 'repeating-linear-gradient(135deg, #D9D2C0 0 12px, #E2DBCA 12px 24px)',
    caption: '[ 호텔 외관·룸 ]',
    captionColor: '#9A9079',
    bandHeight: 138,
  },
  {
    id: 'hyundai-premier',
    selected: false,
    name: '현대 프리미어 호텔',
    district: '을지로',
    amenities: '시티뷰 · 라운지 · 사우나',
    price: 280000,
    upcharge: '+₩0',
    pattern: 'repeating-linear-gradient(135deg, #DED5C2 0 12px, #E7DECB 12px 24px)',
    caption: null,
    captionColor: null,
    bandHeight: 110,
  },
] as const;

export default function GlowupHotelsPage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
  const selected = HOTELS.find((h) => h.selected) ?? HOTELS[0];
  return (
    <PhoneFrame>
      <StatusBar tone="dark" />

      <div className="flex items-center gap-3.5 px-7 pt-3.5">
        <Link
          href={`/${params.locale}/glowup/signature`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD3C5] text-[18px]"
        >
          ←
        </Link>
        <div>
          <div className="font-glow-serif text-[21px] font-semibold tracking-[-0.01em]">
            프리미엄 브랜드 호텔
          </div>
          <div className="mt-0.5 text-xs text-glow-mist">4박 · 명동 중심 5성 호텔</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pt-[18px]">
        {HOTELS.map((h) => (
          <div
            key={h.id}
            className={`relative overflow-hidden rounded-[22px] bg-white ${
              h.selected
                ? 'border-2 border-glow-wine'
                : 'border border-[#EAE3D7]'
            }`}
          >
            {h.selected ? (
              <div className="absolute right-3.5 top-3.5 z-10 rounded-full bg-glow-wine px-3 py-1.5 text-[11px] font-semibold text-glow-paper">
                선택됨
              </div>
            ) : null}
            <div
              className="relative"
              style={{ height: h.bandHeight, background: h.pattern }}
            >
              {h.caption ? (
                <span
                  className="absolute bottom-2 left-3 font-glow-mono text-[9px]"
                  style={{ color: h.captionColor ?? undefined }}
                >
                  {h.caption}
                </span>
              ) : null}
            </div>
            <div className="px-4 pb-[17px] pt-[15px]">
              <div className="flex items-center gap-1.5">
                <span className="font-glow-italic text-[13px] font-semibold italic text-glow-gold">
                  ★★★★★
                </span>
                <span className="text-[11px] text-glow-mist">{h.district}</span>
              </div>
              <div className="mt-1.5 font-glow-serif text-[18px] font-semibold">
                {h.name}
              </div>
              <div className="mt-[5px] text-xs text-[#7C6F64]">{h.amenities}</div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-glow-italic text-[20px] font-bold italic text-glow-ink">
                  ₩{h.price.toLocaleString('ko-KR')}
                  <span className="font-glow-sans text-[12px] font-normal text-glow-mist">
                    {' '}
                    / 박
                  </span>
                </span>
                <span className="text-xs font-semibold text-glow-wine">{h.upcharge}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[#E6DECF] bg-white px-6 pb-[22px] pt-4">
        <Link
          href={`/${params.locale}/glowup/checkout?hotel=${selected.id}`}
          className="flex w-full items-center justify-center rounded-full bg-glow-wine px-4 py-[17px] font-glow-sans text-base font-semibold text-glow-paper shadow-[0_14px_26px_-12px_rgba(124,58,75,0.6)] transition active:scale-[0.98]"
        >
          {selected.name.split(' ').slice(0, 2).join(' ')}로 예약 →
        </Link>
      </div>
    </PhoneFrame>
  );
}
