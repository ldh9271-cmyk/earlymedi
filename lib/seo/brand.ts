/**
 * 브랜드 식별 정보 — 검색엔진이 "코리아글로우업 / 글로우업투어" 를
 * 이 사이트와 연결하도록 하는 단일 출처.
 *
 * 표기가 한글·영문·띄어쓰기 유무로 갈리는데, 검색엔진은 이걸 자동으로
 * 같은 브랜드로 묶어주지 않는다. Organization.alternateName 에 실제로
 * 쓰이는 표기를 모두 올려 별칭임을 명시한다.
 */

export const SITE_URL = 'https://www.glowuptour.com';

/** 대표 표기 — 도메인과 일치시킨다. */
export const BRAND_NAME = '글로우업투어';

/** 같은 브랜드로 인식돼야 하는 모든 표기. */
export const BRAND_ALIASES = [
  '코리아글로우업',
  '코리아 글로우업',
  '글로우업 투어',
  '글로우업',
  'GlowUpTour',
  'Glow Up Tour',
  'KoreaGlowUp',
  'Korea Glow Up',
  'glow-up',
];

/**
 * Organization + WebSite JSON-LD.
 *
 * WebSite 를 함께 넣는 이유: 브랜드명 질의에 대해 검색엔진이 사이트
 * 자체를 하나의 엔티티로 잡아야 별칭 매칭이 산다.
 */
export function brandJsonLd(locale: string): string {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: BRAND_NAME,
      alternateName: BRAND_ALIASES,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      description:
        '한국 의료·뷰티 관광 컨시어지. 퍼스널 컬러 진단, K-뷰티 시술, 병원·호텔·맛집 예약을 6개국어 AI 컨시어지가 안내한다.',
      areaServed: 'KR',
      knowsLanguage: ['ko', 'en', 'zh', 'ja', 'ru', 'vi'],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: BRAND_NAME,
      alternateName: BRAND_ALIASES,
      url: `${SITE_URL}/${locale}`,
      inLanguage: locale === 'kr' ? 'ko' : locale,
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/${locale}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}
