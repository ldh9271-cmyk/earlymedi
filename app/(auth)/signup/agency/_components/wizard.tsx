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
  { key: 'documents', title: '인증 서류' },
  { key: 'plan', title: '플랜 선택' },
  { key: 'review', title: '검토 · 등록비' },
];

const _planSchema = z.enum(['agency_starter', 'agency_growth', 'agency_pro']);

const basicsSchema = z.object({
  orgName: z.string().min(2, '회사명을 입력하세요.').max(120),
  legalName: z.string().min(2).max(120),
  representativeName: z.string().min(2).max(80),
  businessRegistrationNumber: z
    .string()
    .regex(/^\d{3}-\d{2}-\d{5}$/, '사업자등록번호 형식이 올바르지 않습니다. (000-00-00000)'),
  foreignPatientLicenseNumber: z.string().min(4, '외국인환자 유치업 등록증 번호를 입력하세요.'),
});

type Basics = z.infer<typeof basicsSchema>;

const PLANS: Array<{
  code: z.infer<typeof _planSchema>;
  name: string;
  blurb: string;
  monthly: string;
  registration: string;
  gmv: string;
  highlight?: boolean;
}> = [
  {
    code: 'agency_starter',
    name: 'Starter',
    blurb: '소규모 유치업체 · 월 50건 미만',
    monthly: '₩99,000 / 월',
    registration: '등록비 ₩100,000 · 14일 무료',
    gmv: 'GMV 1.5%',
  },
  {
    code: 'agency_growth',
    name: 'Growth',
    blurb: '중규모 유치업체 · 월 50–200건',
    monthly: '₩299,000 / 월',
    registration: '등록비 ₩100,000 · 14일 무료',
    gmv: 'GMV 1.0%',
    highlight: true,
  },
  {
    code: 'agency_pro',
    name: 'Pro',
    blurb: '대형 유치업체 · 화이트라벨 · 무제한',
    monthly: '₩699,000 / 월',
    registration: '등록비 면제',
    gmv: 'GMV 0.7%',
  },
];

export function AgencySignupWizard(): JSX.Element {
  const router = useRouter();
  const wizard = useWizard(STEPS.length);
  const [basics, setBasics] = useState<Basics | null>(null);
  const [docs, setDocs] = useState<Record<string, { url: string; uploadedAt: string; verified: boolean }>>({});
  const [plan, setPlan] = useState<z.infer<typeof _planSchema>>('agency_growth');
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
          <Field label="회사명" error={errors.orgName?.message}>
            <Input placeholder="얼리메디 코리아" {...register('orgName')} />
          </Field>
          <Field label="법인명 (사업자등록증상 상호)" error={errors.legalName?.message}>
            <Input placeholder="주식회사 얼리메디" {...register('legalName')} />
          </Field>
          <Field label="대표자명" error={errors.representativeName?.message}>
            <Input placeholder="홍길동" {...register('representativeName')} />
          </Field>
          <Field label="사업자등록번호" error={errors.businessRegistrationNumber?.message}>
            <Input placeholder="000-00-00000" {...register('businessRegistrationNumber')} />
          </Field>
          <Field label="외국인환자 유치업 등록증 번호" error={errors.foreignPatientLicenseNumber?.message}>
            <Input placeholder="FP-2024-XXXX" {...register('foreignPatientLicenseNumber')} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="submit" variant="brand">
              다음
            </Button>
          </div>
        </form>
      ) : null}

      {wizard.step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            다음 서류를 업로드해 주세요. 인증은 영업일 1–2일 내 완료됩니다.
          </p>
          <DocSlot
            label="사업자등록증"
            slot="business_registration"
            docs={docs}
            setDocs={setDocs}
          />
          <DocSlot
            label="외국인환자 유치업 등록증"
            slot="foreign_patient_license"
            docs={docs}
            setDocs={setDocs}
          />
          <DocSlot label="보증보험증서" slot="bond_insurance" docs={docs} setDocs={setDocs} />
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={wizard.prev}>
              이전
            </Button>
            <Button type="button" variant="brand" onClick={wizard.next}>
              다음
            </Button>
          </div>
        </div>
      ) : null}

      {wizard.step === 2 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">매출 규모에 맞는 플랜을 선택하세요.</p>
          {PLANS.map((p) => (
            <label
              key={p.code}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                plan === p.code ? 'border-brand-600 ring-2 ring-brand-200' : 'hover:border-brand-300'
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
                  {p.highlight ? <Badge variant="brand">추천</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">{p.blurb}</div>
                <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                  <span className="font-medium">{p.monthly}</span>
                  <span className="text-muted-foreground">{p.registration}</span>
                  <span className="text-muted-foreground">{p.gmv}</span>
                </div>
              </div>
            </label>
          ))}
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={wizard.prev}>
              이전
            </Button>
            <Button type="button" variant="brand" onClick={wizard.next}>
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
              <li>회사명: {basics?.orgName}</li>
              <li>법인명: {basics?.legalName}</li>
              <li>사업자등록번호: {basics?.businessRegistrationNumber}</li>
              <li>유치업 등록증: {basics?.foreignPatientLicenseNumber}</li>
              <li>플랜: {PLANS.find((p) => p.code === plan)?.name}</li>
              <li>업로드된 서류: {Object.keys(docs).length} 건</li>
            </ul>
          </div>
          <div className="rounded-lg border border-hospitality-200 bg-hospitality-50 p-4 text-sm text-hospitality-700">
            <div className="font-semibold">등록비 결제 (Mock)</div>
            <p className="mt-1">
              실제 결제는 Phase 6에서 Stripe / Toss / Wise 연동으로 활성화됩니다. 지금은 Mock 결제로
              즉시 활성화합니다.
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={wizard.prev} disabled={pending}>
              이전
            </Button>
            <Button
              type="button"
              variant="brand"
              disabled={pending || !basics}
              onClick={() => {
                if (!basics) return;
                setError(null);
                start(async () => {
                  try {
                    const dest = await provisionOrganizationAction({
                      accountType: 'agency',
                      orgName: basics.orgName,
                      legalName: basics.legalName,
                      representativeName: basics.representativeName,
                      businessRegistrationNumber: basics.businessRegistrationNumber,
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
              {pending ? '활성화 중…' : '등록비 결제 후 활성화'}
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
        <div className="text-xs text-muted-foreground">PDF · JPG · PNG (10MB 이하)</div>
      </div>
      <Button
        type="button"
        variant={has ? 'outline' : 'brand'}
        size="sm"
        onClick={() => {
          // Mock upload — Phase 1.x wires real Supabase Storage upload.
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
