export const SUPPORTED_CURRENCIES = [
  'KRW',
  'USD',
  'JPY',
  'CNY',
  'EUR',
  'RUB',
  'VND',
  'THB',
  'AED',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
