import Link from 'next/link';
import { Logo } from '@/components/shared/brand/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left rail — visual */}
      <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 text-white lg:flex">
        <Link href="/" className="inline-block">
          <span className="text-xl font-display font-bold">
            <span className="font-extrabold">Early</span>
            <span className="font-semibold">Medi</span>{' '}
            <span className="font-medium text-hospitality-200">AI Concierge</span>
          </span>
        </Link>

        <div className="space-y-6">
          <h1 className="text-balance text-4xl font-bold leading-tight">
            환자의 첫 문의부터
            <br />
            귀국 후 케어까지,
            <br />한 손에서 끝나는 의료관광.
          </h1>
          <p className="text-balance max-w-md text-white/80">
            한국 보건복지부 등록 외국인환자 유치업자와 협력 의료기관, 회복호텔, 송객 파트너를
            하나의 플랫폼에서 자동 매칭·정산합니다.
          </p>
          <ul className="space-y-3 text-sm text-white/70">
            <li>• 10채널 다국어 통합 인박스 (KakaoTalk·LINE·WhatsApp·WeChat·Instagram…)</li>
            <li>• AI 시술 차트 자동 채움 + 사후 회복 모니터링</li>
            <li>• 병원 송객 수수료 · 예약금 · 프리랜서 커미션 4자 자동 정산</li>
          </ul>
        </div>

        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} EarlyMedi · 의료법 27조의2 외국인환자 유치 광고 가이드라인 준수
        </p>
      </div>

      {/* Right rail — content */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo size="md" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
