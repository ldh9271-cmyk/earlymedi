/**
 * 심평원 진료과목 코드(dgsbjtCd) 기준 과별 분류.
 *
 * 병원정보서비스 getHospBasisList 는 dgsbjtCd 로 필터할 수 있어, 과목별로
 * 전국 기관을 받아 hospital_registry.dept_codes 에 저장한다. 소비자 화면의
 * "과별 카테고리" 는 아래 DEPT_GROUPS 로 묶어 보여준다 (치과·한방은 세부
 * 과목을 한 그룹으로).
 */
export const HIRA_DEPTS: ReadonlyArray<{ code: string; ko: string }> = [
  { code: '00', ko: '일반의' },
  { code: '01', ko: '내과' }, { code: '02', ko: '신경과' }, { code: '03', ko: '정신건강의학과' }, { code: '04', ko: '외과' },
  { code: '05', ko: '정형외과' }, { code: '06', ko: '신경외과' }, { code: '07', ko: '심장혈관흉부외과' }, { code: '08', ko: '성형외과' },
  { code: '09', ko: '마취통증의학과' }, { code: '10', ko: '산부인과' }, { code: '11', ko: '소아청소년과' }, { code: '12', ko: '안과' },
  { code: '13', ko: '이비인후과' }, { code: '14', ko: '피부과' }, { code: '15', ko: '비뇨의학과' }, { code: '16', ko: '영상의학과' },
  { code: '17', ko: '방사선종양학과' }, { code: '18', ko: '병리과' }, { code: '19', ko: '진단검사의학과' }, { code: '20', ko: '결핵과' },
  { code: '21', ko: '재활의학과' }, { code: '22', ko: '핵의학과' }, { code: '23', ko: '가정의학과' }, { code: '24', ko: '응급의학과' },
  { code: '25', ko: '직업환경의학과' }, { code: '26', ko: '예방의학과' },
  { code: '49', ko: '치과' }, { code: '50', ko: '구강악안면외과' }, { code: '51', ko: '치과보철과' }, { code: '52', ko: '치과교정과' },
  { code: '53', ko: '소아치과' }, { code: '54', ko: '치주과' }, { code: '55', ko: '치과보존과' }, { code: '56', ko: '구강내과' },
  { code: '57', ko: '영상치의학과' }, { code: '58', ko: '구강병리과' }, { code: '59', ko: '예방치과' }, { code: '60', ko: '통합치의학과' },
  { code: '80', ko: '한방내과' }, { code: '81', ko: '한방부인과' }, { code: '82', ko: '한방소아과' }, { code: '83', ko: '한방안·이비인후·피부과' },
  { code: '84', ko: '한방신경정신과' }, { code: '85', ko: '침구과' }, { code: '86', ko: '한방재활의학과' }, { code: '87', ko: '사상체질과' },
  { code: '88', ko: '한방응급' },
];

export const HIRA_DEPT_NAME: Record<string, string> = Object.fromEntries(HIRA_DEPTS.map((d) => [d.code, d.ko]));

/** 소비자 화면 과별 그룹 — key 는 사전(clinicsPage.depts) 키이자 URL 파라미터. */
export const DEPT_GROUPS: ReadonlyArray<{ key: string; codes: string[]; ko: string }> = [
  { key: 'plastic_surgery', codes: ['08'], ko: '성형외과' },
  { key: 'dermatology', codes: ['14'], ko: '피부과' },
  { key: 'dental', codes: ['49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60'], ko: '치과' },
  { key: 'ophthalmology', codes: ['12'], ko: '안과' },
  { key: 'ent', codes: ['13'], ko: '이비인후과' },
  { key: 'internal', codes: ['01'], ko: '내과' },
  { key: 'orthopedics', codes: ['05'], ko: '정형외과' },
  { key: 'neurosurgery', codes: ['06'], ko: '신경외과' },
  { key: 'neurology', codes: ['02'], ko: '신경과' },
  { key: 'psychiatry', codes: ['03'], ko: '정신건강의학과' },
  { key: 'surgery', codes: ['04'], ko: '외과' },
  { key: 'thoracic', codes: ['07'], ko: '심장혈관흉부외과' },
  { key: 'pain', codes: ['09'], ko: '마취통증의학과' },
  { key: 'obgyn', codes: ['10'], ko: '산부인과' },
  { key: 'pediatrics', codes: ['11'], ko: '소아청소년과' },
  { key: 'urology', codes: ['15'], ko: '비뇨의학과' },
  { key: 'rehab', codes: ['21'], ko: '재활의학과' },
  { key: 'family', codes: ['23'], ko: '가정의학과' },
  { key: 'emergency', codes: ['24'], ko: '응급의학과' },
  { key: 'oriental', codes: ['80', '81', '82', '83', '84', '85', '86', '87', '88'], ko: '한방' },
  { key: 'diagnostics', codes: ['16', '17', '18', '19', '22'], ko: '영상·진단검사' },
];

export const DEPT_GROUP_BY_KEY: Record<string, { key: string; codes: string[]; ko: string }> = Object.fromEntries(DEPT_GROUPS.map((g) => [g.key, g]));

/** 과목 코드 → 그룹 키 (치과 세부과목 → dental 등). */
export function groupKeyOfCode(code: string): string | null {
  return DEPT_GROUPS.find((g) => g.codes.includes(code))?.key ?? null;
}
