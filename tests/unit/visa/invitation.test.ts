import { describe, it, expect } from 'vitest';
import {
  InvitationContentSchema,
  validateInvitation,
  MAX_DAYS_BY_CATEGORY,
  renderLetterBodyKo,
  type InvitationContent,
} from '@/lib/visa/invitation-letter';
import {
  buildEntryReminderAlerts,
  buildOverstayAlerts,
  buildAllAlerts,
} from '@/lib/visa/immigration-alerts';

const VALID: InvitationContent = {
  category: 'C_3_3',
  patientName: '王小明',
  passportNumber: 'CN1234567',
  nationality: 'CHN',
  dateOfBirth: '1990-04-15',
  sex: 'female',
  hospitalName: '얼리메디 데모 성형외과',
  hospitalLicenseNumber: 'MED-2024-DEMO',
  hospitalAddress: '서울시 강남구 테헤란로 123',
  hospitalPhone: '+82-2-1234-5678',
  representativeName: '이병원',
  agencyName: '얼리메디 데모 에이전시',
  agencyForeignPatientLicense: 'FP-2024-DEMO-0001',
  intendedEntryDate: '2026-06-10',
  intendedExitDate: '2026-06-20',
  durationDays: 11,
  treatmentSummary: '코재수술 + D+7 검진',
  issuedDate: '2026-05-15',
};

describe('InvitationContentSchema', () => {
  it('accepts a valid invitation', () => {
    const r = InvitationContentSchema.safeParse(VALID);
    expect(r.success).toBe(true);
  });

  it('rejects invalid nationality (must be ISO alpha-3)', () => {
    const r = InvitationContentSchema.safeParse({ ...VALID, nationality: 'KR' });
    expect(r.success).toBe(false);
  });

  it('rejects malformed dates', () => {
    const r = InvitationContentSchema.safeParse({ ...VALID, dateOfBirth: '15/04/1990' });
    expect(r.success).toBe(false);
  });
});

describe('validateInvitation', () => {
  it('no issues on a valid content', () => {
    expect(validateInvitation(VALID)).toEqual([]);
  });

  it('flags exit before entry', () => {
    const r = validateInvitation({ ...VALID, intendedExitDate: '2026-06-05' });
    expect(r.some((i) => i.code === 'exit_before_entry')).toBe(true);
  });

  it('flags duration_mismatch', () => {
    const r = validateInvitation({ ...VALID, durationDays: 30 });
    expect(r.some((i) => i.code === 'duration_mismatch')).toBe(true);
  });

  it('C-3-3 over 90 days → duration_exceeds_category', () => {
    const r = validateInvitation({
      ...VALID,
      intendedEntryDate: '2026-06-10',
      intendedExitDate: '2026-12-31',
      durationDays: 200,
    });
    expect(r.some((i) => i.code === 'duration_exceeds_category')).toBe(true);
  });

  it('G-1-10 over 365 days → exceeds', () => {
    const r = validateInvitation({
      ...VALID,
      category: 'G_1_10',
      intendedEntryDate: '2026-06-10',
      intendedExitDate: '2028-06-10',
      durationDays: 730,
    });
    expect(r.some((i) => i.code === 'duration_exceeds_category')).toBe(true);
  });

  it('issued after entry → flagged', () => {
    const r = validateInvitation({ ...VALID, issuedDate: '2026-07-01' });
    expect(r.some((i) => i.code === 'issued_after_entry')).toBe(true);
  });

  it('companions on C-3-3 → flagged', () => {
    const r = validateInvitation({
      ...VALID,
      companions: [{ name: 'Mom', relation: 'mother', passportNumber: 'CN999' }],
    });
    expect(r.some((i) => i.code === 'companions_require_g_1_10')).toBe(true);
  });

  it('companions on G-1-10 → no flag', () => {
    const r = validateInvitation({
      ...VALID,
      category: 'G_1_10',
      companions: [{ name: 'Mom', relation: 'mother', passportNumber: 'CN999' }],
    });
    expect(r.some((i) => i.code === 'companions_require_g_1_10')).toBe(false);
  });

  it('category caps match spec', () => {
    expect(MAX_DAYS_BY_CATEGORY.C_3_3).toBe(90);
    expect(MAX_DAYS_BY_CATEGORY.G_1_10).toBe(365);
  });
});

describe('renderLetterBodyKo', () => {
  it('includes all spec-required identifiers', () => {
    const body = renderLetterBodyKo(VALID);
    expect(body).toContain('王小明');
    expect(body).toContain('FP-2024-DEMO-0001');
    expect(body).toContain('MED-2024-DEMO');
    expect(body).toContain('의료법 제27조의2');
  });
});

describe('immigration-alerts', () => {
  it('entry reminders cover D-30..D+0', () => {
    const r = buildEntryReminderAlerts('2026-06-10');
    expect(r.length).toBe(6);
    expect(r[0]).toMatchObject({ fireAt: '2026-05-11', severity: 'info' });
    expect(r[r.length - 1]).toMatchObject({ fireAt: '2026-06-10', severity: 'critical' });
  });

  it('overstay alerts include post-exit critical', () => {
    const r = buildOverstayAlerts('2026-06-20');
    expect(r.some((a) => a.fireAt === '2026-06-23' && a.kind === 'overstay_critical')).toBe(true);
  });

  it('buildAllAlerts unions both', () => {
    const r = buildAllAlerts({ intendedEntryDate: '2026-06-10', intendedExitDate: '2026-06-20' });
    expect(r.filter((a) => a.kind === 'pre_entry_reminder').length).toBe(6);
    expect(r.filter((a) => a.kind === 'overstay_warning' || a.kind === 'overstay_critical').length).toBe(5);
  });
});
