'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Calendar,
  Check,
  Plus,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { cn } from '@/lib/utils/cn';
import {
  deleteBookingAction,
  setBookingStatusAction,
  upsertBookingAction,
  type BookingInput,
  type BookingItem,
  type BookingRow,
} from '@/lib/partner/bookings-actions';

type FacilityOpt = {
  id: string;
  name: string;
  defaultPriceAmount: number | null;
  defaultPriceCurrency: string;
  defaultPriceUnit: string | null;
};
type ServiceOpt = {
  id: string;
  name: string;
  priceAmount: number;
  priceCurrency: string;
  priceUnit: string;
};

const STATUS_LABEL: Record<BookingRow['status'], { ko: string; variant: 'brand' | 'care' | 'hospitality' | 'destructive' | 'outline' | 'slate' }> = {
  pending: { ko: '대기', variant: 'hospitality' },
  confirmed: { ko: '확정', variant: 'care' },
  completed: { ko: '완료', variant: 'brand' },
  cancelled: { ko: '취소', variant: 'outline' },
  declined: { ko: '거절', variant: 'destructive' },
};

const STATUS_TABS: Array<{ key: 'all' | BookingRow['status']; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'confirmed', label: '확정' },
  { key: 'completed', label: '완료' },
  { key: 'cancelled', label: '취소' },
  { key: 'declined', label: '거절' },
];

export function BookingsClient({
  initialBookings,
  facilities,
  services,
}: {
  initialBookings: BookingRow[];
  facilities: FacilityOpt[];
  services: ServiceOpt[];
}): JSX.Element {
  const [tab, setTab] = useState<'all' | BookingRow['status']>('all');
  const [editing, setEditing] = useState<BookingRow | 'new' | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    if (tab === 'all') return initialBookings;
    return initialBookings.filter((b) => b.status === tab);
  }, [initialBookings, tab]);

  function setStatus(b: BookingRow, status: BookingRow['status']): void {
    start(async () => {
      try {
        await setBookingStatusAction(b.id, status);
        toast.success(`상태를 "${STATUS_LABEL[status].ko}"(으)로 변경했습니다.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '변경 실패');
      }
    });
  }

  function onDelete(b: BookingRow): void {
    if (!confirm(`"${b.guestName}" 부킹을 삭제할까요? 복구할 수 없습니다.`)) return;
    start(async () => {
      try {
        await deleteBookingAction(b.id);
        toast.success('삭제했습니다.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '삭제 실패');
      }
    });
  }

  // Counts per status for tab badges.
  const counts: Record<'all' | BookingRow['status'], number> = {
    all: initialBookings.length,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    declined: 0,
  };
  for (const b of initialBookings) counts[b.status]++;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((t) => {
            const active = tab === t.key;
            const count = counts[t.key];
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition',
                  active
                    ? 'border-brand-300 bg-brand-50 text-brand-900'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {t.label}
                {count > 0 ? (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[10px] font-bold',
                      active ? 'bg-brand-200 text-brand-900' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <Button variant="brand" size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          부킹 추가
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
          {tab === 'all'
            ? '아직 부킹이 없습니다. 첫 부킹을 등록해 보세요.'
            : `${STATUS_LABEL[tab as BookingRow['status']].ko} 상태의 부킹이 없습니다.`}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const status = STATUS_LABEL[b.status];
            return (
              <Card key={b.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={status.variant} className="text-[10px]">
                          {status.ko}
                        </Badge>
                        {b.guestCountryCode ? (
                          <Badge variant="outline" className="text-[10px]">
                            {b.guestCountryCode}
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="mt-1 text-base font-semibold">{b.guestName}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {b.checkInDate}
                          {b.checkOutDate !== b.checkInDate ? ` → ${b.checkOutDate}` : ''}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {b.partySize}명
                        </span>
                        {b.guestContact ? (
                          <span className="font-mono">{b.guestContact}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {b.totalAmount.toLocaleString()} {b.currency}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        품목 {b.items.length}개
                      </div>
                    </div>
                  </div>

                  {b.items.length > 0 ? (
                    <div className="space-y-0.5 rounded-md border bg-muted/20 px-2.5 py-2 text-[11px]">
                      {b.items.map((it, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="truncate">
                            <span className="font-medium">{it.name}</span>
                            {it.quantity > 1 ? ` × ${it.quantity}` : ''}
                          </span>
                          <span className="shrink-0 font-mono text-muted-foreground">
                            {(it.quantity * it.unitPrice).toLocaleString()} {it.currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {b.notes ? (
                    <div className="rounded-md bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                      {b.notes}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                    {/* Status transitions */}
                    {b.status === 'pending' ? (
                      <>
                        <Button
                          variant="brand"
                          size="sm"
                          onClick={() => setStatus(b, 'confirmed')}
                          disabled={pending}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          수락
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStatus(b, 'declined')}
                          disabled={pending}
                          className="border-destructive/40 text-destructive hover:bg-destructive/5"
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          거절
                        </Button>
                      </>
                    ) : null}
                    {b.status === 'confirmed' ? (
                      <>
                        <Button
                          variant="brand"
                          size="sm"
                          onClick={() => setStatus(b, 'completed')}
                          disabled={pending}
                        >
                          완료 처리
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStatus(b, 'cancelled')}
                          disabled={pending}
                        >
                          취소
                        </Button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setEditing(b)}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      편집
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(b)}
                      disabled={pending}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      title="삭제"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editing !== null ? (
        <BookingModal
          initial={editing === 'new' ? null : editing}
          facilities={facilities}
          services={services}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function BookingModal({
  initial,
  facilities,
  services,
  onClose,
}: {
  initial: BookingRow | null;
  facilities: FacilityOpt[];
  services: ServiceOpt[];
  onClose: () => void;
}): JSX.Element {
  const [guestName, setGuestName] = useState(initial?.guestName ?? '');
  const [guestCountryCode, setGuestCountryCode] = useState(initial?.guestCountryCode ?? '');
  const [guestContact, setGuestContact] = useState(initial?.guestContact ?? '');
  const [partySize, setPartySize] = useState(initial?.partySize ?? 1);
  const [checkInDate, setCheckInDate] = useState(
    initial?.checkInDate ?? new Date().toISOString().slice(0, 10),
  );
  const [checkOutDate, setCheckOutDate] = useState(
    initial?.checkOutDate ?? new Date().toISOString().slice(0, 10),
  );
  const [items, setItems] = useState<BookingItem[]>(initial?.items ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  function addFacility(f: FacilityOpt): void {
    setItems((prev) => [
      ...prev,
      {
        kind: 'facility',
        refId: f.id,
        name: f.name,
        quantity: 1,
        unitPrice: f.defaultPriceAmount ?? 0,
        currency: f.defaultPriceCurrency,
        unitLabel: f.defaultPriceUnit ?? null,
      },
    ]);
  }
  function addService(s: ServiceOpt): void {
    setItems((prev) => [
      ...prev,
      {
        kind: 'service',
        refId: s.id,
        name: s.name,
        quantity: 1,
        unitPrice: s.priceAmount,
        currency: s.priceCurrency,
        unitLabel: s.priceUnit,
      },
    ]);
  }
  function updateItem(idx: number, patch: Partial<BookingItem>): void {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number): void {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const totalCurrency = items[0]?.currency ?? 'KRW';

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error('게스트 이름을 입력하세요.');
      return;
    }
    if (checkOutDate < checkInDate) {
      toast.error('체크아웃이 체크인보다 이전입니다.');
      return;
    }
    setSaving(true);
    try {
      const payload: BookingInput = {
        id: initial?.id,
        guestName: guestName.trim(),
        guestCountryCode: guestCountryCode.trim() || null,
        guestContact: guestContact.trim() || null,
        partySize,
        checkInDate,
        checkOutDate,
        items,
        currency: totalCurrency,
        notes: notes.trim() || null,
      };
      await upsertBookingAction(payload);
      toast.success(initial ? '부킹을 수정했습니다.' : '부킹을 등록했습니다.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패');
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
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-3">
          <h2 className="text-sm font-semibold">
            {initial ? '부킹 편집' : '새 부킹 등록'}
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

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {/* Guest info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bk-name">게스트 이름</Label>
              <Input
                id="bk-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-country">국가 코드 (선택)</Label>
              <Input
                id="bk-country"
                placeholder="KR / US / CN / JP …"
                value={guestCountryCode}
                onChange={(e) => setGuestCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-contact">연락처 (선택)</Label>
              <Input
                id="bk-contact"
                placeholder="이메일 / 전화번호 / 카톡 ID"
                value={guestContact}
                onChange={(e) => setGuestContact(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-party">인원</Label>
              <Input
                id="bk-party"
                type="number"
                min={1}
                max={50}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bk-checkin">체크인</Label>
              <Input
                id="bk-checkin"
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-checkout">체크아웃</Label>
              <Input
                id="bk-checkout"
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>품목</Label>
              <div className="flex gap-1.5">
                {facilities.length > 0 ? (
                  <select
                    onChange={(e) => {
                      const f = facilities.find((x) => x.id === e.target.value);
                      if (f) addFacility(f);
                      e.target.value = '';
                    }}
                    className="h-8 rounded-md border border-input bg-background px-2 text-[11px]"
                    defaultValue=""
                  >
                    <option value="" disabled>+ 시설 추가</option>
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                ) : null}
                {services.length > 0 ? (
                  <select
                    onChange={(e) => {
                      const s = services.find((x) => x.id === e.target.value);
                      if (s) addService(s);
                      e.target.value = '';
                    }}
                    className="h-8 rounded-md border border-input bg-background px-2 text-[11px]"
                    defaultValue=""
                  >
                    <option value="" disabled>+ 서비스 추가</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : null}
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-[11px] text-muted-foreground">
                위 드롭다운에서 시설 / 서비스를 선택해 품목 추가
              </div>
            ) : (
              <div className="space-y-1.5 rounded-md border bg-card p-2">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-1.5">
                    <Badge
                      variant={it.kind === 'facility' ? 'brand' : 'hospitality'}
                      className="col-span-2 justify-center text-[9px]"
                    >
                      {it.kind === 'facility' ? '시설' : '서비스'}
                    </Badge>
                    <span className="col-span-4 truncate text-[11px]">{it.name}</span>
                    <Input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(i, { quantity: Math.max(1, Number(e.target.value)) })
                      }
                      className="col-span-2 h-7 text-[11px]"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={it.unitPrice}
                      onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                      className="col-span-3 h-7 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="col-span-1 text-muted-foreground hover:text-destructive"
                      title="제거"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-1.5 text-[11px] font-bold">
                  <span>합계</span>
                  <span>{total.toLocaleString()} {totalCurrency}</span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="bk-notes">내부 메모 (선택)</Label>
            <textarea
              id="bk-notes"
              rows={2}
              placeholder="특이사항, 알레르기, 요청사항 등"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving ? '저장 중…' : initial ? '수정 저장' : '등록'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
