/**
 * KOIHA(한국보건산업진흥원) 외국인환자 유치 분기 통계 CSV 익스포트.
 *
 * 의료법 시행규칙 제19조의2 — 외국인환자 유치업자는 분기마다 환자 수·국적·시술 등
 * 통계를 보건복지부에 제출해야 함. 보건복지부는 이 데이터를 KOIHA를 통해 집계한다.
 *
 * 필수 컬럼 (KOIHA 양식 2025년 기준):
 *   - 분기 (e.g. 2026Q2)
 *   - 환자 국적 (ISO alpha-3)
 *   - 성별 (male/female/other)
 *   - 연령대 (0_19/20_29/30_39/40_49/50_59/60_plus)
 *   - 진료과 카테고리 (procedure_category enum)
 *   - 입국 일자 / 출국 일자
 *   - 매출 (KRW)
 *   - 환자 본인 부담률 (basis points)
 *   - 보험 적용 여부 (Y/N)
 *
 * 이 모듈은 분기 시작·끝 + 케이스 row 배열을 받아 CSV 문자열을 반환한다.
 * 실제 KOIHA 업로드는 별도 API (수기 업로드 + 자동 API 둘 다 지원).
 */

export type KoihaRow = {
  patientNationality: string; // ISO alpha-3
  sex: 'male' | 'female' | 'other' | 'unknown';
  ageBand: '0_19' | '20_29' | '30_39' | '40_49' | '50_59' | '60_plus';
  procedureCategory: string;
  entryDate: string; // YYYY-MM-DD
  exitDate: string;
  grossRevenueKrw: number;
  patientPaidBp: number; // 환자 본인 부담률
  insuranceCovered: boolean;
};

export type KoihaQuarter = {
  year: number;
  quarter: 1 | 2 | 3 | 4;
};

export function quarterCode(q: KoihaQuarter): string {
  return `${q.year}Q${q.quarter}`;
}

export function quarterRange(q: KoihaQuarter): { start: string; end: string } {
  const startMonth = (q.quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const start = new Date(Date.UTC(q.year, startMonth - 1, 1));
  const end = new Date(Date.UTC(q.year, endMonth, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function ageBandFromBirthYear(birthYear: number, asOfYear: number): KoihaRow['ageBand'] {
  const age = asOfYear - birthYear;
  if (age < 20) return '0_19';
  if (age < 30) return '20_29';
  if (age < 40) return '30_39';
  if (age < 50) return '40_49';
  if (age < 60) return '50_59';
  return '60_plus';
}

const HEADERS = [
  '분기',
  '환자_국적_ISO3',
  '성별',
  '연령대',
  '진료과_카테고리',
  '입국일',
  '출국일',
  '총_매출_KRW',
  '본인부담률_BP',
  '보험_적용',
];

function escapeCell(v: string | number | boolean): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildKoihaCsv(quarter: KoihaQuarter, rows: ReadonlyArray<KoihaRow>): string {
  const code = quarterCode(quarter);
  const lines = [HEADERS.join(',')];
  for (const r of rows) {
    lines.push(
      [
        escapeCell(code),
        escapeCell(r.patientNationality),
        escapeCell(r.sex),
        escapeCell(r.ageBand),
        escapeCell(r.procedureCategory),
        escapeCell(r.entryDate),
        escapeCell(r.exitDate),
        escapeCell(r.grossRevenueKrw),
        escapeCell(r.patientPaidBp),
        escapeCell(r.insuranceCovered ? 'Y' : 'N'),
      ].join(','),
    );
  }
  return lines.join('\n');
}

/** Summary numbers shown on the operator confirmation screen before upload. */
export type KoihaSummary = {
  totalPatients: number;
  totalRevenueKrw: number;
  byNationality: Array<{ code: string; count: number; revenueKrw: number }>;
  byCategory: Array<{ category: string; count: number; revenueKrw: number }>;
};

export function summarizeKoiha(rows: ReadonlyArray<KoihaRow>): KoihaSummary {
  const byNation = new Map<string, { count: number; revenueKrw: number }>();
  const byCat = new Map<string, { count: number; revenueKrw: number }>();
  let totalRev = 0;
  for (const r of rows) {
    totalRev += r.grossRevenueKrw;
    const n = byNation.get(r.patientNationality) ?? { count: 0, revenueKrw: 0 };
    n.count += 1;
    n.revenueKrw += r.grossRevenueKrw;
    byNation.set(r.patientNationality, n);
    const c = byCat.get(r.procedureCategory) ?? { count: 0, revenueKrw: 0 };
    c.count += 1;
    c.revenueKrw += r.grossRevenueKrw;
    byCat.set(r.procedureCategory, c);
  }
  return {
    totalPatients: rows.length,
    totalRevenueKrw: totalRev,
    byNationality: [...byNation.entries()]
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => b.count - a.count),
    byCategory: [...byCat.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.count - a.count),
  };
}
