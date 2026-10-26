import { ImageResponse } from 'next/og';

/**
 * 링크 미리보기(og:image) 이미지 — 카카오톡·라인·슬랙 등이 glowuptour.com 링크를 공유할 때 보이는 그림.
 *
 * 예전에는 /og-image.png 를 가리켰지만 파일이 없어(404) 스크래퍼가 페이지의 첫 이미지(KB 에스크로 인증마크)를
 * 집어 갔다 (2026-10-19). 이제 app/opengraph-image.tsx · app/[locale]/opengraph-image.tsx 가 이 함수로
 * 1200×630 PNG 를 만든다. 그림은 공식 브랜드 마크(app/[locale]/_components/brand-mark.tsx 의 K 스파크 + "glow-up"
 * 로크업)와 도메인만 — 글자는 라틴만 써서 폰트 의존을 최소화한다.
 *
 * 워드마크 굵기(800)·캡션(500)은 next/og 기본 폰트(Noto Sans 400)에 없어 Google Fonts 에서 Inter 를 받아 쓴다
 * (쓰는 글자만 subset). 받지 못하면 기본 폰트로 그린다(가늘어지지만 깨지지는 않는다).
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = '글로우업투어 GlowUpTour';
/**
 * 페이지가 자기 openGraph 를 정의하면 상위 세그먼트의 파일 기반 opengraph-image 가 상속되지 않아
 * 카카오톡 등이 본문 첫 이미지(푸터 KB 에스크로 마크)를 미리보기로 집는다 (2026-10-26 VS라인 상세에서 확인).
 * openGraph 를 쓰는 페이지는 images 에 이 값을 넣어 브랜드 로크업으로 고정한다.
 */
export const OG_IMAGE_META = { url: '/opengraph-image', width: OG_SIZE.width, height: OG_SIZE.height, alt: OG_ALT };
const ROSE = '#ff385c';
const WORDMARK = 'glow-up';

const CAPTION_BRAND = 'GlowUpTour';
const CAPTION_DOMAIN = 'glowuptour.com';
/** Google Fonts 가 글리프를 이 글자들로만 줄여 준다(text=) — 다른 글자는 기본 폰트로 떨어지므로 캡션 글자까지 넣는다. */
const SUBSET_TEXT = [...new Set((WORDMARK + CAPTION_BRAND + CAPTION_DOMAIN).split(''))].join('');

type LoadedFont = { name: string; data: ArrayBuffer; weight: 500 | 800; style: 'normal' };
let fontPromise: Promise<LoadedFont[]> | null = null;

/** Google Fonts CSS API 는 구형 UA 에 woff/ttf 주소를 준다(최신 UA 면 woff2 만 줘서 Satori 가 못 읽는다). 굵기별 @font-face 를 전부 받는다. */
async function loadFonts(): Promise<LoadedFont[]> {
  if (!fontPromise) {
    fontPromise = (async () => {
      try {
        const css = await fetch(
          `https://fonts.googleapis.com/css2?family=Inter:wght@500;800&text=${encodeURIComponent(SUBSET_TEXT)}`,
          { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.7 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.7' } },
        ).then((r) => (r.ok ? r.text() : ''));
        const faces = [...css.matchAll(/font-weight: (500|800);\s*src: url\((.+?)\) format\('(?:opentype|truetype|woff)'\)/g)];
        const out: LoadedFont[] = [];
        for (const [, weight, url] of faces) {
          if (!url) continue;
          const res = await fetch(url);
          if (res.ok) out.push({ name: 'Inter', data: await res.arrayBuffer(), weight: weight === '800' ? 800 : 500, style: 'normal' });
        }
        return out;
      } catch {
        return [];
      }
    })();
  }
  return fontPromise;
}

function OgImage(): JSX.Element {
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#ffffff', fontFamily: 'Inter, "Noto Sans", sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        {/* K 스파크 마크 — brand-mark.tsx 의 spark 변형과 같은 패스 */}
        <svg width={250} height={250} viewBox="0 0 100 100" fill="none">
          <path d="M31 16 V84" stroke={ROSE} strokeWidth="13" strokeLinecap="round" />
          <path d="M31 51 L70 84" stroke={ROSE} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M31 51 L66 23" stroke={ROSE} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M71 13 L79 6" stroke={ROSE} strokeWidth="6.5" strokeLinecap="round" />
          <path d="M76 22 L86 19" stroke={ROSE} strokeWidth="6.5" strokeLinecap="round" />
          <path d="M62 8 L65 1" stroke={ROSE} strokeWidth="6.5" strokeLinecap="round" />
        </svg>
        <div style={{ display: 'flex', fontSize: 184, fontWeight: 800, letterSpacing: '-0.035em', color: ROSE, lineHeight: 1 }}>
          {WORDMARK}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 52, fontSize: 38, fontWeight: 500, color: '#6a6a6a', letterSpacing: '0.01em' }}>
        <span>{CAPTION_BRAND}</span>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#c9c9c4' }} />
        <span>{CAPTION_DOMAIN}</span>
      </div>
    </div>
  );
}

export async function ogImageResponse(): Promise<ImageResponse> {
  const fonts = await loadFonts();
  return new ImageResponse(<OgImage />, { ...OG_SIZE, fonts: fonts.length ? fonts : undefined });
}
