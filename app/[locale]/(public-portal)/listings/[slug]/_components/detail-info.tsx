'use client';

import { useState } from 'react';

/**
 * 상세 정보 섹션 — listing 의 details.detailLandingImageUrl 과
 * details.address 를 합쳐서 보여주는 클라이언트 모듈.
 *
 *   - imageUrl 있으면: 처음엔 최대 600px 만 잘려 보이고 "이미지
 *     더보기" 버튼을 누르면 전체 펼침. 클라 state 토글.
 *   - address 있으면: 제목 + Google 지도 iframe + 주소 텍스트.
 *     주소 없으면 지도 블록 자체 숨김.
 *   - 둘 다 없으면 컴포넌트가 null 반환 — 호출 측에서 섹션 헤더
 *     도 숨길 수 있도록.
 */
export function DetailInfo({
  imageUrl,
  address,
  venueName,
}: {
  imageUrl?: string;
  address?: string;
  venueName: string;
}): JSX.Element | null {
  const [expanded, setExpanded] = useState(false);
  if (!imageUrl && !address) return null;

  const mapsLink = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;
  const mapEmbedSrc = address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {imageUrl ? (
        <div>
          <div
            style={{
              position: 'relative',
              maxHeight: expanded ? 'none' : 600,
              overflow: 'hidden',
              borderRadius: 14,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`${venueName} 상세`}
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
            {!expanded ? (
              <div
                style={{
                  position: 'absolute',
                  left: 0, right: 0, bottom: 0,
                  height: 120,
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 100%)',
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </div>
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              style={{
                width: '100%',
                marginTop: 10,
                height: 48,
                background: '#fff',
                border: '1px solid #dddddd',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                color: '#222',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              이미지 더보기
            </button>
          ) : null}
        </div>
      ) : null}

      {address && mapEmbedSrc ? (
        <div>
          <a
            href={mapsLink ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#222', textDecoration: 'none',
              fontSize: 17, fontWeight: 700,
              marginBottom: 12,
            }}
          >
            {venueName}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <div
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #ebebeb',
            }}
          >
            <iframe
              src={mapEmbedSrc}
              title={`${venueName} 위치`}
              width="100%"
              height="300"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ display: 'block', border: 0 }}
            />
          </div>
          <p style={{ fontSize: 14, color: '#3f3f3f', margin: '12px 0 0' }}>
            {address}
          </p>
        </div>
      ) : null}
    </div>
  );
}
