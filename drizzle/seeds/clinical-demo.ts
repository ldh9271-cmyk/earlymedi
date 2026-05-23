import { db } from '@/lib/db/client';
import { hospitals, hospitalDoctors, hospitalReferralRates, hospitalDepositPolicies, proceduresCatalog } from '@/drizzle/schema/hospitals';
import { DEMO_ORG_AGENCY, DEMO_ORG_MEDICAL } from './demo-organizations';

/**
 * Hospital + procedures catalog seed for Phase 4.
 *
 *   - One demo hospital (linked to the demo medical org)
 *   - 4 doctors
 *   - Procedure catalog (rhinoplasty, breast aug, dental implant, lipo, checkup)
 *   - Referral fee rates with sane defaults per spec (성형 30 / 피부 20 / 치과 15 / 검진 10)
 *   - Deposit policy (20% deposit, refund tiers D-30/D-14/D-7/D-3)
 */

const DEMO_HOSPITAL_ID = '00000000-0000-4000-a000-000000000001';

export async function seedClinicalDemo(): Promise<void> {
  console.info('[seed] demo hospital (linked to demo medical org) ...');
  await db
    .insert(hospitals)
    .values({
      id: DEMO_HOSPITAL_ID,
      organizationId: DEMO_ORG_AGENCY,
      linkedOrgId: DEMO_ORG_MEDICAL,
      name: '얼리메디 데모 성형외과',
      slug: 'em-demo-clinic',
      legalName: '의료법인 얼리메디 데모',
      licenseNumber: 'MED-2024-DEMO-0001',
      foreignPatientLicenseNumber: 'FP-MED-2024-DEMO',
      countryCode: 'KR',
      addressJson: { line1: '서울특별시 강남구 테헤란로 123', city: 'Seoul', postalCode: '06234' },
      latitude: '37.5009',
      longitude: '127.0359',
      primaryCategories: ['plastic_surgery', 'dermatology'],
      languagesSpoken: ['ko', 'en', 'zh-CN', 'ja'],
      rating: 47,
      reviewsCount: 132,
      isActiveForMatching: true,
      onboardingChecklist: {
        basics: true,
        licenses: true,
        referralPolicy: true,
        depositPolicy: true,
        chartWorkflow: true,
        settlementCycle: true,
        contractSigned: true,
      },
      settlementCycle: 'monthly',
    })
    .onConflictDoNothing();

  console.info('[seed] doctors ...');
  for (const d of [
    { fullName: 'Dr. 김지훈', title: 'MD', specialty: 'rhinoplasty', languages: ['ko', 'en'] },
    { fullName: 'Dr. 이서연', title: 'MD', specialty: 'breast_augmentation', languages: ['ko', 'en', 'zh-CN'] },
    { fullName: 'Dr. 박민호', title: 'MD', specialty: 'dermatology', languages: ['ko', 'ja'] },
    { fullName: 'Dr. 최예은', title: 'MD, PhD', specialty: 'liposuction', languages: ['ko', 'en'] },
  ]) {
    await db
      .insert(hospitalDoctors)
      .values({
        organizationId: DEMO_ORG_AGENCY,
        hospitalId: DEMO_HOSPITAL_ID,
        fullName: d.fullName,
        title: d.title,
        specialty: d.specialty,
        languagesSpoken: d.languages,
      })
      .onConflictDoNothing();
  }

  console.info('[seed] procedures catalog ...');
  const procedures = [
    {
      code: 'RHIN_BAS',
      category: 'plastic_surgery' as const,
      nameI18nJson: { ko: '코 성형 (기본)', en: 'Rhinoplasty (basic)', 'zh-CN': '基础隆鼻', ja: '鼻整形(基本)' },
      aliasesJson: ['rhinoplasty', '隆鼻', '鼻整形', 'nose job'],
      recoveryDays: 14,
      flightRestrictionDays: 10,
      typicalPriceKrwMin: 4_000_000,
      typicalPriceKrwMax: 8_000_000,
      vatTreatment: 'taxable' as const,
    },
    {
      code: 'BREAST_AUG_SILICON',
      category: 'plastic_surgery' as const,
      nameI18nJson: { ko: '가슴 확대 (실리콘)', en: 'Breast Augmentation (silicone)' },
      aliasesJson: ['breast augmentation', 'breast aug', '丰胸', '豊胸'],
      recoveryDays: 21,
      flightRestrictionDays: 14,
      typicalPriceKrwMin: 6_000_000,
      typicalPriceKrwMax: 12_000_000,
      vatTreatment: 'taxable' as const,
    },
    {
      code: 'LIPO_ABD',
      category: 'plastic_surgery' as const,
      nameI18nJson: { ko: '복부 지방흡입', en: 'Abdominal Liposuction' },
      aliasesJson: ['liposuction', '吸脂', '脂肪吸引'],
      recoveryDays: 14,
      flightRestrictionDays: 7,
      typicalPriceKrwMin: 3_000_000,
      typicalPriceKrwMax: 7_000_000,
      vatTreatment: 'taxable' as const,
    },
    {
      code: 'BTX_FOREHEAD',
      category: 'dermatology' as const,
      nameI18nJson: { ko: '이마 보톡스', en: 'Forehead Botox' },
      aliasesJson: ['botox', 'botulinum', '肉毒', 'ボトックス'],
      recoveryDays: 1,
      flightRestrictionDays: 0,
      typicalPriceKrwMin: 150_000,
      typicalPriceKrwMax: 500_000,
      vatTreatment: 'taxable' as const,
    },
    {
      code: 'CHECKUP_PREMIUM',
      category: 'checkup' as const,
      nameI18nJson: { ko: '프리미엄 종합검진', en: 'Premium Health Checkup' },
      aliasesJson: ['health checkup', '健康診断', '体检'],
      recoveryDays: 0,
      flightRestrictionDays: 0,
      typicalPriceKrwMin: 1_200_000,
      typicalPriceKrwMax: 3_500_000,
      vatTreatment: 'exempt' as const,
    },
    {
      code: 'IMPLANT_SINGLE',
      category: 'dental' as const,
      nameI18nJson: { ko: '치과 임플란트 (1개)', en: 'Dental Implant (single)' },
      aliasesJson: ['implant', '种植牙', 'インプラント'],
      recoveryDays: 7,
      flightRestrictionDays: 3,
      typicalPriceKrwMin: 1_200_000,
      typicalPriceKrwMax: 3_000_000,
      vatTreatment: 'taxable' as const,
    },
  ];
  for (const p of procedures) {
    await db.insert(proceduresCatalog).values({ organizationId: DEMO_ORG_AGENCY, ...p }).onConflictDoNothing();
  }

  console.info('[seed] hospital referral rates (성형 30/피부 20/치과 15/검진 10) ...');
  const rates: Array<{
    category: 'plastic_surgery' | 'dermatology' | 'hair' | 'dental' | 'ophthalmology' | 'obstetrics' | 'oriental' | 'checkup' | 'orthopedic';
    rateBp: number;
  }> = [
    { category: 'plastic_surgery', rateBp: 3000 },
    { category: 'dermatology', rateBp: 2000 },
    { category: 'hair', rateBp: 2500 },
    { category: 'dental', rateBp: 1500 },
    { category: 'ophthalmology', rateBp: 1500 },
    { category: 'obstetrics', rateBp: 1500 },
    { category: 'oriental', rateBp: 1500 },
    { category: 'checkup', rateBp: 1000 },
    { category: 'orthopedic', rateBp: 1000 },
  ];
  for (const r of rates) {
    await db
      .insert(hospitalReferralRates)
      .values({
        organizationId: DEMO_ORG_AGENCY,
        hospitalId: DEMO_HOSPITAL_ID,
        category: r.category,
        rateBp: r.rateBp,
        feeBase: 'net_excl_vat',
        packageRule: 'sum_per_item',
        vatTreatment: 'mixed',
        payoutTrigger: 'on_treatment_done',
        payoutHoldDays: 7,
      })
      .onConflictDoNothing();
  }

  console.info('[seed] hospital deposit policy ...');
  await db
    .insert(hospitalDepositPolicies)
    .values({
      organizationId: DEMO_ORG_AGENCY,
      hospitalId: DEMO_HOSPITAL_ID,
      isEnabled: true,
      percentageBp: 2000, // 20%
      collector: 'agency_collects',
      timing: 'on_quote_accepted',
      daysBeforeVisit: 7,
      refundTiersJson: [
        { daysBeforeVisitMin: 30, refundBp: 10_000 },
        { daysBeforeVisitMin: 14, refundBp: 7000 },
        { daysBeforeVisitMin: 7, refundBp: 5000 },
        { daysBeforeVisitMin: 3, refundBp: 0 },
      ],
      medicalCauseFullRefund: true,
      forceMajeureFullRefund: true,
      includeInReferralBase: true,
      cancellationSplitJson: { hospitalBp: 5000, agencyBp: 3000, patientRefundBp: 2000 },
      autoRemindersJson: [
        { offsetDays: -7, channelKinds: ['kakao', 'email'] },
        { offsetDays: -3, channelKinds: ['whatsapp', 'sms'] },
      ],
      autoCancelOnUnpaidHours: 72,
    })
    .onConflictDoNothing();
}
