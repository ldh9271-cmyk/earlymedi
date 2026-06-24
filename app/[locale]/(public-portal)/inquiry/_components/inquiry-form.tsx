'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { submitPublicInquiryAction } from '../actions';

/**
 * Public inquiry form — Airbnb-styled.
 *
 * All form behavior is identical to the previous version (submit ->
 * server action -> agency inbox conversation). Only visuals changed:
 * inline-style inputs with 12px border-radius, #ff385c primary CTA,
 * subtle 1px borders, chip-style interest selector with #ff385c
 * background when active. No more Tailwind classes — matches the
 * rest of the /kr surface that uses inline styles throughout.
 */

const COUNTRY_CODES = [
  'US', 'KR', 'CN', 'JP', 'TW', 'HK', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID',
  'RU', 'KZ', 'UZ', 'IN', 'AE', 'SA', 'AU', 'CA', 'GB', 'DE', 'FR', 'IT',
];

const inputStyle: React.CSSProperties = {
  height: 48,
  width: '100%',
  border: '1px solid #dddddd',
  borderRadius: 10,
  padding: '0 14px',
  fontSize: 15,
  color: '#222',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#222',
  marginBottom: 6,
};

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
  prefillProgram?: string | null;
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
      <div
        style={{
          border: '1px solid #a7f3d0', background: '#ecfdf5',
          borderRadius: 14, padding: 32, textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 40 }}>✅</div>
        <h2
          style={{
            fontSize: 20, fontWeight: 700, color: '#065f46',
            margin: '10px 0 0',
          }}
        >
          접수 완료
        </h2>
        <p style={{ fontSize: 14, color: '#047857', margin: '10px 0 0', lineHeight: 1.6 }}>
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
      style={{
        border: '1px solid #dddddd', borderRadius: 14,
        background: '#fff', padding: 28,
        display: 'flex', flexDirection: 'column', gap: 18,
        boxShadow: 'rgba(0,0,0,0.04) 0 2px 8px',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label htmlFor="inq-name" style={labelStyle}>
            {labels.name} <span style={{ color: '#ff385c' }}>*</span>
          </label>
          <input
            id="inq-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="inq-country" style={labelStyle}>{labels.country}</label>
          <select
            id="inq-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={inputStyle}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="inq-contact" style={labelStyle}>
          {labels.contact} <span style={{ color: '#ff385c' }}>*</span>
        </label>
        <input
          id="inq-contact"
          placeholder="email@example.com / @kakaoid / wechatid"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
          style={inputStyle}
        />
      </div>

      {hospitalOptions.length > 0 ? (
        <div>
          <label htmlFor="inq-hospital" style={labelStyle}>관심 병원 (선택)</label>
          <select
            id="inq-hospital"
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            style={inputStyle}
          >
            <option value="">— 아직 결정 안 함 / 추천 받기 —</option>
            {hospitalOptions.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: '#6a6a6a', margin: '6px 0 0' }}>
            특정 병원이 마음에 든 경우 선택해 주세요. 없으면 컨시어지가 환자분 상황에 맞춰 추천드립니다.
          </p>
        </div>
      ) : null}

      <div>
        <span style={labelStyle}>{labels.interest}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categoryKeys.map((k) => {
            const active = interests.includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleInterest(k)}
                style={{
                  border: `1px solid ${active ? '#ff385c' : '#dddddd'}`,
                  background: active ? '#ff385c' : '#fff',
                  color: active ? '#fff' : '#222',
                  borderRadius: 9999,
                  padding: '8px 14px',
                  fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
              >
                {labels.categories[k].label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="inq-memo" style={labelStyle}>{labels.memo}</label>
        <textarea
          id="inq-memo"
          rows={5}
          placeholder="구체적인 시술 / 일정 / 예산 등을 자유롭게 적어주세요."
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          style={{
            ...inputStyle,
            height: 'auto', minHeight: 130,
            padding: '12px 14px', lineHeight: 1.5,
            resize: 'vertical',
          }}
          maxLength={4000}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          width: '100%', height: 50, marginTop: 6,
          background: submitting ? '#ffb3c1' : '#ff385c',
          color: '#fff', border: 'none', borderRadius: 10,
          fontWeight: 600, fontSize: 16,
          cursor: submitting ? 'wait' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {submitting ? '전송 중...' : labels.submit}
      </button>
      <p style={{ fontSize: 12, color: '#6a6a6a', textAlign: 'center', margin: 0 }}>
        {labels.privacy}
      </p>
    </form>
  );
}
