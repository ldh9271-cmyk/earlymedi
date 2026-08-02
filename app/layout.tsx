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
    default: 'KoreaGlowUp AI Concierge',
    template: '%s · KoreaGlowUp AI Concierge',
  },
  description:
    '환자의 첫 문의부터 귀국 후 케어까지, 한 손에서 끝나는 의료관광. 한국 보건복지부 등록 외국인환자 유치업자를 위한 AI 기반 통합 SaaS.',
  keywords: [
    '의료관광',
    'medical tourism',
    'KoreaGlowUp',
    'K-Glowup',
    'AI Concierge',
    '외국인환자 유치업자',
    'KOIHA',
    '컨시어지',
  ],
  authors: [{ name: 'KoreaGlowUp' }],
  creator: 'KoreaGlowUp',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    alternateLocale: ['en_US', 'ja_JP', 'zh_CN', 'ar', 'ru', 'th', 'vi'],
    siteName: 'KoreaGlowUp AI Concierge',
    title: 'KoreaGlowUp AI Concierge',
    description: '환자의 첫 문의부터 귀국 후 케어까지, 한 손에서 끝나는 의료관광',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KoreaGlowUp AI Concierge',
    description: '환자의 첫 문의부터 귀국 후 케어까지, 한 손에서 끝나는 의료관광',
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
