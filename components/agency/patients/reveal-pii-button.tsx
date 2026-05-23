'use client';

import { useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';

export function RevealPiiButton({
  patientId,
  field,
}: {
  patientId: string;
  field: 'passport' | 'phone' | 'email' | 'rrn';
}): JSX.Element {
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reveal(): Promise<void> {
    const reason = window.prompt('PII 조회 사유를 입력하세요 (감사 로그에 기록됩니다)');
    if (!reason || reason.trim().length < 3) {
      toast.error('조회 사유는 최소 3자 이상');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/agency/patients/${patientId}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: [field], reason: reason.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: Record<string, string | null> };
      setValue(json.data[field] ?? '(공란)');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '조회 실패');
    } finally {
      setBusy(false);
    }
  }

  if (value) {
    return <span className="select-all font-mono text-sm">{value}</span>;
  }

  return (
    <Button size="sm" variant="outline" onClick={reveal} disabled={busy}>
      {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
      열기
    </Button>
  );
}
