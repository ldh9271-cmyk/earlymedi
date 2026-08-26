'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { acceptPartnerInviteAction } from '@/lib/agency/accept-partner-invite';

/**
 * Cross-org partner-business invite acceptance form. Asks for the new
 * organization (업체) name — pre-filled from the invite metadata — and
 * submits to the server action that creates the non_medical org +
 * owner membership.
 */
export function AcceptPartnerForm({
  token,
  defaultOrgName,
  agencyName,
}: {
  token: string;
  defaultOrgName: string;
  agencyName: string;
}): JSX.Element {
  const router = useRouter();
  const [orgName, setOrgName] = useState(defaultOrgName);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (orgName.trim().length < 2) {
      toast.error('업체 이름을 2자 이상 입력해 주세요.');
      return;
    }
    start(async () => {
      try {
        const dest = await acceptPartnerInviteAction({
          token,
          orgName: orgName.trim(),
        });
        toast.success(`${agencyName}와(과)의 파트너 협력이 시작되었습니다.`, { duration: 4000 });
        router.replace(dest);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '협력 시작 실패';
        if (msg === 'invite_already_accepted') {
          toast.error('이미 수락된 초대입니다. 로그인 후 /select-org에서 조직을 선택하세요.');
        } else if (msg === 'invite_expired') {
          toast.error('초대가 만료되었습니다. Agency에 재발송을 요청해 주세요.');
        } else if (msg === 'invite_revoked') {
          toast.error('이 초대는 취소되었습니다.');
        } else {
          toast.error(msg);
        }
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="new-partner-org-name">업체 이름 (조직명)</Label>
        <Input
          id="new-partner-org-name"
          placeholder="예) 얼리호텔 명동 / 청담 뷰티살롱"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          maxLength={120}
          required
        />
        <p className="text-[10px] text-muted-foreground">
          사업자명 또는 상호. 나중에 설정에서 변경 가능합니다.
        </p>
      </div>

      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? '협력 시작 중…' : `${agencyName}와(과) 파트너 협력 시작`}
      </Button>
    </form>
  );
}
