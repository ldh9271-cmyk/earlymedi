import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { verifyInviteToken, hashToken } from '@/lib/auth/invite-tokens';
import { db } from '@/lib/db/client';
import { invites } from '@/drizzle/schema/invites';
import { organizations } from '@/drizzle/schema/organizations';

export const metadata = { title: '초대 수락' };

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}): Promise<JSX.Element> {
  let payload: Awaited<ReturnType<typeof verifyInviteToken>> | null = null;
  try {
    payload = await verifyInviteToken(params.token);
  } catch {
    return (
      <Card>
        <CardContent className="space-y-3 p-8 text-center">
          <h1 className="text-lg font-semibold">유효하지 않은 초대</h1>
          <p className="text-sm text-muted-foreground">
            초대 링크가 만료되었거나 잘못된 형식입니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Cross-check stored hash + revoke/accept state
  const hash = hashToken(params.token);
  const [row] = await db.select().from(invites).where(eq(invites.tokenHash, hash)).limit(1);
  if (!row || row.revokedAt || row.acceptedAt || row.expiresAt < new Date()) {
    return (
      <Card>
        <CardContent className="space-y-3 p-8 text-center">
          <h1 className="text-lg font-semibold">사용할 수 없는 초대</h1>
          <p className="text-sm text-muted-foreground">
            이미 수락되었거나 만료/취소된 초대입니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, row.organizationId)).limit(1);

  const targetSignup = payload.intendedAccountType
    ? `/signup/${payload.intendedAccountType === 'non_medical' ? 'partner' : payload.intendedAccountType}?invite=${params.token}&agency=${row.organizationId}`
    : `/login?next=${encodeURIComponent('/select-org')}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{org?.name ?? '조직'}의 초대</CardTitle>
        <CardDescription>
          역할: <strong>{payload.role}</strong> · 카테고리: {payload.intendedAccountType ?? 'agency'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {payload.invitedEmail} 주소로 발송된 초대입니다. 가입 후 자동으로 조직에 연결됩니다.
        </p>
        <Link href={targetSignup}>
          <Button variant="brand" className="w-full">
            초대 수락하고 가입
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
