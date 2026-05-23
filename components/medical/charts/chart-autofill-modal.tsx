'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';

type ExtractedItem = {
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
};

type ExtractionResult = {
  data: {
    data: {
      treatment_date: string;
      doctor_name?: string | null;
      items: ExtractedItem[];
      total_amount_krw: number;
      overall_confidence: number;
      warnings: string[];
    };
    overallConfidenceBp: number;
    status: 'completed' | 'review_required';
  };
};

export function ChartAutofillModal({
  open,
  chartId,
  onClose,
  onApply,
}: {
  open: boolean;
  chartId: string;
  onClose: () => void;
  onApply: (extracted: { items: ExtractedItem[] }) => void;
}): JSX.Element | null {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function run(): Promise<void> {
    if (!file && !text.trim()) {
      toast.error('이미지/PDF 파일 또는 텍스트 중 하나 이상');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('chartId', chartId);
      if (file) form.append('file', file);
      if (text.trim()) form.append('text', text);
      const res = await fetch('/api/medical/charts/autofill', { method: 'POST', body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const j = (await res.json()) as ExtractionResult;
      if (j.data.data.warnings.length > 0) {
        toast.warning(`경고 ${j.data.data.warnings.length}건: ${j.data.data.warnings[0]}`);
      }
      onApply({ items: j.data.data.items });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI 추출 실패');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-hospitality-500" /> AI 차트 자동 채움
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">사진 / PDF</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-xs file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-xs"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              최대 20MB. 흐림/잘림 자동 감지. 텍스트 PDF는 OCR 건너뜁니다.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">텍스트 (메신저 전달본·복사 붙여넣기)</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="mt-1 block w-full rounded-md border bg-background px-2 py-1.5 text-xs"
              placeholder="시술 차트 / 영수증 / 메모를 그대로 붙여넣기"
            />
          </div>

          <div className="rounded-md bg-care-50 px-3 py-2 text-[11px] text-care-800">
            추출된 항목은 자동 적용되지 않습니다. 검토 후 [저장] 누를 때 차트에 반영됩니다. 신뢰도 90% 미만 항목은 색상으로 표시됩니다.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button type="button" variant="hospitality" onClick={run} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> 추출 중…
              </>
            ) : (
              <>
                <Sparkles className="mr-1 h-3.5 w-3.5" /> 추출 시작
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
