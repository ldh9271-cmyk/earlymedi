'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { quickSignupAction } from '../_shared/actions';

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Schema builder — when the user is already authenticated (came from
 * Google OAuth or magic link), email + password fields are not needed.
 * For fresh signups they're required.
 */
function buildSchema(alreadyAuthed: boolean) {
  const orgBlock = {
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
    gender: z
      .union([
        z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
        z.literal(''),
      ])
      .optional(),
    birthYear: z
      .union([
        z.string().regex(/^\d{4}$/, '4자리 연도 (예: 1990)'),
        z.literal(''),
      ])
      .optional(),
  };

  if (alreadyAuthed) {
    return z.object(orgBlock);
  }

  return z
    .object({
      ...orgBlock,
      email: z.string().email('유효한 이메일을 입력해 주세요'),
      password: z
        .string()
        .min(8, '비밀번호는 8자 이상')
        .max(128, '비밀번호는 128자 이하'),
      passwordConfirm: z.string(),
    })
    .refine((d) => d.password === d.passwordConfirm, {
      path: ['passwordConfirm'],
      message: '비밀번호가 일치하지 않습니다',
    });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>> & {
  email?: string;
  password?: string;
  passwordConfirm?: string;
};

const GENDERS: Array<{ value: 'male' | 'female' | 'other' | 'prefer_not_to_say'; label: string }> = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
  { value: 'prefer_not_to_say', label: '응답 안함' },
];

/** Bucket label shown next to the birth-year input. */
function ageRangeLabelFor(year: number): string {
  const age = CURRENT_YEAR - year;
  if (age < 20) return '10대 이하';
  if (age < 30) return '20대';
  if (age < 40) return '30대';
  if (age < 50) return '40대';
  if (age < 60) return '50대';
  if (age < 70) return '60대';
  return '70대 이상';
}

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

export function QuickSignupForm({
  email,
  alreadyAuthed,
}: {
  email: string;
  alreadyAuthed: boolean;
}): JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const schema = buildSchema(alreadyAuthed);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as ReturnType<typeof zodResolver>,
  });

  const accountType = watch('accountType');
  const showPartnerSubtype = accountType === 'non_medical';

  function onSubmit(values: FormValues): void {
    setServerError(null);
    startTransition(async () => {
      try {
        // 1) Fresh signup path — create the auth user first via supabase.
        if (!alreadyAuthed) {
          const supabase = createSupabaseBrowserClient();
          if (!supabase) {
            setServerError('Supabase가 연결되지 않았습니다. 환경 변수 확인.');
            return;
          }
          const { error: signUpErr } = await supabase.auth.signUp({
            email: values.email!,
            password: values.password!,
            options: {
              emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/signup`,
            },
          });
          if (signUpErr) {
            const msg = signUpErr.message.toLowerCase();
            if (msg.includes('already registered') || msg.includes('user already exists')) {
              setServerError(
                '이미 가입된 이메일입니다. 로그인 페이지에서 비밀번호로 로그인하거나, 비밀번호 찾기를 이용해 주세요.',
              );
            } else if (msg.includes('weak') || msg.includes('password')) {
              setServerError('비밀번호가 너무 약합니다. 8자 이상, 영문 + 숫자 조합 권장.');
            } else {
              setServerError(signUpErr.message);
            }
            return;
          }
          // Wait a tick for the session cookie to land before calling the
          // server action (which reads it via createSupabaseServerClient).
          await new Promise((r) => setTimeout(r, 300));
        }

        const birthYearStr =
          typeof values.birthYear === 'string' ? values.birthYear.trim() : '';
        const birthYearNum = birthYearStr ? Number(birthYearStr) : null;
        const genderRaw = (values.gender ?? '') as string;
        const gender =
          genderRaw === 'male' ||
          genderRaw === 'female' ||
          genderRaw === 'other' ||
          genderRaw === 'prefer_not_to_say'
            ? genderRaw
            : null;

        const dest = await quickSignupAction({
          accountType: values.accountType,
          partnerSubtype: showPartnerSubtype ? values.partnerSubtype ?? 'other' : null,
          orgName: values.orgName,
          representativeName: values.representativeName,
          contactPhone: values.contactPhone,
          gender,
          birthYear: birthYearNum,
        });
        router.replace(dest);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '가입 중 오류가 발생했습니다.';
        // unauthenticated thrown from server action means the auth user
        // wasn't created yet (probably email-confirmation required).
        if (msg === 'unauthenticated' && !alreadyAuthed) {
          setServerError(
            '계정 생성 후 이메일 인증이 필요합니다. 받은 인증 메일의 링크를 클릭한 뒤 다시 진행해 주세요.',
          );
        } else {
          setServerError(msg);
        }
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

      {/* Demographics (optional) — gender + birth year. Used for KOIHA
          stats and marketing analytics; users can decline. */}
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-baseline justify-between">
          <Label className="text-sm font-semibold">담당자 기본 정보 (선택)</Label>
          <span className="text-[10px] text-muted-foreground">분석용 · 응답 안 해도 가입 가능</span>
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <Label htmlFor="gender" className="text-xs">성별</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {GENDERS.map((g) => (
              <label key={g.value} className="cursor-pointer">
                <input
                  type="radio"
                  value={g.value}
                  {...register('gender')}
                  className="peer sr-only"
                />
                <div className="rounded-md border bg-card px-2 py-1.5 text-center text-xs transition peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:font-semibold peer-checked:text-brand-700">
                  {g.label}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Birth year + auto age range */}
        <div className="space-y-1.5">
          <Label htmlFor="birthYear" className="text-xs">출생연도</Label>
          <div className="flex items-center gap-2">
            <Input
              id="birthYear"
              type="number"
              inputMode="numeric"
              placeholder="예: 1990"
              min={1920}
              max={CURRENT_YEAR - 10}
              {...register('birthYear')}
              className="w-32"
            />
            {watch('birthYear') && /^\d{4}$/.test(String(watch('birthYear'))) ? (
              <span className="text-xs text-muted-foreground">
                연령대: <strong className="text-foreground">{ageRangeLabelFor(Number(watch('birthYear')))}</strong>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">연령대는 자동 계산됩니다</span>
            )}
          </div>
          {errors.birthYear ? (
            <p className="text-xs text-destructive">{errors.birthYear.message}</p>
          ) : null}
        </div>
      </div>

      {/* Email + password — required for fresh signups; read-only when
          the user already authed via OAuth or magic link. */}
      {alreadyAuthed ? (
        <div className="space-y-1.5">
          <Label>이메일</Label>
          <Input value={email} disabled className="bg-muted/40" />
          <p className="text-[11px] text-muted-foreground">로그인하신 이메일이 자동으로 사용됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
          <Label className="text-sm font-semibold">로그인 계정</Label>
          <div className="space-y-1.5">
            <Label htmlFor="signup-email" className="text-xs">
              이메일 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="signup-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
            />
            {(errors as Record<string, { message?: string } | undefined>).email ? (
              <p className="text-xs text-destructive">
                {(errors as Record<string, { message?: string }>).email?.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-password" className="text-xs">
              비밀번호 <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="8자 이상"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {(errors as Record<string, { message?: string } | undefined>).password ? (
              <p className="text-xs text-destructive">
                {(errors as Record<string, { message?: string }>).password?.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-password-confirm" className="text-xs">
              비밀번호 확인 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="signup-password-confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="다시 한 번"
              {...register('passwordConfirm')}
            />
            {(errors as Record<string, { message?: string } | undefined>).passwordConfirm ? (
              <p className="text-xs text-destructive">
                {(errors as Record<string, { message?: string }>).passwordConfirm?.message}
              </p>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">
            비밀번호 없이 시작하려면 우측 상단 로그인 메뉴에서 Google · 매직링크를 사용하세요.
          </p>
        </div>
      )}

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
