import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { LoginForm } from './_components/login-form';

// absolute — 루트 레이아웃의 '· KoreaGlowUp AI Concierge' 템플릿은
// 콘솔 내부용이라, 브랜드 얼굴인 이 화면에서는 글로우업투어로 덮는다.
export const metadata = { title: { absolute: '파트너 로그인 · 글로우업투어' } };
export const dynamic = 'force-dynamic';

const CUSTOMER_LOCALES: Array<[string, string]> = [
  ['kr', '한국어'],
  ['en', 'English'],
  ['zh', '中文'],
  ['ja', '日本語'],
  ['ru', 'Русский'],
  ['vi', 'Tiếng Việt'],
];

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; sent?: string; code?: string; error?: string };
}): JSX.Element {
  // Supabase magic-link / OAuth (PKCE flow) sometimes redirects back to /login
  // with `?code=...` when the redirect_to allowlist doesn't match or Supabase
  // falls back to Site URL. We CANNOT exchange the code in this Server
  // Component — Next.js silently drops cookieStore.set in Server Components,
  // so the resulting session is invisible to the next request and the user
  // bounces right back to /login. Forward to the Route Handler, which CAN
  // write cookies, and let it redirect to `next`.
  if (searchParams.code) {
    const forward = new URL('/api/auth/callback', 'http://placeholder');
    forward.searchParams.set('code', searchParams.code);
    if (searchParams.next) {
      // Collapse legacy /auth/landing destinations to /select-org.
      const next = searchParams.next.startsWith('/auth/landing') ? '/select-org' : searchParams.next;
      forward.searchParams.set('next', next);
    }
    redirect(`/api/auth/callback?${forward.searchParams.toString()}`);
  }

  const signupHref = `/signup${searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : ''}`;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/biz"
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11.5px] font-bold text-brand-700 transition hover:bg-brand-100"
        >
          글로우업투어 파트너 센터
        </Link>
        <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-surface-ink">
          파트너 로그인
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-surface-mute">
          병원 · 뷰티샵 · 호텔 · 여행사 · 총판을 위한 통합 콘솔입니다.
        </p>
      </div>

      <Card className="rounded-2xl border-surface-line shadow-none">
        <CardContent className="pt-6">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="signup">입점 · 가입</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="pt-4">
              <LoginForm nextPath={searchParams.next ?? '/select-org'} sent={searchParams.sent === '1'} />
            </TabsContent>

            <TabsContent value="signup" className="space-y-3 pt-4">
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3.5">
                <p className="text-[13px] font-bold text-surface-ink">
                  등록 한 번으로 6개 언어 페이지에 노출됩니다
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-surface-mute">
                  상품·가격·사진을 콘솔에 올리면 승인 후 한·영·중·일·러·베 페이지가 자동
                  생성되고, 예약·다국어 결제·정산까지 플랫폼이 처리합니다.
                </p>
              </div>

              <a
                href={signupHref}
                className="block w-full rounded-full bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-brand-700"
              >
                사업자 계정 만들기 →
              </a>

              <p className="pt-1 text-[11.5px] text-surface-mute">
                또는 Google · 매직링크로 바로 시작하기
              </p>
              <LoginForm
                nextPath={searchParams.next ?? '/signup'}
                sent={searchParams.sent === '1'}
                omitPassword
              />

              <p className="border-t border-surface-line pt-3 text-[11px] leading-relaxed text-surface-mute">
                가입과 입점 신청은 무료입니다. 환자 관리(CRM)를 사용하는 의료기관·유치업체는
                가입 후 1개월간 무료로 이용하고, 이후 유료 플랜으로 전환됩니다.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-surface-line bg-surface-tint px-4 py-3.5">
        <p className="text-[12.5px] font-bold text-surface-ink">고객이신가요?</p>
        <p className="mt-0.5 text-[11.5px] text-surface-mute">
          예약 조회·상담은 글로우업투어 고객 페이지에서 이용하실 수 있습니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11.5px]">
          {CUSTOMER_LOCALES.map(([code, label], i) => (
            <span key={code} className="flex items-center gap-2">
              {i > 0 ? <span className="text-surface-line">·</span> : null}
              <Link
                href={`/${code}/login`}
                className="text-surface-mute underline-offset-2 transition hover:text-brand-700 hover:underline"
              >
                {label}
              </Link>
            </span>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-surface-mute">
        가입 시{' '}
        <Link href="/legal/terms" className="underline underline-offset-2">
          이용약관
        </Link>{' '}
        및{' '}
        <Link href="/legal/privacy" className="underline underline-offset-2">
          개인정보처리방침
        </Link>
        에 동의합니다.
      </p>
    </div>
  );
}
