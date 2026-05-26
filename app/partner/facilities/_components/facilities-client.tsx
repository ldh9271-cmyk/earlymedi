'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import {
  deleteFacilityAction,
  upsertFacilityAction,
  type FacilityInput,
  type FacilityRow,
} from '@/lib/partner/facilities-actions';

const KIND_LABEL_KO: Record<FacilityRow['kind'], string> = {
  room: '객실',
  seat: '좌석·룸',
  vehicle: '차량',
  guide: '인력',
  other: '기타',
};

const PRICE_UNIT_OPTIONS = [
  { value: '', label: '단위 선택' },
  { value: 'night', label: '박당' },
  { value: 'person', label: '인당' },
  { value: 'hour', label: '시간당' },
  { value: 'flat', label: '건당 (정액)' },
];

/**
 * Client-side facility list + create/edit modal. Calls the
 * upsertFacilityAction server action which handles auth + RLS + audit.
 */
export function FacilitiesClient({
  initialFacilities,
}: {
  initialFacilities: FacilityRow[];
}): JSX.Element {
  const [editing, setEditing] = useState<FacilityRow | 'new' | null>(null);
  const [pending, start] = useTransition();

  function handleDelete(facility: FacilityRow): void {
    if (!confirm(`"${facility.name}" 시설을 삭제할까요? 관련 가용성 데이터도 함께 삭제됩니다.`)) {
      return;
    }
    start(async () => {
      try {
        await deleteFacilityAction(facility.id);
        toast.success('시설을 삭제했습니다.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '삭제 실패');
      }
    });
  }

  if (initialFacilities.length === 0 && editing === null) {
    return (
      <div className="space-y-3 rounded-lg border-2 border-dashed bg-muted/20 p-10 text-center">
        <p className="text-sm font-semibold">아직 등록된 시설이 없습니다</p>
        <p className="text-xs text-muted-foreground">
          첫 객실 / 차량 / 인력 등을 등록하면 Agency 패키지에서 매칭 가능해집니다.
        </p>
        <Button variant="brand" size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          첫 시설 등록
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button variant="brand" size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          시설 추가
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {initialFacilities.map((f) => (
          <Card key={f.id} className={!f.isActive ? 'opacity-60' : ''}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="slate" className="text-[10px]">
                      {KIND_LABEL_KO[f.kind]}
                    </Badge>
                    {!f.isActive ? (
                      <Badge variant="outline" className="text-[10px]">
                        비활성
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-1 truncate text-sm font-semibold">{f.name}</h3>
                  {f.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {f.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(f)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="편집"
                    aria-label="편집"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(f)}
                    disabled={pending}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="삭제"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t pt-2 text-[11px]">
                <span>
                  <span className="text-muted-foreground">기본 수량 </span>
                  <span className="font-bold">{f.capacityTotal}</span>
                </span>
                {f.defaultPriceAmount ? (
                  <span>
                    <span className="text-muted-foreground">기본가 </span>
                    <span className="font-bold">
                      {f.defaultPriceAmount.toLocaleString()} {f.defaultPriceCurrency}
                      {f.defaultPriceUnit ? ` / ${labelForUnit(f.defaultPriceUnit)}` : ''}
                    </span>
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing !== null ? (
        <FacilityModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function FacilityModal({
  initial,
  onClose,
}: {
  initial: FacilityRow | null;
  onClose: () => void;
}): JSX.Element {
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<FacilityRow['kind']>(initial?.kind ?? 'room');
  const [capacityTotal, setCapacityTotal] = useState(initial?.capacityTotal ?? 1);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [defaultPriceAmount, setDefaultPriceAmount] = useState<string>(
    initial?.defaultPriceAmount?.toString() ?? '',
  );
  const [defaultPriceUnit, setDefaultPriceUnit] = useState<string>(
    initial?.defaultPriceUnit ?? '',
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('시설 이름을 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      const payload: FacilityInput = {
        id: initial?.id,
        name: name.trim(),
        kind,
        capacityTotal: Number(capacityTotal),
        description: description.trim() || null,
        defaultPriceAmount: defaultPriceAmount ? Number(defaultPriceAmount) : null,
        defaultPriceCurrency: 'KRW',
        defaultPriceUnit: defaultPriceUnit || null,
        isActive,
      };
      await upsertFacilityAction(payload);
      toast.success(initial ? '시설을 수정했습니다.' : '시설을 등록했습니다.');
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
            {initial ? '시설 편집' : '새 시설 등록'}
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
            <Label htmlFor="fac-name">시설 이름</Label>
            <Input
              id="fac-name"
              placeholder="예) 디럭스 더블 / VIP 스파 스위트 / 9인승 의전차"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fac-kind">종류</Label>
              <select
                id="fac-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as FacilityRow['kind'])}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {(Object.keys(KIND_LABEL_KO) as Array<FacilityRow['kind']>).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL_KO[k]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fac-capacity">기본 수량</Label>
              <Input
                id="fac-capacity"
                type="number"
                min={0}
                value={capacityTotal}
                onChange={(e) => setCapacityTotal(Number(e.target.value))}
                required
              />
              <p className="text-[10px] text-muted-foreground">
                일별 변동은 가용성 캘린더에서 조정
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fac-desc">설명 (선택)</Label>
            <textarea
              id="fac-desc"
              rows={2}
              placeholder="크기, 침대 타입, 전망 등 특징"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fac-price">기본가 (KRW, 선택)</Label>
              <Input
                id="fac-price"
                type="number"
                min={0}
                placeholder="예) 180000"
                value={defaultPriceAmount}
                onChange={(e) => setDefaultPriceAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fac-unit">가격 단위</Label>
              <select
                id="fac-unit"
                value={defaultPriceUnit}
                onChange={(e) => setDefaultPriceUnit(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {PRICE_UNIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span>활성 상태 — Agency 검색·매칭에 노출</span>
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
  const found = PRICE_UNIT_OPTIONS.find((o) => o.value === unit);
  return found?.label ?? unit;
}
