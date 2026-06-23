import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';

export const metadata = {
  title: 'Korea Glow-up Challenge — 서울에서 놀면서, 예뻐지다',
  description:
    '퍼스널 컬러 진단부터 K-팝 성지, 현지인 찐맛집까지. 노는 사이 더 예뻐지는 올인원 뷰티 여행.',
};

/**
 * S1 · Onboarding — first screen of the Atelier-style patient app.
 *
 * Faithful port of the claude.ai design (Korea Glow-up Challenge -
 * Atelier.dc.html) into a responsive Next.js page. The mockup framed
 * the design inside a 380×800 phone shell; we keep that exact
 * aesthetic on desktop (centered phone card) while collapsing to a
 * full-bleed mobile experience on small screens.
 *
 * Layout structure:
 *   [phone frame · jet bezel · 54px rounded outer]
 *     ├─ image hero (430px, repeating diagonal sand pattern + overlay)
 *     │   ├─ status bar (9:41 · 5G · battery)
 *     │   ├─ SEOUL · SOUTH KOREA eyebrow
 *     │   └─ "[ 모델 · 뷰티 화보컷 ]" art placeholder
 *     └─ content card
 *         ├─ K-BEAUTY TRAVEL · 4박 5일 eyebrow
 *         ├─ "서울에서 놀면서, 예뻐지다" hero serif
 *         ├─ "Glow up while you play in Seoul" italic tagline
 *         ├─ body description paragraph
 *         ├─ [여행 시작하기 →] wine CTA → /glowup/home
 *         └─ 4-language locale chips (current locale highlighted)
 */

const LOCALES: Array<{ code: PublicLocale; label: string }> = [
  { code: 'kr', label: '한국어' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
];

export default function GlowupOnboardingPage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-glow-ivory p-0 sm:p-8 md:p-12">
      {/* Phone frame — full-bleed on mobile, card on larger screens. */}
      <div
        className="
          w-full sm:w-[380px] sm:h-[800px] sm:p-[11px]
          sm:rounded-[54px] sm:bg-glow-jet
          sm:shadow-[0_50px_90px_-40px_rgba(40,28,22,0.55),0_0_0_1px_rgba(0,0,0,0.35)]
          min-h-screen sm:min-h-0
        "
      >
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-glow-cream sm:min-h-0 sm:rounded-[43px]">
          {/* Hero — repeating diagonal sand pattern with brown→ivory overlay */}
          <div
            className="relative h-[55vh] min-h-[380px] flex-shrink-0 sm:h-[430px]"
            style={{
              background:
                'repeating-linear-gradient(135deg, #D8CDB9 0 13px, #E0D6C4 13px 26px)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(22,17,14,0.25) 0%, rgba(22,17,14,0) 30%, rgba(245,241,234,0) 58%, rgba(245,241,234,0.95) 100%)',
              }}
            />
            {/* Status bar */}
            <div className="absolute left-0 right-0 top-[18px] flex items-center justify-between px-7 text-[15px] font-semibold text-glow-paper">
              <span>9:41</span>
              <div className="flex items-center gap-[7px]">
                <span className="text-[12px]">5G</span>
                <div className="flex h-3 w-6 items-stretch rounded-[3px] border-[1.5px] border-glow-paper p-[1.5px]">
                  <div className="h-full w-[72%] rounded-[1px] bg-glow-paper" />
                </div>
              </div>
            </div>
            {/* Location eyebrow */}
            <div className="absolute left-7 top-[64px] font-glow-mono text-[11px] uppercase tracking-[0.22em] text-glow-paper">
              SEOUL · SOUTH KOREA
            </div>
            {/* Art placeholder */}
            <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 font-glow-mono text-[11px] tracking-[0.1em] text-[#8C7E6A]">
              [ 모델 · 뷰티 화보컷 ]
            </div>
          </div>

          {/* Content card */}
          <div className="flex flex-1 flex-col px-[30px] pb-8 pt-2">
            <div className="font-glow-mono text-[11px] uppercase tracking-[0.16em] text-glow-wine">
              K-Beauty Travel · 4박 5일
            </div>
            <h1
              className="mt-3 font-glow-serif text-[35px] font-semibold leading-[1.22] tracking-[-0.01em] text-glow-ink"
              style={{ wordBreak: 'keep-all' }}
            >
              서울에서 놀면서,
              <br />
              예뻐지다
            </h1>
            <p className="mt-[10px] whitespace-nowrap font-glow-italic text-[18px] italic tracking-[0.01em] text-glow-wine">
              Glow up while you play in Seoul
            </p>
            <p className="mt-[14px] text-[14.5px] leading-[1.65] text-glow-slate">
              퍼스널 컬러 진단부터 K-팝 성지, 현지인 찐맛집까지. 노는 사이 더 예뻐지는 올인원 뷰티 여행.
            </p>

            <div className="mt-auto pt-6">
              <Link
                href={`/${params.locale}/glowup/home`}
                className="flex w-full items-center justify-center rounded-full bg-glow-wine px-4 py-[17px] font-glow-sans text-base font-semibold text-glow-paper shadow-[0_14px_26px_-12px_rgba(124,58,75,0.6)] transition active:scale-[0.98]"
              >
                여행 시작하기 →
              </Link>
              <div className="mt-4 flex justify-center gap-2">
                {LOCALES.map((l) => {
                  const isActive = l.code === params.locale;
                  return (
                    <Link
                      key={l.code}
                      href={`/${l.code}/glowup`}
                      className={
                        isActive
                          ? 'rounded-full bg-glow-jet px-3.5 py-[7px] text-xs font-semibold text-glow-paper'
                          : 'rounded-full border border-glow-dune bg-transparent px-3.5 py-[7px] text-xs font-medium text-glow-umber transition hover:bg-glow-sand/30'
                      }
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
