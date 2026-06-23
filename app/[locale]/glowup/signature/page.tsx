import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame } from '../_components/phone-frame';

export const metadata = { title: '4박 5일 글로우업 코스 — Korea Glow-up' };

/**
 * S5 · Signature 4-day, 5-night course (all-in-one).
 *
 * Custom hero with "SIGNATURE COURSE" eyebrow + course name on dark
 * gradient (no standard StatusBar — replaced by header strip with
 * back arrow + 5G indicator overlaid on the hero image).
 *
 * Timeline: vertical day-by-day list (Day 1–5) with wine-circle
 * day-number badges connected by vertical line. Day 5 has ink badge
 * (final day) and no connector below.
 *
 * Inclusions chip row (4 amenities) at bottom of scroll area.
 *
 * Sticky footer: 1인 · 4박 5일 ₩1,890,000~ + [예약하기] wine CTA.
 */

const DAYS: Array<{ n: number; title: string; desc: string; final?: boolean }> = [
  {
    n: 1,
    title: '도착 · 퍼스널 컬러 진단',
    desc: '차량 픽업 · 통역 가이드 · 명동 호텔 체크인',
  },
  {
    n: 2,
    title: '피부 진단 케어 · 한우 다이닝',
    desc: '스킨 진단 · 한우구이·간장게장 찐맛집',
  },
  {
    n: 3,
    title: 'K-팝 성지 투어 · 화보 촬영',
    desc: 'HYBE·SM·JYP·YG 탐방 · 프로필 화보 스튜디오',
  },
  {
    n: 4,
    title: '경복궁 · 한강 · 성수 쇼핑',
    desc: '필수 명소 · 청담·성수 감성 쇼핑',
  },
  {
    n: 5,
    title: '롯데월드 · 출국',
    desc: '아쿠아리움 · 면세 쇼핑 · 공항 샌딩',
    final: true,
  },
];

const AMENITIES = ['차량 서비스', '통역 가이드', '맛집 예약', '5성 호텔'];

export default function GlowupSignaturePage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
  return (
    <PhoneFrame>
      {/* Hero with course title */}
      <div
        className="relative h-[150px] flex-shrink-0"
        style={{
          background:
            'repeating-linear-gradient(135deg, #D8CDB9 0 13px, #E0D6C4 13px 26px)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(22,17,14,0.32), rgba(22,17,14,0) 55%)',
          }}
        />
        <div className="absolute left-0 right-0 top-[18px] flex items-center justify-between px-6 font-semibold text-glow-paper">
          <Link
            href={`/${params.locale}/glowup/home`}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(251,248,242,0.18)] text-[18px]"
          >
            ←
          </Link>
          <div className="flex items-center gap-[7px] text-[15px]">
            <span className="text-[12px]">5G</span>
            <div className="flex h-3 w-6 items-stretch rounded-[3px] border-[1.5px] border-glow-paper p-[1.5px]">
              <div className="h-full w-[72%] rounded-[1px] bg-glow-paper" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-3.5 left-6 text-glow-paper">
          <div className="font-glow-mono text-[10px] tracking-[0.14em]">SIGNATURE COURSE</div>
          <div className="mt-1 font-glow-serif text-[23px] font-semibold">
            4박 5일 글로우업 코스
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-[26px] pt-5">
        <div className="flex flex-col gap-0">
          {DAYS.map((d) => (
            <div key={d.n} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-full font-glow-italic text-xs font-bold italic text-glow-paper ${
                    d.final ? 'bg-glow-ink' : 'bg-glow-wine'
                  }`}
                >
                  {d.n}
                </div>
                {!d.final ? <div className="w-[2px] flex-1 bg-[#E0D6C4]" /> : null}
              </div>
              <div className={d.final ? '' : 'pb-[15px]'}>
                <div className="text-[14.5px] font-semibold">{d.title}</div>
                <div className="mt-0.5 text-xs leading-[1.45] text-[#7C6F64]">{d.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Inclusion chips */}
        <div className="mt-3.5 flex flex-wrap gap-2 pb-6">
          {AMENITIES.map((a) => (
            <span
              key={a}
              className="rounded-full border border-[#E6DECF] bg-white px-[11px] py-1.5 text-[11px] text-glow-slate"
            >
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="flex items-center justify-between border-t border-[#E6DECF] bg-white px-6 pb-[22px] pt-4">
        <div>
          <div className="text-[11px] text-glow-mist">1인 · 4박 5일</div>
          <div className="font-glow-italic text-[24px] font-bold italic text-glow-ink">
            ₩1,890,000~
          </div>
        </div>
        <Link
          href={`/${params.locale}/glowup/checkout?course=signature`}
          className="rounded-full bg-glow-wine px-[30px] py-4 font-glow-sans text-base font-semibold text-glow-paper shadow-[0_14px_26px_-12px_rgba(124,58,75,0.6)] transition active:scale-[0.98]"
        >
          예약하기
        </Link>
      </div>
    </PhoneFrame>
  );
}
