import { describe, it, expect } from 'vitest';
import { accessLevelFor, nextStatusForOverdue, trialEndsAt } from '@/lib/billing/plan-engine';
import { priceUsageEvent, priceUsageBatch, gateUsage } from '@/lib/billing/usage-meter';
import { computePlatformFee } from '@/lib/pricing/platform-fee';
import {
  applyWithholding,
  nonResidentProfile,
  withholdingRate,
} from '@/lib/pricing/tax-calculator';

describe('plan-engine access level', () => {
  it('active → full', () => {
    expect(accessLevelFor({ status: 'active' })).toBe('full');
  });
  it('restricted → read_only', () => {
    expect(accessLevelFor({ status: 'restricted' })).toBe('read_only');
  });
  it('suspended → billing_only', () => {
    expect(accessLevelFor({ status: 'suspended' })).toBe('billing_only');
  });
  it('expired trial degrades to read_only', () => {
    const past = new Date('2025-01-01T00:00:00Z');
    expect(accessLevelFor({ status: 'trialing', trialEndsAt: past }, new Date('2025-02-01T00:00:00Z'))).toBe(
      'read_only',
    );
  });
});

describe('plan-engine overdue ladder', () => {
  it('escalates over time', () => {
    expect(nextStatusForOverdue('active', 0)).toBe('active');
    expect(nextStatusForOverdue('active', 1)).toBe('past_due');
    expect(nextStatusForOverdue('past_due', 7)).toBe('restricted');
    expect(nextStatusForOverdue('restricted', 30)).toBe('suspended');
    expect(nextStatusForOverdue('cancelled', 60)).toBe('cancelled');
  });
});

describe('trialEndsAt', () => {
  it('adds N days', () => {
    const end = trialEndsAt(new Date('2025-01-01T00:00:00Z'), 14);
    expect(end.toISOString().slice(0, 10)).toBe('2025-01-15');
  });
});

describe('usage-meter', () => {
  it('prices fixed rates', () => {
    expect(priceUsageEvent({ kind: 'chart_finalize', units: 1 })).toBe(1_500);
    expect(priceUsageEvent({ kind: 'ai_chart_autofill', units: 2 })).toBe(600);
  });
  it('batches', () => {
    expect(
      priceUsageBatch([
        { kind: 'chart_finalize', units: 3 },
        { kind: 'ai_vision', units: 10 },
      ]),
    ).toBe(5_500);
  });
  it('gates on insufficient balance', () => {
    const r = gateUsage({ kind: 'chart_finalize', units: 1 }, 1_000, false);
    expect(r.ok).toBe(false);
  });
  it('allows negative when plan permits (Committed pre-paid burst)', () => {
    const r = gateUsage({ kind: 'chart_finalize', units: 1 }, 1_000, true);
    expect(r.ok).toBe(true);
  });
});

describe('platform-fee', () => {
  it('agency-only bearer', () => {
    expect(
      computePlatformFee({ gmvKrw: 10_000_000, settlementFeeBp: 100, bearer: 'agency_only' }),
    ).toEqual({ totalFeeKrw: 100_000, agencyFeeKrw: 100_000, patientAddOnKrw: 0 });
  });
  it('patient add-on', () => {
    expect(
      computePlatformFee({ gmvKrw: 10_000_000, settlementFeeBp: 100, bearer: 'patient_add_on' }),
    ).toEqual({ totalFeeKrw: 100_000, agencyFeeKrw: 0, patientAddOnKrw: 100_000 });
  });
  it('shared 50/50 default', () => {
    expect(
      computePlatformFee({ gmvKrw: 10_000_000, settlementFeeBp: 100, bearer: 'shared' }),
    ).toEqual({ totalFeeKrw: 100_000, agencyFeeKrw: 50_000, patientAddOnKrw: 50_000 });
  });
});

describe('tax-calculator', () => {
  it('KR resident 3.30%', () => {
    expect(withholdingRate({ kind: 'kr_resident_individual' }).withholdingBp).toBe(330);
  });
  it('KR business 0% (uses tax invoice instead)', () => {
    expect(withholdingRate({ kind: 'kr_business' }).withholdingBp).toBe(0);
  });
  it('treaty rates from table', () => {
    expect(nonResidentProfile('US')).toMatchObject({ treatyWithholdingBp: 1_200 });
    expect(nonResidentProfile('JP')).toMatchObject({ treatyWithholdingBp: 1_000 });
  });
  it('non-treaty country falls back to 22%', () => {
    const r = withholdingRate(nonResidentProfile('XX'));
    expect(r.withholdingBp).toBe(2_200);
    expect(r.reason).toBe('non_resident_default');
  });
  it('applyWithholding subtracts tax correctly', () => {
    const r = applyWithholding(1_000_000, { kind: 'kr_resident_individual' });
    expect(r.taxKrw).toBe(33_000);
    expect(r.netKrw).toBe(967_000);
  });
});
