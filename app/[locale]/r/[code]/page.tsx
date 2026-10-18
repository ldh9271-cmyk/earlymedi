import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { LOCALE_TO_BCP47, type PublicLocale } from '@/lib/i18n/locales';
import { getPartnerByCode } from '@/lib/referral/service';
import CopyCode from './_components/copy-code';

export const dynamic = 'force-dynamic';

/**
 * 추천 QR 모바일 랜딩 — /[locale]/r/[code]
 *
 * app/r/[code]/route.ts 가 모바일 브라우저(앱 아님)에서 쿠키를 심은 뒤 여기로 보낸다. 세 가지를 보여 준다:
 *   1) 앱 설치 — 안드로이드는 Play 설치 리퍼러(referrer=ref%3D<코드>)로 앱이 설치 후 코드를 읽어 WebView 에
 *      쿠키를 심는다. iOS 는 App Store 링크(NEXT_PUBLIC_IOS_APP_URL)가 정해졌을 때만 버튼이 뜬다.
 *   2) 웹에서 바로 시작 — /r/<code>?go=web → 쿠키(이미 있음) → 홈. 기존 흐름이라 귀속이 확실하다.
 *   3) 추천 코드 안내 + 복사 — 앱 온보딩 '추천 코드' 칸에 넣으면 리퍼러가 없어도(iOS·수동 설치) 귀속된다.
 * 검색 노출은 막는다(noindex).
 */
const PLAY_PACKAGE = 'com.glowuptour.app';
const ROSE = '#ff385c';

export async function generateMetadata({ params }: { params: { locale: PublicLocale } }): Promise<Metadata> {
  const dict = await getDictionary(params.locale);
  return { title: { absolute: dict.refLanding.metaTitle }, robots: { index: false, follow: false } };
}

export default async function ReferralLandingPage({ params }: { params: { locale: PublicLocale; code: string } }): Promise<JSX.Element> {
  const code = (params.code ?? '').toUpperCase();
  const partner = await getPartnerByCode(code);
  if (!partner) redirect(`/${params.locale}`);
  const dict = await getDictionary(params.locale);
  const t = dict.refLanding;
  const ua = headers().get('user-agent') ?? '';
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const android = /Android/i.test(ua);
  const iosUrl = process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() || null;
  const playUrl = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&referrer=${encodeURIComponent(`ref=${partner.code}`)}`;
  // 기기별 설치 버튼: 안드로이드 → Play, iOS → App Store(링크가 있을 때), 그 외(데스크톱에서 직접 연 경우) → 둘 다
  const showPlay = android || (!ios && !android);
  const showIos = !!iosUrl && (ios || (!ios && !android));
  const hasInstall = showPlay || showIos;

  const button = (bg: string, color: string, border: string): React.CSSProperties => ({
    display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', textDecoration: 'none',
    background: bg, color, border: `1px solid ${border}`, borderRadius: 999, padding: '14px 18px',
    fontSize: 16, fontWeight: 700, lineHeight: 1.3,
  });

  return (
    <main
      lang={LOCALE_TO_BCP47[params.locale]}
      style={{
        minHeight: '100dvh', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', color: '#222222',
        fontFamily: "'Inter', 'Pretendard Variable', Pretendard, -apple-system, system-ui, sans-serif",
      }}
    >
      <section style={{ width: '100%', maxWidth: 420, background: '#ffffff', borderRadius: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.06)', padding: '28px 22px 24px' }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3, color: '#141414' }}>
          Glow<span style={{ color: ROSE }}>Up</span>Tour
        </div>
        <h1 style={{ fontSize: 24, lineHeight: 1.3, fontWeight: 800, letterSpacing: -0.4, margin: '18px 0 0', color: '#141414' }}>{t.title}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#6a6a6a', margin: '8px 0 0' }}>{t.subtitle}</p>

        <div style={{ marginTop: 20, background: '#f6f6f4', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6a6a6a' }}>{t.codeLabel}</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#141414', marginTop: 2, wordBreak: 'break-all' }}>{partner.code}</div>
          </div>
          <CopyCode code={partner.code} label={t.copy} done={t.copied} />
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
          {showPlay ? <a href={playUrl} rel="noopener" style={button(ROSE, '#ffffff', ROSE)}>{t.installAndroid}</a> : null}
          {showIos && iosUrl ? <a href={iosUrl} rel="noopener" style={button(showPlay ? '#ffffff' : ROSE, showPlay ? '#141414' : '#ffffff', showPlay ? '#dddddd' : ROSE)}>{t.installIos}</a> : null}
          <a href={`/r/${partner.code}?go=web&l=${params.locale}`} style={button('#ffffff', '#141414', '#dddddd')}>{t.web}</a>
        </div>

        {hasInstall ? (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#444444', margin: '18px 0 0', background: '#fff2f5', borderRadius: 12, padding: '10px 12px' }}>
            {t.appHint.split('{code}').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 ? <strong style={{ color: ROSE, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{partner.code}</strong> : null}
              </span>
            ))}
          </p>
        ) : null}
        <p style={{ fontSize: 12, lineHeight: 1.6, color: '#8a8a8a', margin: '12px 0 0' }}>{t.webHint}</p>
      </section>
    </main>
  );
}
