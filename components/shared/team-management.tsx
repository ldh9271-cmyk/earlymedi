'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Mail, Users, Clock, Copy, X, ShieldCheck, UserPlus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  sendTeamInviteAction,
  revokeTeamInviteAction,
  type SendInviteInput,
} from '@/lib/team/actions';

type Member = {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  isOwner: boolean;
  joinedAt: Date | null;
};

type PendingInvite = {
  inviteId: string;
  email: string;
  role: string;
  invitedAt: Date;
  expiresAt: Date;
};

const ROLE_LABELS: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  manager: '매니저',
  member: '멤버',
  viewer: '뷰어',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: '거의 모든 권한 (소유권 이전 제외)',
  manager: '운영 데이터 편집 + 팀원 관리',
  member: '대부분의 화면 편집 가능',
  viewer: '읽기 전용',
};

export function TeamManagement({
  orgName,
  members: initialMembers,
  pendingInvites: initialInvites,
  canInvite,
}: {
  orgName: string;
  members: Member[];
  pendingInvites: PendingInvite[];
  canInvite: boolean;
}): JSX.Element {
  const [members] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<SendInviteInput['role']>('member');
  const [isPending, startTransition] = useTransition();
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSend(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await sendTeamInviteAction({ email, role });
        setLastInviteUrl(result.inviteUrl);
        setInvites((cur) => [
          {
            inviteId: 'temp-' + Date.now(),
            email,
            role,
            invitedAt: new Date(),
            expiresAt: result.expiresAt,
          },
          ...cur,
        ]);
        setEmail('');
        toast.success(`${email}에 초대 링크가 생성되었습니다. 링크를 복사해서 전달하세요.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '초대 발송 실패';
        setError(translateError(msg));
      }
    });
  }

  function handleRevoke(inviteId: string): void {
    if (!confirm('이 초대를 취소할까요? 링크가 무효화됩니다.')) return;
    startTransition(async () => {
      try {
        await revokeTeamInviteAction(inviteId);
        setInvites((cur) => cur.filter((i) => i.inviteId !== inviteId));
        toast.success('초대가 취소되었습니다.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '취소 실패');
      }
    });
  }

  async function copyLink(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('초대 링크를 클립보드에 복사했습니다.');
    } catch {
      toast.error('클립보드 복사 실패 — 수동으로 복사해 주세요.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">팀원 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <strong>{orgName}</strong> 에 팀원을 초대하고 권한을 관리하세요.
        </p>
      </div>

      {/* Invite form */}
      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" /> 팀원 초대
            </CardTitle>
            <CardDescription>
              이메일을 입력하면 7일간 유효한 초대 링크가 생성됩니다. 링크를 복사해서 KakaoTalk · 이메일 등으로 전달하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">이메일</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-role">권한</Label>
                  <select
                    id="invite-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as SendInviteInput['role'])}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="member">멤버 (대부분 편집)</option>
                    <option value="manager">매니저 (운영 + 팀원 관리)</option>
                    <option value="admin">관리자 (거의 전체)</option>
                    <option value="viewer">뷰어 (읽기 전용)</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {ROLE_DESCRIPTIONS[role]}
              </p>
              {error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}
              <Button type="submit" variant="brand" disabled={isPending || !email}>
                {isPending ? '발송 중…' : '초대 링크 생성'}
              </Button>
            </form>

            {/* Last-invite link callout */}
            {lastInviteUrl ? (
              <div className="mt-4 rounded-lg border border-care-300 bg-care-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-care-700">✅ 초대 링크 생성 완료</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-care-700/80">{lastInviteUrl}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(lastInviteUrl)}
                    className="shrink-0"
                  >
                    <Copy className="mr-1 h-3 w-3" /> 복사
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            팀원 초대는 소유자 · 관리자 · 매니저 권한만 가능합니다.
          </CardContent>
        </Card>
      )}

      {/* Pending invites */}
      {invites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" /> 대기 중인 초대 ({invites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites.map((inv) => {
              const daysLeft = Math.max(
                0,
                Math.ceil((inv.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
              );
              return (
                <div
                  key={inv.inviteId}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[inv.role] ?? inv.role} · {daysLeft}일 후 만료
                      </p>
                    </div>
                  </div>
                  {canInvite ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(inv.inviteId)}
                      disabled={inv.inviteId.startsWith('temp-')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {/* Current members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> 현재 멤버 ({members.length}명)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              아직 다른 멤버가 없습니다.
            </p>
          ) : (
            members.map((m) => (
              <div
                key={m.membershipId}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <span className="text-xs font-semibold">
                      {(m.fullName?.[0] ?? m.email[0] ?? '?').toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.fullName || m.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.isOwner ? 'brand' : 'slate'}>
                    {ROLE_LABELS[m.role] ?? m.role}
                  </Badge>
                  {m.status !== 'active' ? (
                    <Badge variant="hospitality">{m.status}</Badge>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function translateError(code: string): string {
  switch (code) {
    case 'unauthenticated':
      return '로그인이 필요합니다.';
    case 'no_membership':
      return '소속된 조직이 없습니다.';
    case 'insufficient_role':
      return '팀원 초대 권한이 없습니다 (소유자/관리자/매니저만 가능).';
    case 'self_invite_not_allowed':
      return '본인 이메일은 초대할 수 없습니다.';
    case 'already_member':
      return '이미 이 조직의 활성 멤버입니다.';
    case 'invite_create_failed':
      return '초대 생성 실패. 잠시 후 다시 시도해 주세요.';
    default:
      return code;
  }
}
