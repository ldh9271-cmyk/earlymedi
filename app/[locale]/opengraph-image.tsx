import { OG_ALT, OG_SIZE, ogImageResponse } from '@/lib/seo/og-image';

/**
 * 공개 포털(/kr, /en …)의 og:image — Next 가 이 파일을 보고 /[locale] 아래 모든 페이지에 og:image 메타를 넣는다.
 * (파일 기반 메타가 generateMetadata 의 openGraph 보다 우선. 그림은 lib/seo/og-image.tsx)
 */
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image(): Promise<Response> {
  return ogImageResponse();
}
