'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Badge } from '@/components/shared/ui/badge';
import { WizardShell, useWizard, type WizardStep } from '../../_shared/wizard-shell';
import { provisionOrganizationAction } from '../../_shared/actions';

const STEPS: WizardStep[] = [
  { key: 'basics', title: '기본 정보' },
  { key: 'licenses', title: '인증 서류' },
  { key: 'plan', title: '플랜' },
  { key: 'topup', title: '등록비 + 충전' },
];

const basicsSchema = z.object({
  orgName: z.string().min(2).max(120),
  legalName: z.string().min(2).max(120),
  representativeName: z.string().min(2).max(80),
  businessRegistrationNumber: z.string().regex(/^\d{3}-\d{2}-\d{5}$/),
  medicalLicenseNumber: z.string().min(4, '의료기관 개설신고증 번호'),
  foreignPatientLicenseNumber: z.string().min(4, '외국인환자 유치 의료기관 등록증 번호'),
});

type Basics = z.infer<typeof basicsSchema>;

const PLANS: Array<{ code: 'medical_payg' | 'medical_committed'; name: string; blurb: string; price: string; gmv: string }> = [
  {
    code: 'medical_payg',
    name: 'Pay-as-you-go',
    blurb: '사용한 만큼 차감 · 충전식',
    price: '등록비 ₩300,000 + 최소 ₩500,000 충전',
    gmv: 'GMV 0.5%',
  },
  {
    code: 'medical_committed',
    name: 'Committed (연간)',
    blurb: '연간 약정 · 15% 할인 · 우선 정산',
    price: '등록비 ₩300,000 + 연 ₩6,000,000',
    gmv: 'GMV 0.3%',
  },
];

export function MedicalSignupWizard(): JSX.Element {
  const router = useRouter();
  const wizard = useWizard(STEPS.length);
  const [basics, setBasics] = useState<Basics | null>(null);
  const [docs, setDocs] = useState<Record<string, { url: string; uploadedAt: string; verified: boolean }>>({});
  const [plan, setPlan] = useState<'medical_payg' | 'medical_committed'>('medical_committed');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Basics>({ resolver: zodResolver(basicsSchema), defaultValues: basics ?? undefined });

  return (
    <WizardShell steps={STEPS} current={wizard.step}>
      {wizard.step === 0 ? (
        <form
          className="space-y-4"
          onSubmit={handleSubmit((values) => {
            setBasics(values);
            wizard.next();
          })}
        >
          <Field label="병원명" error={errors.orgName?.message}>
            <Input placeholder="얼리메디 성형외과" {...register('orgName')} />
          </Field>
          <Field label="의료법인명" error={errors.legalName?.message}>
            <Input placeholder="의료법인 얼리메디" {...register('legalName')} />
          </Field>
          <Field label="대표 원장" error={errors.representativeName?.message}>
            <Input placeholder="이병원" {...register('representativeName')} />
          </Field>
          <Field label="사업자등록번호" error={errors.businessRegistrationNumber?.message}>
            <Input placeholder="000-00-00000" {...register('businessRegistrationNumber')} />
          </Field>
          <Field label="의료기관 개설신고증 번호" error={errors.medicalLicenseNumber?.message}>
            <Input placeholder="MED-XXXX" {...register('medicalLicenseNumber')} />
          </Field>
          <Field
            label="외국인환자 유치 의료기관 등록증 번호"
            error={errors.foreignPatientLicenseNumber?.message}
          >
            <Input placeholder="FP-MED-XXXX" {...register('foreignPatientLicenseNumber')} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="care">
              다음
            </Button>
          </div>
        </form>
      ) : null}

      {wizard.step === 1 ? (
        <div className="space-y-4">
          <DocSlot label="의료기관 개설신고증" slot="medical_license" docs={docs} setDocs={setDocs} />
          <DocSlot
            label="외국인환자 유치 의료기관 등록증"
            slot="foreign_patient_med_license"
            docs={docs}
            setDocs={setDocs}
          />
          <DocSlot label="사업자등록증" slot="business_registration" docs={docs} setDocs={setDocs} />
          <DocSlot label="진료과 · 의사 명단" slot="doctor_roster" docs={docs} setDocs={setDocs} />
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={wizard.prev}>
              이전
            </Button>
            <Button type="button" variant="care" onClick={wizard.next}>
              다음
            </Button>
          </div>
        </div>
      ) : null}

      {wizard.step === 2 ? (
        <div className="space-y-3">
          {PLANS.map((p) => (
            <label
              key={p.code}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                plan === p.code ? 'border-care-500 ring-2 ring-care-200' : 'hover:border-care-300'
              }`}
            >
              <input
                type="radio"
                name="plan"
                checked={plan === p.code}
                onChange={() => setPlan(p.code)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{p.name}</span>
                  {p.code === 'medical_committed' ? <Badge variant="care">15% 할인</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">{p.blurb}</div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <span className="font-medium">{p.price}</span>
                  <span className="text-muted-foreground">{p.gmv}</span>
                </div>
              </div>
            </label>
          ))}
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={wizard.prev}>
              이전
            </Button>
            <Button type="button" variant="care" onClick={wizard.next}>
              다음
            </Button>
          </div>
        </div>
      ) : null}

      {wizard.step === 3 ? (
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="mb-2 font-semibold">최종 확인</div>
            <ul className="space-y-1 text-muted-foreground">
              <li>병원명: {basics?.orgName}</li>
              <li>플랜: {PLANS.find((p) => p.code === plan)?.name}</li>
              <li>업로드된 서류: {Object.keys(docs).length} 건</li>
            </ul>
          </div>
          <div className="rounded-lg border border-care-200 bg-care-50 p-4 text-sm text-care-700">
            <div className="font-semibold">등록비 + 초기 충전 (Mock)</div>
            <p className="mt-1">
              실 결제는 Phase 6에서 활성화. 데모는 즉시 활성화로 진행하고 잔액은 0원 상태로 시작합니다.
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={wizard.prev} disabled={pending}>
              이전
            </Button>
            <Button
              type="button"
              variant="care"
              disabled={pending || !basics}
              onClick={() => {
                if (!basics) return;
                setError(null);
                start(async () => {
                  try {
                    const dest = await provisionOrganizationAction({
                      accountType: 'medical',
                      orgName: basics.orgName,
                      legalName: basics.legalName,
                      representativeName: basics.representativeName,
                      businessRegistrationNumber: basics.businessRegistrationNumber,
                      medicalLicenseNumber: basics.medicalLicenseNumber,
                      foreignPatientLicenseNumber: basics.foreignPatientLicenseNumber,
                      planCode: plan,
                      verificationDocuments: docs,
                      countryCode: 'KR',
                      timezone: 'Asia/Seoul',
                      defaultLocale: 'ko',
                      defaultCurrency: 'KRW',
                    });
                    router.push(dest);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '가입 처리에 실패했습니다.');
                  }
                });
              }}
            >
              {pending ? '활성화 중…' : '활성화'}
            </Button>
          </div>
        </div>
      ) : null}
    </WizardShell>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function DocSlot({
  label,
  slot,
  docs,
  setDocs,
}: {
  label: string;
  slot: string;
  docs: Record<string, { url: string; uploadedAt: string; verified: boolean }>;
  setDocs: (next: Record<string, { url: string; uploadedAt: string; verified: boolean }>) => void;
}): JSX.Element {
  const has = !!docs[slot];
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">PDF · JPG · PNG</div>
      </div>
      <Button
        type="button"
        variant={has ? 'outline' : 'care'}
        size="sm"
        onClick={() => {
          setDocs({
            ...docs,
            [slot]: {
              url: `https://mock.earlymedi.test/${slot}.pdf`,
              uploadedAt: new Date().toISOString(),
              verified: false,
            },
          });
        }}
      >
        {has ? '재업로드' : '파일 선택'}
      </Button>
    </div>
  );
}
