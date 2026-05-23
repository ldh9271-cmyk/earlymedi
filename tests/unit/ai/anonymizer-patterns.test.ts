import { describe, expect, it } from 'vitest';

// We unit-test only the regex patterns offline; full anonymize() requires DB.
const PATTERNS: Array<{ kind: string; rx: RegExp }> = [
  { kind: 'EMAIL', rx: /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi },
  { kind: 'RRN_KR', rx: /(\d{6}-\d{7})/g },
  { kind: 'PHONE', rx: /(\+?\d{1,3}[ -]?\d{2,4}[ -]?\d{3,4}[ -]?\d{3,4})/g },
  { kind: 'PASSPORT', rx: /\b([A-Z]{1,2}\d{7,8})\b/g },
];

function redact(text: string): string {
  let out = text;
  for (const { kind, rx } of PATTERNS) {
    let i = 0;
    out = out.replace(rx, () => `[[${kind}_${++i}]]`);
  }
  return out;
}

describe('PII regex patterns', () => {
  it('redacts emails', () => {
    expect(redact('write to alice@example.com')).toContain('[[EMAIL_1]]');
  });
  it('redacts Korean RRN', () => {
    expect(redact('주민번호 850101-1234567')).toContain('[[RRN_KR_1]]');
  });
  it('redacts phone numbers in multiple formats', () => {
    expect(redact('+82 10-1234-5678 또는 010 1234 5678')).toContain('[[PHONE_');
  });
  it('redacts passport numbers', () => {
    expect(redact('Passport M12345678')).toContain('[[PASSPORT_1]]');
  });
});
