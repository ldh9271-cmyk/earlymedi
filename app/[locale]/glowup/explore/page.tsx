import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame, StatusBar } from '../_components/phone';
import { BottomTabBar } from '../_components/bottom-tab-bar';
import { HeartIcon } from '../_components/heart-icon';
import { EXPLORE_FOODS } from '../_components/program-data';

export const metadata = { title: '맛집 · K-팝 — glow-up' };

/**
 * Screen 3 — Explore (food & K-pop).
 *
 * Layout:
 *   - sticky status + h1 "현지인 찐맛집" + subtitle
 *   - 2-column food grid (4 cards, 1:1 aspect)
 *     · each card: photo + heart overlay + name + 동·★ rating row
 *   - K-팝 성지 탐방 section
 *     · horizontally scrollable row of 4 entertainment company tiles
 *       (HYBE / SM / JYP / YG) — solid black tile with white label,
 *       no images, matches the design's stylized representation
 *   - bottom tab bar (active='trips' per spec; explore goes to home)
 *
 * No CTAs trigger external flows — this is a discovery-only screen.
 * Tapping a food card could open a detail later; today it's display.
 */

const KPOP_TILES = ['HYBE', 'SM', 'JYP', 'YG'];

export default function GlowupExplorePage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
  return (
    <PhoneFrame>
      <div className="sticky top-0 z-20 bg-white">
        <StatusBar tone="dark" sticky={false} />
        <div className="border-b border-[#ebebeb] px-[18px] pb-3.5 pt-2.5">
          <div className="text-[22px] font-bold tracking-[-0.5px] text-glow-ink">
            현지인 찐맛집
          </div>
          <div className="mt-0.5 text-[13px] text-[#6a6a6a]">
            서울 전역 · 예약 대행 포함
          </div>
        </div>
      </div>

      {/* 2-col food grid */}
      <div className="grid grid-cols-2 gap-4 px-[18px] pt-4">
        {EXPLORE_FOODS.map((f) => (
          <div key={f.id}>
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                aspectRatio: '1',
                backgroundColor: '#f2f2f2',
                backgroundImage: `url(${f.img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute right-2.5 top-2.5">
                <HeartIcon size={20} />
              </div>
            </div>
            <div className="mt-2.5 text-[15px] font-semibold text-glow-ink">{f.name}</div>
            <div className="text-[13px] text-[#6a6a6a]">{f.place}</div>
          </div>
        ))}
      </div>

      {/* K-pop section */}
      <div className="px-[18px] pt-6">
        <div className="text-lg font-semibold text-glow-ink">K-팝 성지 탐방</div>
        <div className="mt-3.5 flex gap-3 overflow-x-auto pb-1">
          {KPOP_TILES.map((label) => (
            <div
              key={label}
              className="flex h-24 w-[130px] flex-shrink-0 items-center justify-center rounded-2xl bg-glow-ink text-[22px] font-bold tracking-[1px] text-white"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className="h-7" />

      <BottomTabBar locale={params.locale} active="trips" />
    </PhoneFrame>
  );
}
