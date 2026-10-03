import type { PublicLocale } from '@/lib/i18n/locales';

/**
 * 약관·개인정보처리방침 본문 구조 (2026-10-03, 6개 언어).
 * 한국어가 원문이고 나머지는 번역본 — 조항 수·순서는 모든 언어가 같아야 한다.
 * 렌더링은 components/shared/legal-doc.tsx.
 */
export type LegalItem = string | { term?: string; text: string; sub?: string[] };

export type LegalSection = {
  title: string;
  /** 목록 앞에 오는 문장 */
  lead?: string;
  /** 번호 목록이면 true, 아니면 글머리 기호 */
  ordered?: boolean;
  items?: LegalItem[];
  /** 목록 뒤 문장 */
  tail?: string;
};

export type LegalDoc = {
  /** <title> 에 들어갈 짧은 제목 */
  metaTitle: string;
  title: string;
  /** 시행일·개정일 한 줄 */
  effective: string;
  /** 번역본 안내 (한국어 원문 우선). 한국어는 비움 */
  translationNotice?: string;
  backToSignup: string;
  sections: LegalSection[];
  addendum: string;
};

export type LegalDocs = Record<PublicLocale, LegalDoc>;
