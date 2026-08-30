import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/shared/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Pretendard is loaded via CDN @import in globals.css (variable font).
// CSS variable name preserved so tailwind.config.ts continues to resolve it.

export const metadata: Metadata = {
  title: {
    // 표기는 lib/seo/brand.ts 의 BRAND_NAME 과 맞춘다 (검색엔진이 하나의
    // 브랜드로 묶도록). 공개 포털 /[locale]/* 는 이 템플릿을 타지 않고
    // withBrandSuffix + absolute 로 자체 처리한다 — 여기 걸리는 건
    // 콘솔·인증·마케팅 같은 한국어 화면이다.
    default: '글로우업투어',
    template: '%s · 글로우업투어',
  },
  description:
    '병원 · 뷰티샵 · 호텔 · 여행사를 위한 글로우업투어 파트너 플랫폼. 6개 언어 사이트와 AI 상담·컨시어지가 외국인 고객의 모객·예약·결제·통역을 대신합니다.',
  keywords: [
    '의료관광',
    'medical tourism',
    '글로우업투어',
    'GlowUpTour',
    'KoreaGlowUp',
    'AI Concierge',
    '외국인환자 유치업자',
    'KOIHA',
    '컨시어지',
  ],
  authors: [{ name: 'GlowUpTour' }],
  creator: 'GlowUpTour',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    alternateLocale: ['en_US', 'ja_JP', 'zh_CN', 'ar', 'ru', 'th', 'vi'],
    siteName: '글로우업투어',
    title: '글로우업투어 — 한국 의료관광 · K-뷰티 플랫폼',
    description: '병원 · 뷰티 · 호텔 · 여행을 6개 언어로. 상담부터 예약 · 결제 · 통역까지.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '글로우업투어 — 한국 의료관광 · K-뷰티 플랫폼',
    description: '병원 · 뷰티 · 호텔 · 여행을 6개 언어로. 상담부터 예약 · 결제 · 통역까지.',
    images: ['/og-image.png'],
  },
  // icons auto-detected from app/icon.svg + app/apple-icon.svg
  // (Next.js 14 convention) — no explicit metadata.icons needed.
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Search Console 소유권 확인 — HTML 파일 방식(public/google….html)이
  // 기본이다. apex(glowuptour.com)가 www 로 307 리다이렉트되기 때문에
  // 속성을 non-www 로 등록하면 파일 방식이 실패하는데, 그때는 콘솔에서
  // 'HTML 태그' 방식의 content 값을 이 env 에 넣으면 된다.
  // 네이버·빙은 콘솔에서 발급한 값을 env 로 넣으면 메타태그가 생긴다.
  // (네이버 서치어드바이저 = naver-site-verification,
  //  Bing Webmaster Tools = msvalidate.01)
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
        ? { 'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION }
        : {}),
      ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
        : {}),
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
