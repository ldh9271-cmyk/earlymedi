'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { PublicLocale } from '@/lib/i18n/locales';
import type { Dictionary } from '@/lib/i18n/dictionaries/kr';
import { submitPublicInquiryAction } from '../actions';

/**
 * Public inquiry form — Airbnb-styled.
 *
 * 두 가지 모드를 한 폼으로 처리한다.
 *  - 일반 문의: 이름·연락처만 필수 (홈 '아직 결정하기 어려우신가요?' 카드).
 *  - 병원 진료 예약 요청(병원 상세 '문의 보내기' 또는 관심 병원 선택):
 *    이름·성별·국가·전화번호·메신저·생년월일·희망 예약일·시간·문의 내용이 전부 필수.
 *    서버가 무료 예약 요청(checkout_orders kind=hospital_visit)을 만들고, 운영자가
 *    병원과 확인해 확정하면 마이페이지에 QR 예약증이 생긴다.
 */

import CountrySelect from '@/app/[locale]/_components/country-select';

const COUNTRY_CODES = [
  'US', 'KR', 'CN', 'JP', 'TW', 'HK', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID',
  'RU', 'KZ', 'UZ', 'IN', 'AE', 'SA', 'AU', 'CA', 'GB', 'DE', 'FR', 'IT', 'MN',
];

const MESSENGERS = ['WhatsApp', 'KakaoTalk', 'LINE', 'WeChat', 'Telegram', 'Zalo', 'Viber', 'Instagram'];

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
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#222',
  marginBottom: 6,
};

const Req = (): JSX.Element => <span style={{ color: '#ff385c' }}> *</span>;

/** 오늘(서울) 날짜 — 희망 예약일 최소값. */
function todaySeoul(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

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
    dob: string;
    dobRequired: string;
    interest: string;
    memo: string;
    submit: string;
    submitReserve: string;
    privacy: string;
    gender: string;
    genderF: string;
    genderM: string;
    genderX: string;
    phone: string;
    messenger: string;
    messengerId: string;
    email: string;
    visitDate: string;
    visitTime: string;
    reserveNote: string;
    doneReserve: string;
    requiredMissing: string;
    myPage: string;
    categories: Dictionary['categories']['items'];
  };
}): JSX.Element {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('US');
  const [phone, setPhone] = useState('');
  const [messengerType, setMessengerType] = useState('WhatsApp');
  const [messengerId, setMessengerId] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [visitYmd, setVisitYmd] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [interests, setInterests] = useState<string[]>(
    prefillInterest ? [prefillInterest] : [],
  );
  const [memo, setMemo] = useState(
    prefillProgram ? `[Glow-up 모바일 앱] ${prefillProgram} 예약 문의입니다.` : '',
  );
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(hospitalId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ invoiceNo: string | null } | null>(null);

  const selectedHospital = selectedHospitalId
    ? hospitalOptions.find((h) => h.id === selectedHospitalId)
    : null;
  // 병원이 골라져 있으면 예약 요청 모드 — 필수 항목이 늘어난다
  const reserveMode = Boolean(selectedHospitalId);

  function toggleInterest(key: string): void {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (reserveMode) {
      const missing = !name.trim() || !gender || !phone.trim() || !messengerType || !messengerId.trim() || !birthDate || !visitYmd || !visitTime || !memo.trim();
      if (missing) { toast.error(labels.requiredMissing); return; }
    } else if (!name.trim() || !(contact.trim() || email.trim() || phone.trim())) {
      toast.error(labels.requiredMissing);
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
        // 예약 모드에서는 이메일(선택) → 전화 순으로 대표 연락처를 채운다
        contact: (reserveMode ? (email.trim() || phone.trim()) : (contact.trim() || email.trim() || phone.trim())),
        birthDate: birthDate || null,
        interests,
        memo: memo.trim(),
        gender: (gender || null) as 'female' | 'male' | 'other' | null,
        phone: phone.trim() || null,
        messengerType: messengerType || null,
        messengerId: messengerId.trim() || null,
        email: email.trim() || null,
        visitYmd: visitYmd || null,
        visitTime: visitTime || null,
      });
      if (!res.ok) {
        toast.error(res.error ?? '문의 접수에 실패했습니다.');
        return;
      }
      toast.success(reserveMode ? labels.doneReserve : '문의가 접수되었습니다. 평균 15분 내 답변드립니다.');
      setDone({ invoiceNo: res.invoiceNo ?? null });
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
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#065f46', margin: '10px 0 0' }}>
          {done.invoiceNo ? `${done.invoiceNo}` : '접수 완료'}
        </h2>
        <p style={{ fontSize: 14, color: '#047857', margin: '10px 0 0', lineHeight: 1.6 }}>
          {done.invoiceNo ? labels.doneReserve : (
            <>
              {name}님의 문의가 컨시어지에게 전달되었습니다.
              <br />
              입력하신 연락처({contact || email || phone})로 답변드릴게요.
            </>
          )}
        </p>
        {done.invoiceNo ? (
          <p style={{ marginTop: 14, fontSize: 13 }}>
            <Link href={`/${locale}/me`} style={{ color: '#047857', fontWeight: 700 }}>{labels.myPage} →</Link>
          </p>
        ) : null}
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
      {hospitalOptions.length > 0 ? (
        <div>
          <label htmlFor="inq-hospital" style={labelStyle}>관심 병원 {reserveMode ? '' : '(선택)'}</label>
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
          <p style={{ fontSize: 12, color: reserveMode ? '#1d4ed8' : '#6a6a6a', margin: '6px 0 0', lineHeight: 1.5 }}>
            {reserveMode ? labels.reserveNote : '특정 병원이 마음에 든 경우 선택해 주세요. 없으면 컨시어지가 환자분 상황에 맞춰 추천드립니다.'}
          </p>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label htmlFor="inq-name" style={labelStyle}>{labels.name}<Req /></label>
          <input id="inq-name" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="inq-gender" style={labelStyle}>{labels.gender}{reserveMode ? <Req /> : null}</label>
          <select id="inq-gender" value={gender} onChange={(e) => setGender(e.target.value)} required={reserveMode} style={inputStyle}>
            <option value="">—</option>
            <option value="female">{labels.genderF}</option>
            <option value="male">{labels.genderM}</option>
            <option value="other">{labels.genderX}</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label htmlFor="inq-country" style={labelStyle}>{labels.country}<Req /></label>
          <div style={{ ...inputStyle, display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '100%' }}>
              <CountrySelect value={country} onChange={setCountry} codes={COUNTRY_CODES} ariaLabel={labels.country} />
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="inq-phone" style={labelStyle}>{labels.phone}{reserveMode ? <Req /> : null}</label>
          <input id="inq-phone" type="tel" placeholder="+82 10-1234-5678" value={phone} onChange={(e) => setPhone(e.target.value)} required={reserveMode} style={inputStyle} autoComplete="tel" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 14 }}>
        <div>
          <label htmlFor="inq-msg-type" style={labelStyle}>{labels.messenger}{reserveMode ? <Req /> : null}</label>
          <select id="inq-msg-type" value={messengerType} onChange={(e) => setMessengerType(e.target.value)} style={inputStyle}>
            {MESSENGERS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="inq-msg-id" style={labelStyle}>{labels.messengerId}{reserveMode ? <Req /> : null}</label>
          <input id="inq-msg-id" placeholder="@id / phone" value={messengerId} onChange={(e) => setMessengerId(e.target.value)} required={reserveMode} style={inputStyle} />
        </div>
      </div>

      {reserveMode ? (
        <div>
          <label htmlFor="inq-email" style={labelStyle}>{labels.email}</label>
          <input id="inq-email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} autoComplete="email" />
        </div>
      ) : (
        <div>
          <label htmlFor="inq-contact" style={labelStyle}>{labels.contact}<Req /></label>
          <input id="inq-contact" placeholder="email@example.com / @kakaoid / wechatid" value={contact} onChange={(e) => setContact(e.target.value)} required style={inputStyle} />
        </div>
      )}

      <div>
        <label htmlFor="inq-dob" style={labelStyle}>{reserveMode ? <>{labels.dobRequired}<Req /></> : labels.dob}</label>
        <input id="inq-dob" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} required={reserveMode} style={inputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label htmlFor="inq-visit-date" style={labelStyle}>{labels.visitDate}{reserveMode ? <Req /> : null}</label>
          <input id="inq-visit-date" type="date" value={visitYmd} onChange={(e) => setVisitYmd(e.target.value)} min={todaySeoul()} required={reserveMode} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="inq-visit-time" style={labelStyle}>{labels.visitTime}{reserveMode ? <Req /> : null}</label>
          <input id="inq-visit-time" type="time" step={1800} value={visitTime} onChange={(e) => setVisitTime(e.target.value)} required={reserveMode} style={inputStyle} />
        </div>
      </div>

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
        <label htmlFor="inq-memo" style={labelStyle}>{labels.memo}{reserveMode ? <Req /> : null}</label>
        <textarea
          id="inq-memo"
          rows={5}
          placeholder="구체적인 시술 / 일정 / 예산 등을 자유롭게 적어주세요."
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          required={reserveMode}
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
        {submitting ? '전송 중...' : reserveMode ? labels.submitReserve : labels.submit}
      </button>
      <p style={{ fontSize: 12, color: '#6a6a6a', textAlign: 'center', margin: 0 }}>
        {labels.privacy}
      </p>
    </form>
  );
}
