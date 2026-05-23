'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { WizardShell, useWizard, type WizardStep } from '../../_shared/wizard-shell';
import { provisionOrganizationAction } from '../../_shared/actions';

const STEPS: WizardStep[] = [
  { key: 'basics', title: '기본 정보' },
  { key: 'type', title: '서비스 유형' },
  { key: 'plan', title: '플랜' },
];

const SUBTYPES = [
  { value: 'hotel', label: '호텔 · 숙박' },
  { value: 'spa', label: '스파 · 마사지' },
  { value: 'salon', label: '미용실' },
  { value: 'studio', label: '사진관 (웨딩 · 프로필 · 전후)' },
  { value: 'restaurant', label: '음식점 (할랄 · 코셔 · 비건)' },
  { value: 'transport', label: '교통 (차량 · 기사 · 픽업)' },
  { value: 'tour', label: '관광 · 가이드' },
  { value: 'shopping', label: '쇼핑 · 면세' },
  { value: 'wellness', label: '웰니스 · 한방' },
  { value: 'other', label: '기타' },
] as const;

const PLANS: Array<{ code: 'partner_listing' | 'partner_active'; name: string; price: string; gmv: string; blurb: string }> = [
  {
    code: 'partner_listing',
    name: 'Listing',
    price: '등록비 ₩50,000 · 무료 운영',
    gmv: 'GMV 3%',
    blurb: '디렉토리 노출 · 거래 시에만 수수료',
  },
  {
    code: 'partner_active',
    name: 'Active',
    price: '등록비 ₩50,000 + ₩49,000/월',
    gmv: 'GMV 1.5%',
    blurb: '우선 노출 · 가용성 캘린더 · 다국어 메뉴',
  },
];

const basicsSchema = z.object({
  orgName: z.string().min(2).max(120),
  representativeName: z.string().min(2).max(80),
  countryCode: z.string().length(2).default('KR'),
  partnerSubtype: z.enum([
    'hotel',
    'spa',
    'salon',
    'studio',
    'restaurant',
    'transport',
    'tour',
    'shopping',
    'wellness',
    'other',
  ]),
});

type Basics = z.infer<typeof basicsSchema>;

export function PartnerSignupWizard(): JSX.Element {
  const router = useRouter();
  const wizard = useWizard(STEPS.length);
  const [basics, setBasics] = useState<Basics | null>(null);
  const [plan, setPlan] = useState<'partner_listing' | 'partner_active'>('partner_active');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<Basics>({
    resolver: zodResolver(basicsSchema),
    defaultValues: { countryCode: 'KR', partnerSubtype: 'hotel' },
  });

  const subtype = watch('partnerSubtype');

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
          <Field label="업체명" error={errors.orgName?.message}>
            <Input placeholder="얼리메디 회복호텔" {...register('orgName')} />
          </Field>
          <Field label="대표자명" error={errors.representativeName?.message}>
            <Input placeholder="최호텔" {...register('representativeName')} />
          </Field>
          <Field label="국가" error={errors.countryCode?.message}>
            <Input placeholder="KR" maxLength={2} {...register('countryCode')} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit">다음</Button>
          </div>
        </form>
      ) : null}

      {wizard.step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">제공하시는 서비스 유형을 선택하세요.</p>
          <div className="grid grid-cols-2 gap-2">
            {SUBTYPES.map((s) => (
              <label
                key={s.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                  subtype === s.value ? 'border-brand-600 ring-2 ring-brand-200' : ''
                }`}
              >
                <input
                  type="radio"
                  checked={subtype === s.value}
                  onChange={() => setValue('partnerSubtype', s.value)}
                />
                {s.label}
              </label>
            ))}
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={wizard.prev}>
              이전
            </Button>
            <Button type="button" onClick={wizard.next}>
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
                plan === p.code ? 'border-brand-600 ring-2 ring-brand-200' : ''
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
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.blurb}</div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <span className="font-medium">{p.price}</span>
                  <span className="text-muted-foreground">{p.gmv}</span>
                </div>
              </div>
            </label>
          ))}
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
                      accountType: 'non_medical',
                      orgName: basics.orgName,
                      representativeName: basics.representativeName,
                      partnerSubtype: basics.partnerSubtype,
                      planCode: plan,
                      countryCode: basics.countryCode,
                      timezone: 'Asia/Seoul',
                      defaultLocale: 'ko',
                      defaultCurrency: 'KRW',
                      verificationDocuments: {},
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
