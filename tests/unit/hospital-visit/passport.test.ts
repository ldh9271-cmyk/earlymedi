import { describe, expect, it } from 'vitest';
import { isValidPassportNo, maskPassportNo, needsPassport, normalizePassportNo } from '@/lib/hospital-visit/passport';

describe('여권번호 정규화·검증·마스킹', () => {
  it('공백·하이픈을 지우고 대문자로 바꾼다', () => {
    expect(normalizePassportNo(' m123 45-678 ')).toBe('M12345678');
    expect(normalizePassportNo('')).toBeNull();
    expect(normalizePassportNo(null)).toBeNull();
  });
  it('영문·숫자 5~15자만 유효', () => {
    expect(isValidPassportNo('M12345678')).toBe(true);
    expect(isValidPassportNo('E1234')).toBe(true);
    expect(isValidPassportNo('ABCD')).toBe(false);
    expect(isValidPassportNo('M123-45678')).toBe(false);
    expect(isValidPassportNo('ABCDEFGHIJKLMNOP')).toBe(false);
    expect(isValidPassportNo(null)).toBe(false);
  });
  it('마스킹은 앞 2 · 뒤 2 만 남긴다', () => {
    expect(maskPassportNo('M12345678')).toBe('M1*****78');
    expect(maskPassportNo('AB12')).toBe('****');
  });
  it('한국 국적만 여권번호를 생략한다', () => {
    expect(needsPassport('KR')).toBe(false);
    expect(needsPassport('kr')).toBe(false);
    expect(needsPassport('JP')).toBe(true);
    expect(needsPassport(null)).toBe(true);
  });
});
