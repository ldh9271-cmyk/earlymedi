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
