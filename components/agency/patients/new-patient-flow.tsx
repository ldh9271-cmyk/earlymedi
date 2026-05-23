'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { PassportUploader } from '@/components/agency/patients/passport-uploader';

type ExtractedPassport = {
  surname: string;
  given_names: string;
  passport_number: string;
  nationality?: string;
  date_of_birth: string;
  sex: 'M' | 'F' | 'X' | 'unknown';
};

export function NewPatientFlow(): JSX.Element {
  const router = useRouter();
  const [extractionJobId, setExtractionJobId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    surname: '',
    givenNames: '',
    nationality: '',
    dateOfBirth: '',
    sex: 'unknown' as 'male' | 'female' | 'other' | 'unknown',
    passportNumber: '',
    phone: '',
    email: '',
    aliasName: '',
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/agency/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          surname: form.surname || undefined,
          givenNames: form.givenNames || undefined,
          nationality: form.nationality || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          sex: form.sex,
          passportNumber: form.passportNumber || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          aliasName: form.aliasName || undefined,
          extractionJobId: extractionJobId ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      return (await res.json()) as { data: { id: string; duplicateOfId?: string } };
    },
    onSuccess: (json) => {
      if (json.data.duplicateOfId) {
        toast.warning('중복 가능성 발견', {
          description: '기존 환자와 동일한 여권/전화/이메일이 감지되었습니다. 환자 상세에서 머지 가능합니다.',
        });
      } else {
        toast.success('환자가 등록되었습니다');
      }
      router.push(`/agency/patients/${json.data.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function applyExtraction(data: ExtractedPassport): void {
    setForm((f) => ({
      ...f,
      surname: data.surname || f.surname,
      givenNames: data.given_names || f.givenNames,
      fullName: f.fullName || `${data.surname} ${data.given_names}`.trim(),
      passportNumber: data.passport_number || f.passportNumber,
      nationality: data.nationality ?? f.nationality,
      dateOfBirth: data.date_of_birth || f.dateOfBirth,
      sex: data.sex === 'M' ? 'male' : data.sex === 'F' ? 'female' : data.sex === 'X' ? 'other' : f.sex,
    }));
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">① 여권 OCR (선택)</CardTitle>
        </CardHeader>
        <CardContent>
          <PassportUploader
            onExtracted={(d, jobId) => {
              applyExtraction(d);
              setExtractionJobId(jobId);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">② 정보 확인 · 저장</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="이름 (Full Name) *">
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="성 (Surname)">
              <Input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} />
            </Field>
            <Field label="이름 (Given names)">
              <Input value={form.givenNames} onChange={(e) => setForm({ ...form, givenNames: e.target.value })} />
            </Field>
          </div>
          <Field label="가명 (외부 노출용)">
            <Input
              value={form.aliasName}
              onChange={(e) => setForm({ ...form, aliasName: e.target.value })}
              placeholder="예: Ms. W. (Beijing)"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="국적 (ISO-3)">
              <Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} maxLength={3} />
            </Field>
            <Field label="생년월일 (YYYY-MM-DD)">
              <Input value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} placeholder="1990-01-01" />
            </Field>
          </div>
          <Field label="성별">
            <select
              value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value as 'male' | 'female' | 'other' | 'unknown' })}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="unknown">선택 안 함</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="여권번호 (저장 시 자동 암호화)">
            <Input
              value={form.passportNumber}
              onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
            />
          </Field>
          <Field label="전화 (저장 시 자동 암호화)">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="이메일 (저장 시 자동 암호화)">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Button
            variant="brand"
            className="w-full"
            disabled={!form.fullName || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? '저장 중…' : '환자 등록'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
