import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame, StatusBar } from '../_components/phone';
import { BottomTabBar } from '../_components/bottom-tab-bar';
import { CATEGORIES_FEED } from '../_components/program-data';

export const metadata = { title: '전체 카테고리 — glow-up' };

/**
 * Screen 4 — All categories feed.
 *
 * Vertically scrollable feed where each category title + "전체" link
 * is followed by a horizontally scrollable row of 160px-wide cards.
 *
 * Categories: 퍼스널컬러 / 피부케어 / 화보촬영 / 메이크업 / K-팝 성지
 * / 현지인 맛집 / 프리미엄 호텔 / 관광 명소 (8 sections, 17 cards).
 *
 * "전체" link → /[locale]/clinics?category=<categoryKey>. Existing
 * clinic listing page already supports category filtering through
 * category_listings table, so the feed integrates with the master
 * console's curation flow.
 */

// Map mobile category key → existing /clinics filter param.
const TO_CLINIC_CATEGORY: Record<string, string> = {
  color:  'dermatology',
  skin:   'dermatology',
  photo:  'photo',
  makeup: 'makeup',
  kpop:   'kpop',
  food:   'food',
  hotel:  'hotel',
  spot:   'spot',
};

export default function GlowupCategoriesPage({
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
            전체 카테고리
          </div>
          <div className="mt-0.5 text-[13px] text-[#6a6a6a]">
            뷰티부터 여행까지 한눈에
          </div>
        </div>
      </div>

      <div className="flex flex-col pb-2 pt-1.5">
        {CATEGORIES_FEED.map((section, idx) => {
          const clinicCat = TO_CLINIC_CATEGORY[section.key] ?? '';
          const allHref = clinicCat
            ? `/${params.locale}/clinics?category=${clinicCat}`
            : `/${params.locale}/clinics`;
          return (
            <div key={section.key}>
              <div className={`flex items-center justify-between px-[18px] ${idx === 0 ? 'pt-4' : 'pt-6'}`}>
                <span className="text-[17px] font-semibold text-glow-ink">{section.title}</span>
                <Link href={allHref} className="text-[13px] text-glow-ink underline">
                  전체
                </Link>
              </div>
              <div className="flex gap-3.5 overflow-x-auto px-[18px] pt-3">
                {section.items.map((item) => (
                  <div key={item.name} className="w-[160px] flex-shrink-0">
                    <div
                      className="relative overflow-hidden rounded-[13px]"
                      style={{
                        aspectRatio: '1',
                        backgroundColor: item.img ? '#f2f2f2' : '#222',
                        backgroundImage: item.img ? `url(${item.img})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      {/* K-pop section has solid color tiles with text label */}
                      {!item.img && item.label ? (
                        <div className="flex h-full w-full items-center justify-center text-[22px] font-bold tracking-[1px] text-white">
                          {item.label}
                        </div>
                      ) : item.featured ? (
                        <div className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-glow-ink">
                          게스트 선호
                        </div>
                      ) : item.label && item.img ? (
                        <div className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-glow-ink">
                          {item.label}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-glow-ink">{item.name}</div>
                    <div className="text-[13px] text-[#6a6a6a]">{item.meta}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="h-4" />
      </div>

      <BottomTabBar locale={params.locale} active="wishlist" />
    </PhoneFrame>
  );
}
