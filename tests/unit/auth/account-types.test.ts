import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_TO_PREFIX,
  accountTypeForPath,
  isAccountType,
  prefixForAccountType,
} from '@/lib/auth/account-types';

describe('account-types', () => {
  it('exposes exactly 4 actor types', () => {
    expect(ACCOUNT_TYPES).toEqual(['agency', 'freelancer', 'medical', 'non_medical']);
  });

  it('maps each type to a unique URL prefix', () => {
    const prefixes = ACCOUNT_TYPES.map(prefixForAccountType);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    expect(ACCOUNT_TYPE_TO_PREFIX).toEqual({
      agency: '/agency',
      freelancer: '/freelancer',
      medical: '/medical',
      non_medical: '/partner',
    });
  });

  it('infers account type from URL path', () => {
    expect(accountTypeForPath('/agency/dashboard')).toBe('agency');
    expect(accountTypeForPath('/freelancer/cases/123')).toBe('freelancer');
    expect(accountTypeForPath('/medical/charts')).toBe('medical');
    expect(accountTypeForPath('/partner/availability')).toBe('non_medical');
    expect(accountTypeForPath('/agencyfoo')).toBeNull(); // must be exact / segmented
    expect(accountTypeForPath('/login')).toBeNull();
    expect(accountTypeForPath('/')).toBeNull();
  });

  it('guards arbitrary strings', () => {
    expect(isAccountType('agency')).toBe(true);
    expect(isAccountType('non_medical')).toBe(true);
    expect(isAccountType('hospital')).toBe(false);
    expect(isAccountType('')).toBe(false);
  });
});
