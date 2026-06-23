import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame, StatusBar } from './_components/phone';
import { BottomTabBar } from './_components/bottom-tab-bar';
import {
  MobileCategoryIcon,
  type MobileCategoryKind,
} from './_components/category-icon';
import { HeartIcon, StarRating } from './_components/heart-icon';
import {
  FEATURED_COURSE,
  HOME_PROGRAMS,
  bookingHref,
} from './_components/program-data';

export const metadata = {
  title: 'glow-up — 모바일',
  description: '서울에서 놀면서, 예뻐지는 4박 5일 — 모바일 환자 앱',
};

/**
 * Screen 1 — Mobile home / browse.
 *
 * Layout (top → bottom):
 *   - status bar (sticky)
 *   - search pill ("어디로 여행가세요? · 서울·날짜·인원")
 *   - 9-icon category strip (전체 active, others muted)
 *   - section: 베스트셀러 패키지
 *     · large featured course card with dark overlay
 *   - section: 개별 뷰티 프로그램 (3 cards)
 *     · first has page-indicator dots overlay
 *   - bottom tab bar (둘러보기 active)
 *
 * B2B routing:
 *   - search pill → /[locale]/clinics (existing browse)
 *   - featured course → /[locale]/glowup/courses/glowup-4n5d
 *   - each program card → /[locale]/inquiry?program=…&interest=…
 *     so the message appears in the agency's inbox
 */

const HOME_CATEGORIES: Array<{ kind: MobileCategoryKind; label: string; active?: boolean }> = [
  { kind: 'all',    label: '전체',    active: true },
  { kind: 'color',  label: '퍼스널컬러' },
  { kind: 'skin',   label: '피부케어' },
  { kind: 'photo',  label: '화보촬영' },
  { kind: 'makeup', label: '메이크업' },
  { kind: 'kpop',   label: 'K-팝' },
  { kind: 'food',   label: '맛집' },
  { kind: 'hotel',  label: '호텔' },
  { kind: 'spot',   label: '명소' },
];

export default function GlowupMobileHomePage({
  params,
}: {
  params: { locale: PublicLocale };
}): JSX.Element {
  return (
    <PhoneFrame>
      {/* Sticky header (status + search + category) */}
      <div className="sticky top-0 z-20 bg-white">
        <StatusBar tone="dark" sticky={false} />
        <div className="px-[18px] pb-3 pt-2">
          <Link
            href={`/${params.locale}/clinics`}
            className="flex items-center gap-3 rounded-full border border-[#dddddd] px-[18px] py-[13px] shadow-[rgba(0,0,0,0.04)_0_2px_8px]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-semibold text-glow-ink">어디로 여행가세요?</div>
              <div className="mt-[1px] text-xs text-[#717171]">서울 · 날짜 · 인원</div>
            </div>
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[#dddddd]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
                <path d="M3 6h18M6 12h12M10 18h4" />
              </svg>
            </div>
          </Link>
        </div>
        <div className="flex gap-[26px] overflow-x-auto border-b border-[#ebebeb] px-[18px] pt-1">
          {HOME_CATEGORIES.map((c) => {
            const color = c.active ? '#222' : '#9a9a9a';
            return (
              <div
                key={c.label}
                className="flex flex-shrink-0 flex-col items-center gap-[7px] pb-3 pt-1.5"
                style={{
                  color,
                  borderBottom: c.active ? '2px solid #222' : '2px solid transparent',
                }}
              >
                <MobileCategoryIcon kind={c.kind} stroke={color} />
                <span className={`text-[11px] ${c.active ? 'font-semibold' : 'font-medium'}`}>
                  {c.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cards stack */}
      <div className="flex flex-col gap-[26px] px-[18px] pt-[18px]">
        {/* Featured course — dark overlay hero card */}
        <div>
          <div className="mb-3 text-lg font-semibold text-glow-ink">베스트셀러 패키지</div>
          <Link
            href={`/${params.locale}/glowup/courses/${FEATURED_COURSE.id}`}
            className="relative block overflow-hidden rounded-2xl bg-glow-jet"
            style={{
              aspectRatio: '1.3',
              backgroundImage: `url(${FEATURED_COURSE.img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.78) 100%)',
              }}
            />
            <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-glow-ink shadow-[rgba(0,0,0,0.1)_0_2px_6px]">
              <span style={{ color: '#ff385c' }}>★</span> 베스트셀러
            </div>
            <div className="absolute right-3.5 top-3.5">
              <HeartIcon size={24} />
            </div>
            <div className="absolute bottom-4 left-[18px] right-[18px] text-white">
              <div className="text-xs font-semibold tracking-[0.04em] text-white/90">
                {FEATURED_COURSE.duration}
              </div>
              <div className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.5px]">
                {FEATURED_COURSE.name}
              </div>
              <div className="mt-1 text-[13px] text-white/90">{FEATURED_COURSE.tagline}</div>
              <div className="mt-3.5 flex items-end justify-between">
                <div>
                  <span className="text-[20px] font-bold">₩{FEATURED_COURSE.price.toLocaleString('ko-KR')}</span>{' '}
                  <span className="text-[13px] text-white/85">/ 1인</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff">
                    <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                  </svg>
                  {FEATURED_COURSE.rating} · {FEATURED_COURSE.reviews}
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="h-px bg-[#ebebeb]" />

        <div className="-mb-2 text-lg font-semibold text-glow-ink">개별 뷰티 프로그램</div>

        {HOME_PROGRAMS.map((p, i) => (
          <Link
            key={p.id}
            href={bookingHref(params.locale, p)}
            className="block"
          >
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                aspectRatio: '1.1',
                backgroundColor: '#f2f2f2',
                backgroundImage: `url(${p.img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {p.featured ? (
                <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-glow-ink shadow-[rgba(0,0,0,0.1)_0_2px_6px]">
                  게스트 선호
                </div>
              ) : null}
              <div className="absolute right-3.5 top-3.5">
                <HeartIcon size={24} />
              </div>
              {/* Carousel dots on first card only — matches design */}
              {i === 0 ? (
                <div className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
                  <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-base font-semibold text-glow-ink">{p.name}</span>
              <StarRating value={p.rating} />
            </div>
            <div className="mt-0.5 text-sm text-[#6a6a6a]">
              {p.place} · {p.duration}
            </div>
            <div className="mt-[5px] text-[15px] text-glow-ink">
              <span className="font-semibold">{p.price}</span>{' '}
              <span className="text-[#6a6a6a]">세션</span>
            </div>
          </Link>
        ))}

        <div className="h-2" />
      </div>

      <BottomTabBar locale={params.locale} active="explore" />
    </PhoneFrame>
  );
}
