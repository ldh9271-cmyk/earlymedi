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
  { key: 'tax', title: '세금 · 은행' },
  { key: 'agency', title: '소속 Agency' },
];

const basicsSchema = z.object({
  orgName: z.string().min(2).max(120),
  representativeName: z.string().min(2).max(80),
  countryCode: z.string().length(2).default('KR'),
});

type Basics = z.infer<typeof basicsSchema>;

export function FreelancerSignupWizard({
  inviteToken,
  agencyHint,
}: {
  inviteToken?: string;
  agencyHint?: string;
}): JSX.Element {
  const router = useRouter();
  const wizard = useWizard(STEPS.length);
  const [basics, setBasics] = useState<Basics | null>(null);
  const [agencyOrgId, setAgencyOrgId] = useState<string | undefined>(agencyHint);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  void inviteToken; // Phase 1.x: redeem the invite token to derive agencyOrgId
  void setAgencyOrgId;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Basics>({
    resolver: zodResolver(basicsSchema),
    defaultValues: { countryCode: 'KR' },
  });

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
          <Field label="활동명 (브랜드명)" error={errors.orgName?.message}>
            <Input placeholder="박송객 컨시어지" {...register('orgName')} />
          </Field>
          <Field label="본명" error={errors.representativeName?.message}>
            <Input placeholder="박송객" {...register('representativeName')} />
          </Field>
          <Field label="거주 국가" error={errors.countryCode?.message}>
            <Input placeholder="KR" maxLength={2} {...register('countryCode')} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="hospitality">
              다음
            </Button>
          </div>
        </form>
      ) : null}

      {wizard.step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            세금 처리·정산 방식을 결정합니다. 한국 거주자는 원천세 3.3% 자동 차감, 해외 거주자는
            조세조약·W-8BEN 처리됩니다.
          </p>
          <Field label="은행명">
            <Input placeholder="국민은행" />
          </Field>
          <Field label="계좌번호">
            <Input placeholder="000-0000-0000-00" />
          </Field>
          <Field label="예금주">
            <Input placeholder="박송객" />
          </Field>
          <p className="text-xs text-muted-foreground">
            * 세금 서류(원천징수영수증·지급명세서·W-8BEN)는 Phase 6 정산 활성화 시 자동 발급됩니다.
          </p>
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={wizard.prev}>
              이전
            </Button>
            <Button type="button" variant="hospitality" onClick={wizard.next}>
              다음
            </Button>
          </div>
        </div>
      ) : null}

      {wizard.step === 2 ? (
        <div className="space-y-4">
          {agencyOrgId ? (
            <div className="rounded-lg border border-care-200 bg-care-50 p-4 text-sm text-care-700">
              ✅ 초대받은 Agency와 자동 연결됩니다.
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              초대 코드가 없습니다. 가입 후 [소속 Agency 추가]에서 검색·요청을 보내거나, Agency가
              발송한 초대 링크를 사용하세요.
            </div>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={wizard.prev} disabled={pending}>
              이전
            </Button>
            <Button
              type="button"
              variant="hospitality"
              disabled={pending || !basics}
              onClick={() => {
                if (!basics) return;
                setError(null);
                start(async () => {
                  try {
                    const dest = await provisionOrganizationAction({
                      accountType: 'freelancer',
                      orgName: basics.orgName,
                      representativeName: basics.representativeName,
                      planCode: 'freelancer_free',
                      countryCode: basics.countryCode,
                      timezone: 'Asia/Seoul',
                      defaultLocale: 'ko',
                      defaultCurrency: 'KRW',
                      inviteAffiliationAgencyOrgId: agencyOrgId,
                      verificationDocuments: {},
                    });
                    router.push(dest);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '가입 처리에 실패했습니다.');
                  }
                });
              }}
            >
              {pending ? '활성화 중…' : '가입 완료'}
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
