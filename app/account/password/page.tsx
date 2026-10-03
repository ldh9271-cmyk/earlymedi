import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import PasswordChangeForm from '@/app/[locale]/(public-portal)/account/password/_components/password-change-form';

export const dynamic = 'force-dynamic';

/**
 * 사업자 콘솔용 비밀번호 변경 (한국어). 임시 비밀번호로 로그인한 계정(must_change_password)이
 * 콘솔 로그인 직후 오는 화면 — 로직은 공개 포털의 /[locale]/account/password 와 같다.
 */
const COPY = {
  newPassword: '새 비밀번호', confirm: '새 비밀번호 확인', submit: '비밀번호 변경', saving: '변경 중…',
  tooShort: '비밀번호는 8자 이상이어야 합니다.', mismatch: '두 비밀번호가 일치하지 않습니다.',
  same: '이전과 다른 비밀번호를 입력해 주세요.', failed: '비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.',
  done: '비밀번호가 변경되었습니다.',
};

export default async function ConsolePasswordPage({ searchParams }: { searchParams: { next?: string } }): Promise<JSX.Element> {
  const next = searchParams.next && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '/select-org';
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const mustChange = Boolean((user?.user_metadata as Record<string, unknown> | undefined)?.must_change_password);

  return (
    <main className="flex min-h-screen items-start justify-center bg-muted/30 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-bold">비밀번호 변경</h1>
        {!user ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">로그인이 필요합니다.</p>
            <Link href="/login?next=%2Faccount%2Fpassword" className="mt-4 inline-block text-sm font-semibold text-brand-600">로그인하기 →</Link>
          </>
        ) : (
          <>
            {mustChange ? (
              <p className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">임시 비밀번호로 로그인하셨습니다. 계속 쓰려면 새 비밀번호를 정해 주세요.</p>
            ) : null}
            <p className="mb-5 mt-2 text-sm text-muted-foreground">새 비밀번호를 정해 주세요. 8자 이상이어야 합니다.</p>
            <PasswordChangeForm copy={COPY} next={next} />
          </>
        )}
      </div>
    </main>
  );
}
