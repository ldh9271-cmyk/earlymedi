/**
 * Visa invitation letter — content + validation.
 *
 * The actual PDF rendering uses @react-pdf/renderer (server-side, on demand)
 * and is wired in the API route. This module owns:
 *   - content shape (zod schema)
 *   - business validation (date logic, category-specific length caps)
 *   - i18n labels (ko / en) used in the rendered letter
 *
 * Korean medical-tourism visa categories enforce hard limits:
 *   - C-3-3:  ≤ 90 days, single-entry typically
 *   - G-1-10: ≤ 365 days (renewable), for companions of medical patients
 */

import { z } from 'zod';

export const VisaCategorySchema = z.enum(['C_3_3', 'G_1_10', 'C_3_9', 'E_6', 'other']);
export type VisaCategory = z.infer<typeof VisaCategorySchema>;

export const InvitationContentSchema = z.object({
  category: VisaCategorySchema,
  patientName: z.string().min(1).max(120),
  passportNumber: z.string().min(5).max(20),
  nationality: z.string().length(3, 'ISO-3166 alpha-3'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(['male', 'female', 'other', 'unknown']),
  hospitalName: z.string().min(1),
  hospitalLicenseNumber: z.string().min(1),
  hospitalAddress: z.string().min(1),
  hospitalPhone: z.string().min(1),
  representativeName: z.string().min(1),
  agencyName: z.string().min(1),
  agencyForeignPatientLicense: z.string().min(1),
  intendedEntryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  intendedExitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationDays: z.number().int().min(1).max(365),
  treatmentSummary: z.string().min(1).max(2_000),
  companions: z
    .array(
      z.object({
        name: z.string().min(1),
        relation: z.string().min(1),
        passportNumber: z.string().min(5),
      }),
    )
    .optional(),
  issuedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type InvitationContent = z.infer<typeof InvitationContentSchema>;

export const MAX_DAYS_BY_CATEGORY: Record<VisaCategory, number> = {
  C_3_3: 90,
  G_1_10: 365,
  C_3_9: 90,
  E_6: 730,
  other: 90,
};

export type ValidationIssue = { code: string; message: string };

/**
 * Validate the content beyond zod shape — category-specific date logic,
 * companions-only-for-G-1-10, etc. Pure: no I/O. Returns a list of issues;
 * empty list means content is ready to render + sign.
 */
export function validateInvitation(content: InvitationContent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const entry = new Date(`${content.intendedEntryDate}T00:00:00Z`).getTime();
  const exit = new Date(`${content.intendedExitDate}T00:00:00Z`).getTime();
  const issued = new Date(`${content.issuedDate}T00:00:00Z`).getTime();

  if (exit <= entry) {
    issues.push({ code: 'exit_before_entry', message: '출국 예정일은 입국 예정일 이후여야 합니다.' });
  }

  const days = Math.round((exit - entry) / (24 * 3_600_000)) + 1;
  if (Math.abs(days - content.durationDays) > 1) {
    issues.push({ code: 'duration_mismatch', message: `체류일 ${content.durationDays}일과 입·출국 차이 ${days}일이 일치하지 않습니다.` });
  }

  const max = MAX_DAYS_BY_CATEGORY[content.category];
  if (content.durationDays > max) {
    issues.push({
      code: 'duration_exceeds_category',
      message: `${content.category}는 최대 ${max}일까지 가능합니다.`,
    });
  }

  if (issued > entry) {
    issues.push({ code: 'issued_after_entry', message: '초청장 발급일은 입국 예정일 이전이어야 합니다.' });
  }

  if (content.companions && content.companions.length > 0 && content.category !== 'G_1_10') {
    issues.push({
      code: 'companions_require_g_1_10',
      message: '동반자는 G-1-10에만 기재합니다 — 환자 본인은 C-3-3로 별도 신청.',
    });
  }

  return issues;
}

/**
 * Human-readable Korean labels for the rendered PDF. Kept here so the PDF
 * renderer stays a pure layout module and the wording lives with the policy.
 */
export const CATEGORY_LABEL_KO: Record<VisaCategory, string> = {
  C_3_3: 'C-3-3 단기 의료관광',
  G_1_10: 'G-1-10 의료관광 보호자',
  C_3_9: 'C-3-9 단기 일반',
  E_6: 'E-6 의료기술 연수',
  other: '기타',
};

export const CATEGORY_LABEL_EN: Record<VisaCategory, string> = {
  C_3_3: 'C-3-3 Short-Term Medical Tourism',
  G_1_10: 'G-1-10 Medical-Tourism Companion',
  C_3_9: 'C-3-9 Short-Term General',
  E_6: 'E-6 Medical Skill Training',
  other: 'Other',
};

/**
 * Standard letter body template (KO + EN bilingual). The PDF renderer fills
 * in the placeholder fields using the validated content above. We keep it
 * here as a string so the wording change goes through a code review.
 */
export function renderLetterBodyKo(c: InvitationContent): string {
  return `본 의료법인 ${c.hospitalName} (외국인환자 유치 의료기관 등록번호 ${c.hospitalLicenseNumber})은
한국 보건복지부 등록 외국인환자 유치업자 ${c.agencyName} (등록번호 ${c.agencyForeignPatientLicense})를 통해
다음의 환자분을 의료관광 목적으로 초청합니다.

· 성명: ${c.patientName}
· 여권번호: ${c.passportNumber}
· 국적: ${c.nationality}
· 생년월일: ${c.dateOfBirth}
· 성별: ${c.sex}

· 입국 예정일: ${c.intendedEntryDate}
· 출국 예정일: ${c.intendedExitDate}
· 체류 일수: ${c.durationDays}일
· 비자 종류: ${CATEGORY_LABEL_KO[c.category]}

· 진료/시술 요약:
${c.treatmentSummary}

· 초청 의료기관: ${c.hospitalName} (대표 ${c.representativeName})
  주소: ${c.hospitalAddress}
  연락처: ${c.hospitalPhone}

발급일: ${c.issuedDate}

본 초청장은 의료법 제27조의2 외국인환자 유치 사업 등록자에 의해 발급된 공식 문서이며,
의료비·체류비·의료사고 처리에 대해 초청자 측이 책임을 분담함을 확인합니다.`;
}

export function renderLetterBodyEn(c: InvitationContent): string {
  return `${c.hospitalName} (Foreign Patient Attraction Medical Institution Registration No. ${c.hospitalLicenseNumber}),
through ${c.agencyName} (Foreign Patient Attraction Business Registration No. ${c.agencyForeignPatientLicense}),
hereby invites the following patient for medical tourism purposes.

· Name: ${c.patientName}
· Passport: ${c.passportNumber}
· Nationality: ${c.nationality}
· Date of birth: ${c.dateOfBirth}
· Sex: ${c.sex}

· Intended entry: ${c.intendedEntryDate}
· Intended exit: ${c.intendedExitDate}
· Stay duration: ${c.durationDays} days
· Visa category: ${CATEGORY_LABEL_EN[c.category]}

· Treatment summary:
${c.treatmentSummary}

· Inviting institution: ${c.hospitalName} (Representative ${c.representativeName})
  Address: ${c.hospitalAddress}
  Phone: ${c.hospitalPhone}

Issued: ${c.issuedDate}`;
}
