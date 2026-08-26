'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, FileText, Inbox, Send, Trophy, X } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import {
  acceptQuoteAction,
  recordQuoteAction,
  rejectQuoteAction,
  sendRfqAction,
} from '../actions';
import type { QuoteCaseRow, QuoteRow } from '@/lib/db/repositories/quotes';

/**
 * RFQ · 견적 워크스페이스 클라이언트. 케이스별 카드에 병원 견적 슬롯을
 * 비교 테이블로 깔고, RFQ 발송 / 견적 입력 / 수락 / 탈락을 모달·버튼으로
 * 처리한다. 모든 변경은 서버 액션 → 케이스 타임라인에도 기록된다.
 */

const STAGE_LABEL: Record<string, string> = {
  scoping: '초기 상담',
  rfq_sent: 'RFQ 발송',
  quoted: '견적 수신',
  accepted: '견적 수락',
};

const STATUS_META: Record<string, { label: string; variant: 'brand' | 'hospitality' | 'care' | 'destructive' | 'outline' }> = {
  requested: { label: '응답 대기', variant: 'outline' },
  received: { label: '수신', variant: 'brand' },
  selected: { label: '수락 ✓', variant: 'care' },
  rejected: { label: '탈락', variant: 'destructive' },
  expired: { label: '만료', variant: 'outline' },
};

function won(n: number | null): string {
  return n == null ? '—' : `₩${n.toLocaleString('ko-KR')}`;
}

function isExpiring(q: QuoteRow): boolean {
  if (q.status !== 'received' || !q.validUntil) return false;
  const d = new Date(`${q.validUntil}T23:59:59+09:00`).getTime() - Date.now();
  return d > 0 && d < 7 * 24 * 60 * 60 * 1000;
}

export function QuotesClient({
  initialCases,
  hospitalOptions,
}: {
  initialCases: QuoteCaseRow[];
  hospitalOptions: Array<{ id: string; name: string }>;
}): JSX.Element {
  const [rfqCase, setRfqCase] = useState<QuoteCaseRow | null>(null);
  const [recordTarget, setRecordTarget] = useState<{ c: QuoteCaseRow; q: QuoteRow } | null>(null);

  const stats = useMemo(() => {
    const all = initialCases.flatMap((c) => c.quotes);
    return {
      waiting: all.filter((q) => q.status === 'requested').length,
      received: all.filter((q) => q.status === 'received').length,
      expiring: all.filter(isExpiring).length,
      selected: all.filter((q) => q.status === 'selected').length,
    };
  }, [initialCases]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Send className="h-4 w-4" />} label="응답 대기 RFQ" value={stats.waiting} />
        <StatCard icon={<Inbox className="h-4 w-4" />} label="수신 견적" value={stats.received} />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="만료 임박 (7일)"
          value={stats.expiring}
          highlight={stats.expiring > 0}
        />
        <StatCard icon={<Trophy className="h-4 w-4" />} label="수락된 견적" value={stats.selected} />
      </div>

      {initialCases.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed bg-muted/20 p-10 text-center text-sm">
          <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
          <p className="font-semibold">견적 진행 중인 케이스가 없습니다</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <Link href="/agency/cases" className="font-medium underline">케이스 보드</Link>
            에서 환자 케이스를 만들면 여기서 RFQ 발송 → 견적 비교 → 수락까지 진행할 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {initialCases.map((c) => (
            <CaseQuoteCard
              key={c.id}
              c={c}
              onOpenRfq={() => setRfqCase(c)}
              onRecord={(q) => setRecordTarget({ c, q })}
            />
          ))}
        </div>
      )}

      {rfqCase ? (
        <RfqModal
          c={rfqCase}
          hospitalOptions={hospitalOptions}
          onClose={() => setRfqCase(null)}
        />
      ) : null}

      {recordTarget ? (
        <RecordQuoteModal
          c={recordTarget.c}
          q={recordTarget.q}
          onClose={() => setRecordTarget(null)}
        />
      ) : null}
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}): JSX.Element {
  return (
    <Card className={highlight ? 'border-amber-300 bg-amber-50/50' : ''}>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <div className="text-lg font-bold leading-tight">{value}</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function CaseQuoteCard({
  c,
  onOpenRfq,
  onRecord,
}: {
  c: QuoteCaseRow;
  onOpenRfq: () => void;
  onRecord: (q: QuoteRow) => void;
}): JSX.Element {
  const router = useRouter();
  const [pending, start] = useTransition();
  // 네이티브 confirm/prompt 는 탭을 블록하므로 인라인 확인 모달을 쓴다.
  const [confirmTarget, setConfirmTarget] = useState<{ kind: 'accept' | 'reject'; q: QuoteRow } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 수신 견적 낮은 금액 우선, 그 외 상태는 뒤로.
  const sorted = [...c.quotes].sort((a, b) => {
    const rank = (q: QuoteRow): number =>
      q.status === 'selected' ? 0 : q.status === 'received' ? 1 : q.status === 'requested' ? 2 : 3;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return (a.totalKrw ?? Infinity) - (b.totalKrw ?? Infinity);
  });
  const lowestReceived = sorted.find((q) => q.status === 'received')?.totalKrw ?? null;

  function runConfirmed(): void {
    const target = confirmTarget;
    if (!target) return;
    setConfirmTarget(null);
    start(async () => {
      try {
        if (target.kind === 'accept') {
          await acceptQuoteAction({ caseId: c.id, quoteId: target.q.id });
          toast.success(`${target.q.hospitalName} 견적을 수락했습니다.`);
        } else {
          await rejectQuoteAction({
            caseId: c.id,
            quoteId: target.q.id,
            reason: rejectReason.trim() || undefined,
          });
          toast.success('탈락 처리했습니다.');
        }
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '처리 실패');
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">{c.caseNumber}</span>
              <Badge variant="brand" className="text-[10px]">{STAGE_LABEL[c.stage] ?? c.stage}</Badge>
              {c.estimatedArrivalDate ? (
                <span className="text-[10px] text-muted-foreground">도착 {c.estimatedArrivalDate}</span>
              ) : null}
            </div>
            <Link href={`/agency/cases/${c.id}`} className="mt-0.5 block truncate text-sm font-semibold hover:underline">
              {c.title}
            </Link>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              환자 {c.patientName}
              {c.targetProcedureCategories.length ? ` · ${c.targetProcedureCategories.join(', ')}` : ''}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenRfq} disabled={pending}>
            <Send className="mr-1 h-3.5 w-3.5" />
            RFQ 발송
          </Button>
        </div>

        {sorted.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            아직 견적 요청이 없습니다 — [RFQ 발송]으로 병원을 선택하세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-1.5 pr-2 text-left font-medium">병원</th>
                  <th className="py-1.5 pr-2 text-left font-medium">상태</th>
                  <th className="py-1.5 pr-2 text-right font-medium">총액</th>
                  <th className="py-1.5 pr-2 text-right font-medium">예약금</th>
                  <th className="py-1.5 pr-2 text-left font-medium">유효기간</th>
                  <th className="py-1.5 text-right font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((q) => {
                  const meta = STATUS_META[q.status] ?? STATUS_META.requested!;
                  const isLowest = q.status === 'received' && q.totalKrw != null && q.totalKrw === lowestReceived;
                  return (
                    <tr key={q.id} className={`border-b border-border/40 ${q.status === 'rejected' || q.status === 'expired' ? 'opacity-50' : ''}`}>
                      <td className="py-2 pr-2 font-medium">
                        {q.hospitalName}
                        {isLowest ? <span className="ml-1 text-[9px] font-bold text-brand-600">최저가</span> : null}
                      </td>
                      <td className="py-2 pr-2">
                        <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                        {isExpiring(q) ? (
                          <span className="ml-1 text-[9px] font-semibold text-amber-600">만료 임박</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2 text-right font-semibold">{won(q.totalKrw)}</td>
                      <td className="py-2 pr-2 text-right text-muted-foreground">{won(q.depositKrw)}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{q.validUntil ?? '—'}</td>
                      <td className="py-2 text-right">
                        <span className="inline-flex items-center gap-1">
                          {q.status === 'requested' || q.status === 'received' ? (
                            <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onRecord(q)} disabled={pending}>
                              {q.status === 'requested' ? '견적 입력' : '수정'}
                            </Button>
                          ) : null}
                          {q.status === 'received' ? (
                            <>
                              <Button
                                variant="brand"
                                size="sm"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => setConfirmTarget({ kind: 'accept', q })}
                                disabled={pending}
                              >
                                <Check className="mr-0.5 h-3 w-3" />
                                수락
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => {
                                  setRejectReason('');
                                  setConfirmTarget({ kind: 'reject', q });
                                }}
                                disabled={pending}
                              >
                                탈락
                              </Button>
                            </>
                          ) : null}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {sorted.some((q) => q.hospitalNotes) ? (
          <div className="space-y-1">
            {sorted
              .filter((q) => q.hospitalNotes)
              .map((q) => (
                <p key={q.id} className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">{q.hospitalName}</span> — {q.hospitalNotes}
                </p>
              ))}
          </div>
        ) : null}

        {confirmTarget ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setConfirmTarget(null)}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-background p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {confirmTarget.kind === 'accept' ? (
                <>
                  <h3 className="text-sm font-semibold">견적 수락</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <strong className="text-foreground">{confirmTarget.q.hospitalName}</strong> 견적(
                    {won(confirmTarget.q.totalKrw)})을 수락합니다. 같은 케이스의 나머지 견적은 자동
                    탈락 처리되고, 케이스가 [견적 수락] 단계로 넘어갑니다.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold">견적 탈락 처리</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <strong className="text-foreground">{confirmTarget.q.hospitalName}</strong> 견적을
                    탈락 처리합니다.
                  </p>
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="rej-reason" className="text-xs">사유 (선택)</Label>
                    <Input
                      id="rej-reason"
                      placeholder="예) 환자 예산 초과"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      maxLength={500}
                    />
                  </div>
                </>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmTarget(null)}>
                  취소
                </Button>
                <Button
                  type="button"
                  variant={confirmTarget.kind === 'accept' ? 'brand' : 'destructive'}
                  size="sm"
                  onClick={runConfirmed}
                  disabled={pending}
                >
                  {confirmTarget.kind === 'accept' ? '수락 확정' : '탈락 확정'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RfqModal({
  c,
  hospitalOptions,
  onClose,
}: {
  c: QuoteCaseRow;
  hospitalOptions: Array<{ id: string; name: string }>;
  onClose: () => void;
}): JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const existing = new Set(c.quotes.filter((q) => q.status !== 'rejected' && q.status !== 'expired').map((q) => q.hospitalId));
  const filtered = hospitalOptions.filter((h) =>
    h.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(): Promise<void> {
    if (selected.size === 0) {
      toast.error('병원을 1개 이상 선택하세요.');
      return;
    }
    setSaving(true);
    try {
      const result = await sendRfqAction({ caseId: c.id, hospitalIds: Array.from(selected) });
      toast.success(`${result.created}개 병원에 RFQ를 기록했습니다.`);
      router.refresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'RFQ 발송 실패');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold">RFQ 발송 — {c.caseNumber}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <p className="text-[11px] text-muted-foreground">
            견적을 요청할 병원을 선택하세요. 실제 발송(이메일·카톡)은 별도로 하고, 여기에는 요청
            상태가 기록되어 응답을 추적합니다.
          </p>
          <Input
            placeholder="병원 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">검색 결과 없음</p>
            ) : (
              filtered.map((h) => {
                const already = existing.has(h.id);
                return (
                  <label
                    key={h.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 ${already ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(h.id)}
                      disabled={already}
                      onChange={() => toggle(h.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1 truncate">{h.name}</span>
                    {already ? <span className="text-[9px] text-muted-foreground">요청됨</span> : null}
                  </label>
                );
              })
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">선택: {selected.size}개</div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>취소</Button>
          <Button type="button" variant="brand" onClick={submit} disabled={saving}>
            {saving ? '기록 중…' : `RFQ 발송 기록 (${selected.size})`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecordQuoteModal({
  c,
  q,
  onClose,
}: {
  c: QuoteCaseRow;
  q: QuoteRow;
  onClose: () => void;
}): JSX.Element {
  const router = useRouter();
  const [totalKrw, setTotalKrw] = useState(q.totalKrw != null ? String(q.totalKrw) : '');
  const [depositKrw, setDepositKrw] = useState(q.depositKrw != null ? String(q.depositKrw) : '');
  const [validUntil, setValidUntil] = useState(q.validUntil ?? '');
  const [hospitalNotes, setHospitalNotes] = useState(q.hospitalNotes ?? '');
  const [internalMemo, setInternalMemo] = useState(q.internalMemo ?? '');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const total = Number(totalKrw.replace(/[^\d]/g, ''));
    if (!total || total <= 0) {
      toast.error('총액을 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      await recordQuoteAction({
        caseId: c.id,
        quoteId: q.id,
        totalKrw: total,
        depositKrw: depositKrw ? Number(depositKrw.replace(/[^\d]/g, '')) : null,
        validUntil: validUntil || null,
        hospitalNotes: hospitalNotes.trim() || null,
        internalMemo: internalMemo.trim() || null,
      });
      toast.success('견적을 기록했습니다.');
      router.refresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '기록 실패');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-md overflow-y-auto rounded-xl bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold">견적 입력 — {q.hospitalName}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          <p className="text-[11px] text-muted-foreground">
            {c.caseNumber} · {c.title}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q-total">총액 (KRW) *</Label>
              <Input
                id="q-total"
                inputMode="numeric"
                placeholder="3000000"
                value={totalKrw}
                onChange={(e) => setTotalKrw(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-deposit">예약금 (KRW)</Label>
              <Input
                id="q-deposit"
                inputMode="numeric"
                placeholder="300000"
                value={depositKrw}
                onChange={(e) => setDepositKrw(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-valid">유효기간</Label>
            <Input
              id="q-valid"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-notes" className="text-xs">병원 조건 메모</Label>
            <textarea
              id="q-notes"
              rows={2}
              placeholder="마취·입원 포함 여부, 재수술 보증 등"
              value={hospitalNotes}
              onChange={(e) => setHospitalNotes(e.target.value)}
              maxLength={2000}
              className="min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-memo" className="text-xs">내부 메모 (환자 비노출)</Label>
            <textarea
              id="q-memo"
              rows={2}
              value={internalMemo}
              onChange={(e) => setInternalMemo(e.target.value)}
              maxLength={2000}
              className="min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>취소</Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving ? '저장 중…' : '견적 저장'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
