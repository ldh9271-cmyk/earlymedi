import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { LoginForm } from './_components/login-form';

export const metadata = { title: '로그인' };
export const dynamic = 'force-dynamic';

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

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
          의료관광 사업자 전용
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">사업자 로그인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          의료기관 · 유치업체 · 파트너업체 · 프리랜서를 위한 통합 콘솔입니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">시작하기</CardTitle>
          <CardDescription>기존 사업자 계정으로 로그인하거나 새로 가입하세요.</CardDescription>
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
              <div className="rounded-lg border bg-care-50 px-4 py-3 text-sm text-care-700">
                <p className="font-semibold">🎁 무료 체험 — 환자 10명까지</p>
                <p className="mt-1 text-xs">
                  이메일·비밀번호로 직접 가입하거나, Google · 매직링크로 가입할 수 있습니다.
                  11명째 환자 등록부터 유료 전환.
                </p>
              </div>
              <a
                href={`/signup${searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : ''}`}
                className="block w-full rounded-md bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                회원가입 페이지로 →
              </a>
              <p className="text-xs text-muted-foreground">
                또는 Google · 매직링크로 빠른 가입:
              </p>
              <LoginForm
                nextPath={searchParams.next ?? '/signup'}
                sent={searchParams.sent === '1'}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">환자이신가요?</p>
        <p className="mt-0.5">
          환자 포털에서 매직링크로 안전하게 로그인하실 수 있습니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/kr/login" className="underline-offset-2 hover:underline">한국어</Link>
          <span>·</span>
          <Link href="/en/login" className="underline-offset-2 hover:underline">English</Link>
          <span>·</span>
          <Link href="/zh/login" className="underline-offset-2 hover:underline">中文</Link>
          <span>·</span>
          <Link href="/ja/login" className="underline-offset-2 hover:underline">日本語</Link>
        </div>
      </div>

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

