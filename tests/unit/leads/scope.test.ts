import { describe, expect, it } from 'vitest';
import { leadScopeReason, normalizeHospitalName, type LeadScope } from '@/lib/leads/scope';

const VS = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

const scope: LeadScope = {
  hospitals: [{ id: VS, name: 'VS라인의원 강남점' }],
  hospitalIds: new Set([VS]),
  hospitalNames: new Set([normalizeHospitalName('VS라인의원 강남점'), normalizeHospitalName('VS Line Clinic Gangnam')]),
  categoryKeys: new Set(['dermatology']),
};

describe('lead scope — 병원 콘솔 리드 노출 범위', () => {
  it('우리 병원을 id 로 지정한 문의는 보인다', () => {
    expect(leadScopeReason(scope, { hospitalId: VS, hospitalName: 'VS라인의원 강남점', interests: ['plastic_surgery'] })).toBe('hospital');
  });

  it('우리 병원을 이름(공백·대소문자·로케일 차이 무시)으로 지정한 문의는 보인다', () => {
    expect(leadScopeReason(scope, { hospitalName: 'vs라인의원  강남점', interests: [] })).toBe('hospital');
    expect(leadScopeReason(scope, { hospitalName: 'VS LINE CLINIC GANGNAM', interests: [] })).toBe('hospital');
    expect(leadScopeReason(scope, { hospitalName: `ID ${VS}`, interests: [] })).toBe('hospital');
  });

  it('다른 병원을 지정한 문의는 분야가 겹쳐도 숨긴다', () => {
    expect(leadScopeReason(scope, { hospitalId: OTHER, hospitalName: '드림성형외과', interests: ['dermatology'] })).toBeNull();
    expect(leadScopeReason(scope, { hospitalName: '세라성형외과', interests: ['dermatology'] })).toBeNull();
    expect(leadScopeReason(scope, { hospitalName: `ID ${OTHER}`, interests: ['dermatology'] })).toBeNull();
  });

  it('병원 미지정 문의는 관심 분야가 우리 진료 분야와 겹칠 때만 보인다', () => {
    expect(leadScopeReason(scope, { interests: ['dermatology', 'hotel'] })).toBe('category');
    expect(leadScopeReason(scope, { interests: ['plastic_surgery'] })).toBeNull();
    expect(leadScopeReason(scope, { interests: [] })).toBeNull();
    expect(leadScopeReason(scope, {})).toBeNull();
  });

  it('연결된 병원이 없는 조직은 아무 리드도 보지 못한다', () => {
    const empty: LeadScope = { hospitals: [], hospitalIds: new Set(), hospitalNames: new Set(), categoryKeys: new Set() };
    expect(leadScopeReason(empty, { hospitalId: VS, hospitalName: 'VS라인의원 강남점', interests: ['dermatology'] })).toBeNull();
    expect(leadScopeReason(empty, { interests: ['dermatology'] })).toBeNull();
  });
});
