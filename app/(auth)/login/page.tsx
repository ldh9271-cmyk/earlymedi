import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { LoginForm } from './_components/login-form';

export const metadata = { title: '로그인' };
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; sent?: string; code?: string; error?: string };
}): Promise<JSX.Element> {
  // Supabase magic-link / OAuth (PKCE flow) sometimes redirects back to /login
  // with `?code=...` instead of /auth/landing (Site URL fallback, allowlist
  // mismatches, etc). Handle it here so the user doesn't see the login form
  // again with a code in the URL.
  if (searchParams.code) {
    try {
      const supabase = createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(searchParams.code);
      if (!error) {
        // Session cookies are set; figure out the real destination. `next` may
        // point at /auth/landing (a transient client page) — collapse that to
        // the canonical post-login route.
        let dest = searchParams.next ?? '/select-org';
        if (dest.startsWith('/auth/landing')) dest = '/select-org';
        redirect(dest);
      }
      // On exchange error, fall through to render the login form.
    } catch (err) {
      // next/navigation `redirect()` throws internally — re-throw so the
      // redirect actually happens. Anything else (e.g. missing env) just
      // falls through to the form.
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err;
      // eslint-disable-next-line no-console
      console.warn('[login] code exchange failed:', err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          이메일로 매직링크를 받아 안전하게 접속하세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">시작하기</CardTitle>
          <CardDescription>본인 카테고리를 선택해 가입하거나, 기존 계정으로 로그인합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="pt-4">
              <LoginForm nextPath={searchParams.next ?? '/select-org'} sent={searchParams.sent === '1'} />
            </TabsContent>

            <TabsContent value="signup" className="space-y-3 pt-4">
              <p className="text-sm text-muted-foreground">가입 카테고리를 선택하세요.</p>
              <SignupOption
                href="/signup/medical"
                title="의료기관"
                description="견적 · 진료 · 시술 차트"
                color="care"
              />
              <SignupOption
                href="/signup/agency"
                title="유치업체 (Agency)"
                description="모객 · 매칭 · 결제 · 정산 · 비자 · 사후관리"
                color="brand"
              />
              <SignupOption
                href="/signup/partner"
                title="파트너업체"
                description="호텔 · 스파 · 살롱 · 식당 · 교통 · 관광"
                color="slate"
              />
              <SignupOption
                href="/signup/freelancer"
                title="프리랜서"
                description="송객 · 통역 · 코디 · 인플루언서"
                color="hospitality"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        가입 시{' '}
        <Link href="/legal/terms" className="underline">
          이용약관
        </Link>{' '}
        및{' '}
        <Link href="/legal/privacy" className="underline">
          개인정보처리방침
        </Link>
        에 동의합니다.
      </p>
    </div>
  );
}

function SignupOption({
  href,
  title,
  description,
  color,
}: {
  href: string;
  title: string;
  description: string;
  color: 'brand' | 'hospitality' | 'care' | 'slate';
}): JSX.Element {
  const ringClass = {
    brand: 'hover:ring-brand-300',
    hospitality: 'hover:ring-hospitality-300',
    care: 'hover:ring-care-300',
    slate: 'hover:ring-slate-300',
  }[color];
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-left transition ${ringClass} hover:ring-2`}
    >
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <span aria-hidden className="text-muted-foreground">
        →
      </span>
    </Link>
  );
}
