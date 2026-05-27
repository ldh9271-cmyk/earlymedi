'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Mail,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import {
  revokeFreelancerInviteAction,
  sendFreelancerInviteAction,
  type AffiliationRow,
  type FreelancerInviteResult,
  type PendingInviteRow,
} from '@/lib/agency/freelancer-invites-actions';

/**
 * Client orchestrator for /agency/freelancers. Shows the two lists +
 * the invite modal. After a successful invite send, we POP a second
 * modal showing the generated link + referral code so the operator can
 * copy them — the raw token only exists at this moment.
 */
export function FreelancersClient({
  initialActive,
  initialPending,
}: {
  initialActive: AffiliationRow[];
  initialPending: PendingInviteRow[];
}): JSX.Element {
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [inviteResult, setInviteResult] = useState<FreelancerInviteResult | null>(null);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            활성 협력 <strong className="text-foreground">{initialActive.length}</strong>
          </span>
          {initialPending.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              대기 중 초대 <strong className="text-foreground">{initialPending.length}</strong>
            </span>
          ) : null}
        </div>
        <Button variant="brand" size="sm" onClick={() => setInviteOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          프리랜서 초대
        </Button>
      </div>

      {/* Active affiliations */}
      <section>
        <h2 className="mb-2 text-sm font-bold">활성 협력 프리랜서</h2>
        {initialActive.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-muted/20 p-8 text-center text-sm">
            <Users className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
            <p className="font-semibold">아직 협력 중인 프리랜서가 없습니다</p>
            <p className="mt-1 text-xs text-muted-foreground">
              위의 &quot;프리랜서 초대&quot; 버튼을 눌러 첫 협력을 시작하세요.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {initialActive.map((a) => (
              <Card key={a.id} className={!a.isActive ? 'opacity-60' : ''}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="hospitality" className="text-[10px]">
                          프리랜서
                        </Badge>
                        {!a.isActive ? (
                          <Badge variant="outline" className="text-[10px]">중단</Badge>
                        ) : null}
                        {!a.contractSignedAt ? (
                          <Badge variant="outline" className="text-[10px]">계약 미체결</Badge>
                        ) : null}
                      </div>
                      <h3 className="mt-1 truncate text-sm font-semibold">
                        {a.freelancerOrgName}
                      </h3>
                      <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="text-[10px] uppercase tracking-wider">코드</span>
                        <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono">
                          {a.referralCode}
                        </code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Pending invites */}
      {initialPending.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold">발송된 초대 (수락 대기)</h2>
          <div className="space-y-2">
            {initialPending.map((p) => (
              <PendingInviteCard key={p.inviteId} row={p} />
            ))}
          </div>
        </section>
      ) : null}

      {isInviteOpen ? (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onSuccess={(result) => {
            setInviteOpen(false);
            setInviteResult(result);
          }}
        />
      ) : null}

      {inviteResult ? (
        <InviteSuccessModal result={inviteResult} onClose={() => setInviteResult(null)} />
      ) : null}
    </>
  );
}

function PendingInviteCard({ row }: { row: PendingInviteRow }): JSX.Element {
  const [pending, start] = useTransition();
  function onRevoke(): void {
    if (!confirm(`"${row.email}" 초대를 취소할까요? 같은 사람을 다시 초대하려면 새 코드가 발급됩니다.`)) {
      return;
    }
    start(async () => {
      try {
        await revokeFreelancerInviteAction(row.inviteId);
        toast.success('초대를 취소했습니다.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '취소 실패');
      }
    });
  }
  const daysLeft = Math.max(
    0,
    Math.ceil((row.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{row.email}</span>
            <Badge variant="outline" className="text-[10px]">
              {row.freelancerName}
            </Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <code className="rounded bg-muted/40 px-1.5 py-0.5 font-mono">
              {row.referralCode}
            </code>
            <span>· {daysLeft}일 후 만료</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRevoke}
          disabled={pending}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="초대 취소"
          aria-label="초대 취소"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}

function InviteModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (result: FreelancerInviteResult) => void;
}): JSX.Element {
  const [email, setEmail] = useState('');
  const [freelancerName, setFreelancerName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!email.includes('@')) {
      toast.error('유효한 이메일을 입력해 주세요.');
      return;
    }
    if (freelancerName.trim().length < 2) {
      toast.error('프리랜서 이름/조직명을 2자 이상 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const result = await sendFreelancerInviteAction({
        email: email.toLowerCase().trim(),
        freelancerName: freelancerName.trim(),
        referralCode: customCode.trim().toUpperCase() || undefined,
        notes: notes.trim() || null,
      });
      onSuccess(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '초대 발송 실패');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-y-auto rounded-xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold">프리랜서 초대</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          <div className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-900">
            💡 초대받은 프리랜서는 자신의 조직을 새로 만들고 owner 권한을 받습니다. 같은 회사
            직원이라면 <a href="/agency/team" className="underline font-medium">팀원 관리</a>에서
            초대하세요.
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-email">프리랜서 이메일 *</Label>
            <Input
              id="inv-email"
              type="email"
              inputMode="email"
              placeholder="freelancer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-name">프리랜서 이름 / 조직명 *</Label>
            <Input
              id="inv-name"
              placeholder="예) 이지영 (코디네이터) / 메디투어즈"
              value={freelancerName}
              onChange={(e) => setFreelancerName(e.target.value)}
              maxLength={120}
              required
            />
            <p className="text-[10px] text-muted-foreground">
              프리랜서가 가입 후 자신의 조직 이름으로 사용. 가입 시 수정 가능.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            {showAdvanced ? '▾' : '▸'} 고급 설정 (referral code, 메모)
          </button>

          {showAdvanced ? (
            <div className="space-y-3 rounded-md border bg-muted/10 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-code" className="text-xs">
                  Referral Code (선택)
                </Label>
                <Input
                  id="inv-code"
                  placeholder="비워두면 자동 생성 (예: F-A7K3PR)"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  maxLength={20}
                  className="font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  영문 대문자/숫자/- 4-20자. 자동 생성을 추천 (오타 위험 없음).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-notes" className="text-xs">메모 (선택)</Label>
                <textarea
                  id="inv-notes"
                  rows={2}
                  placeholder="협력 조건, 첫 캠페인 등"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  className="min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving ? '발송 중…' : '초대 발송'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteSuccessModal({
  result,
  onClose,
}: {
  result: FreelancerInviteResult;
  onClose: () => void;
}): JSX.Element {
  async function copy(text: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} 복사 완료`);
    } catch {
      toast.error('복사 실패 — 수동으로 복사해 주세요.');
    }
  }
  const days = Math.ceil((result.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Check className="h-4 w-4 text-care-600" />
            초대 발송 완료
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-xs text-muted-foreground">
            아래 링크를 프리랜서에게 이메일·카카오톡으로 보내주세요. 링크는 {days}일 후 만료됩니다.
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs">초대 URL</Label>
            <div className="flex items-center gap-1.5">
              <Input value={result.inviteUrl} readOnly className="font-mono text-[11px]" />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy(result.inviteUrl, 'URL을')}
              >
                <Copy className="mr-1 h-3 w-3" />
                복사
              </Button>
              <a
                href={result.inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border p-1.5 text-muted-foreground hover:text-foreground"
                title="새 창에서 미리보기"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">발급된 Referral Code</Label>
            <div className="flex items-center gap-1.5">
              <code className="block flex-1 rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm tracking-wider">
                {result.referralCode}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy(result.referralCode, '코드를')}
              >
                <Copy className="mr-1 h-3 w-3" />
                복사
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              프리랜서가 수락하면 이 코드로 freelancer_affiliations 행이 자동 생성됩니다.
            </p>
          </div>

          <div className="rounded-md border bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground">
            ⚠️ URL은 한 번만 표시됩니다. 잃어버리면 초대를 취소하고 다시 발송해야 합니다.
          </div>

          <div className="flex justify-end border-t pt-3">
            <Button type="button" variant="brand" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
