/**
 * FIT (자유여행) 기본 상품 카탈로그 — founder 2026-06-25 제공 단가표 기준.
 *
 * 마스터 콘솔의 "FIT 자유여행 기본 상품 일괄 등록" 버튼이 이 배열을
 * 읽어 partner_listings 테이블에 status='approved', subType='free' 로
 * 한 번에 insert. 이미 같은 slug 가 있으면 skip — 멱등하게 재실행
 * 가능 (단가 변경은 마스터 편집 페이지에서 직접 수정).
 *
 * 가격은 단가표의 범위 중 하한값. 마스터는 등록 후 개별 편집에서
 * 추가 옵션·범위·promoLabel 을 채울 수 있다.
 */

import type { ListingCategory } from './categories';

export type FitProductSeed = {
  title: string;
  /** 사용자 검색·필터에 노출되는 1줄 설명. */
  description: string;
  category: ListingCategory;
  priceWon: number;
  priceUnit: string;
  /** /inquiry?interest=… 자동선택 키. */
  interestKey: string;
  /** 상세 페이지 호스트 카드 + Why-special 카테고리 hint. */
  detailsExtra?: Record<string, unknown>;
};

export const FIT_PRODUCTS: ReadonlyArray<FitProductSeed> = [
  // ─── 이동 · 픽업 ────────────────────────────────────────────────
  {
    title: '공항 픽업 (인천/김포 → 서울 숙소)',
    description:
      '인천·김포 공항에서 서울 숙소까지 세단 차량 픽업. 전담 기사 + 짐 운반 + 한국어 미숙 게스트 안내 포함. 항공편 도착 시간에 맞춰 출발.',
    category: 'travel_package',
    priceWon: 150_000,
    priceUnit: '회',
    interestKey: 'beauty_tour',
  },
  {
    title: '공항 샌딩 (서울 숙소 → 인천/김포)',
    description:
      '서울 숙소에서 인천·김포 공항까지 세단 차량 샌딩. 출국 비행 2시간 30분 전 출발 기준. 시술 후 회복 동선 고려한 안전 운행.',
    category: 'travel_package',
    priceWon: 150_000,
    priceUnit: '회',
    interestKey: 'beauty_tour',
  },
  {
    title: '클리닉 픽업·샌딩 (숙소 ↔ 클리닉 왕복)',
    description:
      '숙소와 시술 클리닉 사이 왕복 차량 + 전담 기사. 시술 직후 마취·회복 상태 고려한 안전 동선. 진료·상담·결제 시간 대기 포함.',
    category: 'travel_package',
    priceWon: 250_000,
    priceUnit: '회',
    interestKey: 'beauty_tour',
  },
  {
    title: '기사 반일 대절 (4시간, 스타렉스)',
    description:
      '스타렉스급 차량 + 전담 기사 4시간 대절. 시술·식사·쇼핑·면세점 동선 자유 구성. 최대 8인 탑승.',
    category: 'travel_package',
    priceWon: 200_000,
    priceUnit: '반일',
    interestKey: 'beauty_tour',
  },
  {
    title: '기사 종일 대절 (8시간, 스타렉스)',
    description:
      '스타렉스급 차량 + 전담 기사 8시간 대절. 하루 일정 전체 커버 (클리닉·맛집·관광·쇼핑). 최대 8인 탑승.',
    category: 'travel_package',
    priceWon: 300_000,
    priceUnit: '종일',
    interestKey: 'beauty_tour',
  },

  // ─── 통역 ──────────────────────────────────────────────────────
  {
    title: '클리닉 동행 통역 - 반일 (4시간)',
    description:
      '의료 통역 전문가가 클리닉 현장 4시간 동행. 의료 동의서·상담·시술·결제까지 의사소통 책임. 한·영·중·일 가능 (예약 시 언어 선택).',
    category: 'travel_package',
    priceWon: 150_000,
    priceUnit: '반일',
    interestKey: 'beauty_tour',
  },
  {
    title: '클리닉 동행 통역 - 종일 (8시간)',
    description:
      '의료 통역 전문가가 클리닉 현장 8시간 동행. 복수 진료과·복잡 시술·전후 케어 안내까지 한 번에 커버. 한·영·중·일 가능.',
    category: 'travel_package',
    priceWon: 250_000,
    priceUnit: '종일',
    interestKey: 'beauty_tour',
  },

  // ─── 숙소 ──────────────────────────────────────────────────────
  {
    title: '뷰티 회복 숙소 - 1박 (2인 1실 기준)',
    description:
      '클리닉 인근 호텔 1박, 2인 1실 기준 1인당 150,000원. 시술 직후 안정적 회복 환경 + 야간 컨시어지 응대 + 식이 제한식 메뉴 옵션.',
    category: 'hotel',
    priceWon: 150_000,
    priceUnit: '인',
    interestKey: 'hotel',
  },
  {
    title: '뷰티 회복 숙소 - 3박 (조식 포함)',
    description:
      '클리닉 인근 호텔 3박 + 식이 제한식 조식 포함. 회복기 전담 케어 + 일일 컨디션 체크. 1인당 250,000원/박 × 3박 기준.',
    category: 'hotel',
    priceWon: 750_000,
    priceUnit: '3박',
    interestKey: 'hotel',
  },
  {
    title: '서울 호텔 연계 예약 대행',
    description:
      '제휴 호텔 예약 대행. 명동·강남·청담·홍대 등 위치 선택 가능. 실비 + 수수료 10% 정산. 컨시어지가 시술 일정에 맞춘 위치 큐레이션.',
    category: 'hotel',
    priceWon: 0,
    priceUnit: '실비+수수료 10%',
    interestKey: 'hotel',
  },

  // ─── 클리닉 예약 대행 ─────────────────────────────────────────
  {
    title: '클리닉 예약 대행 (무료)',
    description:
      '1개 병원 상담 예약 무료 대행. 사용자 일정 + 진료과 매칭 + 일정 확정까지 컨시어지가 진행. 추가 통역·픽업은 별도 상품으로 결합 가능.',
    category: 'travel_package',
    priceWon: 0,
    priceUnit: '건',
    interestKey: 'plastic_surgery',
  },
];
