import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PublicLocale } from '@/lib/i18n/locales';
import { PhoneFrame } from '../../_components/phone';
import { FEATURED_COURSE } from '../../_components/program-data';

export const metadata = { title: '4박 5일 글로우업 코스 · 예약' };

/**
 * Screen 2 — Course detail (booking).
 *
 * Single dynamic route `[id]`; today only `glowup-4n5d` resolves, but
 * the structure supports adding more courses without changing the
 * layout (just add entries to program-data.ts).
 *
 * Layout:
 *   - 300px image header with translucent back/share/heart buttons
 *     and a white status bar overlay
 *   - body: best-seller chip + h1 + rating + 5-day itinerary timeline
 *     (numbered circles, last one red for "출국")
 *   - sticky reservation bar at bottom:
 *     price + "날짜 선택" link + red "예약하기" CTA
 *
 * "예약하기" → /[locale]/inquiry?program=<course name>&interest=premium
 * so the message lands in /agency/inbox via the existing pipeline.
 */

export default function GlowupCourseDetailPage({
  params,
}: {
  params: { locale: PublicLocale; id: string };
}): JSX.Element {
  // Today's catalog only has the one bundle; 404 anything else cleanly.
  if (params.id !== FEATURED_COURSE.id) {
    notFound();
  }
  const course = FEATURED_COURSE;
  const bookHref = `/${params.locale}/inquiry?program=${encodeURIComponent(course.name)}&interest=plastic_surgery`;

  return (
    <PhoneFrame>
      {/* Image hero — 300px with overlay controls */}
      <div
        className="relative h-[300px] flex-shrink-0 bg-glow-jet"
        style={{
          backgroundImage: `url(${course.img})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 pt-3.5 text-[15px] font-semibold text-white">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px]">5G</span>
            <div className="flex h-3 w-6 items-stretch rounded-[3px] border-[1.5px] border-white p-[1.5px]">
              <div className="h-full w-[72%] rounded-[1px] bg-white" />
            </div>
          </div>
        </div>
        <div className="absolute left-0 right-0 top-[52px] flex items-center justify-between px-5">
          <Link
            href={`/${params.locale}/glowup`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[rgba(0,0,0,0.15)_0_2px_6px]"
            aria-label="뒤로"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          <div className="flex gap-2.5">
            <button
              type="button"
              aria-label="공유"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[rgba(0,0,0,0.15)_0_2px_6px]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
                <path d="M4 12v8h16v-8M12 3v13M8 7l4-4 4 4" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="즐겨찾기"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[rgba(0,0,0,0.15)_0_2px_6px]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.8">
                <path d="M12 20s-7-4.5-9.2-8.5C1.3 8.7 2.5 5.5 5.5 5.5c1.8 0 2.9 1 3.5 2 .6-1 1.7-2 3.5-2 3 0 4.2 3.2 2.7 6C19 15.5 12 20 12 20z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-white" />
          <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
          <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
        </div>
      </div>

      {/* Body */}
      <div className="px-[22px] pt-5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-glow-ink bg-white px-3 py-1.5 text-xs font-semibold text-glow-ink">
          <span style={{ color: '#ff385c' }}>★</span> 베스트셀러
        </div>
        <h1 className="mt-3.5 text-[23px] font-bold tracking-[-0.5px] text-glow-ink">
          {course.name}
        </h1>
        <div className="mt-[5px] flex items-center gap-1 text-sm text-[#6a6a6a]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#222">
            <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
          </svg>
          {course.rating} · 후기 {course.reviews}개 · 서울
        </div>

        <div className="my-5 h-px bg-[#ebebeb]" />

        <div className="mb-4 text-[17px] font-semibold text-glow-ink">5일간의 일정</div>
        <div className="flex flex-col">
          {course.itinerary.map((day, idx) => {
            const isLast = idx === course.itinerary.length - 1;
            return (
              <div key={day.n} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ background: isLast ? '#ff385c' : '#222' }}
                  >
                    {day.n}
                  </div>
                  {!isLast ? <div className="w-[2px] flex-1 bg-[#ebebeb]" /> : null}
                </div>
                <div className={isLast ? 'pb-2' : 'pb-5'}>
                  <div className="text-[15px] font-semibold text-glow-ink">{day.title}</div>
                  <div className="mt-0.5 text-[13px] leading-[1.5] text-[#6a6a6a]">
                    {day.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Padding so content doesn't slip under sticky reservation bar */}
        <div className="h-20" />
      </div>

      {/* Sticky reservation bar */}
      <div className="sticky bottom-0 flex items-center justify-between border-t border-[#ebebeb] bg-white px-[22px] pb-6 pt-3.5">
        <div>
          <div className="text-base font-bold text-glow-ink">
            ₩{course.price.toLocaleString('ko-KR')}{' '}
            <span className="text-[13px] font-normal text-[#6a6a6a]">/ 1인</span>
          </div>
          <div className="mt-0.5 text-xs text-glow-ink underline">날짜 선택</div>
        </div>
        <Link
          href={bookHref}
          className="rounded-lg px-[30px] py-3.5 text-base font-semibold text-white"
          style={{ background: '#ff385c' }}
        >
          예약하기
        </Link>
      </div>
    </PhoneFrame>
  );
}
