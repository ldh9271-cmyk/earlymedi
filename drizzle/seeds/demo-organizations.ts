/**
 * Demo seed — provisions four organizations (one per account_type) plus a
 * synthetic owner user for each. Used by `npm run db:seed` for first-run demo.
 *
 * IDs are deterministic UUIDs so referencing seeds (affiliations/contracts)
 * can be reproduced. Magic-link login: send a link to the email below.
 */

export const DEMO_USER_OWNER_AGENCY = '00000000-0000-4000-8000-000000000001';
export const DEMO_USER_OWNER_FREELANCER = '00000000-0000-4000-8000-000000000002';
export const DEMO_USER_OWNER_MEDICAL = '00000000-0000-4000-8000-000000000003';
export const DEMO_USER_OWNER_PARTNER = '00000000-0000-4000-8000-000000000004';

/**
 * Demo "master" operator — gets `owner` membership in ALL 4 demo orgs so the
 * operator can hop between actor views from a single email via /select-org.
 *
 * Auth flow: magic-link only. There is no password — Supabase Auth holds the
 * identity and emails a one-time link on every login. Run `npm run setup:master`
 * once to register this email in Supabase Auth with the same UUID so the
 * `users.id` row created below maps to `auth.uid()`.
 *
 * Not a backdoor: each session still funnels through the 5-step middleware,
 * URL ↔ account_type lock, and RLS. Master only shortcuts the *which org am
 * I logged into* selection — they still see only one org's data at a time.
 */
export const MASTER_OPERATOR_USER_ID = '00000000-0000-4000-8000-000000000099';
export const MASTER_OPERATOR_EMAIL = 'astoriakr@naver.com';

export const DEMO_ORG_AGENCY = '00000000-0000-4000-9000-000000000001';
export const DEMO_ORG_FREELANCER = '00000000-0000-4000-9000-000000000002';
export const DEMO_ORG_MEDICAL = '00000000-0000-4000-9000-000000000003';
export const DEMO_ORG_PARTNER_HOTEL = '00000000-0000-4000-9000-000000000004';

export const DEMO_USERS = [
  {
    id: MASTER_OPERATOR_USER_ID,
    email: MASTER_OPERATOR_EMAIL,
    fullName: '마스터 운영자 (Master Operator)',
    locale: 'ko',
    timezone: 'Asia/Seoul',
    activeOrgId: DEMO_ORG_AGENCY,
  },
  {
    id: DEMO_USER_OWNER_AGENCY,
    email: 'demo-agency@earlymedi.test',
    fullName: '김유치 (Demo Agency Owner)',
    locale: 'ko',
    timezone: 'Asia/Seoul',
    activeOrgId: DEMO_ORG_AGENCY,
  },
  {
    id: DEMO_USER_OWNER_FREELANCER,
    email: 'demo-freelancer@earlymedi.test',
    fullName: '박송객 (Demo Freelancer)',
    locale: 'ko',
    timezone: 'Asia/Seoul',
    activeOrgId: DEMO_ORG_FREELANCER,
  },
  {
    id: DEMO_USER_OWNER_MEDICAL,
    email: 'demo-medical@earlymedi.test',
    fullName: '이병원 (Demo Hospital Admin)',
    locale: 'ko',
    timezone: 'Asia/Seoul',
    activeOrgId: DEMO_ORG_MEDICAL,
  },
  {
    id: DEMO_USER_OWNER_PARTNER,
    email: 'demo-partner@earlymedi.test',
    fullName: '최호텔 (Demo Hotel Manager)',
    locale: 'ko',
    timezone: 'Asia/Seoul',
    activeOrgId: DEMO_ORG_PARTNER_HOTEL,
  },
] as const;

export const DEMO_ORGS = [
  {
    id: DEMO_ORG_AGENCY,
    accountType: 'agency' as const,
    partnerSubtype: null,
    name: '얼리메디 데모 에이전시',
    legalName: '주식회사 얼리메디 데모',
    slug: 'demo-agency',
    countryCode: 'KR',
    timezone: 'Asia/Seoul',
    defaultLocale: 'ko',
    defaultCurrency: 'KRW',
    businessRegistrationNumber: '123-45-67890',
    foreignPatientLicenseNumber: 'FP-2024-DEMO-0001',
    representativeName: '김유치',
    verificationStatus: 'verified' as const,
  },
  {
    id: DEMO_ORG_FREELANCER,
    accountType: 'freelancer' as const,
    partnerSubtype: null,
    name: '박송객 컨시어지',
    legalName: '박송객',
    slug: 'demo-freelancer',
    countryCode: 'KR',
    timezone: 'Asia/Seoul',
    defaultLocale: 'ko',
    defaultCurrency: 'KRW',
    representativeName: '박송객',
    verificationStatus: 'verified' as const,
  },
  {
    id: DEMO_ORG_MEDICAL,
    accountType: 'medical' as const,
    partnerSubtype: null,
    name: '얼리메디 데모 성형외과',
    legalName: '의료법인 얼리메디 데모',
    slug: 'demo-clinic',
    countryCode: 'KR',
    timezone: 'Asia/Seoul',
    defaultLocale: 'ko',
    defaultCurrency: 'KRW',
    businessRegistrationNumber: '987-65-43210',
    medicalLicenseNumber: 'MED-2024-DEMO-0001',
    foreignPatientLicenseNumber: 'FP-MED-2024-DEMO',
    representativeName: '이병원',
    verificationStatus: 'verified' as const,
  },
  {
    id: DEMO_ORG_PARTNER_HOTEL,
    accountType: 'non_medical' as const,
    partnerSubtype: 'hotel' as const,
    name: '얼리메디 회복호텔',
    legalName: '얼리메디 호스피탈리티',
    slug: 'demo-hotel',
    countryCode: 'KR',
    timezone: 'Asia/Seoul',
    defaultLocale: 'ko',
    defaultCurrency: 'KRW',
    representativeName: '최호텔',
    verificationStatus: 'verified' as const,
  },
];
