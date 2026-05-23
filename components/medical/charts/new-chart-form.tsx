'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';

type FormState = {
  hospitalId: string;
  patientId: string;
  treatmentDate: string;
  doctorName: string;
  quoteTotalKrw: string;
};

export function NewChartForm(): JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    hospitalId: '',
    patientId: '',
    treatmentDate: new Date().toISOString().slice(0, 10),
    doctorName: '',
    quoteTotalKrw: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/medical/charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: form.hospitalId,
          patientId: form.patientId,
          treatmentDate: form.treatmentDate,
          doctorName: form.doctorName || null,
          quoteTotalKrw: form.quoteTotalKrw ? Number.parseInt(form.quoteTotalKrw, 10) : null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { data } = (await res.json()) as { data: { id: string } };
      toast.success('차트가 생성되었습니다');
      router.push(`/medical/charts/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '생성 실패');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="hospitalId">병원 ID (UUID)</Label>
        <Input
          id="hospitalId"
          required
          value={form.hospitalId}
          onChange={(e) => setForm({ ...form, hospitalId: e.target.value })}
          placeholder="hospitals.id"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Phase 5에서 환자·병원 선택 콤보박스로 교체됩니다. 지금은 시드 ID를 직접 입력.
        </p>
      </div>
      <div>
        <Label htmlFor="patientId">환자 ID (UUID)</Label>
        <Input
          id="patientId"
          required
          value={form.patientId}
          onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          placeholder="patients.id"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="treatmentDate">시술일</Label>
          <Input
            id="treatmentDate"
            type="date"
            required
            value={form.treatmentDate}
            onChange={(e) => setForm({ ...form, treatmentDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="doctorName">담당 의사</Label>
          <Input
            id="doctorName"
            value={form.doctorName}
            onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
            placeholder="김의사"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="quoteTotalKrw">견적 합계 (KRW, 선택)</Label>
        <Input
          id="quoteTotalKrw"
          type="number"
          inputMode="numeric"
          value={form.quoteTotalKrw}
          onChange={(e) => setForm({ ...form, quoteTotalKrw: e.target.value })}
          placeholder="10000000"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          입력 시 차트 합계와의 차이(±5%/±15%)가 자동으로 분류됩니다.
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="care" disabled={submitting}>
          {submitting ? '생성 중…' : '차트 생성'}
        </Button>
      </div>
    </form>
  );
}
