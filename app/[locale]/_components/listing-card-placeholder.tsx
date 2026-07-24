import { BrandMark } from './brand-mark';

/**
 * 커버 이미지 미등록 상품용 브랜드 플레이스홀더 — /clinics 병원 카드와
 * 동일한 디자인 언어(핑크 그라데이션 + K glow-up 로고 + 상호명)로
 * 맛집·뷰티 상품 카드도 통일. 부모 컨테이너는 position: relative 에
 * 배경으로 LISTING_PLACEHOLDER_BG 를 깔고, 이 컴포넌트를 자식으로
 * 렌더한다. 실제 사진 업로드 시 자동으로 대체됨.
 */
export const LISTING_PLACEHOLDER_BG =
  'linear-gradient(150deg, #fff7f8 0%, #ffeef1 55%, #ffe3e9 100%)';

export function ListingCardPlaceholder({ name }: { name: string }): JSX.Element {
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: '14%',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background:
            'radial-gradient(90% 70% at 50% 18%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 60%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <BrandMark size={30} color="#ff385c" />
        <span
          style={{
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em',
            color: '#ff385c',
          }}
        >
          glow-up
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          fontSize: 17, fontWeight: 700, lineHeight: 1.35,
          letterSpacing: '-0.02em',
          color: '#222222', textAlign: 'center',
          wordBreak: 'keep-all',
        }}
      >
        {name}
      </div>
      <div
        style={{
          position: 'relative',
          width: 26, height: 3, borderRadius: 9999,
          background: 'rgba(255,56,92,0.35)',
        }}
      />
    </div>
  );
}
