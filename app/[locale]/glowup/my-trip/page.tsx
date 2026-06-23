import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame, StatusBar } from '../_components/phone-frame';
import { BottomNav } from '../_components/bottom-nav';

export const metadata = { title: '내 여행 — Korea Glow-up' };

/**
 * S10 · My Trip — booked itinerary view (마이 active tab).
 *
 * Top section:
 *   - "지민님의 여행" eyebrow + "내 여행" Noto Serif KR header
 *   - Dark ink "UPCOMING" card with:
 *     · soft wine circle in background top-right corner
 *     · D-14 Cormorant italic count + "서울 글로우업" title
 *     · date range + hotel name in stone
 *
 * Day tabs: Day 1 (active wine pill) / Day 2 / Day 3 / Day 4 / 5
 *
 * Day 1 timeline (3 events):
 *   - 11:00 인천공항 도착 · VIP 픽업 (wine dot)
 *   - 14:00 호텔 체크인 · 퍼스널 컬러 진단 (wine dot)
 *   - 19:00 웰컴 디너 · 한우구이 (gold dot — final of day)
 *
 * Times in Cormorant italic, vertical wine line connecting events.
 *
 * BottomNav: 마이 active.
 */

const TIMELINE = [
  {
    time: '11:00',
    title: '인천공항 도착 · VIP 픽업',
    desc: '전용 차량 · 통역 가이드 미팅',
    dotColor: 'bg-glow-wine',
    final: false,
  },
  {
    time: '14:00',
    title: '호텔 체크인 · 퍼스널 컬러 진단',
    desc: '아테르 앰배서더 명동 · 90분 컨설팅',
    dotColor: 'bg-glow-wine',
    final: false,
  },
  {
    time: '19:00',
    title: '웰컴 디너 · 한우구이',
    desc: '현지인 추천 강남 맛집 · 예약 완료',
    dotColor: 'bg-glow-gold',
    final: true,
  },
];

export default function GlowupMyTripPage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
  return (
    <PhoneFrame>
      <StatusBar tone="dark" />

      <div className="px-7 pt-4">
        <div className="text-[13px] text-glow-mist">지민님의 여행</div>
        <div className="mt-[3px] font-glow-serif text-[22px] font-semibold tracking-[-0.01em]">
          내 여행
        </div>
      </div>

      {/* UPCOMING card */}
      <div className="relative mx-6 mt-4 overflow-hidden rounded-[20px] bg-glow-ink p-[22px]">
        <div className="absolute -right-5 -top-[30px] h-[120px] w-[120px] rounded-full bg-[rgba(124,58,75,0.35)]" />
        <div className="relative">
          <div className="font-glow-mono text-[10px] tracking-[0.14em] text-glow-gold">
            UPCOMING
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="whitespace-nowrap font-glow-italic text-[34px] font-bold italic text-glow-paper">
              D-14
            </span>
            <span className="font-glow-serif text-[17px] font-semibold text-glow-paper">
              서울 글로우업
            </span>
          </div>
          <div className="mt-1.5 text-xs text-[#B8AE9F]">
            2026.7.12 – 7.16 · 아테르 앰배서더 명동
          </div>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto px-6 pt-[18px]">
        {[
          { label: 'Day 1', active: true },
          { label: 'Day 2' },
          { label: 'Day 3' },
          { label: 'Day 4' },
          { label: '5' },
        ].map((d) => (
          <span
            key={d.label}
            className={
              d.active
                ? 'whitespace-nowrap rounded-full bg-glow-wine px-3.5 py-1.5 text-xs font-semibold text-glow-paper'
                : 'whitespace-nowrap rounded-full border border-[#E6DECF] bg-white px-3.5 py-1.5 text-xs font-medium text-glow-slate'
            }
          >
            {d.label}
          </span>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-[26px] pt-4">
        {TIMELINE.map((event, i) => (
          <div key={i} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <div className="font-glow-italic text-[13px] font-bold italic text-glow-wine">
                {event.time}
              </div>
              <div className={`mt-1.5 h-[9px] w-[9px] rounded-full ${event.dotColor}`} />
              {!event.final ? <div className="w-[2px] flex-1 bg-[#E0D6C4]" /> : null}
            </div>
            <div className={`flex-1 ${event.final ? '' : 'pb-4'}`}>
              <div className="text-[14.5px] font-semibold">{event.title}</div>
              <div className="mt-0.5 text-xs text-[#7C6F64]">{event.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav locale={params.locale} active="my" />
    </PhoneFrame>
  );
}
