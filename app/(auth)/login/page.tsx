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
              <div className="rounded-lg border bg-care-50 px-4 py-3 text-sm text-care-700">
                <p className="font-semibold">🎁 무료 체험 — 환자 10명까지</p>
                <p className="mt-1 text-xs">
                  이메일 또는 Google로 로그인 → 4가지 기본 정보 입력 → 바로 전체 서비스를 둘러볼 수
                  있습니다. 11명째 환자 등록부터 유료 전환.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                먼저 로그인하시면 가입 페이지(/signup)로 자동 안내됩니다.
              </p>
              <LoginForm nextPath="/signup" sent={searchParams.sent === '1'} />
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

