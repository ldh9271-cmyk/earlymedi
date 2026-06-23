import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame, StatusBar } from '../_components/phone-frame';
import { BottomNav } from '../_components/bottom-nav';

export const metadata = { title: '찐맛집 & K-팝 — Korea Glow-up' };

/**
 * S6 · Local Food & K-POP — discovery for entertainment-side
 * experiences that round out the beauty course.
 *
 * Sections:
 *   - Tab strip: 찐맛집 (active, wine underline) / K-팝 성지 / 관광 명소
 *   - 2×2 food grid (4 restaurants with district + rating)
 *   - "엔터테인먼트 탐방" header
 *   - 4-up entertainment row (HYBE · SM · JYP · YG ink chips)
 *   - Bottom tab nav (코스 active per spec)
 *
 * Tab interaction is intentionally static — visual reference matches
 * design; real filtering wires up when DB content lands.
 */

const FOODS = [
  {
    name: '삼겹살',
    district: '마포 · ★4.8',
    pattern: 'repeating-linear-gradient(135deg, #E1D2C2 0 10px, #E9DBCB 10px 20px)',
  },
  {
    name: '한우구이',
    district: '강남 · ★4.9',
    pattern: 'repeating-linear-gradient(135deg, #DBC8C0 0 10px, #E5D4CC 10px 20px)',
  },
  {
    name: '간장게장',
    district: '을지로 · ★4.7',
    pattern: 'repeating-linear-gradient(135deg, #DED5C0 0 10px, #E7DECA 10px 20px)',
  },
  {
    name: '낙지볶음탕',
    district: '종로 · ★4.8',
    pattern: 'repeating-linear-gradient(135deg, #E2D4CE 0 10px, #EBDDD7 10px 20px)',
  },
] as const;

const ENTERTAINMENT = ['HYBE', 'SM', 'JYP', 'YG'];

export default function GlowupExperiencesPage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
  return (
    <PhoneFrame>
      <StatusBar tone="dark" />

      <div className="px-7 pt-3.5">
        <div className="font-glow-mono text-[10px] tracking-[0.14em] text-glow-wine">
          #한국음식추천 #K-POP
        </div>
        <div className="mt-1.5 font-glow-serif text-[21px] font-semibold tracking-[-0.01em]">
          현지인 추천 &amp; K-팝 성지
        </div>
      </div>

      {/* Tab strip — 찐맛집 active */}
      <div className="flex gap-[22px] border-b border-[#E6DECF] px-7 pt-4">
        <div className="border-b-[2px] border-glow-wine pb-2.5 text-sm font-semibold text-glow-ink">
          찐맛집
        </div>
        <div className="pb-2.5 text-sm font-medium text-[#A89E90]">K-팝 성지</div>
        <div className="pb-2.5 text-sm font-medium text-[#A89E90]">관광 명소</div>
      </div>

      {/* Food grid */}
      <div className="flex-1 overflow-y-auto px-6 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {FOODS.map((f) => (
            <div
              key={f.name}
              className="overflow-hidden rounded-[16px] border border-[#EAE3D7] bg-white"
            >
              <div className="h-[78px]" style={{ background: f.pattern }} />
              <div className="px-[11px] pb-[11px] pt-[9px]">
                <div className="text-[13px] font-semibold">{f.name}</div>
                <div className="mt-0.5 text-[10.5px] text-glow-mist">{f.district}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Entertainment */}
        <div className="mt-[18px] font-glow-serif text-[15px] font-semibold">
          엔터테인먼트 탐방
        </div>
        <div className="mt-[11px] flex gap-2 pb-6">
          {ENTERTAINMENT.map((label) => (
            <div
              key={label}
              className="flex-1 rounded-[13px] bg-glow-ink py-[13px] text-center font-glow-italic text-[15px] font-bold italic tracking-[0.04em] text-glow-paper"
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <BottomNav locale={params.locale} active="courses" />
    </PhoneFrame>
  );
}
