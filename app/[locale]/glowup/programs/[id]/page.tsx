import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame } from '../../_components/phone-frame';

export const metadata = { title: '프로그램 상세 — Korea Glow-up' };

/**
 * S4 · Program Detail — single program purchase page.
 *
 * Layout:
 *   - Hero (230px diagonal-stripe pattern + brown→ivory overlay)
 *     · top-left back arrow, top-right heart (favorite)
 *     · bottom-left art placeholder caption
 *   - Content scroll area
 *     · eyebrow row: 진단·90분 · ★ 4.9 · (312)
 *     · h2: 퍼스널 컬러 진단
 *     · description paragraph
 *     · "포함 사항" list with wine ✓ checkmarks
 *     · 3-up thumbnail strip
 *   - Sticky footer: "1인 기준 ₩180,000" + "예약하기" wine CTA
 *
 * URL params: /[locale]/glowup/programs/[id]
 * Today we render the same content regardless of `id`; real lookup
 * lands when programs become DB-backed.
 */

const FEATURES = [
  '1:1 전문 컬러 컨설턴트',
  '컬러 드레이핑 진단 + 결과 리포트',
  '맞춤 메이크업·패션 컬러 가이드',
  '통역 가이드 동행 (영·중·일)',
] as const;

const THUMBS = [
  'repeating-linear-gradient(135deg, #E4D2D6 0 9px, #ECDDE0 9px 18px)',
  'repeating-linear-gradient(135deg, #DED5C2 0 9px, #E7DECB 9px 18px)',
  'repeating-linear-gradient(135deg, #D9D2C0 0 9px, #E2DBCA 9px 18px)',
];

export default function GlowupProgramDetailPage({
  params,
}: {
  params: { locale: PublicLocale; id: string };
}): JSX.Element {
  return (
    <PhoneFrame>
      {/* Hero with pattern + dark gradient overlay */}
      <div
        className="relative h-[230px] flex-shrink-0"
        style={{
          background:
            'repeating-linear-gradient(135deg, #E4D2D6 0 13px, #ECDDE0 13px 26px)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(22,17,14,0.28), rgba(22,17,14,0) 50%)',
          }}
        />
        <div className="absolute left-0 right-0 top-[18px] flex items-center justify-between px-6 font-semibold text-glow-paper">
          <Link
            href={`/${params.locale}/glowup/programs`}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(251,248,242,0.2)] text-[18px]"
          >
            ←
          </Link>
          <button
            type="button"
            aria-label="즐겨찾기"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(251,248,242,0.2)] text-[15px]"
          >
            ♡
          </button>
        </div>
        <div className="absolute bottom-3.5 left-6 font-glow-mono text-[10px] text-[#A98792]">
          [ 퍼스널 컬러 진단 화보 ]
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-[26px] pt-[22px]">
        <div className="flex items-center gap-2">
          <span className="font-glow-mono text-[11px] tracking-[0.06em] text-glow-wine">
            진단 · 90분
          </span>
          <span className="text-glow-sand">·</span>
          <span className="font-glow-italic text-sm font-semibold italic text-glow-gold">
            ★ 4.9
          </span>
          <span className="text-[11px] text-glow-mist">(312)</span>
        </div>
        <h2 className="mt-2.5 font-glow-serif text-[25px] font-semibold tracking-[-0.01em]">
          퍼스널 컬러 진단
        </h2>
        <p className="mt-2.5 text-[13.5px] leading-[1.6] text-glow-slate">
          전문 컨설턴트가 드레이핑으로 나에게 가장 잘 어울리는 컬러를 찾아드려요.
          결과 리포트와 메이크업·패션 추천까지.
        </p>

        <div className="mt-[18px] font-glow-serif text-[15px] font-semibold">포함 사항</div>
        <div className="mt-[11px] flex flex-col gap-[9px]">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2.5 text-[13.5px] text-[#3D362F]">
              <div className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-[#F0E3E6] text-[11px] text-glow-wine">
                ✓
              </div>
              {f}
            </div>
          ))}
        </div>

        <div className="mt-[18px] flex gap-2.5">
          {THUMBS.map((bg, i) => (
            <div
              key={i}
              className="h-16 flex-1 rounded-[13px]"
              style={{ background: bg }}
            />
          ))}
        </div>

        {/* Spacer so content doesn't hide under sticky CTA */}
        <div className="h-24" />
      </div>

      {/* Sticky CTA footer */}
      <div className="flex items-center justify-between border-t border-[#E6DECF] bg-white px-6 pb-[22px] pt-4">
        <div>
          <div className="text-[11px] text-glow-mist">1인 기준</div>
          <div className="font-glow-italic text-[24px] font-bold italic text-glow-ink">
            ₩180,000
          </div>
        </div>
        <Link
          href={`/${params.locale}/glowup/checkout?program=${params.id}`}
          className="rounded-full bg-glow-wine px-[34px] py-4 font-glow-sans text-base font-semibold text-glow-paper shadow-[0_14px_26px_-12px_rgba(124,58,75,0.6)] transition active:scale-[0.98]"
        >
          예약하기
        </Link>
      </div>
    </PhoneFrame>
  );
}
