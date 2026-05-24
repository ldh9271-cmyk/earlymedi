'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { quickSignupAction } from '../_shared/actions';

const schema = z.object({
  accountType: z.enum(['medical', 'agency', 'non_medical', 'freelancer'], {
    required_error: '카테고리를 선택해 주세요',
  }),
  partnerSubtype: z
    .enum(['hotel', 'spa', 'salon', 'studio', 'restaurant', 'transport', 'tour', 'shopping', 'wellness', 'other'])
    .optional(),
  orgName: z.string().min(2, '회사명은 2자 이상').max(120),
  representativeName: z.string().min(2, '담당자명은 2자 이상').max(80),
  contactPhone: z
    .string()
    .min(8, '연락처를 입력해 주세요')
    .max(40)
    .regex(/^[0-9+\-\s()]+$/, '숫자·+·-·괄호만 사용해 주세요'),
});

type FormValues = z.infer<typeof schema>;

const CATEGORIES: Array<{
  value: 'medical' | 'agency' | 'non_medical' | 'freelancer';
  label: string;
  desc: string;
  ring: string;
  bg: string;
}> = [
  {
    value: 'medical',
    label: '의료기관',
    desc: '병원 · 의원 · 한의원 · 치과',
    ring: 'peer-checked:ring-care-500 peer-checked:bg-care-50',
    bg: 'bg-care-100 text-care-700',
  },
  {
    value: 'agency',
    label: '유치업체',
    desc: '외국인환자 유치업자',
    ring: 'peer-checked:ring-brand-500 peer-checked:bg-brand-50',
    bg: 'bg-brand-100 text-brand-700',
  },
  {
    value: 'non_medical',
    label: '파트너업체',
    desc: '호텔 · 스파 · 식당 · 교통 · 관광',
    ring: 'peer-checked:ring-slate-500 peer-checked:bg-slate-50',
    bg: 'bg-slate-100 text-slate-700',
  },
  {
    value: 'freelancer',
    label: '프리랜서',
    desc: '송객 · 통역 · 코디 · 인플루언서',
    ring: 'peer-checked:ring-hospitality-500 peer-checked:bg-hospitality-50',
    bg: 'bg-hospitality-100 text-hospitality-700',
  },
];

const PARTNER_SUBTYPES: Array<{ value: string; label: string }> = [
  { value: 'hotel', label: '호텔 · 숙박' },
  { value: 'spa', label: '스파 · 마사지' },
  { value: 'salon', label: '뷰티 · 살롱' },
  { value: 'restaurant', label: '식당' },
  { value: 'transport', label: '교통 · 픽업' },
  { value: 'tour', label: '관광 · 투어' },
  { value: 'shopping', label: '쇼핑' },
  { value: 'wellness', label: '웰니스' },
  { value: 'other', label: '기타' },
];

export function QuickSignupForm({ email }: { email: string }): JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const accountType = watch('accountType');
  const showPartnerSubtype = accountType === 'non_medical';

  function onSubmit(values: FormValues): void {
    setServerError(null);
    startTransition(async () => {
      try {
        const dest = await quickSignupAction({
          accountType: values.accountType,
          partnerSubtype: showPartnerSubtype ? values.partnerSubtype ?? 'other' : null,
          orgName: values.orgName,
          representativeName: values.representativeName,
          contactPhone: values.contactPhone,
        });
        router.replace(dest);
      } catch (err) {
        setServerError(err instanceof Error ? err.message : '가입 중 오류가 발생했습니다.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Account type selection */}
      <div className="space-y-2">
        <Label>카테고리 선택</Label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => (
            <label
              key={cat.value}
              className="relative cursor-pointer"
              onClick={() => setValue('accountType', cat.value, { shouldValidate: true })}
            >
              <input
                type="radio"
                value={cat.value}
                {...register('accountType')}
                className="peer sr-only"
              />
              <div
                className={`rounded-lg border bg-white px-3 py-2.5 ring-2 ring-transparent transition ${cat.ring}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${cat.bg}`}>
                    {cat.label[0]}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{cat.label}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{cat.desc}</div>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
        {errors.accountType ? (
          <p className="text-xs text-destructive">{errors.accountType.message}</p>
        ) : null}
      </div>

      {/* Partner subtype (only for non_medical) */}
      {showPartnerSubtype ? (
        <div className="space-y-1.5">
          <Label htmlFor="partnerSubtype">파트너 분야</Label>
          <select
            id="partnerSubtype"
            {...register('partnerSubtype')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {PARTNER_SUBTYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Company name */}
      <div className="space-y-1.5">
        <Label htmlFor="orgName">회사 이름</Label>
        <Input id="orgName" placeholder="예) 서울 라엘 의원" {...register('orgName')} />
        {errors.orgName ? <p className="text-xs text-destructive">{errors.orgName.message}</p> : null}
      </div>

      {/* Representative name */}
      <div className="space-y-1.5">
        <Label htmlFor="representativeName">담당자 이름</Label>
        <Input id="representativeName" placeholder="예) 이동희" {...register('representativeName')} />
        {errors.representativeName ? (
          <p className="text-xs text-destructive">{errors.representativeName.message}</p>
        ) : null}
      </div>

      {/* Contact phone */}
      <div className="space-y-1.5">
        <Label htmlFor="contactPhone">연락처</Label>
        <Input id="contactPhone" placeholder="010-1234-5678" inputMode="tel" {...register('contactPhone')} />
        {errors.contactPhone ? (
          <p className="text-xs text-destructive">{errors.contactPhone.message}</p>
        ) : null}
      </div>

      {/* Email (read-only, from auth) */}
      <div className="space-y-1.5">
        <Label>이메일</Label>
        <Input value={email} disabled className="bg-muted/40" />
        <p className="text-[11px] text-muted-foreground">로그인하신 이메일이 자동으로 사용됩니다.</p>
      </div>

      {serverError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {serverError}
        </div>
      ) : null}

      <Button type="submit" variant="brand" className="w-full" disabled={isPending}>
        {isPending ? '가입 중…' : '가입 완료하고 둘러보기'}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        가입 시 이용약관 · 개인정보처리방침에 동의합니다. 세금 · 사업자 등록 정보는 나중에 설정에서 추가할 수 있습니다.
      </p>
    </form>
  );
}
