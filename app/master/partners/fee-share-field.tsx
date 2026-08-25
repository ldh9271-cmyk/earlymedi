'use client';

import { useState } from 'react';

/**
 * 정산 비율 입력 — 배당 이익(병원 유치 수수료)을 100%로 보고 총판/회사로
 * 나눈다. 총판 % 를 입력하면 회사 몫(100 − 총판)이 실시간으로 계산돼
 * 보인다. 퍼센트는 자유롭게 바꿀 수 있다. 지역(일본) 마스터가 국가 단위로
 * 이 값을 설정한다 — 개별 총판 화면에서는 읽기 전용으로만 보인다.
 */
export function FeeShareField({ defaultPct }: { defaultPct: number }): JSX.Element {
  const [raw, setRaw] = useState(String(defaultPct ?? 70));
  const n = Math.max(0, Math.min(100, Number(raw) || 0));
  const company = 100 - n;

  return (
    <div
      style={{
        border: '1px solid #ff385c', borderRadius: 12, padding: 16,
        background: '#fff5f7', marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#c81e42', marginBottom: 8 }}>
        정산 비율 — 배당 이익을 100%로 보고 나눕니다
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6a6a6a', display: 'block', marginBottom: 4 }}>
            총판 정산 비율 %
          </span>
          <input
            name="feeSharePct"
            value={raw}
            onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, ''))}
            inputMode="decimal"
            style={{
              border: '1px solid #ff385c', borderRadius: 8, padding: '8px 10px',
              fontSize: 18, fontWeight: 700, fontFamily: 'inherit', width: 110,
            }}
          />
        </label>
        {/* 실시간 배분 표시 */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flex: 1, minWidth: 220 }}>
          <div style={{ flex: n, minWidth: 60, background: '#ff385c', color: '#fff', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 11, opacity: 0.9 }}>총판</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{n}%</div>
          </div>
          <div style={{ flex: company, minWidth: 60, background: '#222', color: '#fff', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>회사(플랫폼)</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{company}%</div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 8 }}>
        예: 성형 300만원 시술(수수료 30%) → 배당 이익 90만원 → 총판 ₩{Math.round((900000 * n) / 100).toLocaleString('ko-KR')}
        {' · '}회사 ₩{Math.round((900000 * company) / 100).toLocaleString('ko-KR')}.
        이 나라 총판 전체에 적용됩니다.
      </div>
    </div>
  );
}
