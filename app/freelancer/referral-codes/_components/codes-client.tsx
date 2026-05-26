'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  Edit2,
  ExternalLink,
  Plus,
  QrCode,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import {
  createCodeAction,
  deleteCodeAction,
  updateCodeAction,
  type CodeInput,
  type CodeRow,
} from '@/lib/freelancer/referral-codes-actions';

const LOCALE_OPTIONS = [
  { value: '', label: '자동 감지' },
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ru', label: 'Русский' },
];

/**
 * Page client — list cards + create/edit modal. QR images are pulled
 * from a free public QR service (api.qrserver.com) so we don't need a
 * server-side QR library; the URL itself is the only state needed.
 */
export function CodesClient({
  initialCodes,
}: {
  initialCodes: CodeRow[];
}): JSX.Element {
  const [editing, setEditing] = useState<CodeRow | 'new' | null>(null);
  const [pending, start] = useTransition();

  function handleDelete(row: CodeRow): void {
    if (
      !confirm(
        `"${row.label}" 코드를 삭제할까요? 이미 이 코드로 유입된 케이스는 유지되지만 새 유입은 무효 처리됩니다.`,
      )
    ) {
      return;
    }
    start(async () => {
      try {
        await deleteCodeAction(row.id);
        toast.success('코드를 삭제했습니다.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '삭제 실패');
      }
    });
  }

  if (initialCodes.length === 0 && editing === null) {
    return (
      <div className="space-y-3 rounded-lg border-2 border-dashed bg-muted/20 p-10 text-center">
        <QrCode className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-semibold">아직 발급한 추천 코드가 없습니다</p>
        <p className="text-xs text-muted-foreground">
          첫 코드를 만들면 QR 이미지와 추적 URL을 즉시 받습니다.
        </p>
        <Button variant="brand" size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-1 h-3.5 w-3.5" />첫 코드 발급
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button variant="brand" size="sm" onClick={() => setEditing('new')}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          새 코드 발급
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {initialCodes.map((c) => (
          <CodeCard
            key={c.id}
            row={c}
            onEdit={() => setEditing(c)}
            onDelete={() => handleDelete(c)}
            pending={pending}
          />
        ))}
      </div>

      {editing !== null ? (
        <CodeModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function CodeCard({
  row,
  onEdit,
  onDelete,
  pending,
}: {
  row: CodeRow;
  onEdit: () => void;
  onDelete: () => void;
  pending: boolean;
}): JSX.Element {
  const landingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/r/${row.code}`
      : `/r/${row.code}`;
  // Use a public QR service so we don't need a server-side QR library.
  // 300x300 PNG, error-correction level M, with margin.
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(
    landingUrl,
  )}`;

  async function copyUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(landingUrl);
      toast.success('URL을 복사했습니다.');
    } catch {
      toast.error('복사 실패 — 수동으로 복사해 주세요.');
    }
  }

  const conversionPct =
    row.clicks > 0 ? Math.round((row.signups / row.clicks) * 1000) / 10 : 0;

  return (
    <Card className={!row.isActive ? 'opacity-60' : ''}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Badge variant="hospitality" className="font-mono text-[10px] tracking-wider">
                {row.code}
              </Badge>
              {!row.isActive ? (
                <Badge variant="outline" className="text-[10px]">비활성</Badge>
              ) : null}
              {row.targetLocale ? (
                <Badge variant="outline" className="text-[10px]">
                  {LOCALE_OPTIONS.find((l) => l.value === row.targetLocale)?.label ??
                    row.targetLocale}
                </Badge>
              ) : null}
            </div>
            <h3 className="mt-1 truncate text-sm font-semibold">{row.label}</h3>
            {row.notes ? (
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                {row.notes}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="편집"
              aria-label="편집"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="삭제"
              aria-label="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          {/* QR image — uses a public QR service, no auth needed.
              alt text lets screen readers read out the code. */}
          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md border bg-white p-2 transition hover:border-hospitality-300"
            title="QR 이미지 새 창으로 열기 (다운로드 → 인쇄용)"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt={`QR for ${row.code}`}
              width={96}
              height={96}
              className="h-24 w-24"
            />
          </a>

          <div className="min-w-0 flex-1 space-y-2">
            {/* Landing URL */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                추적 URL
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <code className="block flex-1 truncate rounded bg-muted/40 px-2 py-1 font-mono text-[11px]">
                  {landingUrl}
                </code>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="URL 복사"
                  aria-label="URL 복사"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <a
                  href={landingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="새 창에서 열기"
                  aria-label="새 창에서 열기"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/20 px-2 py-1.5 text-center">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  클릭
                </div>
                <div className="text-sm font-bold">{row.clicks}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  가입
                </div>
                <div className="text-sm font-bold text-hospitality-700">
                  {row.signups}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  전환율
                </div>
                <div className="text-sm font-bold">
                  {conversionPct}
                  <span className="text-[9px] font-normal text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CodeModal({
  initial,
  onClose,
}: {
  initial: CodeRow | null;
  onClose: () => void;
}): JSX.Element {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [targetLocale, setTargetLocale] = useState(initial?.targetLocale ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!label.trim()) {
      toast.error('라벨(어떤 채널용인지)을 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      const payload: CodeInput = {
        id: initial?.id,
        label: label.trim(),
        targetLocale: targetLocale || null,
        notes: notes.trim() || null,
        isActive,
      };
      if (initial) {
        await updateCodeAction(payload);
        toast.success('코드 정보를 수정했습니다.');
      } else {
        const { code } = await createCodeAction(payload);
        toast.success(`새 코드 "${code}"가 발급되었습니다.`, {
          duration: 5000,
          icon: <Check className="h-4 w-4 text-care-600" />,
        });
      }
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
        className="relative w-full max-w-md overflow-y-auto rounded-xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold">
            {initial ? '코드 편집' : '새 추천 코드 발급'}
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
          {!initial ? (
            <div className="rounded-md border border-hospitality-200 bg-hospitality-50 px-3 py-2 text-xs text-hospitality-900">
              💡 코드(8자리 영문·숫자)는 자동 생성됩니다. 라벨만 입력하시면 됩니다.
            </div>
          ) : (
            <div className="space-y-1">
              <Label>코드</Label>
              <code className="block rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm tracking-wider">
                {initial.code}
              </code>
              <p className="text-[10px] text-muted-foreground">
                코드 자체는 변경할 수 없습니다 (이미 유포되어 있을 수 있음).
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="code-label">라벨</Label>
            <Input
              id="code-label"
              placeholder="예) Instagram 메인 / KakaoTalk QR — 6월 행사"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              maxLength={120}
            />
            <p className="text-[10px] text-muted-foreground">
              어떤 채널·캠페인용인지 본인이 알아보기 쉬운 메모
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="code-locale">기본 언어 (선택)</Label>
            <select
              id="code-locale"
              value={targetLocale}
              onChange={(e) => setTargetLocale(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {LOCALE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              QR로 들어온 랜딩 페이지의 기본 언어. 미설정 시 브라우저 자동 감지.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="code-notes">메모 (선택)</Label>
            <textarea
              id="code-notes"
              rows={2}
              placeholder="캠페인 목표, 협력 Agency 등"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span>활성 상태 — 새 유입 추적 가능</span>
          </label>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button type="submit" variant="brand" disabled={saving}>
              {saving ? '저장 중…' : initial ? '수정 저장' : '코드 발급'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
