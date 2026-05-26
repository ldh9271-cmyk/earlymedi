'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Clock, Edit2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import {
  deleteServiceAction,
  upsertServiceAction,
  type ServiceInput,
  type ServiceRow,
} from '@/lib/partner/services-actions';

const CATEGORY_KO: Record<ServiceRow['category'], string> = {
  massage: '마사지·스파',
  transfer: '의전·이송',
  guide: '가이드·통역',
  food: '식음·룸서비스',
  tour: '관광·체험',
  other: '기타',
};

const PRICE_UNIT_OPTIONS = [
  { value: 'flat', label: '건당 (정액)' },
  { value: 'person', label: '인당' },
  { value: 'session', label: '세션당' },
  { value: 'hour', label: '시간당' },
  { value: 'day', label: '일당' },
];

const CURRENCY_OPTIONS = ['KRW', 'USD', 'CNY', 'JPY', 'EUR', 'RUB'];

export function MenuClient({
  initialServices,
}: {
  initialServices: ServiceRow[];
}): JSX.Element {
  const [editing, setEditing] = useState<ServiceRow | 'new' | null>(null);
  const [pending, start] = useTransition();

  // Group by category for the section layout.
  const grouped = useMemo(() => {
    const map = new Map<ServiceRow['category'], ServiceRow[]>();
    for (const s of initialServices) {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return map;
  }, [initialServices]);

  function handleDelete(svc: ServiceRow): void {
    if (!confirm(`"${svc.name}" 서비스를 삭제할까요?`)) return;
    start(async () => {
      try {
        await deleteServiceAction(svc.id);
        toast.success('서비스를 삭제했습니다.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '삭제 실패');
      }
    });
  }

  if (initialServices.length === 0 && editing === null) {
    return (
      <div className="space-y-3 rounded-lg border-2 border-dashed bg-muted/20 p-10 text-center">
        <p className="text-sm font-semibold">아직 등록된 서비스가 없습니다</p>
        <p className="text-xs text-muted-foreground">
          마사지·의전·가이드·F&amp;B·투어 등을 한 개라도 등록하면 Agency가 패키지 견적에 사용할 수 있습니다.
        </p>
        <Button variant="brand" size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-1 h-3.5 w-3.5" />첫 서비스 등록
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button variant="brand" size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          서비스 추가
        </Button>
      </div>

      <div className="space-y-6">
        {(Object.keys(CATEGORY_KO) as Array<ServiceRow['category']>).map((cat) => {
          const items = grouped.get(cat) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <div className="mb-2 flex items-center gap-2 border-b pb-1">
                <h2 className="text-sm font-bold">{CATEGORY_KO[cat]}</h2>
                <Badge variant="slate" className="text-[10px]">
                  {items.length}개
                </Badge>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((s) => (
                  <Card key={s.id} className={!s.isActive ? 'opacity-60' : ''}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold">{s.name}</h3>
                          {!s.isActive ? (
                            <Badge variant="outline" className="mt-0.5 text-[10px]">
                              비활성
                            </Badge>
                          ) : null}
                          {s.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {s.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(s)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="편집"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            disabled={pending}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 border-t pt-2 text-[11px]">
                        <span className="text-base font-bold text-foreground">
                          {s.priceAmount.toLocaleString()} {s.priceCurrency}
                        </span>
                        <span className="text-muted-foreground">
                          / {labelForUnit(s.priceUnit)}
                        </span>
                        {s.durationMinutes ? (
                          <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {s.durationMinutes}분
                          </span>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {editing !== null ? (
        <ServiceModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function ServiceModal({
  initial,
  onClose,
}: {
  initial: ServiceRow | null;
  onClose: () => void;
}): JSX.Element {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<ServiceRow['category']>(
    initial?.category ?? 'other',
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priceAmount, setPriceAmount] = useState<string>(
    initial?.priceAmount?.toString() ?? '',
  );
  const [priceCurrency, setPriceCurrency] = useState(initial?.priceCurrency ?? 'KRW');
  const [priceUnit, setPriceUnit] = useState(initial?.priceUnit ?? 'flat');
  const [durationMinutes, setDurationMinutes] = useState<string>(
    initial?.durationMinutes?.toString() ?? '',
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('서비스 이름을 입력하세요.');
      return;
    }
    if (!priceAmount || Number(priceAmount) < 0) {
      toast.error('가격을 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      const payload: ServiceInput = {
        id: initial?.id,
        name: name.trim(),
        category,
        description: description.trim() || null,
        priceAmount: Number(priceAmount),
        priceCurrency,
        priceUnit,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        isActive,
      };
      await upsertServiceAction(payload);
      toast.success(initial ? '서비스를 수정했습니다.' : '서비스를 등록했습니다.');
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
        className="relative w-full max-w-lg overflow-y-auto rounded-xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold">
            {initial ? '서비스 편집' : '새 서비스 등록'}
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

        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="svc-name">서비스 이름</Label>
            <Input
              id="svc-name"
              placeholder="예) 스웨디시 60분 / 공항 픽업 (세단) / 한라산 트레킹 1일"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="svc-cat">카테고리</Label>
            <select
              id="svc-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as ServiceRow['category'])}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {(Object.keys(CATEGORY_KO) as Array<ServiceRow['category']>).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_KO[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="svc-desc">설명 (선택)</Label>
            <textarea
              id="svc-desc"
              rows={2}
              placeholder="포함 사항, 진행 절차 등"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc-price">가격</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                placeholder="80000"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-curr">통화</Label>
              <select
                id="svc-curr"
                value={priceCurrency}
                onChange={(e) => setPriceCurrency(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-unit">단위</Label>
              <select
                id="svc-unit"
                value={priceUnit}
                onChange={(e) => setPriceUnit(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {PRICE_UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="svc-duration">소요 시간 (분, 선택)</Label>
            <Input
              id="svc-duration"
              type="number"
              min={0}
              placeholder="시간 기반 서비스만"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span>활성 상태 — Agency 카탈로그에 노출</span>
          </label>

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

function labelForUnit(unit: string): string {
  return PRICE_UNIT_OPTIONS.find((o) => o.value === unit)?.label ?? unit;
}
