/**
 * 앱 서버용 지식 문서 스토어 — DB 의 활성 청크를 60초 캐시로 읽고(태그 'ai-knowledge'),
 * 마스터가 문서를 올리거나 활성/비활성·삭제하면 revalidateTag 로 즉시 무효화한다.
 * (lib/cache/registry-cache.ts 와 같은 unstable_cache 패턴. 캐시 자체가 실패하면 DB 직접, 그것도 실패하면 마지막 성공값)
 */
import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import { db } from '@/lib/db/client';
import type { KnowledgeSource } from './chunker';
import { fetchActiveKnowledge } from './db';

export const KB_CACHE_TAG = 'ai-knowledge';
export const KB_CACHE_TTL_SEC = 60;

const cachedFetch = unstable_cache(() => fetchActiveKnowledge(db), ['ai-knowledge-active-v1'], {
  revalidate: KB_CACHE_TTL_SEC,
  tags: [KB_CACHE_TAG],
});

let lastGood: KnowledgeSource | null = null;

/**
 * 상담이 쓰는 활성 지식. null 이면 호출 쪽이 내장 청크(chunks.generated.ts)로 폴백한다.
 * 활성 문서가 0개인 것(null)과 DB 실패(마지막 성공값 또는 null)를 구분하지 않는다 — 둘 다 폴백이 맞다.
 */
export async function loadActiveKnowledge(): Promise<KnowledgeSource | null> {
  try {
    const s = await cachedFetch();
    if (s) lastGood = s;
    return s;
  } catch (err) {
    console.warn('[ai-knowledge] cache read failed, querying DB directly:', err instanceof Error ? err.message : err);
  }
  try {
    const s = await fetchActiveKnowledge(db);
    if (s) lastGood = s;
    return s;
  } catch (err) {
    console.warn('[ai-knowledge] DB read failed, using last good / builtin:', err instanceof Error ? err.message : err);
    return lastGood;
  }
}

/** 문서 변경 후 호출 — 다음 상담 요청부터 새 청크를 읽는다 */
export function invalidateKnowledgeCache(): void {
  revalidateTag(KB_CACHE_TAG);
}
