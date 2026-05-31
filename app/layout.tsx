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
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
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
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
