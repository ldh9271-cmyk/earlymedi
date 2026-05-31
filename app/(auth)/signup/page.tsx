import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { db } from '@/lib/db/client';
import { invites } from '@/drizzle/schema/invites';
import { organizations } from '@/drizzle/schema/organizations';
import { verifyInviteToken, hashToken } from '@/lib/auth/invite-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { QuickSignupForm } from './_components/quick-signup-form';
import { InviteSignupForm } from './_components/invite-signup-form';

export const metadata = { title: '간편 가입' };
export const dynamic = 'force-dynamic';

/**
 * Unified single-step signup. Three entry paths:
 *
 * 1) Already authenticated (came via /login → Google OAuth or magic
 *    link): collect org info + provision new organization.
 * 2) Fresh visitor (no next): collect email + password + org info,
 *    sign up, then provision a new organization.
 * 3) Invite acceptance (?next=/invite/<token>): show invite context +
 *    a compact sign-up form (email + password OR existing-account
 *    sign-in). On success the user is forwarded to /invite/<token>
 *    to confirm the team join — no new organization is created.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: { next?: string };
}): Promise<JSX.Element> {
  const next = searchParams.next ?? null;
  const isInviteFlow = next?.startsWith('/invite/') === true;

  // For the invite flow, look up the invite so the page can show
  // "Join {OrgName}" with the right context.
  let inviteContext: {
    token: string;
    invitedEmail: string;
    orgName: string;
    role: string;
  } | null = null;

  if (isInviteFlow && next) {
    const token = next.replace(/^\/invite\//, '');
    try {
      const payload = await verifyInviteToken(token);
      const hash = hashToken(token);
      const [row] = await db.select().from(invites).where(eq(invites.tokenHash, hash)).limit(1);
      if (row && !row.revokedAt && !row.acceptedAt && row.expiresAt > new Date()) {
        const [org] = await db
          .select({ name: organizations.name })
          .from(organizations)
          .where(eq(organizations.id, payload.organizationId))
          .limit(1);
        inviteContext = {
          token,
          invitedEmail: payload.invitedEmail,
          orgName: org?.name ?? '조직',
          role: payload.role,
        };
      }
    } catch {
      // Invalid token — fall through to regular signup
    }
  }

  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const alreadyAuthed = !!auth.user;
  const presetEmail = auth.user?.email ?? '';

  // If already authenticated AND it's an invite flow, jump straight to
  // the invite confirmation page (no need to re-sign-up).
  if (alreadyAuthed && isInviteFlow && next) {
    redirect(next);
  }

  // ─── Invite-acceptance signup variant ──────────────────────────
  if (inviteContext) {
    return (
      <div className="space-y-6">
        <div>
          <Badge variant="brand" className="mb-2">팀 초대</Badge>
          <h1 className="text-2xl font-bold tracking-tight">
            {inviteContext.orgName}에 합류
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong>{inviteContext.invitedEmail}</strong> 주소로 초대받으셨습니다. 계정을 만들면 자동으로
            {inviteContext.orgName}의 {labelForRole(inviteContext.role)} 권한으로 합류합니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">계정 만들기</CardTitle>
            <CardDescription>이메일·비밀번호로 가입하면 곧바로 팀에 합류됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <InviteSignupForm
              invitedEmail={inviteContext.invitedEmail}
              orgName={inviteContext.orgName}
              token={inviteContext.token}
            />
          </CardContent>
        </Card>

        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          이미 KoreaGlowUp 계정이 있으신가요?{' '}
          <Link
            href={`/login?next=/invite/${inviteContext.token}`}
            className="font-medium text-foreground underline"
          >
            로그인하고 합류 →
          </Link>
        </div>
      </div>
    );
  }

  // ─── Regular signup (already-authed or fresh visitor) ──────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KoreaGlowUp 가입</h1>
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
          <li>가입 즉시 KoreaGlowUp 전체 기능을 둘러볼 수 있습니다.</li>
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

function labelForRole(role: string): string {
  switch (role) {
    case 'owner': return '소유자';
    case 'admin': return '관리자';
    case 'manager': return '매니저';
    case 'member': return '멤버';
    case 'viewer': return '뷰어';
    default: return role;
  }
}
