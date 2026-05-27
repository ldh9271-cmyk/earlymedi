import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { verifyInviteToken, hashToken } from '@/lib/auth/invite-tokens';
import { db } from '@/lib/db/client';
import { invites } from '@/drizzle/schema/invites';
import { organizations } from '@/drizzle/schema/organizations';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { ACCOUNT_TYPE_LABEL_KO } from '@/lib/auth/account-types';
import { AcceptInviteForm } from './_components/accept-invite-form';
import { AcceptFreelancerForm } from './_components/accept-freelancer-form';

export const metadata = { title: '초대 수락' };
export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  manager: '매니저',
  member: '멤버',
  viewer: '뷰어',
};

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}): Promise<JSX.Element> {
  // 1. Verify the JWT signature + expiry
  let payload: Awaited<ReturnType<typeof verifyInviteToken>>;
  try {
    payload = await verifyInviteToken(params.token);
  } catch {
    return errorCard('유효하지 않은 초대', '초대 링크가 만료되었거나 잘못된 형식입니다.');
  }

  // 2. Cross-check the stored row state
  const hash = hashToken(params.token);
  const [row] = await db.select().from(invites).where(eq(invites.tokenHash, hash)).limit(1);
  if (!row || row.revokedAt || row.acceptedAt || row.expiresAt < new Date()) {
    return errorCard('사용할 수 없는 초대', '이미 수락되었거나 만료/취소된 초대입니다.');
  }

  const [org] = await db
    .select({ name: organizations.name, accountType: organizations.accountType })
    .from(organizations)
    .where(eq(organizations.id, row.organizationId))
    .limit(1);

  // 3. If not logged in, give the visitor TWO choices: log in (existing
  //    account) or sign up (new account). Both preserve next= so they
  //    land back here. Forward to /signup by default since most invitees
  //    are first-time users — /signup detects the invite flow and shows
  //    the slim InviteSignupForm instead of the full org-creation form.
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    const nextPath = `/invite/${params.token}`;
    redirect(`/signup?next=${encodeURIComponent(nextPath)}`);
  }

  // 4. Logged-in — branch on invite kind.
  //    - intendedAccountType='freelancer' → create a NEW freelancer org
  //      and link via freelancer_affiliations (cross-org flow).
  //    - else → join the existing org as a team member (same-org flow).
  const accountTypeLabel = org?.accountType ? ACCOUNT_TYPE_LABEL_KO[org.accountType] : '조직';
  const isFreelancerAffiliation = payload.intendedAccountType === 'freelancer';
  const meta = (row.metadata ?? {}) as {
    freelancerName?: string;
    referralCode?: string;
  };

  if (isFreelancerAffiliation) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Badge variant="hospitality" className="mb-2 w-fit">
              프리랜서 협력 초대
            </Badge>
            <CardTitle className="text-xl">
              {org?.name ?? '조직'}와(과) 협력 시작
            </CardTitle>
            <CardDescription>
              초대해 주신 Agency: <strong className="text-foreground">{org?.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-hospitality-200 bg-hospitality-50 px-3 py-2.5 text-xs text-hospitality-900">
              <p className="font-semibold">📝 이렇게 됩니다</p>
              <ul className="mt-1 space-y-0.5 pl-3 list-disc">
                <li>본인 소유의 프리랜서 조직이 새로 생성됩니다 (owner 권한)</li>
                <li>Agency와 자동 연결 + referral_code 발급</li>
                {meta.referralCode ? (
                  <li>
                    발급될 코드:{' '}
                    <code className="rounded bg-white px-1 font-mono">{meta.referralCode}</code>
                  </li>
                ) : null}
                <li>본인 추천 코드로 들어온 환자가 자동 정산 추적됨</li>
              </ul>
            </div>

            {payload.invitedEmail.toLowerCase() !== (auth.user.email ?? '').toLowerCase() ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                ⚠️ 초대받은 이메일 ({payload.invitedEmail})과 로그인 이메일이 다릅니다.
                계속 진행하면 현재 로그인된 계정으로 새 조직이 생성됩니다.
              </div>
            ) : null}

            <AcceptFreelancerForm
              token={params.token}
              defaultOrgName={meta.freelancerName ?? ''}
              agencyName={org?.name ?? '협력 Agency'}
            />

            <p className="text-center text-[11px] text-muted-foreground">
              협력 시작 시 EarlyMedi 이용약관 · 개인정보처리방침에 동의합니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default — same-org team invite
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Badge variant="brand" className="mb-2 w-fit">팀원 초대</Badge>
          <CardTitle className="text-xl">{org?.name ?? '조직'}에 합류</CardTitle>
          <CardDescription>
            {accountTypeLabel} · 역할:{' '}
            <strong className="text-foreground">{ROLE_LABELS[payload.role] ?? payload.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-care-50 px-3 py-2.5 text-xs text-care-700">
            <p className="font-semibold">초대 대상: {payload.invitedEmail}</p>
            <p className="mt-0.5 text-care-700/80">
              로그인하신 계정 ({auth.user.email}) 으로 합류합니다.
            </p>
          </div>

          {payload.invitedEmail.toLowerCase() !== (auth.user.email ?? '').toLowerCase() ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              ⚠️ 초대받은 이메일 ({payload.invitedEmail})과 로그인 이메일이 다릅니다.
              계속 진행하면 현재 로그인된 계정이 합류합니다.
            </div>
          ) : null}

          <AcceptInviteForm token={params.token} />

          <p className="text-center text-[11px] text-muted-foreground">
            합류 시 EarlyMedi 이용약관 · 개인정보처리방침에 동의합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function errorCard(title: string, body: string): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-3 p-8 text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
