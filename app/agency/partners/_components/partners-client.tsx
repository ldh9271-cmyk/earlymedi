'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Mail,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import {
  revokePartnerInviteAction,
  sendPartnerInviteAction,
  type PartnerInviteResult,
  type PartnerPendingInviteRow,
  type PartnerRow,
} from '@/lib/agency/partner-invites-actions';
import {
  PARTNER_SUBTYPES,
  PARTNER_SUBTYPE_EMOJI,
  PARTNER_SUBTYPE_LABEL_KO,
  type PartnerSubtype,
} from '@/lib/agency/partner-subtypes';

/**
 * Client orchestrator for /agency/partners. Directory of non-medical
 * partner businesses + the invite modal. Pattern mirrors
 * freelancers-client.tsx (invite → success modal with one-time URL).
 */
export function PartnersClient({
  initialPartners,
  initialPending,
}: {
  initialPartners: PartnerRow[];
  initialPending: PartnerPendingInviteRow[];
}): JSX.Element {
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [inviteResult, setInviteResult] = useState<PartnerInviteResult | null>(null);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            등록 파트너 <strong className="text-foreground">{initialPartners.length}</strong>
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
          파트너 초대
        </Button>
      </div>

      {/* Partner directory */}
      <section>
        <h2 className="mb-2 text-sm font-bold">파트너업체 디렉토리</h2>
        {initialPartners.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-muted/20 p-8 text-center text-sm">
            <Building2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
            <p className="font-semibold">아직 등록된 파트너업체가 없습니다</p>
            <p className="mt-1 text-xs text-muted-foreground">
              위의 &quot;파트너 초대&quot; 버튼으로 호텔·스파·살롱 등 협력 업체를 온보딩하세요.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {initialPartners.map((p) => (
              <Card key={p.orgId}>
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="hospitality" className="text-[10px]">
                          {p.subtype
                            ? `${PARTNER_SUBTYPE_EMOJI[p.subtype]} ${PARTNER_SUBTYPE_LABEL_KO[p.subtype]}`
                            : '🤝 파트너'}
                        </Badge>
                        {p.myBookingCount > 0 ? (
                          <Badge variant="brand" className="text-[10px]">협력 중</Badge>
                        ) : null}
                      </div>
                      <h3 className="mt-1 truncate text-sm font-semibold">{p.name}</h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {new Date(p.createdAt).toISOString().slice(0, 10)} 등록
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 border-t pt-2.5 text-center">
                    <Stat label="시설" value={p.facilityCount} />
                    <Stat label="서비스" value={p.serviceCount} />
                    <Stat label="리스팅" value={p.approvedListingCount} />
                    <Stat
                      label="예약"
                      value={p.totalBookingCount}
                      hint={p.myBookingCount > 0 ? `우리 송객 ${p.myBookingCount}` : undefined}
                    />
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

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}): JSX.Element {
  return (
    <div>
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      {hint ? <div className="text-[9px] text-brand-600">{hint}</div> : null}
    </div>
  );
}

function PendingInviteCard({ row }: { row: PartnerPendingInviteRow }): JSX.Element {
  const [pending, start] = useTransition();
  function onRevoke(): void {
    if (!confirm(`"${row.email}" 초대를 취소할까요?`)) return;
    start(async () => {
      try {
        await revokePartnerInviteAction(row.inviteId);
        toast.success('초대를 취소했습니다.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '취소 실패');
      }
    });
  }
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(row.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{row.email}</span>
            <Badge variant="outline" className="text-[10px]">{row.partnerName}</Badge>
            {row.subtype ? (
              <Badge variant="outline" className="text-[10px]">
                {PARTNER_SUBTYPE_LABEL_KO[row.subtype]}
              </Badge>
            ) : null}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{daysLeft}일 후 만료</div>
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
  onSuccess: (result: PartnerInviteResult) => void;
}): JSX.Element {
  const [email, setEmail] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [subtype, setSubtype] = useState<PartnerSubtype>('hotel');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!email.includes('@')) {
      toast.error('유효한 이메일을 입력해 주세요.');
      return;
    }
    if (partnerName.trim().length < 2) {
      toast.error('업체 이름을 2자 이상 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const result = await sendPartnerInviteAction({
        email: email.toLowerCase().trim(),
        partnerName: partnerName.trim(),
        subtype,
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
          <h2 className="text-sm font-semibold">파트너업체 초대</h2>
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
            💡 초대받은 업체는 자신의 파트너 조직을 새로 만들고 파트너 콘솔에서 시설·예약·정산을
            직접 관리합니다.
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pinv-email">담당자 이메일 *</Label>
            <Input
              id="pinv-email"
              type="email"
              inputMode="email"
              placeholder="manager@hotel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pinv-name">업체 이름 *</Label>
            <Input
              id="pinv-name"
              placeholder="예) 얼리호텔 명동 / 청담 뷰티살롱"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              maxLength={120}
              required
            />
            <p className="text-[10px] text-muted-foreground">
              업체가 가입 후 조직 이름으로 사용. 가입 시 수정 가능.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pinv-subtype">업종 *</Label>
            <select
              id="pinv-subtype"
              value={subtype}
              onChange={(e) => setSubtype(e.target.value as PartnerSubtype)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {PARTNER_SUBTYPES.map((s) => (
                <option key={s} value={s}>
                  {PARTNER_SUBTYPE_EMOJI[s]} {PARTNER_SUBTYPE_LABEL_KO[s]}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              업종에 따라 파트너가 만들 수 있는 리스팅 카테고리가 정해집니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pinv-notes" className="text-xs">메모 (선택)</Label>
            <textarea
              id="pinv-notes"
              rows={2}
              placeholder="협력 조건, 담당자 정보 등"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
            />
          </div>

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
  result: PartnerInviteResult;
  onClose: () => void;
}): JSX.Element {
  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('URL 복사 완료');
    } catch {
      toast.error('복사 실패 — 수동으로 복사해 주세요.');
    }
  }
  const days = Math.ceil(
    (new Date(result.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
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
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-xs text-muted-foreground">
            아래 링크를 업체 담당자에게 이메일·카카오톡으로 보내주세요. 링크는 {days}일 후
            만료됩니다.
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs">초대 URL</Label>
            <div className="flex items-center gap-1.5">
              <Input value={result.inviteUrl} readOnly className="font-mono text-[11px]" />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy(result.inviteUrl)}
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
