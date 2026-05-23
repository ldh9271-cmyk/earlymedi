'use client';

import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';

type Extracted = {
  surname: string;
  given_names: string;
  passport_number: string;
  nationality?: string;
  date_of_birth: string;
  date_of_expiry: string;
  sex: 'M' | 'F' | 'X' | 'unknown';
  overall_confidence_bp: number;
  confidence: Record<string, number>;
  warnings: string[];
};

export function PassportUploader({
  onExtracted,
}: {
  onExtracted?: (data: Extracted, jobId: string) => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Extracted | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('파일이 너무 큽니다. 8MB 이하 이미지를 사용하세요.');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/ai/passport-ocr', { method: 'POST', body: form });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { data: { jobId: string; data: Extracted; warnings: string[] } };
      setResult(json.data.data);
      setJobId(json.data.jobId);
      onExtracted?.(json.data.data, json.data.jobId);
      toast.success(`여권 추출 완료 (신뢰도 ${(json.data.data.overall_confidence_bp / 100).toFixed(1)}%)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '추출 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed p-4 hover:border-brand-300">
        <div className="flex items-center gap-3 text-sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-brand-600" />}
          <div>
            <div className="font-medium">여권 사진 업로드</div>
            <div className="text-xs text-muted-foreground">JPG / PNG · 8MB 이하 · MRZ 포함 권장</div>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" disabled={busy}>
          <span>파일 선택</span>
        </Button>
        <input
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={onPick}
          disabled={busy}
        />
      </label>

      {result ? (
        <div className="rounded-lg border bg-card p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">추출 결과</div>
            <ConfidencePill bp={result.overall_confidence_bp} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="성" value={result.surname} bp={result.confidence.surname} />
            <Field label="이름" value={result.given_names} bp={result.confidence.given_names} />
            <Field
              label="여권번호"
              value={result.passport_number}
              bp={result.confidence.passport_number}
            />
            <Field label="국적" value={result.nationality ?? '—'} bp={result.confidence.nationality} />
            <Field
              label="생년월일"
              value={result.date_of_birth}
              bp={result.confidence.date_of_birth}
            />
            <Field
              label="만료일"
              value={result.date_of_expiry}
              bp={result.confidence.date_of_expiry}
            />
          </div>
          {result.warnings.length > 0 ? (
            <div className="mt-3 rounded-md border border-hospitality-200 bg-hospitality-50 p-2 text-xs text-hospitality-800">
              ⚠ {result.warnings.join(' · ')}
            </div>
          ) : null}
          {jobId ? <div className="mt-2 text-[10px] text-muted-foreground">job: {jobId}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value, bp }: { label: string; value: string; bp?: number }): JSX.Element {
  const color = bpColor(bp);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium ${color}`}>{value || '—'}</div>
    </div>
  );
}

function ConfidencePill({ bp }: { bp: number }): JSX.Element {
  const klass =
    bp >= 9000
      ? 'bg-care-100 text-care-700'
      : bp >= 7000
        ? 'bg-hospitality-100 text-hospitality-700'
        : 'bg-destructive/10 text-destructive';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${klass}`}>
      {(bp / 100).toFixed(1)}%
    </span>
  );
}

function bpColor(bp?: number): string {
  if (typeof bp !== 'number') return 'text-foreground';
  if (bp >= 9000) return 'text-foreground';
  if (bp >= 7000) return 'text-hospitality-700';
  return 'text-destructive';
}
