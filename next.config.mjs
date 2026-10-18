/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'api.mapbox.com' },
      { protocol: 'https', hostname: 'cdn.earlymedi.com' },
    ],
  },
  // 정식 호스트 = www. apex(glowuptour.com) 로 들어오면 www 로 영구 이동한다.
  // 이유: 카카오맵 JavaScript 키는 도메인 1개(www)에만 묶이고, 추천 쿠키·SEO 정규화도
  // 한 호스트로 모아야 유실이 없다 (2026-09-06 이동희 추천 매출 미반영 사고의 재발 방지).
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'glowuptour.com' }],
        destination: 'https://www.glowuptour.com/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      // iOS 유니버설 링크 파일(public/.well-known/apple-app-site-association)은 확장자가 없어
      // 기본으로 octet-stream 이 나간다 — 애플은 application/json 을 요구한다. assetlinks.json 은 확장자로 충분.
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
