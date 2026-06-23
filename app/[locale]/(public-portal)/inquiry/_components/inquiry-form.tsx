'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { submitPublicInquiryAction } from '../actions';

const COUNTRY_CODES = [
  'US', 'KR', 'CN', 'JP', 'TW', 'HK', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID',
  'RU', 'KZ', 'UZ', 'IN', 'AE', 'SA', 'AU', 'CA', 'GB', 'DE', 'FR', 'IT',
];

export function InquiryForm({
  locale,
  hospitalId,
  prefillProgram,
  prefillInterest,
  hospitalOptions,
  labels,
}: {
  locale: PublicLocale;
  hospitalId: string | null;
  /** Pre-fills memo when arriving from the Glow-up app (e.g. "예약 문의: 4박 5일 글로우업 코스"). */
  prefillProgram?: string | null;
  /** Pre-checks one of the interest chips (categoryKey) when present. */
  prefillInterest?: string | null;
  hospitalOptions: Array<{ id: string; name: string }>;
  labels: {
    name: string;
    country: string;
    contact: string;
    interest: string;
    memo: string;
    submit: string;
    privacy: string;
    categories: Dictionary['categories']['items'];
  };
}): JSX.Element {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('US');
  const [contact, setContact] = useState('');
  const [interests, setInterests] = useState<string[]>(
    prefillInterest ? [prefillInterest] : [],
  );
  const [memo, setMemo] = useState(
    prefillProgram ? `[Glow-up 모바일 앱] ${prefillProgram} 예약 문의입니다.` : '',
  );
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(hospitalId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const selectedHospital = selectedHospitalId
    ? hospitalOptions.find((h) => h.id === selectedHospitalId)
    : null;

  function toggleInterest(key: string): void {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      toast.error('이름과 연락처는 필수입니다.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitPublicInquiryAction({
        locale,
        hospitalId: selectedHospitalId || null,
        hospitalName: selectedHospital?.name ?? null,
        name: name.trim(),
        countryCode: country,
        contact: contact.trim(),
        interests,
        memo: memo.trim(),
      });
      if (!res.ok) {
        toast.error(res.error ?? '문의 접수에 실패했습니다.');
        return;
      }
      toast.success('문의가 접수되었습니다. 평균 15분 내 답변드립니다.');
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-care-300 bg-care-50 p-8 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="mt-3 text-xl font-bold text-care-900">접수 완료</h2>
        <p className="mt-2 text-sm text-care-800">
          {name}님의 문의가 컨시어지에게 전달되었습니다.
          <br />
          입력하신 연락처({contact})로 답변드릴게요.
        </p>
      </div>
    );
  }

  const categoryKeys = Object.keys(labels.categories) as Array<
    keyof typeof labels.categories
  >;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inq-name">
            {labels.name} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="inq-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inq-country">{labels.country}</Label>
          <select
            id="inq-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inq-contact">
          {labels.contact} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="inq-contact"
          placeholder="email@example.com / @kakaoid / wechatid"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
        />
      </div>

      {/* Optional clinic picker. Pre-selected when arriving from a
          /clinics/[slug] detail page (?hospital=<id>), otherwise blank
          ("아직 결정 안 함"). Keeping it optional keeps the funnel
          friendly — the patient doesn't have to commit to a clinic
          before talking to a concierge. */}
      {hospitalOptions.length > 0 ? (
        <div className="space-y-1.5">
          <Label htmlFor="inq-hospital">관심 병원 (선택)</Label>
          <select
            id="inq-hospital"
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— 아직 결정 안 함 / 추천 받기 —</option>
            {hospitalOptions.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground">
            특정 병원이 마음에 든 경우 선택해 주세요. 없으면 컨시어지가 환자분 상황에 맞춰 추천드립니다.
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label>{labels.interest}</Label>
        <div className="flex flex-wrap gap-1.5">
          {categoryKeys.map((k) => {
            const active = interests.includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleInterest(k)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-brand-500 bg-brand-100 text-brand-900'
                    : 'border-input bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                {labels.categories[k].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inq-memo">{labels.memo}</Label>
        <textarea
          id="inq-memo"
          rows={5}
          placeholder="구체적인 시술 / 일정 / 예산 등을 자유롭게 적어주세요."
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          maxLength={4000}
        />
      </div>

      <div className="border-t pt-4">
        <Button type="submit" variant="brand" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {labels.submit}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {labels.submit}
            </>
          )}
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">{labels.privacy}</p>
      </div>
    </form>
  );
}
