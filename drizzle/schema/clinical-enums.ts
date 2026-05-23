import { pgEnum } from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────
// Patients
// ─────────────────────────────────────────────────────────
export const patientSexEnum = pgEnum('patient_sex', ['male', 'female', 'other', 'unknown']);

export const patientStatusEnum = pgEnum('patient_status', [
  'active',
  'inactive',
  'archived',
  'merged_into', // duplicate, see merged_into_id
]);

// ─────────────────────────────────────────────────────────
// Procedure / specialty taxonomy
// ─────────────────────────────────────────────────────────
export const procedureCategoryEnum = pgEnum('procedure_category', [
  'plastic_surgery', // 성형
  'dermatology', // 피부
  'hair', // 모발
  'dental', // 치과
  'ophthalmology', // 안과
  'obstetrics', // 산부인과
  'oriental', // 한의원
  'checkup', // 검진
  'orthopedic', // 정형
  'cardiology', // 심장
  'oncology', // 암
  'gastroenterology', // 소화기
  'neurology',
  'urology',
  'ent',
  'fertility',
  'cosmetic_dental',
  'general',
]);

export const vatTreatmentEnum = pgEnum('vat_treatment', [
  'exempt', // 의료법 면세 (medical)
  'taxable', // 비급여 미용 시술 등 (cosmetic)
  'mixed', // 혼합 (item-level)
]);

export const feePackageRuleEnum = pgEnum('fee_package_rule', [
  'sum_per_item', // 시술별 합산
  'single_package_rate', // 패키지 단일
  'minimum_per_item', // 최저값 적용
]);

export const feeBaseEnum = pgEnum('fee_base', [
  'gross_amount', // 청구 총액
  'net_excl_vat', // VAT 제외 금액 (기본)
  'patient_paid', // 환자 실 결제 (자기부담)
]);

// ─────────────────────────────────────────────────────────
// Deposits
// ─────────────────────────────────────────────────────────
export const depositCollectorEnum = pgEnum('deposit_collector', [
  'agency_collects',
  'hospital_direct',
  'escrow',
]);

export const depositTimingEnum = pgEnum('deposit_timing', [
  'on_quote_accepted',
  'days_before_visit',
  'on_arrival',
]);

// ─────────────────────────────────────────────────────────
// Treatment chart
// ─────────────────────────────────────────────────────────
export const treatmentChartStatusEnum = pgEnum('treatment_chart_status', [
  'draft', // hospital is editing
  'submitted', // hospital has submitted to agency
  'agency_review', // agency reviewer evaluating
  'changes_requested', // agency asked the hospital for revisions
  'agency_approved', // agency signed off
  'patient_shared', // visible to patient via patient PWA
  'finalized', // immutable; only new version may be created
  'voided', // superseded / cancelled
]);

export const treatmentChartShareLevelEnum = pgEnum('treatment_chart_share_level', [
  'name_only', // patient sees procedure names but not amounts
  'name_and_amount', // names + line totals
  'full', // full breakdown including agency commission
]);

export const treatmentChartItemKindEnum = pgEnum('treatment_chart_item_kind', [
  'procedure',
  'addon', // upgrade / add-on (e.g. premium implant grade)
  'consumable',
  'medication',
  'follow_up_visit',
  'discount',
  'tax',
  'other',
]);
