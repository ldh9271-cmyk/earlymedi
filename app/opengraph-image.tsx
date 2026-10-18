import { OG_ALT, OG_SIZE, ogImageResponse } from '@/lib/seo/og-image';

/** 루트(/ 및 콘솔·마케팅 화면)의 og:image — 그림은 lib/seo/og-image.tsx. */
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image(): Promise<Response> {
  return ogImageResponse();
}
