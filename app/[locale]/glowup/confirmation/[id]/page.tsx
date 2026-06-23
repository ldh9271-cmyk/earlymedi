import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame, StatusBar } from '../../_components/phone-frame';

export const metadata = { title: '예약 완료 — Korea Glow-up' };

/**
 * S9 · Booking Confirmation — celebratory dark-themed success screen.
 *
 * Full-screen ink background (variant="jet" on PhoneFrame). Unlike
 * the other screens, the inner surface is also ink — not cream — to
 * emphasize the moment.
 *
 * Composition (vertical center):
 *   - 84px wine circle with white CSS-drawn checkmark (border-rotate trick)
 *   - "See you in Seoul" Cormorant gold italic tagline
 *   - "예약이 완료되었어요" h2 Noto Serif KR cream
 *   - Subtitle (line break)
 *   - Detail card (subtle paper overlay): 예약번호 / 일정 / 코스
 *
 * Bottom: 2 stacked buttons:
 *   - 내 일정 보기 (solid wine) → /[locale]/glowup/my-trip
 *   - 홈으로 (gold outlined) → /[locale]/glowup/home
 */

export default function GlowupConfirmationPage({
  params,
}: {
  params: { locale: PublicLocale; id: string };
}): JSX.Element {
  return (
    <PhoneFrame variant="jet">
      <StatusBar tone="light" />

      {/* Hero center */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div
          className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-glow-wine"
          style={{ boxShadow: '0 0 0 10px rgba(124,58,75,0.18)' }}
        >
          {/* CSS-drawn checkmark — rotated border trick */}
          <div
            className="-mt-[6px] h-4 w-[30px]"
            style={{
              borderLeft: '3px solid #F7F2EB',
              borderBottom: '3px solid #F7F2EB',
              transform: 'rotate(-45deg)',
            }}
          />
        </div>

        <div className="mt-7 whitespace-nowrap font-glow-italic text-[18px] italic text-glow-gold">
          See you in Seoul
        </div>
        <h2 className="mt-2 font-glow-serif text-[27px] font-semibold tracking-[-0.01em] text-glow-paper">
          예약이 완료되었어요
        </h2>
        <p className="mt-3 text-[13.5px] leading-[1.6] text-[#B8AE9F]">
          7월의 글로우업 여행이 확정되었습니다.
          <br />
          설레는 마음으로 준비할게요.
        </p>

        {/* Detail card */}
        <div
          className="mt-[26px] w-full rounded-[18px] border p-[18px] text-left"
          style={{
            background: 'rgba(245,241,234,0.06)',
            borderColor: 'rgba(245,241,234,0.14)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#B8AE9F]">예약번호</span>
            <span className="font-glow-mono text-[13px] tracking-[0.04em] text-glow-paper">
              {params.id}
            </span>
          </div>
          <div className="my-[13px] h-px" style={{ background: 'rgba(245,241,234,0.12)' }} />
          <div className="flex justify-between">
            <span className="text-xs text-[#B8AE9F]">일정</span>
            <span className="text-[13px] font-semibold text-glow-paper">
              7.12 – 7.16 · 4박 5일
            </span>
          </div>
          <div className="mt-[9px] flex justify-between">
            <span className="text-xs text-[#B8AE9F]">코스</span>
            <span className="text-[13px] font-semibold text-glow-paper">
              글로우업 올인원 (2인)
            </span>
          </div>
        </div>
      </div>

      {/* Stacked CTAs */}
      <div className="flex flex-col gap-[11px] px-7 pb-[30px]">
        <Link
          href={`/${params.locale}/glowup/my-trip`}
          className="flex w-full items-center justify-center rounded-full bg-glow-wine px-4 py-[17px] font-glow-sans text-base font-semibold text-glow-paper transition active:scale-[0.98]"
        >
          내 일정 보기
        </Link>
        <Link
          href={`/${params.locale}/glowup/home`}
          className="flex w-full items-center justify-center rounded-full border bg-transparent px-4 py-[15px] font-glow-sans text-[15px] font-medium text-glow-gold transition active:scale-[0.98]"
          style={{ borderColor: 'rgba(201,168,106,0.4)' }}
        >
          홈으로
        </Link>
      </div>
    </PhoneFrame>
  );
}
