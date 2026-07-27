/**
 * 로케일별 이미지 폴백.
 *
 * 사진은 언어와 무관한 공통 자산이다 — 병원/업체 사진을 kr 로케일에만
 * 올려두면 en/zh/ja/ru/vi 에서는 커버가 비어 브랜드 플레이스홀더가
 * 뜬다. 이름·소개는 번역본을 쓰되, 이미지는 해당 로케일에 없으면 kr
 * 이미지를 그대로 재사용한다.
 *
 * 호출부는 로케일 콘텐츠를 조회할 때 `locale` 컬럼을 함께 select 하고
 * `inArray(locale, localesForMedia(locale))` 로 대상 로케일 + kr 을
 * 같이 가져온 뒤, 이름은 대상 로케일 행에서, 커버는 이 맵에서 읽는다.
 */

/** 미디어 폴백까지 포함해 조회해야 할 로케일 목록. */
export function localesForMedia(locale: string): string[] {
  return locale === 'kr' ? ['kr'] : [locale, 'kr'];
}

/** id → 커버 URL (대상 로케일 우선, 없으면 kr). */
export function coverByLocale(
  rows: Array<{ id: string; locale: string; coverImageUrl: string | null }>,
  locale: string,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of rows) {
    const url = r.coverImageUrl?.trim();
    if (!url) continue;
    // 대상 로케일이 kr 행을 덮어쓰도록 우선 적용
    if (r.locale === locale) out.set(r.id, url);
    else if (r.locale === 'kr' && !out.has(r.id)) out.set(r.id, url);
  }
  // kr 행이 먼저 들어온 뒤 대상 로케일 행이 온 경우를 위해 한 번 더 정리
  for (const r of rows) {
    const url = r.coverImageUrl?.trim();
    if (url && r.locale === locale) out.set(r.id, url);
  }
  return out;
}

/** 갤러리도 같은 규칙 — 대상 로케일이 비어 있으면 kr 갤러리를 쓴다. */
export function galleryByLocale(
  rows: Array<{ id: string; locale: string; galleryImageUrls: unknown }>,
  locale: string,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const r of rows) {
    const list = Array.isArray(r.galleryImageUrls) ? (r.galleryImageUrls as string[]) : [];
    if (list.length === 0) continue;
    if (r.locale === locale) out.set(r.id, list);
    else if (r.locale === 'kr' && !out.has(r.id)) out.set(r.id, list);
  }
  for (const r of rows) {
    const list = Array.isArray(r.galleryImageUrls) ? (r.galleryImageUrls as string[]) : [];
    if (list.length > 0 && r.locale === locale) out.set(r.id, list);
  }
  return out;
}
