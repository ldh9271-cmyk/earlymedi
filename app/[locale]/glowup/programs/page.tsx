import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame, StatusBar } from '../_components/phone-frame';
import { BottomNav } from '../_components/bottom-nav';

export const metadata = { title: '뷰티 프로그램 — Korea Glow-up' };

/**
 * S3 · Beauty Program List — 4 signature care programs.
 *
 * Each row card has: square thumbnail (diagonal sand pattern) +
 * eyebrow (Space Mono) + program name + 1-line description + price.
 * Tap → /[locale]/glowup/programs/[id] (S4 detail).
 *
 * 4 programs match the design spec; content kept verbatim. Real DB
 * binding lands in a follow-up phase.
 */
const PROGRAMS = [
  {
    id: 'personal-color',
    eyebrow: '진단 · 90분',
    name: '퍼스널 컬러 진단',
    summary: '나에게 꼭 맞는 컬러 · 메이크업 추천',
    price: '₩180,000',
    pattern: 'repeating-linear-gradient(135deg, #E4D2D6 0 10px, #ECDDE0 10px 20px)',
  },
  {
    id: 'skin-care',
    eyebrow: '케어 · 120분',
    name: '피부 진단 케어',
    summary: 'AI 피부 분석 · 맞춤 스킨 프로그램',
    price: '₩240,000',
    pattern: 'repeating-linear-gradient(135deg, #D9D2C0 0 10px, #E2DBCA 10px 20px)',
  },
  {
    id: 'profile-photo',
    eyebrow: '스튜디오 · 150분',
    name: '프로필 화보 촬영',
    summary: '헤어·메이크업 + 전문 포토 스튜디오',
    price: '₩320,000',
    pattern: 'repeating-linear-gradient(135deg, #DED5C2 0 10px, #E7DECB 10px 20px)',
  },
  {
    id: 'kbeauty-class',
    eyebrow: '클래스 · 100분',
    name: 'K-뷰티 메이크업 클래스',
    summary: '아티스트와 1:1 셀프 메이크업 레슨',
    price: '₩150,000',
    pattern: 'repeating-linear-gradient(135deg, #E2D3CF 0 10px, #EADBD7 10px 20px)',
  },
] as const;

export default function GlowupProgramsPage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
  return (
    <PhoneFrame>
      <StatusBar tone="dark" />

      {/* Header row: back arrow + title block */}
      <div className="flex items-center gap-3.5 px-7 pt-3.5">
        <Link
          href={`/${params.locale}/glowup/home`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD3C5] text-[18px] text-glow-ink"
        >
          ←
        </Link>
        <div>
          <div className="font-glow-serif text-[21px] font-semibold tracking-[-0.01em]">
            뷰티 프로그램
          </div>
          <div className="mt-0.5 text-xs text-glow-mist">
            놀면서 예뻐지는 4가지 시그니처 케어
          </div>
        </div>
      </div>

      {/* Program rows — fills remaining height; each card links to S4 */}
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-6 pt-[18px]">
        {PROGRAMS.map((p) => (
          <Link
            key={p.id}
            href={`/${params.locale}/glowup/programs/${p.id}`}
            className="flex items-center gap-3.5 rounded-[20px] border border-[#EAE3D7] bg-white p-3.5"
          >
            <div
              className="h-[84px] w-[84px] flex-shrink-0 rounded-[15px]"
              style={{ background: p.pattern }}
            />
            <div className="flex-1">
              <div className="font-glow-mono text-[10px] tracking-[0.06em] text-glow-mist">
                {p.eyebrow}
              </div>
              <div className="mt-1 text-base font-semibold">{p.name}</div>
              <div className="mt-[3px] text-xs text-[#7C6F64]">{p.summary}</div>
              <div className="mt-[6px] font-glow-italic text-[18px] font-semibold italic text-glow-wine">
                {p.price}
              </div>
            </div>
            <div className="text-xl text-[#C3B8A8]">›</div>
          </Link>
        ))}
      </div>

      <BottomNav locale={params.locale} active="discover" />
    </PhoneFrame>
  );
}
