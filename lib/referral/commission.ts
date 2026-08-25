import type { DistributorConfig } from '@/drizzle/schema/referral-program';

/**
 * 수당 배분 계산 — 순수 함수. DB 를 모르므로 단위 테스트로 검증한다.
 *
 * 원칙 (제안서 2026-07-28):
 *  - 플랫폼 운영비 3% 는 어느 경로든 먼저 뗀다.
 *  - 총판 직접 유치: 나머지 전부 총판 (환자 포인트는 총판 설정으로 0~).
 *  - 추천인 경유: 환자 포인트 · 1단계 · 2단계를 배분표대로 떼고 나머지는
 *    총판. 2단계가 없으면(1단계의 상위가 총판) 그 몫도 총판에게 간다 —
 *    총판을 잔여 청구자로 두면 "빈 단계는 총판으로" 가 자동으로 된다.
 *  - 여행상품: 판매가 × travelMarginPct 를 총판이 따로 받고, 포함 시술에는
 *    위 규칙을 그대로 적용한다.
 */

export type LedgerDraft = {
  beneficiary: 'platform' | 'patient_points' | 'referrer_l1' | 'referrer_l2' | 'distributor';
  beneficiaryPartnerId: string | null;
  beneficiaryUserId: string | null;
  basis: 'hospital_fee' | 'travel_margin';
  rateBp: number;
  baseAmountWon: number;
  amountWon: number;
};

export type CommissionInput = {
  kind: 'listing' | 'procedure' | 'travel';
  category: string | null;
  /** 수수료 기준 시술비. travel 은 포함 시술 금액 (없으면 0). */
  procedureAmountWon: number;
  /** travel 일 때 패키지 판매가. */
  saleAmountWon: number;
  /** 등록 시 고정한 병원 수수료율 (bp). null 이면 config 기본값. */
  hospitalFeeBp: number | null;
  distributorId: string;
  /** 환자를 소개한 1단계 추천인. 총판 직접이면 null. */
  l1PartnerId: string | null;
  /** 1단계 추천인을 모집한 추천인. 총판이 모집했으면 null. */
  l2PartnerId: string | null;
  patientUserId: string | null;
  config: DistributorConfig;
};

function pctToBp(pct: number): number {
  return Math.round(pct * 100);
}

function won(base: number, bp: number): number {
  return Math.round((base * bp) / 10000);
}

export function resolveFeeBp(category: string | null, config: DistributorConfig): number {
  const table = config.feePctByCategory;
  const pct = (category && table[category] != null ? table[category] : table.default) ?? 0;
  return pctToBp(pct);
}

export function computeLedger(input: CommissionInput): LedgerDraft[] {
  const rows: LedgerDraft[] = [];
  const { config } = input;

  // ── 여행상품 판매 마진 (총판) ─────────────────────────────────
  if (input.kind === 'travel' && input.saleAmountWon > 0 && config.travelMarginPct > 0) {
    const bp = pctToBp(config.travelMarginPct);
    rows.push({
      beneficiary: 'distributor',
      beneficiaryPartnerId: input.distributorId,
      beneficiaryUserId: null,
      basis: 'travel_margin',
      rateBp: bp,
      baseAmountWon: input.saleAmountWon,
      amountWon: won(input.saleAmountWon, bp),
    });
  }

  // ── 병원 수수료 배분 ──────────────────────────────────────────
  const base = input.procedureAmountWon;
  if (base <= 0) return rows;

  const feeBp = input.hospitalFeeBp ?? resolveFeeBp(input.category, config);
  const feeWon = won(base, feeBp);

  // ── 단순 정산 모드: 수수료를 총판 N% / 플랫폼 (100−N)% 로만 나눈다 ──
  const sharePct = config.feeShare?.distributorPct ?? 0;
  if (sharePct > 0) {
    const distWon = Math.round((feeWon * sharePct) / 100);
    const platWon = feeWon - distWon;
    if (platWon > 0) {
      rows.push({
        beneficiary: 'platform', beneficiaryPartnerId: null, beneficiaryUserId: null,
        basis: 'hospital_fee', rateBp: Math.round(((100 - sharePct) * feeBp) / 100),
        baseAmountWon: base, amountWon: platWon,
      });
    }
    rows.push({
      beneficiary: 'distributor', beneficiaryPartnerId: input.distributorId, beneficiaryUserId: null,
      basis: 'hospital_fee', rateBp: Math.round((sharePct * feeBp) / 100),
      baseAmountWon: base, amountWon: distWon,
    });
    return rows;
  }

  const platformBp = pctToBp(config.platformPct);
  let remaining = feeWon;

  const push = (
    beneficiary: LedgerDraft['beneficiary'],
    bp: number,
    partnerId: string | null,
    userId: string | null,
  ): void => {
    if (bp <= 0) return;
    const amount = Math.min(won(base, bp), remaining);
    if (amount <= 0) return;
    remaining -= amount;
    rows.push({
      beneficiary, beneficiaryPartnerId: partnerId, beneficiaryUserId: userId,
      basis: 'hospital_fee', rateBp: bp, baseAmountWon: base, amountWon: amount,
    });
  };

  push('platform', platformBp, null, null);

  if (input.l1PartnerId) {
    const split = (input.category && config.network[input.category]) || config.network.default
      || { patient: 0, l1: 0, l2: 0 };
    push('patient_points', pctToBp(split.patient), null, input.patientUserId);
    push('referrer_l1', pctToBp(split.l1), input.l1PartnerId, null);
    if (input.l2PartnerId) push('referrer_l2', pctToBp(split.l2), input.l2PartnerId, null);
  } else {
    push('patient_points', pctToBp(config.direct.patientPointsPct), null, input.patientUserId);
  }

  // 총판 = 잔여. 2단계가 비었거나 수수료율이 배분표 합과 다르면 차액이 여기로.
  if (remaining > 0) {
    rows.push({
      beneficiary: 'distributor',
      beneficiaryPartnerId: input.distributorId,
      beneficiaryUserId: null,
      basis: 'hospital_fee',
      rateBp: Math.round((remaining / base) * 10000),
      baseAmountWon: base,
      amountWon: remaining,
    });
  }
  return rows;
}

/** 총판 수당 설정 기본값 — 제안서 배분표. */
export { DEFAULT_DISTRIBUTOR_CONFIG } from '@/drizzle/schema/referral-program';
