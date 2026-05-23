import { describe, expect, it } from 'vitest';
import { BILLING_PLAN_SEEDS } from '@/drizzle/seeds/billing-plans';

describe('billing plan seeds', () => {
  it('contains all 8 plans with unique codes', () => {
    const codes = BILLING_PLAN_SEEDS.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toEqual(
      expect.arrayContaining([
        'agency_starter',
        'agency_growth',
        'agency_pro',
        'medical_payg',
        'medical_committed',
        'partner_listing',
        'partner_active',
        'freelancer_free',
      ]),
    );
  });

  it('matches spec headline numbers', () => {
    const get = (code: string) => BILLING_PLAN_SEEDS.find((p) => p.code === code);
    expect(get('agency_starter')?.monthlyFeeKrw).toBe(99_000);
    expect(get('agency_starter')?.settlementFeeBp).toBe(150);
    expect(get('agency_starter')?.trialDays).toBe(14);

    expect(get('agency_growth')?.monthlyFeeKrw).toBe(299_000);
    expect(get('agency_growth')?.settlementFeeBp).toBe(100);

    expect(get('agency_pro')?.monthlyFeeKrw).toBe(699_000);
    expect(get('agency_pro')?.registrationFeeKrw).toBe(0);
    expect(get('agency_pro')?.settlementFeeBp).toBe(70);

    expect(get('medical_payg')?.registrationFeeKrw).toBe(300_000);
    expect(get('medical_payg')?.prepaidChargeMinKrw).toBe(500_000);
    expect(get('medical_committed')?.annualFeeKrw).toBe(6_000_000);

    expect(get('partner_listing')?.settlementFeeBp).toBe(300);
    expect(get('partner_active')?.monthlyFeeKrw).toBe(49_000);
    expect(get('partner_active')?.settlementFeeBp).toBe(150);

    expect(get('freelancer_free')?.monthlyFeeKrw).toBe(0);
  });
});
