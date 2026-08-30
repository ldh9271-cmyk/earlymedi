import Link from 'next/link';
import { BrandLockup } from '@/app/[locale]/_components/brand-mark';

/**
 * 사업자(파트너) 인증 화면 셸 — 로그인·가입·초대·조직선택 공통.
 *
 * 이 화면은 /biz 파트너 랜딩에서 넘어오는 첫 화면이므로 같은 디자인
 * 언어를 쓴다: glow-up 로즈 로크업, 라운드 카드, 필 버튼, 화이트 배경.
 * (예전에는 인디고 그라디언트 + "환자의 첫 문의부터…" 카피여서 병원
 * CRM 처럼 보였고, 호텔·뷰티샵·총판 파트너에게는 맞지 않았다.)
 *
 * 좌측 레일은 lg 이상에서만 보인다. 그 아래에서는 상단 바로 접힌다.
 */

const PARTNER_TYPES: Array<{ emoji: string; title: string; sub: string }> = [
  { emoji: '🏥', title: '병원 · 클리닉', sub: '성형 · 피부 · 치과 · 검진 · 한방' },
  { emoji: '💇', title: '뷰티 · 라이프스타일', sub: '헤어 · 메이크업 · 네일 · 스튜디오' },
  { emoji: '🏨', title: '호텔 · 여행 · 맛집', sub: '숙박 · 투어 · 다이닝 · 교통' },
  { emoji: '🌏', title: '총판 · 에이전시', sub: '국내 · 해외 모객 파트너' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ── 좌측 레일 — 브랜드 (lg+) ───────────────────────────── */}
      {/* sticky + h-screen — /signup 처럼 우측이 길어지는 화면에서도 레일이
          늘어나 내용이 위아래로 벌어지지 않게 뷰포트에 고정한다. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-tour-line bg-gradient-to-b from-tour-50 to-white px-12 py-12 lg:sticky lg:top-0 lg:flex lg:h-screen">
        {/* 은은한 로즈 글로우 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-tour-100/60 blur-3xl"
        />

        <div className="relative flex items-baseline gap-2.5">
          <Link href="/kr" aria-label="글로우업투어" className="flex items-center">
            <BrandLockup height={30} color="#ff385c" />
          </Link>
          <span className="text-[13px] font-bold tracking-wide text-tour-mute">for Business</span>
        </div>

        <div className="relative max-w-lg space-y-7">
          <div className="space-y-4">
            <h1 className="text-balance text-[40px] font-extrabold leading-[1.15] tracking-tight text-tour-ink">
              외국인 고객은
              <br />
              글로우업투어가
              <br />
              데려다드립니다
            </h1>
            <p className="text-balance text-[15px] leading-relaxed text-tour-mute">
              6개 언어 사이트와 AI 상담·컨시어지가 모객부터 예약·결제·통역까지 대신합니다.
              파트너 콘솔에서 상품·예약·정산을 한곳에서 관리하세요.
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-2.5">
            {PARTNER_TYPES.map((p) => (
              <li
                key={p.title}
                className="rounded-2xl border border-tour-line bg-white/80 px-4 py-3.5 backdrop-blur"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-lg leading-none">
                    {p.emoji}
                  </span>
                  <span className="text-[13.5px] font-bold text-tour-ink">{p.title}</span>
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-tour-mute">{p.sub}</p>
              </li>
            ))}
          </ul>

          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              ['115', '제휴 병원 · 클리닉'],
              ['118', '뷰티 · 여행 상품'],
              ['6', '개 언어 서비스'],
              ['24/7', 'AI 컨시어지'],
            ].map(([n, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block text-2xl font-extrabold leading-none text-tour-500">{n}</span>
                  <span className="mt-1 block text-[11.5px] text-tour-mute">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative space-y-2">
          <p className="text-[11.5px] font-medium text-tour-ink">
            보건복지부 등록 외국인환자 유치업자가 운영합니다
          </p>
          <p className="text-[11px] text-tour-mute">
            © {new Date().getFullYear()} GlowUpTour · 의료법 27조의2 외국인환자 유치 광고
            가이드라인 준수
          </p>
        </div>
      </aside>

      {/* ── 우측 — 폼 ─────────────────────────────────────────── */}
      <main className="flex min-h-screen flex-col">
        {/* 모바일 상단 바 — 좌측 레일이 접힐 때의 브랜드 자리 */}
        <div className="flex items-center justify-between border-b border-tour-line px-6 py-4 lg:hidden">
          <Link href="/kr" aria-label="글로우업투어" className="flex items-center">
            <BrandLockup height={26} color="#ff385c" />
          </Link>
          <span className="text-xs font-bold tracking-wide text-tour-mute">for Business</span>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
