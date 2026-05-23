'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { ChartAutofillModal } from './chart-autofill-modal';

type ItemKind = 'procedure' | 'addon' | 'consumable' | 'medication' | 'follow_up_visit' | 'discount' | 'tax' | 'other';
type VatTreatment = 'exempt' | 'taxable' | 'mixed';

export type ComposerItem = {
  lineNumber: number;
  itemKind: ItemKind;
  procedureNameNormalized: string;
  bodyPart: string | null;
  quantity: number;
  unitPriceKrw: number;
  lineTotalKrw: number;
  vatIncluded: boolean;
  vatRateBp: number;
  vatTreatment: VatTreatment;
  isAddon: boolean;
  discountKrw: number;
  confidenceBp: number;
  aiNotes: string | null;
};

const EMPTY_ROW = (lineNumber: number): ComposerItem => ({
  lineNumber,
  itemKind: 'procedure',
  procedureNameNormalized: '',
  bodyPart: null,
  quantity: 1,
  unitPriceKrw: 0,
  lineTotalKrw: 0,
  vatIncluded: false,
  vatRateBp: 1000,
  vatTreatment: 'taxable',
  isAddon: false,
  discountKrw: 0,
  confidenceBp: 10_000,
  aiNotes: null,
});

export function ChartComposer({
  chartId,
  editable,
  initialItems,
}: {
  chartId: string;
  editable: boolean;
  initialItems: ComposerItem[];
}): JSX.Element {
  const router = useRouter();
  const [items, setItems] = useState<ComposerItem[]>(initialItems);
  const [autofillOpen, setAutofillOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update(idx: number, patch: Partial<ComposerItem>): void {
    setItems((arr) => {
      const next = arr.slice();
      const target = next[idx];
      if (!target) return arr;
      const merged: ComposerItem = { ...target, ...patch };
      if (patch.quantity !== undefined || patch.unitPriceKrw !== undefined) {
        merged.lineTotalKrw = merged.quantity * merged.unitPriceKrw;
      }
      next[idx] = merged;
      return next;
    });
  }

  function addRow(): void {
    setItems((arr) => [...arr, EMPTY_ROW(arr.length + 1)]);
  }

  function removeRow(idx: number): void {
    setItems((arr) => arr.filter((_, i) => i !== idx).map((it, i) => ({ ...it, lineNumber: i + 1 })));
  }

  async function save(): Promise<void> {
    try {
      const res = await fetch(`/api/medical/charts/${chartId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'replace_items', items }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      toast.success('라인 항목 저장 완료');
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장 실패');
    }
  }

  function applyAutofill(extracted: {
    items: Array<{
      raw_text: string;
      procedure_name_normalized: string;
      body_part?: string | null;
      quantity: number;
      unit_price_krw: number;
      line_total_krw: number;
      vat_included: boolean;
      vat_rate_bp: number;
      vat_treatment: 'exempt' | 'taxable' | 'mixed';
      is_addon: boolean;
      discount_krw: number;
      confidence: number;
    }>;
  }): void {
    const startLine = items.length + 1;
    const fromAi: ComposerItem[] = extracted.items.map((it, idx) => ({
      lineNumber: startLine + idx,
      itemKind: 'procedure',
      procedureNameNormalized: it.procedure_name_normalized,
      bodyPart: it.body_part ?? null,
      quantity: it.quantity,
      unitPriceKrw: it.unit_price_krw,
      lineTotalKrw: it.line_total_krw,
      vatIncluded: it.vat_included,
      vatRateBp: it.vat_rate_bp,
      vatTreatment: it.vat_treatment,
      isAddon: it.is_addon,
      discountKrw: it.discount_krw,
      confidenceBp: Math.round(it.confidence * 100),
      aiNotes: it.raw_text,
    }));
    setItems((arr) => [...arr, ...fromAi]);
    setAutofillOpen(false);
    toast.success(`AI가 ${fromAi.length}개 항목을 추가했습니다 — 검토 후 저장하세요`);
  }

  if (!editable) {
    return (
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">라인 항목이 없습니다.</p>
        ) : (
          <ReadOnlyTable items={items} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAutofillOpen(true)}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> AI 자동 채움
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 h-3.5 w-3.5" /> 라인 추가
          </Button>
        </div>
        <Button type="button" variant="care" size="sm" onClick={save} disabled={isPending}>
          <Upload className="mr-1 h-3.5 w-3.5" /> 저장
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          [+ 라인 추가] 로 항목을 직접 입력하거나 [✨ AI 자동 채움] 으로 영수증/PDF/텍스트에서 한 번에 가져오세요.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="w-6">#</th>
                <th className="px-1">시술명</th>
                <th className="px-1 w-20">부위</th>
                <th className="px-1 w-14">수량</th>
                <th className="px-1 w-28">단가 (₩)</th>
                <th className="px-1 w-28">라인 합계 (₩)</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-1 text-muted-foreground">{it.lineNumber}</td>
                  <td className="px-1 py-1">
                    <Input
                      className="h-8 text-xs"
                      value={it.procedureNameNormalized}
                      onChange={(e) => update(idx, { procedureNameNormalized: e.target.value })}
                      placeholder="코 재수술"
                    />
                    {it.confidenceBp < 9000 ? (
                      <span className={`mt-0.5 inline-block text-[10px] ${it.confidenceBp < 7000 ? 'text-destructive' : 'text-hospitality-700'}`}>
                        AI 신뢰도 {(it.confidenceBp / 100).toFixed(0)}%
                      </span>
                    ) : null}
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      className="h-8 text-xs"
                      value={it.bodyPart ?? ''}
                      onChange={(e) => update(idx, { bodyPart: e.target.value || null })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      className="h-8 text-xs"
                      value={it.quantity}
                      onChange={(e) => update(idx, { quantity: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      className="h-8 text-xs"
                      value={it.unitPriceKrw}
                      onChange={(e) => update(idx, { unitPriceKrw: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })}
                    />
                  </td>
                  <td className="px-1 py-1 text-right font-medium">
                    {it.lineTotalKrw.toLocaleString('ko-KR')}
                  </td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label="라인 삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ChartAutofillModal
        open={autofillOpen}
        chartId={chartId}
        onClose={() => setAutofillOpen(false)}
        onApply={applyAutofill}
      />
    </div>
  );
}

function ReadOnlyTable({ items }: { items: ComposerItem[] }): JSX.Element {
  return (
    <table className="w-full text-xs">
      <thead className="border-b text-left text-muted-foreground">
        <tr>
          <th className="w-6">#</th>
          <th>시술명</th>
          <th>부위</th>
          <th className="text-right w-14">수량</th>
          <th className="text-right w-28">라인 합계</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.lineNumber} className="border-b last:border-0">
            <td className="py-1.5 text-muted-foreground">{it.lineNumber}</td>
            <td className="py-1.5">
              <div>{it.procedureNameNormalized}</div>
              {it.isAddon ? <span className="text-[10px] text-hospitality-700">add-on</span> : null}
            </td>
            <td className="py-1.5">{it.bodyPart ?? '—'}</td>
            <td className="py-1.5 text-right">{it.quantity}</td>
            <td className="py-1.5 text-right font-medium">₩{it.lineTotalKrw.toLocaleString('ko-KR')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
