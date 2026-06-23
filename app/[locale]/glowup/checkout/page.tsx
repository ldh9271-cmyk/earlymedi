import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame, StatusBar } from '../_components/phone-frame';

export const metadata = { title: '예약·결제 — Korea Glow-up' };

/**
 * S8 · Checkout — booking review + payment.
 *
 * Layout (top → bottom):
 *   - Status bar (dark on cream)
 *   - Header: ← back + "예약 정보"
 *   - Course summary card (thumbnail + name + base price)
 *   - 2-up row: 출발일 (7월 12일 토) + 인원 stepper (성인 2)
 *   - "추가 옵션" header
 *   - 2 toggle rows:
 *     · 프로필 화보 촬영 (+₩320,000) — ON (wine pill)
 *     · 공항 VIP 픽업 (+₩90,000) — OFF (sand pill)
 *   - Line items: 코스(2인) ₩3,780,000 + 화보 추가 ₩320,000
 *   - Sticky footer: 총 결제 금액 ₩4,100,000 + [결제하기] wine CTA
 *
 * Static visual only — toggle UI doesn't drive state; real wiring is
 * a follow-up phase along with Stripe/Toss Pay integration.
 */

export default function GlowupCheckoutPage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
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
        <div className="font-glow-serif text-[21px] font-semibold tracking-[-0.01em]">
          예약 정보
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-[18px]">
        {/* Course summary */}
        <div className="flex items-center gap-3.5 rounded-[18px] border border-[#EAE3D7] bg-white p-[15px]">
          <div
            className="h-[62px] w-[62px] flex-shrink-0 rounded-[13px]"
            style={{
              background:
                'repeating-linear-gradient(135deg, #D8CDB9 0 9px, #E0D6C4 9px 18px)',
            }}
          />
          <div className="flex-1">
            <div className="font-glow-mono text-[10px] text-glow-mist">올인원 · 4박 5일</div>
            <div className="mt-[3px] text-[15px] font-semibold">4박 5일 글로우업 코스</div>
            <div className="mt-1 font-glow-italic text-base font-semibold italic text-glow-wine">
              ₩1,890,000
            </div>
          </div>
        </div>

        {/* Date + occupancy */}
        <div className="mt-3.5 flex gap-2.5">
          <div className="flex-1 rounded-[14px] border border-[#EAE3D7] bg-white px-3.5 py-3">
            <div className="text-[11px] text-glow-mist">출발일</div>
            <div className="mt-1 text-sm font-semibold">7월 12일 (토)</div>
          </div>
          <div className="flex flex-1 items-center justify-between rounded-[14px] border border-[#EAE3D7] bg-white px-3.5 py-3">
            <div>
              <div className="text-[11px] text-glow-mist">인원</div>
              <div className="mt-1 text-sm font-semibold">성인 2</div>
            </div>
            <div className="flex gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#DDD3C5] text-sm text-glow-wine">
                −
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-glow-wine text-sm text-glow-paper">
                +
              </div>
            </div>
          </div>
        </div>

        {/* Add-ons */}
        <div className="mt-[18px] font-glow-serif text-[15px] font-semibold">추가 옵션</div>

        {[
          { name: '프로필 화보 촬영 추가', price: '+ ₩320,000', on: true },
          { name: '공항 VIP 픽업', price: '+ ₩90,000', on: false },
        ].map((opt, i) => (
          <div
            key={opt.name}
            className={`mt-${i === 0 ? '[11px]' : '2.5'} flex items-center gap-2.5 rounded-[14px] border border-[#EAE3D7] bg-white p-3.5`}
          >
            <div className="flex-1">
              <div className="text-[13.5px] font-semibold">{opt.name}</div>
              <div className="mt-0.5 text-[11px] text-glow-mist">{opt.price}</div>
            </div>
            <div
              className={`relative h-6 w-[42px] flex-shrink-0 rounded-full ${
                opt.on ? 'bg-glow-wine' : 'bg-[#E0D6C4]'
              }`}
            >
              <div
                className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white ${
                  opt.on ? 'right-[3px]' : 'left-[3px]'
                }`}
              />
            </div>
          </div>
        ))}

        {/* Line items */}
        <div className="mt-[18px] flex flex-col gap-2 pb-6">
          <div className="flex justify-between text-[13px] text-glow-slate">
            <span>코스 (2인)</span>
            <span className="font-glow-italic font-semibold italic">₩3,780,000</span>
          </div>
          <div className="flex justify-between text-[13px] text-glow-slate">
            <span>화보 촬영 추가</span>
            <span className="font-glow-italic font-semibold italic">₩320,000</span>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="flex items-center justify-between border-t border-[#E6DECF] bg-white px-6 pb-[22px] pt-[15px]">
        <div>
          <div className="text-[11px] text-glow-mist">총 결제 금액</div>
          <div className="font-glow-italic text-[23px] font-bold italic text-glow-ink">
            ₩4,100,000
          </div>
        </div>
        <Link
          href={`/${params.locale}/glowup/confirmation/GUC-240712`}
          className="rounded-full bg-glow-wine px-8 py-4 font-glow-sans text-base font-semibold text-glow-paper shadow-[0_14px_26px_-12px_rgba(124,58,75,0.6)] transition active:scale-[0.98]"
        >
          결제하기
        </Link>
      </div>
    </PhoneFrame>
  );
}
