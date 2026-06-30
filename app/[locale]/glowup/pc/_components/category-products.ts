/**
 * 7 sample products — one per PC category strip entry (전체 excluded
 * because it points at /glowup/pc itself).
 *
 * Each product map to one of the existing patient-portal categories
 * (`interest`) so the inquiry pipeline records intent correctly when
 * the user clicks "예약하기" → /[locale]/inquiry?program=…&interest=…
 * lands in /agency/inbox with the right tag.
 *
 * Images reused from the design bundle in /public/images/glowup-pc/
 * (extracted earlier from the Airbnb-style standalone HTML).
 */
import type { PcCategoryKey } from './pc-header';

const IMG = '/images/glowup-pc';

export type CategoryProduct = {
  key: Exclude<PcCategoryKey, 'all'>;
  /** Korean h1 + Airbnb-style subtitle. */
  title: string;
  subtitle: string;
  /** Eyebrow line under the title (location · rating · reviews). */
  metaLine: string;
  rating: number;
  reviewCount: number;
  /** Bullet list of inclusions, rendered as ✓ rows. */
  includes: string[];
  /** "₩180,000 / 세션" or "₩320,000 / 박" — we display unit on its own line. */
  priceWon: number;
  priceUnit: string;
  /** Image used in the hero band — JPEG from /public/images/glowup-pc. */
  heroImg: string;
  /** Which patient-portal interest chip to auto-check on the inquiry form. */
  interest: 'plastic_surgery' | 'dermatology' | 'photo' | 'makeup' | 'kpop' | 'food' | 'hotel' | 'hair';
};

export const CATEGORY_PRODUCTS: Record<Exclude<PcCategoryKey, 'all'>, CategoryProduct> = {
  color: {
    key: 'color',
    title: '퍼스널 컬러 진단',
    subtitle: '1:1 전문 컨설턴트 드레이핑 90분',
    metaLine: '강남 스튜디오',
    rating: 4.9,
    reviewCount: 312,
    includes: [
      '1:1 전문 컬러 컨설턴트',
      '컬러 드레이핑 진단 + 결과 리포트',
      '맞춤 메이크업·패션 컬러 가이드',
      '통역 가이드 동행 (영·중·일)',
    ],
    priceWon: 180_000,
    priceUnit: '세션',
    heroImg: `${IMG}/65b2c08d-ad5a-411e-a40e-fcbfec808c02.jpg`,
    interest: 'dermatology',
  },
  skin: {
    key: 'skin',
    title: '피부 진단 케어',
    subtitle: 'AI 피부 분석 + 맞춤 스킨 프로그램 120분',
    metaLine: '청담 클리닉',
    rating: 4.8,
    reviewCount: 184,
    includes: [
      'AI 기반 피부 스코어 측정',
      '모공·색소·탄력 항목별 진단',
      '진단 결과에 맞춘 맞춤 스킨 트리트먼트',
      '7일 홈케어 가이드 + 제품 추천',
    ],
    priceWon: 240_000,
    priceUnit: '세션',
    heroImg: `${IMG}/0b3ab66a-79d6-49be-b4f6-8a626ee1fc2d.jpg`,
    interest: 'dermatology',
  },
  hair: {
    key: 'hair',
    title: 'K-스타일링 헤어 살롱',
    subtitle: '컷·펌·컬러 — 강남 K-팝 스타일리스트 90분',
    metaLine: '강남 살롱',
    rating: 4.9,
    reviewCount: 142,
    includes: [
      '1:1 상담 + 두피·모발 진단',
      '컷·펌·컬러 중 1택 시술',
      '아이돌 메이크업 호환 헤어 스타일링',
      '외국인 통역 가이드 동행 (영·중·일)',
    ],
    priceWon: 130_000,
    priceUnit: '세션',
    heroImg: `${IMG}/96a7e0c2-ea2f-4549-8875-a3be3c38c523.jpg`,
    interest: 'hair',
  },
  photo: {
    key: 'photo',
    title: '프로필 화보 촬영',
    subtitle: '헤어·메이크업 + 전문 포토 스튜디오 150분',
    metaLine: '성수 스튜디오',
    rating: 5.0,
    reviewCount: 96,
    includes: [
      '전문 헤어·메이크업 1:1',
      '의상 4벌 + 컨셉 3 컷',
      '리터칭 보정본 12장 디지털 전달',
      '셀프 SNS 가이드북 제공',
    ],
    priceWon: 320_000,
    priceUnit: '세션',
    heroImg: `${IMG}/10f945b3-775f-4fe8-aab6-7e434cfca9b5.jpg`,
    interest: 'photo',
  },
  makeup: {
    key: 'makeup',
    title: 'K-뷰티 메이크업 클래스',
    subtitle: '아티스트와 1:1 셀프 메이크업 레슨 100분',
    metaLine: '명동 살롱',
    rating: 4.9,
    reviewCount: 228,
    includes: [
      '1:1 K-뷰티 메이크업 아티스트 강사',
      '셀프 적용 실습 (촬영 가능)',
      'CC 크림·립·아이섀도우 샘플 키트',
      '한국 화장품 추천 + 면세점 동행 옵션',
    ],
    priceWon: 150_000,
    priceUnit: '세션',
    heroImg: `${IMG}/96a7e0c2-ea2f-4549-8875-a3be3c38c523.jpg`,
    interest: 'makeup',
  },
  kpop: {
    key: 'kpop',
    title: 'HYBE 인사이트 + 성지 투어',
    subtitle: '용산 HYBE 사옥 관람 + 4사 성지 동행 200분',
    metaLine: '용산 · HYBE · SM · JYP · YG',
    rating: 4.8,
    reviewCount: 412,
    includes: [
      'HYBE 인사이트 입장권 (전시 + 굿즈샵)',
      'SM·JYP·YG 사옥 외관 투어 + 포토 스팟',
      '아티스트별 공식 카페·팝업 안내',
      '통역 가이드 + 전용 차량 이동',
    ],
    priceWon: 145_000,
    priceUnit: '1인',
    heroImg: `${IMG}/79dac510-b190-481f-bff3-acd40a97ced6.jpg`,
    interest: 'kpop',
  },
  food: {
    key: 'food',
    title: '강남 한우구이 다이닝',
    subtitle: '미슐랭 가이드 한우 전문점 · 예약 대행 포함',
    metaLine: '강남구 청담동',
    rating: 4.9,
    reviewCount: 542,
    includes: [
      '한우 1++ 등급 모듬 코스 (4인분)',
      '시즌 사이드 메뉴 + 전통주 페어링',
      '예약 대행 + 영·중·일 메뉴 통역',
      '차량 픽업·드롭 옵션 (강남권 호텔)',
    ],
    priceWon: 120_000,
    priceUnit: '1인',
    heroImg: `${IMG}/79cf46f3-c412-4e1e-8f72-e15c9e0f609b.jpg`,
    interest: 'food',
  },
  hotel: {
    key: 'hotel',
    title: '아테르 앰배서더 명동',
    subtitle: '명동 중심 5성 호텔 · 스파·루프탑·조식 뷔페',
    metaLine: '명동 · ★★★★★',
    rating: 4.9,
    reviewCount: 891,
    includes: [
      '디럭스 더블 룸 1박',
      '루프탑 풀 + 사우나 무료 이용',
      '조식 뷔페 2인 포함',
      '명동·남산·동대문 도보 접근',
    ],
    priceWon: 320_000,
    priceUnit: '박',
    heroImg: `${IMG}/b6d9c1aa-25f5-4abd-bb32-c74099caddc0.jpg`,
    interest: 'hotel',
  },
};
