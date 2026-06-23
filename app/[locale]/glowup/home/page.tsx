import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame, StatusBar } from '../_components/phone-frame';
import { BottomNav } from '../_components/bottom-nav';

export const metadata = { title: '홈 — Korea Glow-up' };

/**
 * S2 · Home — authenticated patient's landing tab.
 *
 * Layout (top → bottom):
 *   - Status bar (dark on cream)
 *   - Greeting row: "안녕하세요, 지민님" + "어떤 글로우업을 원하세요?" + avatar
 *   - Search input ("프로그램·코스·맛집 검색")
 *   - Category filter chips: 전체 / 뷰티 / 맛집 / K-팝 / 명소 (전체 active)
 *   - Section header: "시그니처 뷰티 프로그램" + 전체보기
 *   - Horizontal card row: 퍼스널 컬러 진단 / 피부 진단 케어
 *   - Hero promo card (dark ink bg): "BEST · 올인원" 4박5일 글로우업 코스
 *   - Bottom tab nav (둘러보기 active)
 *
 * Greeting name "지민" is hard-coded in the mockup; in real app this
 * would come from session.user.firstName. Kept as-is for fidelity.
 */
export default function GlowupHomePage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
  return (
    <PhoneFrame>
      <StatusBar tone="dark" />

      {/* Greeting */}
      <div className="flex items-center justify-between px-7 pt-[18px]">
        <div>
          <div className="text-[13px] text-glow-mist">안녕하세요, 지민님</div>
          <div className="mt-1 font-glow-serif text-[22px] font-semibold tracking-[-0.01em]">
            어떤 글로우업을 원하세요?
          </div>
        </div>
        <div
          className="h-11 w-11 flex-shrink-0 rounded-full border border-[#E6DECF]"
          style={{
            background:
              'repeating-linear-gradient(135deg, #D8CDB9 0 6px, #E0D6C4 6px 12px)',
          }}
        />
      </div>

      {/* Search */}
      <div className="mx-7 mt-[18px] flex items-center gap-2.5 rounded-[14px] border border-[#E6DECF] bg-white px-4 py-[13px]">
        <div className="h-[15px] w-[15px] rounded-full border-2 border-[#B8AE9F]" />
        <span className="text-sm text-[#A89E90]">프로그램·코스·맛집 검색</span>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto px-7 pt-4">
        {[
          { label: '전체', active: true },
          { label: '뷰티' },
          { label: '맛집' },
          { label: 'K-팝' },
          { label: '명소' },
        ].map((c) => (
          <span
            key={c.label}
            className={
              c.active
                ? 'whitespace-nowrap rounded-full bg-glow-wine px-3.5 py-2 text-[13px] font-semibold text-glow-paper'
                : 'whitespace-nowrap rounded-full border border-[#E6DECF] bg-white px-3.5 py-2 text-[13px] font-medium text-glow-slate'
            }
          >
            {c.label}
          </span>
        ))}
      </div>

      {/* Section: Signature Beauty Programs */}
      <div className="flex items-baseline justify-between px-7 pt-[22px]">
        <div className="font-glow-serif text-[17px] font-semibold">시그니처 뷰티 프로그램</div>
        <Link
          href={`/${params.locale}/glowup/programs`}
          className="text-xs font-semibold text-glow-wine"
        >
          전체보기
        </Link>
      </div>
      <div className="flex gap-3.5 overflow-x-auto px-7 pt-3.5">
        {[
          {
            id: 'personal-color',
            label: '진단 · 90분',
            name: '퍼스널 컬러 진단',
            price: '₩180,000',
            pattern: 'repeating-linear-gradient(135deg, #E4D2D6 0 12px, #ECDDE0 12px 24px)',
            tag: '[ 퍼스널컬러 ]',
            tagColor: '#A98792',
          },
          {
            id: 'skin-care',
            label: '케어 · 120분',
            name: '피부 진단 케어',
            price: '₩240,000',
            pattern: 'repeating-linear-gradient(135deg, #D9D2C0 0 12px, #E2DBCA 12px 24px)',
            tag: '[ 피부진단 ]',
            tagColor: '#9A9079',
          },
        ].map((card) => (
          <Link
            key={card.id}
            href={`/${params.locale}/glowup/programs/${card.id}`}
            className="w-[190px] flex-shrink-0 overflow-hidden rounded-[20px] border border-[#EAE3D7] bg-white"
          >
            <div className="relative h-[118px]" style={{ background: card.pattern }}>
              <span
                className="absolute bottom-2 left-2.5 font-glow-mono text-[9px]"
                style={{ color: card.tagColor }}
              >
                {card.tag}
              </span>
            </div>
            <div className="px-3.5 pb-[15px] pt-3.5">
              <div className="text-[11px] text-glow-mist">{card.label}</div>
              <div className="mt-1 text-[15px] font-semibold">{card.name}</div>
              <div className="mt-2 font-glow-italic text-[18px] font-semibold italic text-glow-wine">
                {card.price}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Hero promo — 4박 5일 글로우업 코스 */}
      <Link
        href={`/${params.locale}/glowup/signature`}
        className="mx-7 mt-[18px] flex items-center justify-between rounded-[22px] bg-glow-ink px-[22px] py-5"
      >
        <div>
          <div className="font-glow-mono text-[10px] tracking-[0.14em] text-glow-gold">
            BEST · 올인원
          </div>
          <div className="mt-[7px] font-glow-serif text-[18px] font-semibold text-glow-paper">
            4박 5일 글로우업 코스
          </div>
          <div className="mt-[5px] text-[13px] text-[#B8AE9F]">
            뷰티+맛집+K-팝+호텔 올인원
          </div>
        </div>
        <div className="text-right">
          <div className="font-glow-italic text-[22px] font-bold italic text-glow-paper">₩1.89M~</div>
          <div className="ml-auto mt-2 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-glow-wine text-[18px] text-glow-paper">
            →
          </div>
        </div>
      </Link>

      <BottomNav locale={params.locale} active="discover" />
    </PhoneFrame>
  );
}
