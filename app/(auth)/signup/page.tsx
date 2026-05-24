import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { QuickSignupForm } from './_components/quick-signup-form';

export const metadata = { title: '간편 가입' };
export const dynamic = 'force-dynamic';

/**
 * Unified single-step signup. Replaces the old per-actor wizards
 * (/signup/agency, /signup/medical, /signup/freelancer, /signup/partner)
 * — each of which used to demand tax IDs, banking, plan selection, etc.
 *
 * Two entry paths supported:
 *   1) Already authenticated (came via /login → Google OAuth or magic
 *      link): the form skips the email + password fields and just
 *      collects org/contact info.
 *   2) Fresh visitor: the form shows email + password (+ confirm) fields
 *      and the server action calls supabase.auth.signUp() before
 *      provisioning the org.
 *
 * Detailed info (sales tax, licenses, banking, verification docs) is
 * collected later from the dashboard's Settings → Compliance flow.
 */
export default async function SignupPage(): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const alreadyAuthed = !!auth.user;
  const presetEmail = auth.user?.email ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">EarlyMedi 가입</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {alreadyAuthed
            ? '기본 정보 4가지만 입력하시면 바로 둘러볼 수 있습니다. 환자 10명까지 무료, 그 이후는 유료 전환.'
            : '이메일·비밀번호로 가입하거나, 우측 상단 로그인에서 Google·매직링크를 이용할 수 있습니다. 환자 10명까지 무료.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">계정 + 조직 정보</CardTitle>
          <CardDescription>
            {alreadyAuthed
              ? '가입한 카테고리에 맞는 대시보드로 자동 진입합니다.'
              : '이메일/비밀번호로 계정을 만들고, 곧바로 조직 정보를 입력하시면 가입이 완료됩니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuickSignupForm email={presetEmail} alreadyAuthed={alreadyAuthed} />
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-care-50 px-4 py-3 text-sm text-care-700">
        <p className="font-medium">🎁 무료 체험 안내</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
          <li>가입 즉시 EarlyMedi 전체 기능을 둘러볼 수 있습니다.</li>
          <li>
            <strong>환자 10명까지 등록 무료</strong> — 인박스 · CRM · AI 시술 차트 · 케이스 · 정산 · 사후관리 모두 포함
          </li>
          <li>11명째 환자 등록 시점에 유료 플랜으로 전환 안내가 표시됩니다.</li>
          <li>세금 · 은행 · 사업자 등록 정보는 가입 후 설정에서 추가하시면 됩니다.</li>
        </ul>
      </div>
    </div>
  );
}
